# 更新日志

本文件记录 dsh-notify 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.1.10 起建立并回填：0.1.10 之前的历史以 GitHub Release 与 git tag 为准。

## [0.3.6] - 2026-09-25

### 修复

- **「零引用 ⇒ optional」口径守卫改为只认真实 import 形态**（Code Review 发现，中危）：
  原判据用 `content.includes(packageName)` 判断某 peer 是否被引用，于是**注释里点名该包
  也算「已引用」**——而这条钉子的存在目的正是「防止再漏标 optional」，一把被自己的注释
  喂饱的尺子量不出下一次漏标（asr-voice 的头注释此前已宣称「排除注释」，实现却与旧版
  一字不差，属注释宣称 A、代码做 B）。改动已做变异实证：把 `src/client/index.ts` 唯一
  真实 import 换成注释并剥掉 optional，旧守卫**仍然全绿**。
  现改为先剥块注释与引号外的行注释，再匹配真实 import 形态（`from '<pkg>'` /
  `from '<pkg>/sub'` / 动态 `import('<pkg>')`，包名整体匹配，`pkg` 与 `pkg-extra`
  不会互相冒认），并新增 2 条单元钉子（形态表 + 与口径共用同一判据的变异验证）。

- **审批调用点钉子的窗口定位改为结构切片**（Code Review 发现，低危）：原窗口用
  `indexOf('NOTIFY_EVENTS.approval')` 定位，找到的是常量 import 行而非 handler 起点，
  且宽度固定 4000 字符（当前 handler 全长 3183，余量 817）——审批分支一旦增长，超出
  部分静默不再被覆盖。现从 `ctx.on(NOTIFY_EVENTS.approval` 起、到下一个 `ctx.on(` 止。

### 测试

- 新增 `referencesPackage` 形态单元测试与「零引用扫描不会被注释喂成恒真」变异测试
  （破坏 → 变红已实测），审批窗口改为结构切片后补切片自检。

## [0.3.5] - 2026-09-25

### 修复

- **`dsh.client.inject` 移除已退役契约的包，`dsh-client-ui-settings-plugins` 补标 optional**
  （Code Review 发现，低危）：本插件的设置卡片自 0.2.1 起只注册官方 `plugins.bundle.config`
  契约（DSH 0.1.6-alpha.2 退役了 `settings.plugin.item`，见上游 commit `90af3110b7`），
  而 `@deepseek-ai/dsh-client-ui-settings-plugins` 是那个旧座位的提供方——该包在 rc.2
  只剩 Settings → Plugins 的导航入口与表格 chrome，`src/` 与 `test/` 对本插件零引用。
  现从 `dsh.client.inject` 列表移除它（不再作为一个「要加载的依赖」被拉起），
  peer+dev 双列保留（声明对官方设置外壳的版本下限）并按同一把尺子补标 `optional`，
  与 asr-voice / model-selector 的口径对齐。运行时行为不变：宿主侧 peer 兼容校验
  （`evaluatePluginCompatibility`）只比较版本区间，不读 `peerDependenciesMeta`。

### 测试

- 新增 `test/deps-double-listing.test.mjs`（3 条）：把「`@deepseek-ai/*` 依赖必须
  peer+dev 双列」「两侧版本范围一致（cordis / schemastery 按宽松策略豁免）」
  「src/test 零引用的 peer 必须标 optional」三条判据钉住。第三条即上文口径的守卫，
  已通过「剥掉 optional → 变红并精确点名」的反向验证。
- 新增 `test/approval-callsite.test.mjs`（2 条）：**调用点级**守卫——审批通知正文必须经
  `approvalDetailOf(req, preferenceOf())` 取词，且不得直接读 `req.reason` /
  `req.displayReason`。原有 `notify-policy.test.mjs` 测的是纯函数本体，覆盖不到
  「调用点绕过纯函数」：若有人把 `notify-events.ts` 改回直接读 `reason`，纯函数测试仍会
  全绿而用户收到的又变成未经本地化的内部表述。已通过反向验证（替身改动后两条均变红）。

## [0.3.4] - 2026-09-25

### 修复

- **审批通知改用 rc.2 的本地化提示文本 `displayReason`**：DSH `0.1.7-rc.2` 给审批事件
  （`approval/request`）新增可选字段 `displayReason`（`{ en, [locale] }` 字典，官方注释
  明确「仅用于展示、不进入审批审计事件」），而 `reason` 是给审计用的原始文本。此前通知只展
  示 `reason`，用户收到的可能是未经本地化的内部表述。现在优先按当前语言偏好取
  `displayReason`（解析顺序：精确 locale 键 → 主子标签 → `en` → 字典首个非空值；
  与官方 `locale.resolveText` 同向但在「空串视为缺失」等两处边角刻意不同，源码注释有记录），
  `displayReason` 缺失或畸形时回落 `reason`，两者都缺失时只展示工具名——
  旧版协议与只填 `reason` 的 asker 行为不变。取词逻辑为纯函数
  （`notify-policy.ts` 的 `approvalDetailOf` / `localizedTextOf`），畸形字典一律不抛错
  （通知是增益不是依赖），并补 8 条回归用例（含 `undefined` 载荷）。

