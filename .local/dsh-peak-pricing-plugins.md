# DSH 插件：DeepSeek 空闲（错峰）价格状态 相关插件清单

> 数据来源：awesome-dsh-plugin.com/plugins.json（共 3631 个插件，筛出 59 个相关项）

> 官方规则（DeepSeek API 文档）：高峰 = 01:00–04:00 与 06:00–10:00 UTC，周一至周五；其余全为空闲。
> 即北京时间 周一至周五 09:00–12:00、14:00–18:00 为高峰，空闲价 = 高峰价 5 折。


## A. 空闲/高峰状态显示（含倒计时）—— 最贴合你的需求（28 个）

1. **dsh-bottom-info-bar#plugin** — ★35 · 下载 3165 · ui
   - Bottom info bar for the DSH Web UI: provider/model, live balance, peak/off-peak pricing with countdown, and real persisted per-session spend in a single line. | DSH 底部信息栏：一行显示服务商/模型、真实余额、高峰(琥珀)/空闲(绿)价与倒计时，以及本对话·今日·近一月·全部花费（真实落盘统计）。
   - 来源：https://github.com/songoao25/dsh-bottom-info-bar/tree/main/plugin
   - 安装：`dsh plugin --profile web add dsh-bottom-info-bar`

2. **dsh-balance-meter** — ★18 · 下载 — · usage
   - DeepSeek account balance and session cost in the composer dock, with auto-fetched official pricing and peak/off-peak support. | 输入框 dock 显示 DeepSeek 账户余额与会话花费，自动拉取官方定价，支持高峰/低谷计价。
   - 来源：https://github.com/Ghost011118/dsh-balance-meter
   - 安装：`dsh plugin --profile web add github:Ghost011118/dsh-balance-meter`

3. **dsh-meow-cachebilling** — ★17 · 下载 437 · usage
   - Per-round cache billing inside the composer context-meter popover: what the current call spends on cache hits, misses, and output in CNY, with automatic official peak/off-peak and per-model pricing; hidden on non-official DeepSeek routes. | 点开输入框旁的上下文圆环即见本轮账单：缓存命中/未命中/输出各花多少钱（¥），官方峰谷价与模型分价自动判定；非 Dee
   - 来源：https://github.com/Phant0Meow/dsh-meow-cachebilling
   - 安装：`dsh plugin --profile web add meow-cachebilling`

4. **dsh-balance-tide** — ★6 · 下载 — · usage
   - DeepSeek account balance and session cost under the composer, with a live peak/off-peak pricing badge (Beijing time), a countdown to the next pricing switch, hover price tables, and usage advice. | 输入框下方显示 DeepSeek 账户余额与本会话花费，余额前带峰/谷价格徽章（北京时间）与距切换倒计时，悬停看两档单价明细与使用建议。
   - 来源：https://github.com/huanyuLv/dsh-balance-tide
   - 安装：`dsh plugin --profile web add github:huanyuLv/dsh-balance-tide`

5. **dsh-peak-indicator** — ★4 · 下载 3601 · ui
   - Session header badge showing DeepSeek peak/off-peak status, per-model token prices on hover, and real session/turn costs from actual usage. | 会话头部徽标：显示 DeepSeek 高峰/闲时状态、当前模型 token 单价，并按真实用量统计会话与每轮费用。
   - 来源：https://github.com/future007s/dsh-peak-indicator
   - 安装：`dsh plugin --profile web add dsh-peak-indicator`

6. **dsh-cost-dashboard** — ★4 · 下载 — · usage
   - Cost dashboard for DeepSeek Harness: aggregates model input/output/cache tokens across all local sessions, prices them with a builtin table (including DeepSeek peak/off-peak), and shows daily trends plus per-model and per-session tables. | 费用看板：汇总本机全部会话的模型输入/输出/缓存 token，按内置价格表计费（含 DeepSeek 峰谷），展示每日趋
   - 来源：https://github.com/mike-lee0120/dsh-cost-dashboard
   - 安装：`dsh plugin --profile web add github:mike-lee0120/dsh-cost-dashboard`

