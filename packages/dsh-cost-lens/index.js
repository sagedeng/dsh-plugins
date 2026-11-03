/**
 * DeepSeek Cost Lens — Host half.
 *
 * Derives account balance, per-session / daily usage and live spend from
 * authoritative sources only:
 *   - balance: `ctx.deepseekAccount.getBalance()` (Platform wallet), falling back
 *     to `GET https://api.deepseek.com/user/balance` with the stored API key.
 *   - usage:   `assistant/message` session events, which carry the billed
 *     `TokenUsage`. The session log is the source of truth, so nothing here is
 *     persisted twice; history is rebuilt from the log on activation.
 *   - prices:  the official price table in `pricing.js` plus the official
 *     peak / off-peak schedule.
 *
 * The browser half polls `<statePath>` for one JSON snapshot.
 */
import {
  PRICING_SOURCE,
  PEAK_MULTIPLIER,
  MODEL_ALIASES,
  HOLIDAYS_DEFAULT,
  buildPriceTable,
  resolvePrice,
  pricedUsage,
  tariffAt,
  isPeakInstant,
  bjDayKey,
} from './pricing.js'

export const inject = ['webServer']

const STATE_PATH = '/dsh-cost-lens/state.json'
const SNAPSHOT_TTL_MS = 900
const MAX_SEEN = 200000
const MAX_RECENT = 6

