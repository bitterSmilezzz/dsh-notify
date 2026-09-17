# 更新日志

本文件记录 dsh-notify 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.1.10 起建立并回填：0.1.10 之前的历史以 GitHub Release 与 git tag 为准。

## [0.2.0] - 2026-09-17

### 新增

- **Linux 平台支持**：`notify-send`（libnotify）展示型通知，未安装时静默跳过。
  通知不可点击（notify-send 无可靠的点击回调通道），声音由桌面主题控制（本插件的声音
  开关在 Linux 上无效）——两者都在 README 与设置卡片文案里写明。
- **通知文案本地化**：host 侧通知标题/正文跟随官方 locale 设置的偏好（设置 → 通用 → 语言），
  中文/英文双语；读不到偏好时回落中文（此前一律硬编码中文，英文界面用户收到中文通知）。
- **正文带会话标题**：优先官方 `sessionTitle` 服务折叠出的会话标题，无标题时回落模型名
  （此前正文只有模型名，多会话并行时无法分辨是哪一个会话）。
- **聚焦抑制（分级）**：浏览器半区经官方 Connection RPC 通道（`/dsh-notify`）上报页面可见性，
  host 在页面可见时抑制「轮次完成 / 会话完成」这类非阻塞通知；「审批 / 出错」始终送达
  （审批是阻塞性的，官方审批 UI 只在对应会话内出现）。上报可见时每 30s 续期，host 侧
  75s 保鲜期兜底——页面崩溃/断连后最多 75s 恢复通知（宁可多通知，不可静默失效）。
- **设置卡片双契约注册**：同时注册旧 `settings.plugin.item`（设置 → 插件 → 配置）与新
  `plugins.bundle.config`（插件详情页，`view: 'summary' | 'page'`）两代官方 slot 契约——
  DSH 0.1.6 期间换过插件配置架构，只注册一个会让卡片在其中一代运行时里彻底消失。

### 变更（破坏性）

- **移除防重叠探测机制（`overlap` / `probeServices`）**：实测该机制探测的 6 个 cordis
  service 名（`notification` / `notifications` / `notifyCenter` / `desktopNotify` /
  `systemNotify` / `toast`）在官方 251 个包中零命中，探测名单纯属命名猜测；而一旦误命中
  （第三方插件恰好注册同名 service），本插件会**静默停止通知**（只弹一次提示）——这是
  通知类插件最糟的失败模式。移除探测逻辑、两个配置项与设置卡片对应行（老配置里残留的
  字段被 schemastery 原样保留，不影响解析，但不再有任何作用）。
- **设置卡片视觉对齐官方组件层**：卡片描边 `0.5px border-l4`、圆角 16px、悬停与打开态
  换描边/背景、头部 `focus-visible` 轮廓、正文分隔线 `0.5px border-l2`；折叠箭头改用官方
  `IconChevronDownOutline14`（此前自绘 svg）；次要按钮改 outline 形态（对齐官方卡片内
  按钮）；错误色改用真实存在的 `--dsw-alias-label-error`（此前用的是**不存在**的
  `--dsw-alias-state-danger-fill`，恒走硬编码 fallback 色）。
- 折叠头补官方同款无障碍名（`展开设置/收起设置: <标题>`）。

### 修复

- 设置卡片文案 `masterDesc` 此前称「macOS 需已装 terminal-notifier」，与实现不符
  （osascript 为主、terminal-notifier 只影响可点击跳转），会误导用户以为没装就收不到通知；
  已改为按平台说明（macOS 可点击需 terminal-notifier；Linux 仅展示）。
- `README` 补齐此前缺失的 overlap/probeServices 说明（该机制已移除），并补全平台矩阵、
  权限披露与已知风险。
- `CHANGELOG` 0.1.10 对 overlap 的描述（「检测到屏幕已被其他应用独占（如全屏演示、投屏）时
  自动暂停」）与实现（探测 cordis service 名）完全不符——本版移除该机制，描述错位一并终结。

### 工程

- host 侧按职责拆分：`notify-events.ts`（事件编排）、`notify-text.ts`（文案）、
  `presence.ts`（聚焦状态机）、`system-notify.ts`（平台通道）、`notify-policy.ts`（纯策略）；
  原先单文件 512 行的 `system-notify.ts` 同时承载四类职责。
- 新增回归测试覆盖：文案字典 zh/en key 一致性、`notifyTextOf` 回落、聚焦状态机与上报协议、
  Linux `notify-send` argv 与 PATH 探测、Windows toast 全路径（argv/静默 env/兜底清理）、
  host↔client 配置字段一致性、卡片双契约注册。

## [0.1.14] - 2026-09-16

### 变更

- **UI 一致性（组件层重叠清理）**：设置卡片「音效」行残留的自绘 `input[type=checkbox]`
  开关改为官方 `@deepseek-ai/dsh-client-ui-primitives` 的 `Switch`，与同卡片其余开关行
  （0.1.10 起已对齐的 `ToggleRow`）同源。
