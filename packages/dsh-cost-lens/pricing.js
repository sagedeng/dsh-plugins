/**
 * DeepSeek official API pricing + the peak / off-peak (峰谷) schedule.
 *
 * Source of truth (checked 2026-11-03):
 *   https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
 *   https://api-docs.deepseek.com/quick_start/pricing/
 *
 * Rule: peak hours are Beijing time Monday-Friday 09:00-12:00 and 14:00-18:00
 * (UTC 01:00-04:00 and 06:00-10:00), excluding Chinese public holidays.
 * Every other hour — weekends and holidays in full — is off-peak, and
 * off-peak prices are exactly half of the peak prices.
 *
 * Prices below are the OFF-PEAK unit prices per 1,000,000 tokens.
 */

export const PRICING_SOURCE = {
  url: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
  urlEn: 'https://api-docs.deepseek.com/quick_start/pricing/',
  checkedAt: '2026-11-03',
  catalog: 'DeepSeek-V4.1-Flash-1017 / DeepSeek-V4-Pro-0813',
}

/** Peak price = off-peak price x this factor (official rule). */
export const PEAK_MULTIPLIER = 2

/** Off-peak unit prices per 1M tokens. */
export const PRICING_MODELS = {
  'deepseek-flash': {
    label: 'deepseek-flash',
    cny: { hit: 0.02, miss: 1, out: 4 },
    usd: { hit: 0.003, miss: 0.15, out: 0.6 },
  },
  'deepseek-v4-pro': {
    label: 'deepseek-v4-pro',
    cny: { hit: 0.15, miss: 4.5, out: 13.5 },
    usd: { hit: 0.022, miss: 0.66, out: 1.98 },
  },
}

/**
 * Retired model ids the official docs still accept and bill at the Flash price.
 * https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ footnote (1).
 */
export const MODEL_ALIASES = {
  'deepseek-v4-flash': 'deepseek-flash',
  'deepseek-v4-flash-vision-exp': 'deepseek-flash',
}

/**
 * 2026 Chinese public holidays (the days off), from
 * 国办发明电〔2025〕7号: https://www.gov.cn/zhengce/content/202511/content_7047090.htm
 * Only weekday holidays change the tariff; 调休 working weekends stay off-peak
 * because the official rule pegs peak hours to Monday-Friday.
 */
export const HOLIDAYS_DEFAULT = [
  ...dateRange('2026-01-01', '2026-01-03'), // 元旦
  ...dateRange('2026-02-15', '2026-02-23'), // 春节
  ...dateRange('2026-04-04', '2026-04-06'), // 清明节
  ...dateRange('2026-05-01', '2026-05-05'), // 劳动节
  ...dateRange('2026-06-19', '2026-06-21'), // 端午节
  ...dateRange('2026-09-25', '2026-09-27'), // 中秋节
  ...dateRange('2026-10-01', '2026-10-07'), // 国庆节
]

/** Inclusive UTC date range as `YYYY-MM-DD` keys. */
function dateRange(from, to) {
  const out = []
  const day = 86400000
  let cursor = Date.parse(from + 'T00:00:00Z')
  const end = Date.parse(to + 'T00:00:00Z')
  while (cursor <= end) {
    out.push(new Date(cursor).toISOString().slice(0, 10))
    cursor += day
  }
  return out
}

/** `YYYY-MM-DD` of one instant as seen in Beijing (UTC+8). */
export function bjDayKey(ms) {
  return new Date(ms + 8 * 3600000).toISOString().slice(0, 10)
}

function utcDayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * The peak windows map to 01:00-04:00 and 06:00-10:00 UTC, and Beijing is UTC+8,
 * so the UTC calendar date equals the Beijing calendar date across both windows.
 * Holiday lookups therefore use the UTC date.
 */
export function isPeakInstant(ms, holidays) {
  const d = new Date(ms)
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return false
  const minute = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60
  const inWindow = (minute >= 60 && minute < 240) || (minute >= 360 && minute < 600)
  if (!inWindow) return false
  return !holidays.has(utcDayKey(ms))
}

/**
 * Current tariff plus the instant it flips.
 * @returns {{ phase: 'peak'|'off', nextAt: number, nextPhase: 'peak'|'off' }}
 */
export function tariffAt(ms, holidays) {
  if (isPeakInstant(ms, holidays)) {
    const d = new Date(ms)
    const minute = d.getUTCHours() * 60 + d.getUTCMinutes()
    const endMinute = minute < 240 ? 240 : 600
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    return { phase: 'peak', nextAt: dayStart + endMinute * 60000, nextPhase: 'off' }
  }
  const day = 86400000
  const d = new Date(ms)
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  for (let offset = 0; offset < 21; offset += 1) {
    const startOfDay = today + offset * day
    const probe = new Date(startOfDay + 12 * 3600000)
    const dow = probe.getUTCDay()
    if (dow === 0 || dow === 6) continue
    if (holidays.has(utcDayKey(startOfDay + 12 * 3600000))) continue
    for (const startMinute of [60, 360]) {
      const at = startOfDay + startMinute * 60000
      if (at > ms) return { phase: 'off', nextAt: at, nextPhase: 'peak' }
    }
  }
  return { phase: 'off', nextAt: ms + day, nextPhase: 'peak' }
}

/** Merge user overrides (same shape as PRICING_MODELS) over the official table. */
export function buildPriceTable(overrides) {
  const models = {}
  for (const [id, row] of Object.entries(PRICING_MODELS)) {
    models[id] = {
      label: row.label,
      cny: { ...row.cny },
      usd: { ...row.usd },
    }
  }
  if (overrides && typeof overrides === 'object') {
    for (const [id, row] of Object.entries(overrides)) {
      if (!row || typeof row !== 'object') continue
      const target = models[id] || { label: id, cny: { hit: 0, miss: 0, out: 0 }, usd: { hit: 0, miss: 0, out: 0 } }
      models[id] = {
        label: target.label,
        cny: { ...target.cny, ...(row.cny || {}) },
        usd: { ...target.usd, ...(row.usd || {}) },
      }
    }
  }
  return models
}

/** Resolve one model id to its price row, following the retired-id aliases. */
export function resolvePrice(models, model) {
  if (!model) return null
  const id = MODEL_ALIASES[model] || model
  const row = models[id]
  if (!row) return null
  return { id, ...row }
}

/**
 * Price one call's usage. DSH reports `inputTokens` as the cache-miss portion,
 * `cacheReadTokens` as the cache-hit portion and `outputTokens` as the billed
 * output (reasoning included) — see `assistant/message.data.usage`.
 */
export function pricedUsage(price, usage, phase) {
  const hit = Math.max(0, Number(usage && usage.cacheReadTokens) || 0)
  const miss = Math.max(0, Number(usage && usage.inputTokens) || 0)
  const out = Math.max(0, Number(usage && usage.outputTokens) || 0)
  const factor = phase === 'peak' ? PEAK_MULTIPLIER : 1
  const cny = (miss * price.cny.miss + hit * price.cny.hit + out * price.cny.out) * factor / 1e6
  const usd = (miss * price.usd.miss + hit * price.usd.hit + out * price.usd.out) * factor / 1e6
  return { hit, miss, out, phase, cny, usd }
}
