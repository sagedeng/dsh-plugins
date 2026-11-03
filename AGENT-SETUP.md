# 插件安装与迁移手册（给代理读）

这份文档的读者是**下一个会话里的代理**（或三个月后的我）。它只描述动作，不描述动机；动机在末尾一节。

一句话：`plugins.json` 是本机自建插件的唯一清单，`scripts/check.mjs` 验证代码，`plugin_manager` 完成安装，`scripts/pack.sh` 产出离线包。

---

## 0. 前提检查（先在目标机器上跑）

```bash
pwd                                   # 必须是仓库根，且必须是 DSH 会话工作区
echo "$DSH_PROFILE"                   # 期望 desktop（清单里的 targetProfile）
ls ~/.dsh/profiles                    # profile 是否已初始化
command -v dsh pnpm git node          # 四个都要有
```

判读：

- `DSH_PROFILE` 为空 → DSH 不是用 profile 启动的，插件管理不可用，先让用户正常启动 DSH。
- `~/.dsh/profiles/<目标 profile>` 不存在 → 让用户启动一次 DSH 桌面端，profile 会自动建立。
- 仓库不在 `~/DeepSeekWork` → 见下面「路径约定」，`link:` 装法需要固定路径。

---

## 1. 换电脑：从零重建

### 1.1 取代码

优先级从高到低，任选其一，落到 `~/DeepSeekWork`：

1. `git clone <远端> ~/DeepSeekWork`
2. 用户带来的离线包：`dist/dsh-cost-lens-<version>.tgz`（此时不需要仓库，直接跳到 1.2 的 B 路）
3. 仓库目录压缩包解压（无远端时的兜底）

确认结构：

```bash
ls ~/DeepSeekWork            # plugins.json / scripts/ / dsh-cost-lens/ / profiles/
node ~/DeepSeekWork/scripts/check.mjs
```

`check.mjs` 不联网、不碰 `~/.dsh`，失败就不要往下装。

### 1.2 安装（两条路，按代码在哪选）

**A 路 · 有仓库（开发/日常）** —— 装 `link:`，改代码即时生效：

对 `plugins.json` 的每一项调用一次：

```
plugin_manager { action: "install_bundle", target: "<仓库绝对路径>/<dir>" }
```

例：`/Users/dsz/DeepSeekWork/packages/dsh-cost-lens`

读返回：`application` 必须是 `applied`；`warnings` 必须为空；出现 `restart-required` 就重启 DSH 再验。

**B 路 · 直接从 GitHub 装（无需 clone）** —— 仓库已公开时最省事（`#path:` 子目录语法已用 pnpm 10.8.1 实测可用；插件管理器走 launcher 自带的 pnpm 11）：

```
plugin_manager { action: "install_bundle", target: "github:sagedeng/dsh-plugins#path:/packages/dsh-cost-lens" }
```

**C 路 · 只有 tgz（离线/锁版本）** —— 装死版本：

```
plugin_manager { action: "install_bundle", target: "<绝对路径>/dist/dsh-cost-lens-0.1.0.tgz" }
```

B、C 两路都不依赖本地代码目录，`~/DeepSeekWork` 可以不存在。

### 1.3 配置覆盖（只在这些键上动手）

`cordis.patch.example.yml` 是**快照**，不是配置源。到目标机器上：

1. 打开 `~/.dsh/profiles/<profile>/cordis.patch.yml`
2. 只把其中带 `id: <插件 id>` 的条目（如 `cost-lens`）合并进去
3. **不要整份覆盖**：那份文件里还有主题、语言、欢迎页版本等本机偏好，覆盖会把新机器的设置冲掉

插件没有 `Config` 时（`cost-lens` 就是这样），`cordis.patch.yml` 里没有它的条目是正常状态，配置项走插件自己的默认值。

### 1.4 验证（四项都要成立）

```bash
# 1) 状态路由（端口取 $DSH_WEB_URL）
curl -s "${DSH_WEB_URL%/}/dsh-cost-lens/state.json" | head -c 300
# 期望：{"ok":true,...,"tariff":{"phase":...},"balance":{...}}

node ~/DeepSeekWork/scripts/check.mjs
```

4. 代理侧两项只读检查：

```
cordis_inspect_query { platform: "host", provider: "Config", method: "listConfigs",
                       input: { name: "dsh-cost-lens" } }
  → entries 里出现 patchId "cost-lens"

cordis_inspect_query { platform: "client", provider: "Slots", method: "listSubTree",
                       input: { root: "conversation.composer.dock" } }
  → occupants 里有 { id: "cost-lens", active: true }
```

工具型插件（如 `github-ops`）不看槽位，看工具表：`cordis_inspect_query { platform: "host", provider: "Tool", method: "listTools" }`
里应出现清单中 `verify.tools` 的每个名字，然后**真调一次**读工具（`github_status`）确认它能跑通。

`ok:true` 但没有余额 → 见 1.5；`active:false` 或槽位缺失 → 见第 4 节。