- 行为差异说明：开关的可点区域由浏览器默认 checkbox 尺寸变为官方 Switch 自身尺寸；
  该行原本就**不是整行可点**（无 `<label>` 包裹、行上无 `onClick`），故交互语义不变。
  无障碍名仍由本地化词条 `notifySound` 提供。
- 该自绘开关原本没有专属 CSS 规则（`styles.ts` 里只有 `.dshn-field` 布局与 radio 样式），
  故不涉及样式清理。
- 新增 2 项设置卡片开关契约测试（钉住「开关一律走官方 Switch」，并防自绘开关回流）。
- 回归测试 56 → 58 项，双半区 typecheck 与构建全绿。

## [0.1.13] - 2026-09-15

### 变更

- **DSH 兼容**：`@deepseek-ai/*` 依赖线对齐 DSH `0.1.6-alpha.1`（peer 与 dev 双声明，约束为
  `^0.1.6-alpha.1`），并同步 `pnpm-workspace.yaml` 的 release-age 例外清单。
- 本版为纯依赖对齐，**无功能与行为变更**。双半区 typecheck、构建与 56 项回归测试全绿。

## [0.1.12] - 2026-09-13

### 变更

- **包名迁移**：`dsh-notify` → **`@bittersmilezzz/dsh-notify`**，以便发布到 npm registry
  （原短名在 npm 上已被其他作者占用）。同步更新的加载契约：`package.json` name、
  `cordis.patch.yml` 的 bundle `name`（`id` 保持短原名，那是实例标识）、客户端 bundle 的
  `window.__ModuleLoader__.load({ id })`、样式注入的 `data-plugin` / `data-plugin-css` 标记。
  功能、配置 schema、settings namespace（`notify`）与 UI 文案均未改动。
- **npm 首次发布**：本版是包进入 npm registry 的首个版本。此前只能通过 GitHub 或本地路径安装。
- **桌面端兼容**：客户端平台模块（`react`、`react-dom`、`@deepseek-ai/dsh-client-ui-slots`、
  `@deepseek-ai/dsh-client-ui-primitives`）改标为 **optional peer**（`peerDependenciesMeta`）。
  它们由 DSH 客户端的冻结模块表在运行时提供，不属于宿主共享包；不标 optional 会被
  Desktop 的 profile 校验以 `requires missing …` 拒绝加载。

## [0.1.11] - 2026-09-12

### 变更

- **DSH 兼容**：`@deepseek-ai/*` 依赖线对齐 DSH `0.1.5-rc.2`（peer 与 dev 双声明，约束为
  `^0.1.5-rc.2`），并同步 `pnpm-workspace.yaml` 的 release-age 例外清单。
- 本版为纯依赖与元数据对齐，**无功能与行为变更**。运行 `0.1.5-rc.1` / `0.1.5-rc.2` 的 DSH
  实例升级后无需改动任何配置；`0.1.5-rc.2` 相较 `rc.1` 的改动（反馈弹窗确认、交付卡片排版）
  均不触及本插件依赖的 API 与事件。

### 验证

- 双半区 typecheck（host + client）零错误，构建通过。
- 测试 **56/56** 通过（`node --test test/*.test.mjs`）。

## [0.1.10] - 2026-09-08

### 新增

- **通知防重叠探测**：新增 `overlap` 策略，`auto` 模式下检测到屏幕已被其他应用独占
  （如全屏演示、投屏）时自动暂停桌面通知，退出后恢复，避免打断用户当前场景。
- **设置卡片无障碍强化**：开关行的可访问名称、状态语义与键盘可达性对齐官方规范。

### 变更

- **设置开关改用官方 `Switch` 组件**：移除自绘 checkbox 样式，与其他配置卡片视觉一致；
  开关自带 `role="switch"` 与 `aria-label`。注意：替换后点击范围收敛到开关本身，
  不再支持"整行点击"。
- 音效配置精简；macOS 通知通道探测改为动态化。

### 修复

- **深链（deep-link）**：修复临时死区（TDZ）访问与 notification summary 的截断语义，
  收紧相关类型。
- **macOS 兜底链**：`terminal-notifier` 缺失时的 `osascript` 回退路径修正。
- 通知 scope 清理逻辑修正。

### 验证

- 测试 **56/56** 通过；新增系统通知事件、兜底链与通知策略用例。

## [0.1.9] - 2026-09-04

### 修复

- **deep-link 适配 DSH 0.1.2-rc.1 的 token 鉴权**：点击通知跳转改为携带进程 token 的
  `authenticatedUrl`，并把会话 ID 放进 `#session=` fragment，首次点击自动种 cookie，
  解决带鉴权后通知点击落不到目标会话的问题。

[未发布]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.14...v0.2.0
[0.1.11]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/bitterSmilezzz/dsh-notify/releases/tag/v0.1.9
