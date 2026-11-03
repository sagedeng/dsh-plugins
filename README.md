# dsh-plugins

本地自建的 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/) 插件集合。

| 插件 | 作用 |
|---|---|
| [`dsh-cost-lens`](packages/dsh-cost-lens) | DeepSeek 余额、用量、官方峰谷单价与实时花费，显示在输入框下方一行 |
| [`dsh-github-ops`](packages/dsh-github-ops) | 十个通用 GitHub 工具：仓库状态、提交推送、PR、评审、CI 检查、issue |

## 安装

三种方式等价，选一种：

```yaml
# 1) 目录安装（开发，改动即时生效）
plugin_manager: { action: install_bundle, target: "<本仓库>/packages/dsh-cost-lens" }

# 2) 直接从 GitHub 装（无需 clone）
plugin_manager: { action: install_bundle, target: "github:sagedeng/dsh-plugins#path:/packages/dsh-cost-lens" }

# 3) 离线 tgz（./scripts/pack.sh 生成）
plugin_manager: { action: install_bundle, target: "<本仓库>/dist/dsh-cost-lens-0.1.0.tgz" }
```

安装不是 `dsh plugin add`：后者只装包，不会把 bundle 选进 `dsh.profile.bundles`。

## 依赖

- DSH 带插件管理器的版本（`plugin_manager` 工具可用）
- `dsh-cost-lens`：DeepSeek 账户登录，或配置 `DEEPSEEK_API_KEY`（余额走 `/user/balance`）
- `dsh-github-ops`：`gh` CLI 已 `gh auth login`，插件不存储任何 token

## 仓库结构

```
packages/            一个插件一个包
plugins.json         清单：装什么、装在哪、装完怎么算成功
scripts/check.mjs    静态自检（清单/导出/图标/locale/语法/入口）
scripts/pack.sh      打 tgz 到 dist/
AGENT-SETUP.md       换机重装与排错手册（给代理读）
```

## 开发

```bash
node scripts/check.mjs     # 提交前必跑
./scripts/pack.sh          # 需要分发时
```

改动 Host 侧（`index.js`）后必须重启 DSH 才会重新加载模块；浏览器侧（`client.js`）会热更新。

## License

MIT