7. **dsh-valley-meter** — ★3 · 下载 — · ui
   - Peak-Valley Meter (峰谷电表) — a tiny DeepSeek usage companion: a minimal balance badge above the composer, official balance refreshed every 5s so it's always in sight; hover to expand a 24h peak/valley timeline (orange=peak, blue=valley, glowing white marker at the current local time) so off-peak hours
   - 来源：https://github.com/uckkk/dsh-valley-meter
   - 安装：`dsh plugin --profile web add github:uckkk/dsh-valley-meter`

8. **suanzhang-dsh** — ★3 · 下载 — · usage
   - Trading-terminal style cost tracker for DeepSeek Harness: sidebar balance and today spend, per-step RMB cost table, auto-synced official pricing with peak/off-peak, cross-session and per-day summaries, tool-level attribution, and cost forecast. | 交易终端风格的 DeepSeek Harness 计费插件：侧边栏余额与今日消费、按步骤人民币费用表、官方
   - 来源：https://github.com/CZ1900/suanzhang-dsh
   - 安装：`dsh plugin --profile web add github:CZ1900/suanzhang-dsh`

9. **dsh-peak-cost-mode** — ★3 · 下载 1474 · notify
   - Auto-switches the agent to ultra-compressed caveman-style output during DeepSeek peak-pricing hours (Beijing 09:00–12:00 / 14:00–18:00, price x2) and shows a status badge plus transition toasts. | 在 DeepSeek 高峰计价时段（北京时间 09:00–12:00、14:00–18:00，价格 ×2）自动切换 caveman 超精简输出省 token，标题栏常驻状态徽章，档位切换时弹提醒。
   - 来源：https://github.com/moon09300731/dsh-peak-cost-mode
   - 安装：`dsh plugin --profile web add dsh-peak-cost-mode`