export function apply(ctx, config) {
  const cfg = {
    currency: 'CNY',
    balanceTtlMs: 60000,
    historyDays: 14,
    maxBackfillSessions: 60,
    holidayDates: HOLIDAYS_DEFAULT,
    priceOverrides: null,
    ...(config && typeof config === 'object' ? config : {}),
  }
  const holidays = new Set(Array.isArray(cfg.holidayDates) ? cfg.holidayDates : HOLIDAYS_DEFAULT)
  const priceModels = buildPriceTable(cfg.priceOverrides)

  const store = {
    totals: emptyAgg(),
    days: new Map(),
    sessions: new Map(),
    models: new Map(),
    seen: new Set(),
    unpriced: { calls: 0, hit: 0, miss: 0, out: 0 },
    lastModel: null,
    backfill: { state: 'pending', sessions: 0, skipped: 0, error: null },
    balance: {
      at: 0,
      wallets: null,
      bonusWallets: [],
      links: null,
      error: null,
      source: null,
      busy: false,
    },
  }

  // ---------------------------------------------------------------- ingestion

  function ingest(sessionId, seq, time, source, usage) {
    if (!usage) return
    const hit = Math.max(0, Number(usage.cacheReadTokens) || 0)
    const miss = Math.max(0, Number(usage.inputTokens) || 0)
    const out = Math.max(0, Number(usage.outputTokens) || 0)
    if (!hit && !miss && !out) return

    const key = `${sessionId}:${seq}`
    if (store.seen.has(key)) return
    if (store.seen.size > MAX_SEEN) store.seen.clear()
    store.seen.add(key)

    const model = (source && source.model) || 'unknown'
    const provider = (source && source.provider) || 'unknown'
    const price = resolvePrice(priceModels, model)
    const phase = isPeakInstant(time, holidays) ? 'peak' : 'off'
    const cost = price ? pricedUsage(price, usage, phase) : null

    const entry = {
      at: time,
      model,
      priceId: price ? price.id : null,
      phase,
      hit,
      miss,
      out,
      cny: cost ? cost.cny : 0,
      usd: cost ? cost.usd : 0,
    }

    accumulate(store.totals, entry)
    const dayKey = bjDayKey(time)
    accumulate(bucket(store.days, dayKey), entry)
    accumulate(bucket(store.models, model), entry)

    const session = bucket(store.sessions, String(sessionId))
    accumulate(session, entry)
    session.model = model
    session.provider = provider
    session.lastAt = time
    session.recent.unshift(entry)
    if (session.recent.length > MAX_RECENT) session.recent.length = MAX_RECENT

    if (!price) {
      store.unpriced.calls += 1
      store.unpriced.hit += hit
      store.unpriced.miss += miss
      store.unpriced.out += out
    }
    store.lastModel = model
  }

  function ingestEvents(sessionId, events) {
    for (const event of events || []) {
      if (!event || event.type !== 'assistant/message') continue
      const data = event.data || {}
      if (!data.usage) continue
      const source = (data.message && data.message.source) || null
      ingest(sessionId, event.seq, event.time, source, data.usage)
    }
  }

  // Live feed: every committed session event, including subagent sessions.
  ctx.effect(() =>
    ctx.on('session/event', (session, event) => {
      try {
        if (!event || event.type !== 'assistant/message') return
        const data = event.data || {}
        if (!data.usage) return
        const source = (data.message && data.message.source) || null
        ingest(session.id, event.seq, event.time, source, data.usage)
      } catch {
        /* a malformed event must never disturb the agent loop */
      }
    }),
  )

  // Cold history: fold stored session logs once so "today" and "7 days" are real
  // from the first paint instead of starting at plugin activation.
  ctx.effect(() => {
    let stopped = false
    const timer = setTimeout(() => {
      backfill().catch((error) => {
        store.backfill.state = 'failed'
        store.backfill.error = message(error)
      })
    }, 1200)
    return () => {
      stopped = true
      clearTimeout(timer)
      void stopped
    }

    async function backfill() {
      const query = ctx.get('sessionQuery')
      if (!query) {
        store.backfill.state = 'unavailable'
        return
      }
      store.backfill.state = 'running'
      let records = []
      try {
        records = await query.listSessions()
      } catch (error) {
        store.backfill.state = 'failed'
        store.backfill.error = message(error)
        return
      }
      const since = Date.now() - Math.max(1, cfg.historyDays) * 86400000
      const candidates = records
        .filter((record) => record && record.header && record.header.createdAt >= since)
        .sort((a, b) => b.header.createdAt - a.header.createdAt)
        .slice(0, Math.max(1, cfg.maxBackfillSessions))
      store.backfill.skipped = Math.max(0, records.length - candidates.length)
      for (const record of candidates) {
        if (stopped) {
          store.backfill.state = 'stopped'
          return
        }
        try {
          const snapshot = await query.readSession(record.header.id)
          ingestEvents(record.header.id, snapshot.events)
          store.backfill.sessions += 1
        } catch {
          /* an unreadable or migrating log is skipped, not fatal */
        }
      }
      if (!stopped) store.backfill.state = 'done'
    }
  })

  // ------------------------------------------------------------------ balance

  async function refreshBalance() {
    if (store.balance.busy) return
    store.balance.busy = true
    try {
      const client = {
        version: '0.1.0',
        locale: 'zh',
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      }
      const account = ctx.get('deepseekAccount')
      let resolved = null
      if (account) {
        try {
          const view = await account.getState()
          if (view && view.links) store.balance.links = view.links
        } catch {
          /* links stay as previously seen */
        }
        try {
          const wallets = await account.getBalance(client)
          if (Array.isArray(wallets) && wallets.length) {
            resolved = { wallets, bonusWallets: [], source: 'account' }
          }
        } catch (error) {
          store.balance.error = message(error)
        }
      }
      if (!resolved) {
        try {
          const rest = await balanceFromApiKey()
          if (rest) resolved = rest
        } catch (error) {
          store.balance.error = message(error)
        }
      }
      if (resolved) {
        store.balance.wallets = resolved.wallets
        store.balance.bonusWallets = resolved.bonusWallets || []
        store.balance.source = resolved.source
        store.balance.error = null
        store.balance.at = Date.now()
      }
    } finally {
      store.balance.busy = false
    }
  }

  async function balanceFromApiKey() {
    const credentials = ctx.get('credentials')
    if (!credentials) return null
    const resolved = await credentials.resolve('DEEPSEEK_API_KEY')
    if (!resolved || !resolved.value) return null
    const response = await fetch('https://api.deepseek.com/user/balance', {
      headers: { authorization: `Bearer ${resolved.value}`, accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`balance HTTP ${response.status}`)
    const body = await response.json()
    const infos = Array.isArray(body && body.balance_infos) ? body.balance_infos : []
    if (!infos.length) return null
    return {
      wallets: infos.map((info) => ({
        currency: info.currency,
        balance: String(info.total_balance),
        granted: info.granted_balance == null ? null : String(info.granted_balance),
        toppedUp: info.topped_up_balance == null ? null : String(info.topped_up_balance),
      })),
      bonusWallets: [],
      source: 'api-key',
    }
  }

  ctx.effect(() => {
    const timer = setInterval(() => {
      if (Date.now() - store.balance.at >= Math.max(10000, cfg.balanceTtlMs)) {
        refreshBalance().catch(() => {})
      }
    }, 15000)
    return () => clearInterval(timer)
  })
  refreshBalance().catch(() => {})

  // ---------------------------------------------------------------- snapshots

  let cached = { at: 0, sessionId: '', body: null }

  function snapshot(sessionId) {
    const now = Date.now()
    const tariff = tariffAt(now, holidays)
    const session = sessionId ? store.sessions.get(sessionId) : undefined
    const todayKey = bjDayKey(now)
    const week = emptyAgg()
    const days = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const key = bjDayKey(now - offset * 86400000)
      const bucketAgg = store.days.get(key)
      if (bucketAgg) addInto(week, bucketAgg)
      days.push({
        date: key,
        cny: bucketAgg ? bucketAgg.cny : 0,
        usd: bucketAgg ? bucketAgg.usd : 0,
        calls: bucketAgg ? bucketAgg.calls : 0,
      })
    }
    const modelsToday = []
    for (const [model, agg] of store.models) {
      if (!agg.calls) continue
      modelsToday.push({ model, cny: agg.cny, usd: agg.usd, calls: agg.calls })
    }
    modelsToday.sort((a, b) => b.cny - a.cny)

    return {
      ok: true,
      now,
      currency: cfg.currency === 'USD' ? 'USD' : 'CNY',
      sessionId: sessionId || null,
      tariff: {
        phase: tariff.phase,
        nextAt: tariff.nextAt,
        nextPhase: tariff.nextPhase,
      },
      pricing: {
        source: PRICING_SOURCE,
        peakMultiplier: PEAK_MULTIPLIER,
        models: priceModels,
        aliases: MODEL_ALIASES,
        holidays: [...holidays],
      },
      balance: {
        at: store.balance.at,
        wallets: store.balance.wallets,
        bonusWallets: store.balance.bonusWallets,
        links: store.balance.links,
        error: store.balance.error,
        source: store.balance.source,
        busy: store.balance.busy,
      },
      totals: {
        all: cloneAgg(store.totals),
        today: cloneAgg(store.days.get(todayKey) || emptyAgg()),
        week: cloneAgg(week),
        unpriced: { ...store.unpriced },
      },
      models: modelsToday,
      days,
      session: session
        ? {
            ...cloneAgg(session),
            model: session.model || null,
            provider: session.provider || null,
            lastAt: session.lastAt || null,
            recent: session.recent.slice(0, MAX_RECENT).map(cloneEntry),
          }
        : null,
      currentModel: session?.model || store.lastModel || null,
      backfill: { ...store.backfill },
    }
  }

  // -------------------------------------------------------------------- route

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: STATE_PATH,
      handler(req, res) {
        if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        let sessionId = ''
        try {
          const url = new URL(req.url || STATE_PATH, 'http://127.0.0.1')
          sessionId = url.searchParams.get('session') || ''
        } catch {
          /* a malformed URL simply yields the global snapshot */
        }
        const now = Date.now()
        if (cached.body && cached.sessionId === sessionId && now - cached.at < SNAPSHOT_TTL_MS) {
          sendJson(res, cached.body, req.method)
          return
        }
        let body
        try {
          body = JSON.stringify(snapshot(sessionId))
          cached = { at: now, sessionId, body }
        } catch (error) {
          body = JSON.stringify({ ok: false, error: message(error) })
        }
        sendJson(res, body, req.method)
      },
    }),
  )
}