## [0.3.3] - 2026-09-25

### 修复

- **补齐 `minimumReleaseAgeExclude` 白名单中的 DSH `0.1.7-rc.2`**（本地开发/CI 被 supply-chain
  策略误拦的修复）：0.1.7-rc.2 于 2026-09-24 下午发布，本仓库白名单此前只登记到 `0.1.7-rc.1`，
  而 pnpm 12 的 `minimumReleaseAge`（默认 24h，CLI 与 `.npmrc` 均无法关闭）会把 lockfile 中
  发布未满 24h 的版本判为策略失败——于是本地任何带依赖检查的 pnpm script（`test` /
  `typecheck` / `build` / `pnpm install --frozen-lockfile`）全部以
  `ERR_PNPM_LOCKFILE_SUPPLY_CHAIN_POLICY` 中断（65 个 lockfile 条目验证失败），
  而本仓库的 `publish.yml` 不安装依赖，所以发布时不会暴露该问题。
  现将 67 条 rc 行统一追加 `|| 0.1.7-rc.2`。
- 验证：`pnpm install --frozen-lockfile` EXIT 0（177 entries 全部通过策略校验）、
  lockfile 零改动、`pnpm test` 107 passed / 0 failed、双 program typecheck 与 `pnpm build` EXIT 0。
- 运行时行为无变化（`lib/` 产物未变）：这是一次纯构建/策略配置修复。

## [0.3.2] - 2026-09-24

### 变更

- **`@deepseek-ai/*` 依赖对齐到 DSH `0.1.7-rc.2`**：peerDependencies 与 devDependencies
  双列同步升级（`dsh-agent` / `dsh-api-session-controller` / `dsh-client-connection` /
  `dsh-client-locale` / `dsh-client-ui-plugin-manager` / `dsh-client-ui-primitives` /
  `dsh-client-ui-renderer` / `dsh-client-ui-settings` / `dsh-client-ui-settings-plugins` /
  `dsh-client-ui-slots` / `dsh-settings` / `dsh-user-approval`）。
- **未做源码适配**：已核对 rc.1→rc.2 的破坏性变更面——`plugins.bundle.config` 设置座位契约
  未变；Cordis 事件 `agent/status` / `agent/error` / `approval/request` 类型未变；
  `ui-primitives` 的导出新增（`MenuSurface` / `ShortcutKeys` / `observeComposition` /
  `focusWithoutRing` / `useModalLayer` 等）与删除（`OnboardingSurface`）本插件均未引用；
  `Switch` 组件样式调整不影响其 props 契约。
- 验证：107 用例全绿 + host/client 双 program typecheck + `pnpm build`。

## [0.3.1] - 2026-09-24

### 修复

- **删除已失效的 host 侧 namespace 常量**（静默失效家族的可诊断性修复）：
  `NOTIFY_SETTINGS_NAMESPACE` 的值是 `'notify'`，而 0.1.7 起 namespace 由 profile entry id
  提供、本插件的 entry id 是 `'dsh-notify'`——两者已经分叉，且该常量在 0.1.7 之后
  **没有任何调用方**。留着它就是第二个真相源：日后有人照它改名，会出现「host 用 notify /
  client 用 dsh-notify」的半边失效。现删除该导出，改由
  `test/config-parity.test.mjs` 的 entry-id 钉子守住「client `NOTIFY_ENTRY_ID` ==
  cordis.patch.yml 的 `id`」。
- CHANGELOG 版本段修正：已发布的 0.3.0 此前顶着 `## [未发布]`（与 npm / git tag 不一致），
  改回 `## [0.3.0] - 2026-09-23` 并同步底部 compare 链接，与「三包统一版本号 + 日期」的
  规范一致（该格式也是 model-selector publish workflow 的版本段门禁所要求的）。
- `cordis.patch.yml` 补文件末尾换行（历史遗留的格式问题，不影响解析）。

### 工程

- `test/config-parity.test.mjs` 新增两条钉子：① entry id 三方一致
  （cordis.patch.yml 的 `id` / client `NOTIFY_ENTRY_ID` / host 不得再定义自己的常量）；
  ② `setConfig` 的 `set` 返回 `false` 与 reject 都必须广播 `dsh-notify:config-error`
  （0.1.7 起 `set` 返回 `Promise<boolean>`，这是唯一的行为变化分支，此前无回归覆盖）。