10. **dsh-workspace-hub** — ★2 · 下载 447 · usage
   - DSH workspace hub: organize workspaces into color-coded folders in the sidebar (three-level drag reorder for folders/workspaces/sessions, inline edit, one-click expand/collapse, dual-channel search) with per-workspace and per-session token usage and cost stats from real session logs (official DeepSe
   - 来源：https://github.com/Jadramcool/dsh-workspace-hub
   - 安装：`dsh plugin --profile web add dsh-workspace-hub`

11. **DeepSeek-Harness-chat-billing** — ★2 · 下载 3070 · usage
   - DeepSeek account balance, this session's billed spend, and today's total spend in the session-header badge; a turn-cost row in the message actions strip, a detail panel with per-model pricing and a today session-spend ranking. Official peak/off-peak pricing; balance from the real /user/balance API. 
   - 来源：https://github.com/rayadesune/DeepSeek-Harness-chat-billing
   - 安装：`dsh plugin --profile web add @rayadesu/dsh-billing`

12. **dsh-cost-gauge** — ★2 · 下载 — · usage
   - Peak/off-peak billing cost dial for the DSH Web GUI: session token usage billed at the official DeepSeek peak and off-peak rates, a rate dial with a model-colored needle and switch countdown, a balance ring with a low-balance alarm, drag-to-resize, and a minimized status-lamp mode. | 峰谷计费表盘：DSH Web 
   - 来源：https://github.com/wjingshan/dsh-cost-gauge
   - 安装：`dsh plugin --profile web add github:wjingshan/dsh-cost-gauge`

13. **dsh-cost-tracker** — ★2 · 下载 — · usage
   - Per-model token cost tracking with configurable cache-hit/miss, output and peak-window pricing, a live session cost bar, and unconfigured-model flags. | 按模型追踪 token 成本：可配置缓存命中/未命中、输出与高峰时段单价，实时会话花费条，并标记未配置价格的模型。
   - 来源：https://github.com/yflmq001/dsh-cost-tracker
   - 安装：`dsh plugin --profile web add github:yflmq001/dsh-cost-tracker`

14. **deepseek-cost-usage-status-plugin** — ★2 · 下载 — · usage
   - Adds a colored status line under the DSH conversation stats showing live DeepSeek API cost, usage and account balance, with on/off-peak pricing indicators. | 在 DSH 会话统计行下方新增彩色状态行，实时显示 DeepSeek API 费用、用量与账户余额，并带高峰/错峰计费指示。
   - 来源：https://github.com/Zenjibad/deepseek-cost-usage-status-plugin
   - 安装：`dsh plugin --profile web add github:Zenjibad/deepseek-cost-usage-status-plugin`

15. **dsh-balance-tracker** — ★1 · 下载 699 · usage
   - Real DeepSeek account balance and official spend tracker in the session header, with peak/off-peak badge, monetary alert with auto-stop, and one-click top-up. | 会话头部的真实 DeepSeek 余额与官方消费统计：高峰/空闲标签、按金额提醒与自动停止、一键充值。
   - 来源：https://github.com/aexachao/dsh-balance-tracker
   - 安装：`dsh plugin --profile web add dsh-balance-tracker`

16. **dsh-balance-tasks** — ★1 · 下载 — · usage
   - Floating card showing DeepSeek balance, peak/off-peak tier countdown, and remaining tasks estimated from historical per-task token usage and the current context. | 右下角悬浮卡显示 DeepSeek 余额与峰谷档位倒计时，并基于历史平均单任务 Token 消耗与当前上下文估算剩余任务数。
   - 来源：https://github.com/Bil812/dsh-balance-tasks
   - 安装：`dsh plugin --profile web add github:Bil812/dsh-balance-tasks`

17. **dsh-balance-and-cost** — ★1 · 下载 — · usage
   - DeepSeek account balance and model cost tracking with official peak/off-peak pricing, three-tier token billing (cache miss, cache hit, output), per-model and per-session breakdowns, a composer summary bar with hover details, CSV export, and a settings panel. | DeepSeek 账户余额与模型消耗：官方价格表分高峰/空闲时段计价，三档计费
   - 来源：https://github.com/boooooooer/dsh-balance-and-cost
   - 安装：`dsh plugin --profile web add github:boooooooer/dsh-balance-and-cost`

18. **balance-dsh** — ★1 · 下载 1177 · usage
   - Shows DeepSeek account balance and current-session token and cost usage in the sidebar footer and composer dock, including peak and off-peak billing and subagent consumption. | 在侧边栏底部和输入框上方显示你的 DeepSeek 账户余额与当前会话 token 及费用消耗，支持高峰/空闲峰谷计费与子代理消耗统计。
   - 来源：https://github.com/Rannist/balance-dsh
   - 安装：`dsh plugin --profile web add balance-dsh`

19. **dsh-plugin-ds-balance** — ★1 · 下载 — · usage
   - DeepSeek API balance + per-call cost tracker: durable per-call cost ledger from real usage chunks with official Beijing peak/off-peak (x2) pricing, 60 s balance polling, and a sidebar footer action showing balance and today's spend. | DeepSeek 余额与逐次调用成本追踪：基于真实 usage 的持久化成本账本，支持官方高峰/低谷定价（北京时间 ×2），60 
   - 来源：https://github.com/storyOuO/dsh-plugin-ds-balance
   - 安装：`dsh plugin --profile web add github:storyOuO/dsh-plugin-ds-balance`

20. **dsh-balance-by-token** — ★1 · 下载 — · tools
   - A DeepSeek Harness plugin (dual-face host + browser) for watching your DeepSeek account **balance** and estimating **token-based costs**, with prices configured per **model × peak/off-peak period** online. Everything lives in a unified modal (opened from the sidebar-footer **Balance** button); a **s
   - 来源：https://github.com/jsoncode/dsh-balance-by-token
   - 安装：`dsh plugin --profile web add github:jsoncode/dsh-balance-by-token`

21. **dsh-balance** — ★0 · 下载 292 · usage
   - Provider-aware account balance chip for the DSH sidebar, showing the active model provider balance for DeepSeek, OpenRouter, Moonshot/Kimi, Zhipu/GLM, and MiniMax, plus DeepSeek peak/off-peak status. | DSH 侧边栏的账户余额胶囊，跟随当前模型的服务商显示余额，支持 DeepSeek、OpenRouter、Moonshot/Kimi、Zhipu/GLM 与 MiniMax，并显示 DeepSee
   - 来源：https://github.com/andregoncalves/dsh-balance
   - 安装：`dsh plugin --profile web add @andrecgoncalves/dsh-balance`

22. **deepseek-time#dsh** — ★0 · 下载 — · usage
   - Peak and off-peak pricing-period indicator for the DeepSeek API in the DSH chat UI, with a countdown to the next period and an API balance readout on hover. | 在 DSH 会话界面显示 DeepSeek 当前高峰/空闲收费时段图标与下一时段倒计时，悬停图标可查询 API 余额。
   - 来源：https://github.com/Cheeserackery/deepseek-time/tree/master/adapters/dsh
   - 安装：`dsh plugin --profile web add github:Cheeserackery/deepseek-time#path:/adapters/dsh`

23. **dsh-balance-vision** — ★0 · 下载 — · usage
   - DeepSeek balance and per-session cost in the DSH web composer dock, with official peak/off-peak pricing (peak hours Mon-Fri BJT 9-12 / 14-18, weekends off-peak) and built-in deepseek-v4-flash-vision-exp vision model rates billed at flash price (images billed as tokens, max 384 tokens each). | 输入框下方实
   - 来源：https://github.com/Flonger/dsh-balance-vision
   - 安装：`dsh plugin --profile web add "https://github.com/Flonger/dsh-balance-vision/releases/download/v0.1.0/dsh-balance-vision-0.1.0.tgz"`

24. **dsh-balance** — ★0 · 下载 — · usage
   - Shows DeepSeek API balance and tells whether the current moment is peak or off-peak pricing time, with a live countdown to the next switch. | 显示 DeepSeek API 余额，并判断当前是否为高峰时段，实时倒计时到下次切换。
   - 来源：https://github.com/gejiaju/dsh-balance
   - 安装：`dsh plugin --profile web add github:gejiaju/dsh-balance`

25. **dsh-cost-meter** — ★0 · 下载 — · usage
   - Session cost chip in the DeepSeek Harness conversation header showing live token usage by bucket, peak/off-peak tariff pricing, and a countdown to the next tariff switch. | 在 DeepSeek Harness 对话标题栏显示会话费用芯片：实时分桶 Token 用量、高峰/非高峰费率，以及到下次费率切换的倒计时。
   - 来源：https://github.com/GooDAnDReaDY/dsh-cost-meter
   - 安装：`dsh plugin --profile web add github:GooDAnDReaDY/dsh-cost-meter`

26. **dsh-convo-cost** — ★0 · 下载 565 · usage
   - Real-time cost tracking for the current DSH conversation: a composer-dock line showing the running token usage and DeepSeek official price estimate (base and peak/valley pricing). | 当前对话实时费用统计：输入框下方一行显示运行中的 token 用量与 DeepSeek 官方价格估算（基础价与峰谷价）。
   - 来源：https://github.com/ljr282341583/dsh-convo-cost
   - 安装：`dsh plugin --profile web add dsh-convo-cost`

27. **dsh-session-cost** — ★0 · 下载 358 · usage
   - Composer cost chip: prices the current session DeepSeek API spend message-by-message with the official pricing table (incl. the 2026-08-17 peak/off-peak policy); hover for the breakdown, today (DSH) total and account balance. DeepSeek models only. | 输入框右侧会话成本芯片：按官方价表（含 2026-08-17 峰谷价）逐消息计价当前会话的 Deep
   - 来源：https://github.com/Lzh3070/dsh-session-cost
   - 安装：`dsh plugin --profile web add @phynez_1103/dsh-session-cost`

28. **dsh-task-effort** — ★0 · 下载 92 · dev
   - Auto-adjust model reasoning effort per task (off/low/high/max): task classification, \[effort=...] markers, in-turn error escalation, DeepSeek peak-pricing-period capping with countdown notices, and manual-selection priority. | 根据任务自动调整模型推理档位（off/low/high/max）：任务分类判定、\[effort=...] 显式标记、轮内出错升级、DeepSe
   - 来源：https://github.com/zhangzhenwen1/dsh-task-effort
   - 安装：`dsh plugin --profile web add dsh-task-effort`


## B. 余额 / 费用 / 用量仪表盘（含峰谷计价）（20 个）

1. **dsh-cost-meter** — ★289 · 下载 56706 · usage
   - Per-session and daily API cost, budget with usage %, official balance, history dashboard, and one-click official price sync with peak/off-peak pricing. | 会话与当日 API 费用统计、预算图框（已用%）、官方余额、历史看板，支持峰谷计价与官方价格一键同步。
   - 来源：https://github.com/Han-1413141/dsh-cost-meter
   - 安装：`dsh plugin --profile web add dsh-cost-meter`

2. **dsh-usage-billing** — ★9 · 下载 — · usage
   - Usage and cost statistics with peak/off-peak pricing after the 2026-08-17 rate change, a floating summary panel, per-session breakdowns, and a day/week/month/year/all usage heatmap. | 用量与消费统计：8/17 调价前后峰谷计费，主界面汇总面板、按会话明细与日/周/月/年/累计用量热力图。
   - 来源：https://github.com/940842546/dsh-usage-billing
   - 安装：`dsh plugin --profile web add github:940842546/dsh-usage-billing`

3. **dsh-token-viewer** — ★8 · 下载 — · usage
   - CC Switch-style token consumption statistics for the dsh web GUI: per-request usage log, real-consumption hero, request-time-bucketed trend chart, per-model peak/off-peak list pricing, per-project and per-model stats, and account balance. | dsh 网页端 CC Switch 风格 Token 消耗统计：按请求的用量日志、真实消耗 Hero、按请求提交时间分
   - 来源：https://github.com/qwert702/dsh-token-viewer
   - 安装：`dsh plugin --profile web add github:qwert702/dsh-token-viewer`

4. **dsh-cache-billing** — ★6 · 下载 322 · usage
   - Per-call cache billing inside the context-meter popover: current step, round and session totals with hit/miss/output tokens and amounts, automatic Beijing working-hour peak/off-peak pricing, per-model rates, and third-party relays billed too. | 在上下文圆环弹层里实时算账：当前步、当前轮、会话累计三块明细，缓存命中/未命中/输出各带 token 与金额，
   - 来源：https://github.com/better-er/dsh-cache-billing
   - 安装：`dsh plugin --profile web add dsh-cache-billing`

5. **dsh-token-billing** — ★5 · 下载 — · usage
   - Real-time token billing for DSH web: official DeepSeek CNY pricing with automatic peak/off-peak switching, hourly price sync from the official site, visual custom model prices, and multi-currency fallback. | DSH Web 实时 token 计费插件：官网人民币价直接计费、高峰/错峰自动切换、价格实时跟随官网、可视化自定义模型价格、多币种兜底。
   - 来源：https://github.com/2006spy/dsh-token-billing
   - 安装：`dsh plugin --profile web add github:2006spy/dsh-token-billing`

6. **dsh-calculator** — ★5 · 下载 — · usage
   - DeepSeek API spend (current session and all sessions) and account balance in the aside panel, with official pricing and peak/off-peak support. | 右侧面板展示 DeepSeek API 费用（当前会话 + 全部会话累计）与账户余额，内置官方计价与峰谷计价支持。
   - 来源：https://github.com/bobcat848/dsh-calculator
   - 安装：`dsh plugin --profile web add github:bobcat848/dsh-calculator`

7. **dsh-token-attention** — ★3 · 下载 — · usage
   - Token attention management panel for DeepSeek Harness: per-task/day/week/month token usage and cost tracking (input hit/miss, output, reasoning), DeepSeek peak/off-peak pricing, task-type recognition, and advice on when to switch sessions, write a hand-off, or compact context. | Token 注意力管理面板：按任务/日/
   - 来源：https://github.com/Young4ever33/dsh-token-attention
   - 安装：`dsh plugin --profile web add github:Young4ever33/dsh-token-attention`

8. **dsh-usage-dashboard** — ★2 · 下载 — · usage
   - DeepSeek Harness Usage tab for DeepSeek account balance, official peak/off-peak pricing, live countdown, platform usage link, and local balance warning light. | DeepSeek Harness 用量页签：展示 DeepSeek 账户余额、官方峰谷时段价格、动态倒计时、平台用量页入口和本地余额告警灯。
   - 来源：https://github.com/Hann428/dsh-usage-dashboard
   - 安装：`dsh plugin --profile web add github:Hann428/dsh-usage-dashboard`

9. **dsh-usage-vendor-stats** — ★2 · 下载 356 · usage
   - Vendor-based usage dashboard: per-provider token/cache/output KPI, a 53-week heatmap, trend chart with hourly "today" view, model drilldown, cost estimation, CSV export, and health cards (TTFT, generation speed, peak context, error rate). | 按厂商（订阅/官方API）统计用量看板：按供应商/模型拆分 Token、缓存、输出等 KPI，53 周热力图，趋势折线
   - 来源：https://github.com/kirigayakazima/dsh-usage-vendor-stats
   - 安装：`dsh plugin --profile web add dsh-usage-vendor-stats`

10. **dsh-usage-dashboard** — ★2 · 下载 — · usage
   - DeepSeek Harness usage analytics dock on the composer: Beijing-time peak/valley pricing with all-day weekend valley rate, live balance, cross-session history, by-date drill-down and charts. | DSH 用量分析坞：输入框峰谷计费坞（周末全天谷时）、实时余额、跨会话历史、按日期下钻与图表。
   - 来源：https://github.com/woosh2010/dsh-usage-dashboard
   - 安装：`dsh plugin --profile web add github:woosh2010/dsh-usage-dashboard`

11. **Deepseek-Continuity** — ★2 · 下载 1500 · vision
   - Local image, voice, music and SFX generation plus transcription, with pinned identity: characters, animals, objects and actor voices are defined once and reused on every later call, degenerate output (a near-flat image, silent audio) is rejected instead of returned as success, and a generated line c
   - 来源：https://github.com/linxuhao/Deepseek-Continuity
   - 安装：`dsh plugin --profile web add dsh-plugin-continuity`

12. **dsh-feishu-channel** — ★2 · 下载 — · remote
   - Feishu/Lark channel that drives DeepSeek Harness agents from chats: streaming rich cards with live thinking and tool steps, per-turn cost metering at DeepSeek peak/off-peak rates, one-tap approval cards, model-gated image intake, and QR onboarding without a public endpoint. | 在飞书聊天里驱动 DeepSeek Harne
   - 来源：https://github.com/whoisjiahao/dsh-feishu-channel
   - 安装：`dsh plugin --profile web add github:whoisjiahao/dsh-feishu-channel`

13. **dsh-plugin-balance** — ★1 · 下载 325 · ui
   - Balance and live session usage for the DSH web UI: header balance button (left of the Session log), dropdown with account balance, real-time token breakdown (cache miss/hit, cache write, output), cache hit rate, and official-rate cost estimates with peak/off-peak auto-switch. | DSH Web 余额与会话用量插件：头部余
   - 来源：https://github.com/lmmzss-jk/dsh-plugin-balance
   - 安装：`dsh plugin --profile web add @lmmzss/dsh-plugin-balance`

14. **dsh-cost-tracker** — ★1 · 下载 — · usage
   - Tracks DeepSeek Harness LLM token usage and cost (CNY, peak/off-peak pricing) with a settings dashboard, agent tools, HTTP API and persistent storage. | 统计 DeepSeek Harness 的 LLM Token 用量与花费（人民币、峰谷计价），提供设置面板、Agent 工具、HTTP 接口与持久化存储。
   - 来源：https://github.com/Angelyeye/dsh-cost-tracker
   - 安装：`dsh plugin --profile web add "https://github.com/Angelyeye/dsh-cost-tracker/releases/latest/download/dsh-cost-tracker.tgz"`

15. **dsh-token-usage-stats** — ★1 · 下载 15030 · usage
   - DeepSeek-styled cross-session token usage, request count, and tiered cost analytics dashboard. | 仿 DeepSeek 官方 Token 统计，跨会话 Token 消耗、请求次数与峰谷分时费用统计看板。
   - 来源：https://github.com/jkStars/dsh-token-usage-stats
   - 安装：`dsh plugin --profile web add dsh-token-usage-stats`

16. **dsh-better-stats** — ★1 · 下载 2907 · usage
   - Composer stats strip for the DSH Web UI: official CNY pricing with auto-synced peak/off-peak tiers, per-model accounting, live timers, subagent-tree merging, DeepSeek account balance, budget alerts, and streaming cost estimation. | DSH Web 输入框下方的增强统计条：官方人民币计价（峰谷分时、价目自动同步）、多模型分账、实时计时、子代理树合并、余额直连、预算预警
   - 来源：https://github.com/null5069/dsh-better-stats
   - 安装：`dsh plugin --profile web add dsh-better-stats`

17. **dsh-high-fee-alert** — ★1 · 下载 — · notify
   - Automatically retrieves time-of-use pricing data (with Beijing Time) and notifies users during peak periods to reduce costs. | 自动获取分时电价数据（按北京时间），在高峰时段提醒用户，以降低用电成本。
   - 来源：https://github.com/GuoFengyu110429/dsh-high-fee-alert
   - 安装：`dsh plugin --profile web add github:GuoFengyu110429/dsh-high-fee-alert`

18. **dsh-team-cost** — ★0 · 下载 — · usage
   - Team cost captain: meters every model call (subagents included), attributes each call to a member by workspace rules, prices it with the built-in DeepSeek 2026-09 catalog (peak/off-peak, CNY/USD) or user overrides, and appends it to a local JSONL ledger. Adds hot-reloadable member budgets, 80%/100% 
   - 来源：https://github.com/1569126506-sudo/dsh-team-cost
   - 安装：`dsh plugin --profile web add github:1569126506-sudo/dsh-team-cost`

19. **dsh-usage-stats-plus** — ★0 · 下载 — · usage
   - DSH usage and balance panel with official live balance, per-event official peak/off-peak pricing, all-channel spend estimates from daily balance snapshots, and a Codex-style 12-month token activity timeline. Fork of Ychris12138/dsh-usage-stats. | DSH 用量与余额面板：官方余额实时拉取、逐事件官方峰谷计价、基于余额快照的全渠道消耗估算、Codex 风
   - 来源：https://github.com/Nixz0824/dsh-usage-stats-plus
   - 安装：`dsh plugin --profile web add "https://github.com/Nixz0824/dsh-usage-stats-plus/releases/download/v0.3.0/dsh-usage-stats-plus-0.3.0.tgz"`

20. **dsh-cost-crystal** — ★0 · 下载 — · usage
   - Floating cost crystal for the Web UI: balance card, real-time tok/s, peak/off-peak billing countdown, last-24h spend, and a 🔮 next-message cost forecast, all timezone-aware. | Web UI 成本水晶球:余额卡片、实时 tok/s 速率、波峰/低峰计费倒计时、近 24h 消耗,以及 🔮 下一条消息消耗预测,全部时区感知。
   - 来源：https://github.com/xxvk/dsh-cost-crystal
   - 安装：`dsh plugin --profile web add github:xxvk/dsh-cost-crystal`


## C. 自动错峰省钱 / 闲时调度（不是显示，是帮你避开高峰）（5 个）

1. **dsh-lowtide#dsh-lowtide** — ★157 · 下载 1525 · workflow
   - Lowtide (as in low tide) runs task batches automatically in off-peak hours — a highly customizable task framework with four execution strategies, L1–L3 semi/full-auto adjudication, in-place task editing and preflight checks, built on the Cordis microkernel, one build for both desktop and web. | lowt
   - 来源：https://github.com/KelaoHu/dsh-lowtide/tree/main/packages/dsh-lowtide
   - 安装：`dsh plugin --profile web add dsh-lowtide`

2. **dsh-save-money#plugin** — ★36 · 下载 941 · usage
   - Pause and resume tasks automatically during user-defined time windows to avoid peak-hour API costs; includes account balance display and 10-minute granularity spend bar chart. | 自定义时间窗口自动暂停/恢复任务，高峰时段节省 API 费用；含账户余额显示和 10 分钟粒度的消费柱状图。
   - 来源：https://github.com/zhu168/dsh-save-money/tree/main/plugin
   - 安装：`dsh plugin --profile web add dsh-save-money`

3. **dsh-input-traffic** — ★4 · 下载 2507 · ui
   - Three-tier now/next/later input planning dock for the DeepSeek Harness web GUI: a red/yellow/green priority strip replaces the busy-Enter queue, plain Enter queues to later, with in-place multi-line editing, drag reorder, and session-isolated freeze/resume; the freeze button bridges a separate plugi
   - 来源：https://github.com/drscrewdriver/dsh-input-traffic
   - 安装：`dsh plugin --profile web add dsh-input-traffic`

4. **dsh-off-peak-message#dsh-offpeak-send** — ★4 · 下载 — · session
   - Off-peak message scheduler: turn on valley mode and the composer queues your messages until DeepSeek off-peak hours (half price), then auto-injects them into the session and gets replies. Native-look composer, hotkeys (Enter queue / ⌘+Enter send now / Esc exit), per-session toggle persisted across r
   - 来源：https://github.com/Ricketts-Guo/dsh-off-peak-message/tree/main/dsh-offpeak-send
   - 安装：`dsh plugin --profile web add github:Ricketts-Guo/dsh-off-peak-message#path:/dsh-offpeak-send`

5. **dsh-peakrate** — ★None · 下载 — · model
   - Peak / off-peak rate badges for the model selector (every row) and the composer tool row, judged per provider by its own time zone and schedule; the live catalog is served from the host over a fenced route. | 为模型选择器（每一行）与 composer 工具行显示峰谷倍率，按每个 provider 自己的时区与时段规则判定；实时目录由 host 经带信任围栏的路由下发。
   - 来源：https://github.com/log-li/dsh-peakrate
   - 安装：`dsh plugin --profile web add github:log-li/dsh-peakrate`


## D. 桌宠 / 挂件 / 边框类（顺带显示余额与峰谷）（6 个）

1. **DeepSeek-Balance-Whale-Widget-Bowl** — ★9 · 下载 — · ui
   - A fixed-corner DeepSeek balance whale widget for the DSH web GUI: three switchable skins (default / bowl-on-head / bowl-in-hand), balance with today usage, per-turn cost popups, peak/off-peak price conversion, press sound effects and random talk lines. Modified from MeteorNOX/DeepSeek-Balance-Whale-
   - 来源：https://github.com/Witherwithwinter/DeepSeek-Balance-Whale-Widget-Bowl
   - 安装：`dsh plugin --profile web add github:Witherwithwinter/DeepSeek-Balance-Whale-Widget-Bowl`

2. **dsh-usage-dashboard** — ★9 · 下载 1671 · usage
   - DeepSeek usage dashboard for DSH Web: days-left estimate from recent average spend, daily/monthly/cumulative costs with period-over-period comparison, per-model cost ranking, cache savings, peak/off-peak pricing impact, and a draggable floating balance widget. | DSH Web 的 DeepSeek 用量仪表盘：按近期日均消耗估算可用天
   - 来源：https://github.com/Cassius0924/dsh-usage-dashboard
   - 安装：`dsh plugin --profile web add @cassius0924/dsh-usage-dashboard`

3. **dsh-api-dashboard** — ★7 · 下载 925 · usage
   - Multi-platform API balance and usage dashboard for the DSH web GUI: balances for DeepSeek, Zhipu GLM, Kimi, StepFun, SiliconFlow, MiniMax, OpenRouter, Novita and xAI under the composer, estimated per-session and per-subagent cost with DeepSeek peak/off-peak pricing, automatic discovery of relays con
   - 来源：https://github.com/133563825as-ai/dsh-api-dashboard
   - 安装：`dsh plugin --profile web add dsh-api-dashboard`

4. **dsh-game-hud** — ★5 · 下载 — · ui
   - Game-style floating HUD: balance HP bar, context MP bar, official peak/valley pricing with countdown, auto-compaction under 5% remaining, and memory-carrying new conversation. | 游戏风格悬浮 HUD：余额血条、上下文蓝条、官方峰谷定价与切换倒计时、上下文不足5%自动压缩、携带记忆开启新对话。
   - 来源：https://github.com/guoliyuan97-png/dsh-game-hud
   - 安装：`dsh plugin --profile web add github:guoliyuan97-png/dsh-game-hud`

5. **dsh-liangwengu** — ★3 · 下载 — · usage
   - DeepSeek API pricing reminder with a game HUD: Beijing-time countdowns to peak/off-peak windows, a draggable HP capsule with day/moonlight themes, and a nine-realm cultivation system with breakthrough animations. | 按北京时间提醒 DeepSeek API 定价高峰/空闲时段的游戏化插件：可拖动血条胶囊、日夜主题、隐藏彩蛋与修仙突破动画。
   - 来源：https://github.com/mozhuanzuojing/dsh-liangwengu
   - 安装：`dsh plugin --profile web add github:mozhuanzuojing/dsh-liangwengu`

6. **dsh-token-anxiety** — ★2 · 下载 — · usage
   - Live per-task token cost widget: peak/valley pricing windows, projected post-hike costs, sortable per-task cost table, multi-currency (COP/USD/CNY + ~40 more) with FX rates, and one-click streamed LLM explain of expensive tasks. | 实时按任务追踪 token 成本的小部件：高峰/低谷定价时段、涨价后预测成本、可排序的每任务成本表、多币种（默认 COP/USD/CNY，
   - 来源：https://github.com/mov-eax-eax/dsh-token-anxiety
   - 安装：`dsh plugin --profile web add github:mov-eax-eax/dsh-token-anxiety`