// --------------------------------------------------------------------- utils

function emptyAgg() {
  return { cny: 0, usd: 0, calls: 0, hit: 0, miss: 0, out: 0, recent: [] }
}

function bucket(map, key) {
  let value = map.get(key)
  if (!value) {
    value = emptyAgg()
    map.set(key, value)
  }
  return value
}

function accumulate(agg, entry) {
  agg.cny += entry.cny
  agg.usd += entry.usd
  agg.calls += 1
  agg.hit += entry.hit
  agg.miss += entry.miss
  agg.out += entry.out
}

function addInto(target, source) {
  target.cny += source.cny
  target.usd += source.usd
  target.calls += source.calls
  target.hit += source.hit
  target.miss += source.miss
  target.out += source.out
}

function cloneAgg(agg) {
  return {
    cny: agg.cny,
    usd: agg.usd,
    calls: agg.calls,
    hit: agg.hit,
    miss: agg.miss,
    out: agg.out,
  }
}

function cloneEntry(entry) {
  return {
    at: entry.at,
    model: entry.model,
    phase: entry.phase,
    hit: entry.hit,
    miss: entry.miss,
    out: entry.out,
    cny: entry.cny,
    usd: entry.usd,
  }
}

function sendJson(res, body, method) {
  const bytes = Buffer.byteLength(body)
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': bytes,
  })
  if (method === 'HEAD') res.end()
  else res.end(body)
}

function message(error) {
  if (!error) return 'unknown error'
  if (typeof error === 'string') return error
  return String(error.message || error)
}