## [0.3.0] - 2026-09-23

### 变更（破坏性）

- **适配 DSH 0.1.7-rc.1 的设置架构迁移**（上游 `601d6761e4` profile-backed forms）：
  host 半区原先的 `ctx.settings.register(namespace, schema)` **已被上游移除**
  （`SettingsProvider` → `SettingsForms`，只剩 `configure/describe/update/replace/mutate`），
  改为在入口模块顶层导出 `Config` + `apply(ctx, config)` 函数插件，配置由 Cordis 作为第二参
  注入；client 半区的 `ctx.settingsScope.bind({namespace})` → `ctx.configForms.get(entryId)`。
  **对使用者无行为影响**：六个开关（总开关 / 审批 / 轮次完成 / 会话完成 / 出错 / 音效）
  的名称、默认值、点击即写的交互都不变，设置卡仍渲染在侧边栏 Plugins → 本插件 → 配置表单。
- 依赖对齐：`@deepseek-ai/*` 全部 devDependencies 与 peerDependencies 抬到
  `^0.1.7-rc.1`。旧版 peer range（`^0.1.6-alpha.2`）在 0.1.7 运行时下经 semver 判定仍兼容
  （`includePrerelease`），但 0.1.7 起上游会强制校验插件 peer 并把不满足的整行 entry 禁用，
  故一并抬齐。

### 工程

- Config schema 六个字段全部标 `.volatile()`：0.1.7 起没有 volatile 标记的 entry 不会进入
  `describe()`，官方配置页与 client 写入会**静默失效**（无编译错、无运行错）。
- 官方图标改名跟随：`IconChevronDownOutline14` → `IconChevronDownOutlineRegular`。
- `cordis.patch.yml` 移除 `inject: [settings]`（settings 不再是 Cordis service）。

## [0.2.0] - 2026-09-17

### 新增

- **Linux 平台支持**：`notify-send`（libnotify）展示型通知，未安装时静默跳过。
  通知不可点击（notify-send 无可靠的点击回调通道），声音由桌面主题控制（本插件的声音
  开关在 Linux 上无效）——两者都在 README 与设置卡片文案里写明。
- **通知文案本地化**：host 侧通知标题/正文跟随官方 locale 设置的偏好（设置 → 通用 → 语言），
  中文/英文双语；读不到偏好时回落中文（此前一律硬编码中文，英文界面用户收到中文通知）。
- **正文带会话标题**：优先官方 `sessionTitle` 服务折叠出的会话标题，无标题时回落模型名
  （此前正文只有模型名，多会话并行时无法分辨是哪一个会话）。
- **聚焦抑制（分级）**：浏览器半区把页面可见性 POST 到 `/api/dsh-notify/presence`（精确 HTTP
  路由，信任围栏复用官方 `connection.requestRejection`：Host/Origin 检查 + 浏览器认证），
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

## [未发布]

### 修复

- **修复 host 侧四类通知全部静默失效（P0）**：`sessionOpenUrl` 用 `ctx.connection` 属性访问
  connection 服务，而本 fiber 的 `inject` 只有 `['settings']`——Cordis 的 traceable proxy 对
  未声明的 service 属性抛 `cannot get property "connection" without inject`，且抛点在
  `try` 之外，被 handler 外层的 `safe()` 静默吞掉 → 轮次完成 / 审批 / 出错 / 会话完成
  一条都不发。改为 `ctx.get('connection')`（无 inject 要求，与官方 dsh-web-app 读 webServer
  同款）；测试 harness 同步复刻 Cordis 的 inject 契约（未声明 key 的属性访问即抛错），
  并新增 3 条钉子断言「inject 不含 connection 时四类事件仍全部通知」。
- **会话完成通知不再带失效深链**：`agent/disposed` 后 session 已从列表快照移除，点击通知
  时 client deep-link 会等满 15s 超时仍打不开，反而像「点击失灵」。该通知改为不可点击
  （会话已销毁，跳过去也没有可打开的对象）。

### 变更

- 适配 DSH 0.1.6-alpha.2：删除已退役的 `settings.plugin.item` 契约注册，只保留官方
  `plugins.bundle.config`（0.2.0 的「双契约注册」条目由本条目取代）；`view` 缺省时仍保留
  自绘折叠外壳兜底。
- README 修正「通知音效为 Web Audio 合成」的说法：提示音走系统通道（macOS Glass /
  Windows toast 音），Web Audio 只服务设置卡片试听。

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

[0.3.1]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.14...v0.2.0
[0.1.11]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/bitterSmilezzz/dsh-notify/releases/tag/v0.1.9