### 1.5 新机器上必须由人做的一件事

余额来自 DeepSeek 账户，不随代码迁移：

- 在 DSH 里登录 DeepSeek 账户，**或**在凭据里设置 `DEEPSEEK_API_KEY`。
- 都没做时，插件仍显示用量与峰谷计时，余额区显示「暂无记录」。

---

## 2. 本机新增插件

1. 在 `~/DeepSeekWork/packages/<dir>/` 建包（`package.json` 带 `dsh.bundle.patch`，有 UI 就带 `dsh.client`）
2. 在 `plugins.json` 的 `plugins` 数组追加一项（`id / package / dir / version / enabled / verify`）
3. `node scripts/check.mjs` 通过
4. `plugin_manager install_bundle`（同上 A 路）
5. 按该项的 `verify` 逐条验

命名纪律（决定多个插件能不能共处）：目录 `packages/dsh-<id>`、包名 `dsh-<id>`、slot id `<id>`、路由 `/dsh-<id>/...`、storage 目录 `<id>`、locale 命名空间 `<id>` 驼峰。四项公共资源全部带前缀，冲突只可能发生在自己身上。

## 3. 更新已有插件

- **A 路（link）**：客户端 bundle 会热更新；**Host 侧（`index.js`）的改动必须重启 DSH 才会重新导入模块**（插件管理器文档明确：linked 包改代码后需要重启）。重启后用一个探针字段确认新代码已加载，例如 `github_status` 输出里的 `plugin.version`。
- **B 路（tgz）**：改 `version` → `./scripts/pack.sh` → `install_bundle` 指向新 tgz。装同包名的新版本 = 先移除再装，中间会有一段插件不在线，装完记得复验第 1.4 节。
- 无论哪条路：**升级不碰配置**。`cordis.patch.yml` 里的覆盖按 `id` 匹配，版本变了照样生效。

---

## 4. 失败对照表

| 现象 | 原因 | 动作 |
|---|---|---|
| `EPERM ... package.json.lock` | 代理在沙箱里跑了 `dsh plugin` | 改用 `plugin_manager`，或让用户在自己的终端跑 |
| `application: failed` + 导入诊断 | 主入口语法/依赖错 | 本地 `node scripts/check.mjs`，改完重装 |
| `already-installed`（HMR 下装同 spec） | 包已在 profile 里 | `plugin_manager { action: "set_bundle", target: "<包名>", enabled: true }` |
| `restart-required` | 运行中的 bundle 覆盖不上 | 重启 DSH，再验 1.4 |
| 路由 404，但 slot 在 | 端口/profile 不对 | `echo $DSH_WEB_URL`，确认是同一个 DSH |
| slot 不存在 `cost-lens` | 客户端 bundle 没加载 | 看 Settings → Plugins 的 row 状态；F12 控制台搜 `slot entry crashed` |
| 余额一直「暂无记录」 | 未登录且无 API key | 见 1.5 |
| 启动报警 `link` 目标不存在 | 代码目录被挪走/换了 home | 恢复目录到原绝对路径；或删依赖后按 B 路重装 |

---

## 5. 不迁移的东西（重装时不要拷）

| 路径 | 原因 |
|---|---|
| `~/.dsh/.credentials.yaml` | 含登录令牌与 API key，按机器各自登录 |
| `~/.dsh/sessions/` | 会话日志，与机器绑定，且体积大 |
| `~/.dsh/storages/` | 插件运行态。插件重装会自己重建；卸载时**要**连带删掉对应目录（避免留孤儿） |
| `~/.dsh/profiles/*/node_modules`、`pnpm-lock.yaml` | 由 `plugin_manager` 生成，手改会不一致 |

---

## 6. 路径约定（`link:` 的代价）

`install_bundle` 传目录时，profile 里记的是**绝对路径** `link:/Users/<user>/DeepSeekWork/<dir>`。所以：

- 每台机器都把仓库放在 `~/DeepSeekWork`（同一 path 结构），`link:` 才通用；
- 用户名或路径不同 → 走 B 路 tgz，或在新机器上重新 `install_bundle` 一次让路径重写；
- 目录一旦被挪走，profile 里就是悬空链接，**不要手改 profile 的 `package.json` 去修**，按第 4 节最后一行的顺序处理。

---

## 7. 为什么这样设计

- **代码 / 引用 / 状态三层分离**：代码进 git；引用（profile 的 `package.json` 与 `cordis.patch.yml`）是生成物，只留可重放的快照；状态（credentials / sessions / storages）永远不迁移。
- **清单驱动**：`plugins.json` 让「有哪些插件、装在哪、装完怎么算成功」变成一个可读文件，而不是散落在聊天记录和 `.bak` 里。
- **自检前置**：纯 JS 插件没有类型检查，所以 `check.mjs` 承担了类型检查的位置——装之前就能拦住九成低级错误。
- **两路安装**：`link:` 给每天改代码的机器，`tgz` 给不能共享路径的机器和对外分发；两者不混用。
