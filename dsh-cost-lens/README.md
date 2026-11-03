# DeepSeek Cost Lens

A DSH Web UI plugin that answers four questions in one line under the composer:

| | |
|---|---|
| **余额** | DeepSeek Platform wallet balance (recharge + granted) |
| **用量** | per-session and per-day tokens: cache hit / cache miss / output |
| **定价** | the official unit prices of the model in use, peak and off-peak side by side |
| **实时花费** | spend of the current session and of today, recomputed as each model call lands |

Click the line to open the detail panel: wallets, tariff countdown and rule, session breakdown,
seven-day trend, per-model totals, the official price table and its source.

## Data sources

| Value | Source |
|---|---|
| Balance | `ctx.deepseekAccount.getBalance()`; fallback `GET https://api.deepseek.com/user/balance` with the stored `DEEPSEEK_API_KEY` |
| Usage | `assistant/message` session events (`data.usage` is the billed `TokenUsage`) — the durable session log, not a private counter |
| Prices | the official price page, transcribed in `pricing.js` |
| Tariff | the official peak/off-peak schedule, evaluated against the instant of each call |

Because usage is derived from the session log, history is rebuilt on activation: "today" and the
seven-day trend are correct the first time the plugin paints, and nothing is stored twice.

## Peak / off-peak

Peak hours are Beijing time **Monday–Friday 09:00–12:00 and 14:00–18:00** (UTC 01:00–04:00 and
06:00–10:00), excluding Chinese public holidays. Every other hour — weekends and holidays in full —
is off-peak, priced at exactly half. The holiday list in `pricing.js` carries the 2026 State Council
schedule; extend `holidayDates` for later years.

## Price table (off-peak, per 1M tokens)

| Model | cache hit | cache miss | output |
|---|---|---|---|
| `deepseek-flash` | ¥0.02 / $0.003 | ¥1 / $0.15 | ¥4 / $0.6 |
| `deepseek-v4-pro` | ¥0.15 / $0.022 | ¥4.5 / $0.66 | ¥13.5 / $1.98 |

Peak = 2× the row above. Retired ids `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` bill at
the Flash row. Official source: <https://api-docs.deepseek.com/zh-cn/quick_start/pricing/>.

## Configuration

Optional overrides in the profile's `cordis.patch.yml`:

```yaml
- id: cost-lens
  name: '@local/dsh-cost-lens'
  config:
    currency: CNY          # cost display currency: CNY | USD
    balanceTtlMs: 60000    # balance poll interval
    historyDays: 14        # how far back the startup backfill reads session logs
    maxBackfillSessions: 60
    holidayDates: ['2027-01-01']   # extra off-peak holidays (YYYY-MM-DD, Beijing date)
    priceOverrides:        # off-peak unit prices per 1M tokens
      my-relay-model:
        cny: { hit: 0.02, miss: 1, out: 4 }
```

## Notes and limits

- Spend is **estimated**: official unit prices × the usage recorded in the session log. Search /
  Fetch calls and any platform-side adjustments are not part of it, so it is a close reference, not
  the official bill.
- The snapshot route `GET /dsh-cost-lens/state.json` is served by the loopback Web listener without
  an extra auth layer, like other decoration plugins; it exposes balance and usage to processes that
  can already reach that loopback port.
- Balance requires a signed-in DeepSeek account or a stored `DEEPSEEK_API_KEY`.
