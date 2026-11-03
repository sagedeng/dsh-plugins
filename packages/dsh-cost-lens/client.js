/**
 * DeepSeek Cost Lens — browser half.
 *
 * One ambient line under the composer: account balance, live session spend,
 * today's spend and the current peak / off-peak tariff with a countdown.
 * Clicking it expands the detail panel (usage breakdown, official unit prices,
 * seven-day trend). Everything comes from the Host snapshot route; the Client
 * only formats and renders.
 */
window.__ModuleLoader__.load({
  id: 'dsh-cost-lens',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback } = React

    const NS = 'costLens'
    const ROUTE = '/dsh-cost-lens/state.json'
    const POLL_MS = 2500
    const SYMBOL = { CNY: '¥', USD: '$' }

    const zh = {
      balance: '余额',
      session: '本会话',
      today: '今日',
      weekShort: '近7日',
      peak: '高峰',
      off: '空闲',
      toPeak: '距高峰 {d}',
      toOff: '距空闲 {d}',
      openHint: 'DeepSeek 余额 · 用量 · 峰谷单价（点击展开）',
      panelTitle: 'DeepSeek 费用概览',
      unavailable: '费用监控不可用',
      retry: '点击重试',
      noData: '暂无记录',
      loading: '加载中…',
      sectionTariff: '计费时段',
      rule: '高峰：北京时间周一至周五 09:00–12:00、14:00–18:00（法定节假日除外）；其余时段半价。',
      sectionSession: '本会话',
      sectionTotals: '今日 / 近 7 日',
      sectionPrices: '当前模型单价',
      sectionModels: '按模型（累计）',
      cacheHit: '缓存命中',
      cacheMiss: '缓存未命中',
      output: '输出',
      input: '输入',
      hitRate: '缓存命中率',
      calls: '次',
      recent: '最近调用',
      topUp: '充值',
      usagePage: '官方用量',
      bonus: '赠送',
      wallet: '充值余额',
      refreshed: '更新于 {time}',
      unit: '元 / 百万 tokens',
      unitUsd: '美元 / 百万 tokens',
      source: '数据来源：DeepSeek 官方价格页（{date} 复核）',
      disclaimer: '花费按官方单价对会话日志中的真实用量估算，仅供参考，不等于官方账单。',
      unpriced: '{n} 次调用未收录单价，未计入金额',
      backfillRunning: '正在汇总历史会话…',
      extraCharges: '网页搜索 / 抓取调用单独按次计费，未计入上方金额。',
      allShort: '累计',
      skipped: '仅统计近期的 {n} 个会话，更早的 {skipped} 个已跳过',
      unknownModel: '未识别的模型',
      now: '当前',
    }

    const en = {
      balance: 'Balance',
      session: 'Session',
      today: 'Today',
      weekShort: '7 days',
      peak: 'Peak',
      off: 'Off-peak',
      toPeak: '{d} to peak',
      toOff: '{d} to off-peak',
      openHint: 'DeepSeek balance, usage and peak/off-peak prices (click to expand)',
      panelTitle: 'DeepSeek cost overview',
      unavailable: 'Cost monitor unavailable',
      retry: 'click to retry',
      noData: 'No records yet',
      loading: 'Loading…',
      sectionTariff: 'Tariff',
      rule: 'Peak: Mon–Fri 09:00–12:00 and 14:00–18:00 Beijing time (Chinese public holidays excluded); all other hours are half price.',
      sectionSession: 'This session',
      sectionTotals: 'Today / last 7 days',
      sectionPrices: 'Current model unit price',
      sectionModels: 'By model (total)',
      cacheHit: 'Cache hit',
      cacheMiss: 'Cache miss',
      output: 'Output',
      input: 'Input',
      hitRate: 'Cache hit rate',
      calls: 'calls',
      recent: 'Recent calls',
      topUp: 'Top up',
      usagePage: 'Official usage',
      bonus: 'Granted',
      wallet: 'Topped up',
      refreshed: 'updated {time}',
      unit: 'CNY / 1M tokens',
      unitUsd: 'USD / 1M tokens',
      source: 'Source: official DeepSeek price page (checked {date})',
      disclaimer: 'Spend is estimated from the real usage in session logs at official unit prices. Reference only — not your official bill.',
      unpriced: '{n} calls had no listed price and are excluded from amounts',
      backfillRunning: 'Aggregating past sessions…',
      extraCharges: 'Search and Fetch calls are billed per request and are not part of the amounts above.',
      allShort: 'Total',
      skipped: '{skipped} older sessions were skipped; {n} were aggregated',
      unknownModel: 'Unrecognized model',
      now: 'now',
    }

    const CSS = `
.dscl-wrap { display: flex; justify-content: center; width: 100%; }
.dscl-bar {
  display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
  justify-content: center; max-width: 100%;
  padding: 1px 8px; margin: 0; border: 0; border-radius: 999px;
  background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11px; line-height: 16px;
  font-variant-numeric: tabular-nums; cursor: pointer;
}
.dscl-bar:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dscl-bar:focus-visible { outline: 1px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dscl-item { white-space: nowrap; }
.dscl-sep { opacity: .45; }
.dscl-amount { color: var(--dsw-alias-label-primary); font-weight: 500; }
.dscl-chip { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.dscl-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.dscl-dot-off { background: var(--dsw-alias-state-success-primary); }
.dscl-dot-peak { background: var(--dsw-alias-state-warn-primary); }
.dscl-warn { color: var(--dsw-alias-state-warn-primary); }
.dscl-muted { color: var(--dsw-alias-label-secondary); }
.dscl-panel {
  position: fixed; z-index: 60; width: 348px; max-width: calc(100vw - 24px);
  max-height: min(70vh, 560px); overflow-y: auto; box-sizing: border-box;
  padding: 12px 14px; border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  border: 1px solid var(--dsw-alias-border-l1);
  box-shadow: 0 12px 32px rgba(0, 0, 0, .16);
  color: var(--dsw-alias-label-primary);
  font-size: 12px; line-height: 18px; text-align: left;
  font-variant-numeric: tabular-nums;
}
.dscl-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.dscl-title { font-size: 12px; font-weight: 600; }
.dscl-section { padding-top: 10px; margin-top: 10px; border-top: 1px solid var(--dsw-alias-border-l1); }
.dscl-section:first-of-type { padding-top: 0; margin-top: 0; border-top: 0; }
.dscl-label { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-bottom: 4px; }
.dscl-big { font-size: 18px; font-weight: 600; letter-spacing: -.2px; }
.dscl-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.dscl-grid { display: grid; grid-template-columns: 1fr auto auto; gap: 2px 10px; align-items: baseline; }
.dscl-grid-head { font-size: 10px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: .04em; }
.dscl-num { text-align: right; white-space: nowrap; }
.dscl-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 0 6px; border-radius: 999px; font-size: 10px; line-height: 16px;
  border: 1px solid var(--dsw-alias-border-l1);
}
.dscl-link {
  color: var(--dsw-alias-brand-primary); text-decoration: none;
  font-size: 11px; cursor: pointer; background: none; border: 0; padding: 0; font-family: inherit;
}
.dscl-link:hover { text-decoration: underline; }
.dscl-bars { display: flex; align-items: flex-end; gap: 4px; height: 34px; margin-top: 6px; }
.dscl-bar-col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 2px; height: 100%; }
.dscl-bar-fill { width: 100%; border-radius: 2px 2px 0 0; background: var(--dsw-alias-brand-primary); opacity: .75; min-height: 1px; }
.dscl-bar-label { font-size: 9px; color: var(--dsw-alias-label-secondary); }
.dscl-foot { margin-top: 8px; font-size: 10px; line-height: 15px; color: var(--dsw-alias-label-secondary); }
.dscl-recent { font-size: 11px; color: var(--dsw-alias-label-secondary); }
`

    function fmtMoney(value, currency) {
      const n = Number(value) || 0
      const symbol = SYMBOL[currency] || ''
      const abs = Math.abs(n)
      if (abs === 0) return symbol + '0'
      if (abs < 0.0001) return symbol + '<0.0001'
      if (abs < 1) return symbol + n.toFixed(4)
      if (abs < 10000) return symbol + n.toFixed(2)
      return symbol + n.toFixed(0)
    }

    function fmtTokens(value) {
      const n = Math.max(0, Number(value) || 0)
      if (n < 1000) return String(Math.round(n))
      if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + 'k'
      return (n / 1e6).toFixed(2) + 'M'
    }

    function fmtDuration(ms) {
      const total = Math.max(0, Math.round(ms / 1000))
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const seconds = total % 60
      if (hours > 0) return hours + 'h' + String(minutes).padStart(2, '0') + 'm'
      if (minutes > 0) return minutes + 'm' + String(seconds).padStart(2, '0') + 's'
      return seconds + 's'
    }

    function fmtClock(ms) {
      if (!ms) return '—'
      const d = new Date(ms)
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
    }

    function fill(text, vars) {
      if (!vars) return text
      return text.replace(/\{(\w+)\}/g, (match, key) => (vars[key] == null ? match : String(vars[key])))
    }

    function CostLens(props) {
      const sessionId = props.sessionId ? String(props.sessionId) : ''
      const ctx = props.__ctx
      const t = props.__t
      const [snapshot, setSnapshot] = useState(null)
      const [fetchedAt, setFetchedAt] = useState(0)
      const [error, setError] = useState(null)
      const [open, setOpen] = useState(false)
      const [position, setPosition] = useState(null)
      const [tick, setTick] = useState(0)
      const [reloadKey, setReloadKey] = useState(0)
      const rootRef = useRef(null)
      const buttonRef = useRef(null)

      // Locale switches re-render plugin copy without a reload.
      useEffect(() => {
        if (!ctx || !ctx.locale || typeof ctx.locale.subscribe !== 'function') return undefined
        return ctx.locale.subscribe(() => setTick((value) => value + 1))
      }, [ctx])

      // Poll the Host snapshot route.
      useEffect(() => {
        let alive = true
        let timer = 0
        const load = async () => {
          try {
            const url = ROUTE + (sessionId ? '?session=' + encodeURIComponent(sessionId) : '')
            const response = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } })
            if (!response.ok) throw new Error('HTTP ' + response.status)
            const json = await response.json()
            if (!alive) return
            if (json && json.ok === false) {
              setError(json.error || t('unavailable'))
              return
            }
            setSnapshot(json)
            setFetchedAt(Date.now())
            setError(null)
          } catch (cause) {
            if (alive) setError(String((cause && cause.message) || cause))
          }
        }
        load()
        timer = setInterval(load, POLL_MS)
        return () => {
          alive = false
          clearInterval(timer)
        }
      }, [sessionId, reloadKey])

      // One-second tick drives the tariff countdown.
      useEffect(() => {
        const timer = setInterval(() => setTick((value) => value + 1), 1000)
        return () => clearInterval(timer)
      }, [])

      // Keep the fixed-position panel anchored above the bar.
      useEffect(() => {
        if (!open) {
          setPosition(null)
          return undefined
        }
        const place = () => {
          const node = buttonRef.current
          if (!node) return
          const rect = node.getBoundingClientRect()
          const width = Math.min(348, window.innerWidth - 24)
          const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8)
          const bottom = Math.max(8, window.innerHeight - rect.top + 8)
          const maxHeight = Math.max(180, Math.min(Math.round(window.innerHeight * 0.7), Math.round(rect.top - 16)))
          setPosition({ left, bottom, width, maxHeight })
        }
        place()
        window.addEventListener('resize', place)
        return () => window.removeEventListener('resize', place)
      }, [open, snapshot, error])

      // Dismiss on outside click or Escape.
      useEffect(() => {
        if (!open) return undefined
        const onPointer = (event) => {
          if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
        }
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onPointer, true)
        document.addEventListener('keydown', onKey)
        return () => {
          document.removeEventListener('mousedown', onPointer, true)
          document.removeEventListener('keydown', onKey)
        }
      }, [open])

      const onToggle = useCallback(() => {
        setOpen((value) => !value)
        if (error) setReloadKey((value) => value + 1)
      }, [error])

      const currency = (snapshot && snapshot.currency) || 'CNY'
      const serverNow = snapshot ? snapshot.now + (fetchedAt ? Date.now() - fetchedAt : 0) : Date.now()
      const money = (value) => fmtMoney(value, currency)

      // ---- compact bar -----------------------------------------------------
      let bar
      if (!snapshot) {
        bar = h(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            className: 'dscl-bar',
            onClick: onToggle,
            title: error ? error : t('loading'),
          },
          h('span', { className: 'dscl-muted' }, error ? t('unavailable') + ' · ' + t('retry') : t('loading')),
        )
      } else {
        const tariff = snapshot.tariff
        const isPeak = tariff.phase === 'peak'
        const remaining = Math.max(0, tariff.nextAt - serverNow)
        const wallet = primaryWallet(snapshot.balance.wallets)
        bar = h(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            className: 'dscl-bar',
            onClick: onToggle,
            'aria-expanded': open,
            'aria-haspopup': 'dialog',
            title: t('openHint'),
          },
          wallet
            ? h(
                'span',
                { className: 'dscl-item dscl-chip' },
                h('span', { className: 'dscl-muted' }, t('balance')),
                h('span', { className: 'dscl-amount' }, fmtMoney(wallet.balance, wallet.currency || currency)),
              )
            : null,
          wallet ? h('span', { className: 'dscl-sep' }, '·') : null,
          h(
            'span',
            { className: 'dscl-item dscl-chip' },
            h('span', { className: 'dscl-muted' }, t('session')),
            h('span', { className: 'dscl-amount' }, money(snapshot.session ? snapshot.session.cny : 0)),
          ),
          h('span', { className: 'dscl-sep' }, '·'),
          h(
            'span',
            { className: 'dscl-item dscl-chip' },
            h('span', { className: 'dscl-muted' }, t('today')),
            h('span', { className: 'dscl-amount' }, money(snapshot.totals.today.cny)),
          ),
          h('span', { className: 'dscl-sep' }, '·'),
          h(
            'span',
            { className: 'dscl-item dscl-chip' + (isPeak ? ' dscl-warn' : '') },
            h('span', { className: 'dscl-dot ' + (isPeak ? 'dscl-dot-peak' : 'dscl-dot-off') }),
            h('span', null, isPeak ? t('peak') : t('off')),
            h(
              'span',
              { className: 'dscl-muted' },
              '· ' + fill(isPeak ? t('toOff') : t('toPeak'), { d: fmtDuration(remaining) }),
            ),
          ),
        )
      }

      return h(
        React.Fragment,
        null,
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h(
          'div',
          { className: 'dscl-wrap', ref: rootRef },
          bar,
          open && snapshot && position
            ? h(
                'div',
                {
                  className: 'dscl-panel',
                  role: 'dialog',
                  'aria-label': t('panelTitle'),
                  style: {
                    left: position.left + 'px',
                    bottom: position.bottom + 'px',
                    width: position.width + 'px',
                    maxHeight: position.maxHeight + 'px',
                  },
                },
                panel(snapshot, { t, money, currency, serverNow }),
              )
            : null,
        ),
      )
    }

    // Visual details are pure functions of the snapshot.
    function panel(snapshot, view) {
      const { t, money, currency } = view
      const { balance, totals, tariff, pricing } = snapshot
      const isPeak = tariff.phase === 'peak'
      const remaining = Math.max(0, tariff.nextAt - view.serverNow)
      const session = snapshot.session
      const models = pricing.models || {}
      const alias = (pricing.aliases || {})[snapshot.currentModel] || snapshot.currentModel
      const price = alias ? models[alias] : null
      const priceLabel = price ? price.label : null
      const maxDay = Math.max(...snapshot.days.map((day) => day.cny), 0)

      return [
        h(
          'div',
          { className: 'dscl-head', key: 'head' },
          h('span', { className: 'dscl-title' }, t('panelTitle')),
          balance.at
            ? h('span', { className: 'dscl-muted', style: { fontSize: '10px' } }, fill(t('refreshed'), { time: fmtClock(balance.at) }))
            : null,
        ),

        // ---------------------------------------------------------- balance
        h(
          'div',
          { className: 'dscl-section', key: 'balance' },
          h('div', { className: 'dscl-row' }, [
            h(
              'div',
              { key: 'wallets' },
              balanceLines(balance, currency, t).map((line) =>
                line.text
                  ? h('div', { key: line.key, className: 'dscl-muted', style: { fontSize: '11px' } }, line.text)
                  : h(
                      'div',
                      {
                        key: line.key,
                        className: line.primary ? '' : 'dscl-muted',
                        style: line.primary ? {} : { fontSize: '11px' },
                      },
                      h('span', { className: line.primary ? 'dscl-big' : '' }, fmtMoney(line.balance, line.currency)),
                      line.label ? ' ' : null,
                      line.label
                        ? h('span', { className: 'dscl-muted', style: { fontSize: '11px' } }, line.label)
                        : null,
                    ),
              ),
            ),
            h(
              'div',
              { key: 'links', style: { display: 'flex', gap: '8px', alignItems: 'center' } },
              balance.links && balance.links.topUpUrl
                ? h(
                    'a',
                    { className: 'dscl-link', href: balance.links.topUpUrl, target: '_blank', rel: 'noreferrer' },
                    t('topUp'),
                  )
                : null,
              balance.links && balance.links.usageUrl
                ? h(
                    'a',
                    { className: 'dscl-link', href: balance.links.usageUrl, target: '_blank', rel: 'noreferrer' },
                    t('usagePage'),
                  )
                : null,
            ),
          ]),
          balance.error
            ? h('div', { className: 'dscl-muted', style: { fontSize: '10px', marginTop: '2px' } }, balance.error)
            : null,
        ),

        // ----------------------------------------------------------- tariff
        h(
          'div',
          { className: 'dscl-section', key: 'tariff' },
          h(
            'div',
            { className: 'dscl-row' },
            h(
              'span',
              { className: 'dscl-badge' + (isPeak ? ' dscl-warn' : '') },
              h('span', { className: 'dscl-dot ' + (isPeak ? 'dscl-dot-peak' : 'dscl-dot-off') }),
              isPeak ? t('peak') : t('off'),
            ),
            h(
              'span',
              { className: 'dscl-muted' },
              fill(isPeak ? t('toOff') : t('toPeak'), { d: fmtDuration(remaining) }) +
                ' · ' +
                new Date(tariff.nextAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ),
          ),
          h('div', { className: 'dscl-foot' }, t('rule')),
        ),

        // ---------------------------------------------------------- session
        h(
          'div',
          { className: 'dscl-section', key: 'session' },
          h('div', { className: 'dscl-label' }, t('sectionSession')),
          session && session.calls
            ? h(
                React.Fragment,
                null,
                h(
                  'div',
                  { className: 'dscl-row' },
                  h('span', { className: 'dscl-big' }, money(session.cny)),
                  h('span', { className: 'dscl-muted' }, session.calls + ' ' + t('calls')),
                ),
                h(
                  'div',
                  { className: 'dscl-muted', style: { fontSize: '11px' } },
                  t('cacheMiss') + ' ' + fmtTokens(session.miss) + ' · ' +
                    t('cacheHit') + ' ' + fmtTokens(session.hit) + ' · ' +
                    t('output') + ' ' + fmtTokens(session.out),
                ),
                h(
                  'div',
                  { className: 'dscl-muted', style: { fontSize: '11px' } },
                  t('hitRate') + ' ' + hitRate(session),
                ),
                session.recent && session.recent.length
                  ? h(
                      'div',
                      { className: 'dscl-recent', style: { marginTop: '6px' } },
                      session.recent.slice(0, 3).map((entry) =>
                        h(
                          'div',
                          { key: String(entry.at), className: 'dscl-row' },
                          h(
                            'span',
                            null,
                            fmtClock(entry.at) + ' · ' + entry.model + ' · ' + (entry.phase === 'peak' ? t('peak') : t('off')),
                          ),
                          h('span', { className: 'dscl-num' }, money(entry.cny)),
                        ),
                      ),
                    )
                  : null,
              )
            : h('div', { className: 'dscl-muted' }, t('noData')),
        ),

        // ----------------------------------------------------------- totals
        h(
          'div',
          { className: 'dscl-section', key: 'totals' },
          h('div', { className: 'dscl-label' }, t('sectionTotals')),
          h(
            'div',
            { className: 'dscl-row' },
            h('span', null, t('today') + ' ' + money(totals.today.cny)),
            h('span', { className: 'dscl-muted' }, totals.today.calls + ' ' + t('calls')),
          ),
          h(
            'div',
            { className: 'dscl-muted', style: { fontSize: '11px' } },
            t('cacheMiss') + ' ' + fmtTokens(totals.today.miss) + ' · ' +
              t('cacheHit') + ' ' + fmtTokens(totals.today.hit) + ' · ' +
              t('output') + ' ' + fmtTokens(totals.today.out),
          ),
          h(
            'div',
            { className: 'dscl-row', style: { marginTop: '2px' } },
            h('span', null, t('weekShort') + ' ' + money(totals.week.cny)),
            h('span', { className: 'dscl-muted' }, t('allShort') + ' ' + money(totals.all.cny)),
          ),
          h(
            'div',
            { className: 'dscl-bars' },
            snapshot.days.map((day) =>
              h(
                'div',
                { key: day.date, className: 'dscl-bar-col', title: day.date + ' · ' + money(day.cny) },
                h('div', {
                  className: 'dscl-bar-fill',
                  style: { height: maxDay > 0 ? Math.max(2, Math.round((day.cny / maxDay) * 26)) + 'px' : '2px' },
                }),
                h('span', { className: 'dscl-bar-label' }, day.date.slice(5)),
              ),
            ),
          ),
          totals.unpriced && totals.unpriced.calls
            ? h('div', { className: 'dscl-foot' }, fill(t('unpriced'), { n: totals.unpriced.calls }))
            : null,
          h('div', { className: 'dscl-foot' }, t('extraCharges')),
          snapshot.backfill && snapshot.backfill.skipped
            ? h(
                'div',
                { className: 'dscl-foot' },
                fill(t('skipped'), { n: snapshot.backfill.sessions, skipped: snapshot.backfill.skipped }),
              )
            : null,
        ),

        // ----------------------------------------------------------- prices
        h(
          'div',
          { className: 'dscl-section', key: 'prices' },
          h(
            'div',
            { className: 'dscl-label' },
            t('sectionPrices') + ' · ' + (priceLabel || snapshot.currentModel || t('unknownModel')),
          ),
          price
            ? h(
                'div',
                { className: 'dscl-grid' },
                h('span', { className: 'dscl-grid-head' }, ''),
                h('span', { className: 'dscl-grid-head dscl-num' }, t('off')),
                h('span', { className: 'dscl-grid-head dscl-num' }, t('peak')),
                ...[
                  [t('cacheHit'), price[currency === 'USD' ? 'usd' : 'cny'].hit],
                  [t('cacheMiss'), price[currency === 'USD' ? 'usd' : 'cny'].miss],
                  [t('output'), price[currency === 'USD' ? 'usd' : 'cny'].out],
                ].flatMap(([label, rate]) => [
                  h('span', { key: label + '-l' }, label),
                  h('span', { key: label + '-o', className: 'dscl-num' }, String(rate)),
                  h('span', { key: label + '-p', className: 'dscl-num' }, String(rate * (pricing.peakMultiplier || 2))),
                ]),
              )
            : h('div', { className: 'dscl-muted' }, t('noData')),
          h('div', { className: 'dscl-foot' }, currency === 'USD' ? t('unitUsd') : t('unit')),
          h(
            'div',
            { className: 'dscl-foot' },
            h(
              'a',
              {
                className: 'dscl-link',
                href: pricing.source && pricing.source.url ? pricing.source.url : 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
                target: '_blank',
                rel: 'noreferrer',
              },
              fill(t('source'), { date: (pricing.source && pricing.source.checkedAt) || '—' }),
            ),
          ),
        ),

        // ------------------------------------------------------------ models
        snapshot.models && snapshot.models.length > 1
          ? h(
              'div',
              { className: 'dscl-section', key: 'models' },
              h('div', { className: 'dscl-label' }, t('sectionModels')),
              snapshot.models.map((row) =>
                h(
                  'div',
                  { key: row.model, className: 'dscl-row' },
                  h('span', null, row.model),
                  h('span', { className: 'dscl-num' }, money(row.cny) + ' · ' + row.calls),
                ),
              ),
            )
          : null,

        snapshot.backfill && snapshot.backfill.state === 'running'
          ? h('div', { className: 'dscl-foot', key: 'backfill' }, t('backfillRunning'))
          : null,

        h('div', { className: 'dscl-foot', key: 'disclaimer' }, t('disclaimer')),
      ]
    }

    function primaryWallet(wallets) {
      if (!Array.isArray(wallets) || !wallets.length) return null
      const cny = wallets.find((wallet) => wallet.currency === 'CNY')
      return cny || wallets[0]
    }

    function balanceLines(balance, currency, t) {
      const wallets = Array.isArray(balance.wallets) ? balance.wallets : []
      if (!wallets.length) return [{ key: 'none', text: t('noData') }]
      const lines = []
      const main = primaryWallet(wallets)
      const split = [
        main.toppedUp != null ? t('wallet') + ' ' + fmtMoney(main.toppedUp, main.currency || currency) : null,
        main.granted != null ? t('bonus') + ' ' + fmtMoney(main.granted, main.currency || currency) : null,
      ].filter(Boolean)
      lines.push({
        key: 'main',
        primary: true,
        balance: main.balance,
        currency: main.currency || currency,
        label: split.join(' · '),
      })
      for (const wallet of wallets) {
        if (wallet === main) continue
        lines.push({
          key: 'w-' + wallet.currency,
          primary: false,
          balance: wallet.balance,
          currency: wallet.currency,
          label: wallet.currency,
        })
      }
      for (const bonus of Array.isArray(balance.bonusWallets) ? balance.bonusWallets : []) {
        lines.push({
          key: 'b-' + bonus.currency,
          primary: false,
          balance: bonus.balance,
          currency: bonus.currency,
          label: t('bonus'),
        })
      }
      return lines
    }

    function hitRate(agg) {
      const total = (agg.hit || 0) + (agg.miss || 0)
      if (!total) return '—'
      return ((agg.hit / total) * 100).toFixed(1) + '%'
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'cost-lens: dictionaries')
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            { name: 'conversation.composer.dock', id: 'cost-lens', order: 2 },
            (props) => h(CostLens, { ...props, __ctx: ctx, __t: t }),
          ),
        )
      },
    }
  },
})
