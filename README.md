# @bittersmilezzz/dsh-notify

DeepSeek Harness (DSH) 的**系统级桌面通知（Desktop Notifications）**：审批请求 / 轮次完成 / 后台会话完成 / Agent 出错时弹出系统通知，点击通知直接跳转浏览器对应会话。从 dsh-ui-tweaks 按功能拆分出的独立插件包。

## 功能

- **四类事件分别开关**：审批（approval/request）、轮次完成（agent idle）、会话完成（agent/disposed）、Agent 出错（agent/error，同会话 30s 去重）
- **总开关 + 声音开关**；通知音效为 Web Audio 合成，设置卡片可试听
- **通知文案跟随界面语言**：读官方 locale 设置的偏好（设置 → 通用 → 语言），中文/英文双语；未设置时用中文
- **正文带会话身份**：优先会话标题（官方 `sessionTitle` 服务），无标题时回落模型名——多会话并行时能分辨是哪一个
- **聚焦抑制（分级）**：浏览器页面可见时，「轮次完成 / 会话完成」这类非阻塞通知不再打扰；「审批 / 出错」始终送达（审批是阻塞性的，官方审批 UI 只在对应会话内出现，用户在看别的会话时看不到）
- **点击跳转**：通知携带带进程 token 的地址 + `#session=<id>`（如 `http://127.0.0.1:3080/?token=...#session=<id>`），首次点击自动完成浏览器认证（无需手动打开启动 URL），client 半区 deep-link 自动打开对应会话；兼容旧 `?session=<id>` 形态
- **按平台分派**：
  - macOS：`terminal-notifier`（可点击跳转）→ 缺失或运行失败时 `osascript` 兜底（仅展示）
  - Windows：PowerShell WinRT toast（Win10+ 自带，点击「查看会话」跳转）
  - Linux：`notify-send`（libnotify，多数桌面发行版预装；仅展示，无点击跳转通道）
  - 其他平台：静默跳过

## 安装

```bash
# npm（推荐）：包名 @bittersmilezzz/dsh-notify
dsh plugin --profile <profile> add @bittersmilezzz/dsh-notify
# 或从 GitHub
dsh plugin --profile <profile> add github:bitterSmilezzz/dsh-notify
# 或本地路径
dsh plugin --profile <profile> add <path-to-repo>
```

启用后开关在设置里的**桌面通知**卡片（settings namespace `notify`）。卡片注册了两代官方契约，位置随 DSH 版本而定：

- **旧版 DSH**（`settings.plugin.item`）：设置 → 插件 → 配置 → 桌面通知（折叠卡片）
- **新版 DSH**（`plugins.bundle.config`）：侧边栏 Plugins 面板 → 本插件 → 配置表单

**安装/升级插件后需重启 web profile 生效；开关调整即时生效（拨动即写，无需保存），无需重启。**

## 外部依赖

- macOS：可选 `terminal-notifier`（`/opt/homebrew/bin/` 或 `/usr/local/bin/`，仅有点击跳转需要；缺失自动降级 osascript 仅展示）
- Windows：PowerShell 5+（Win10/11 自带，无第三方依赖）；临时 .ps1 脚本自身 finally 自删，另有两层兜底（JS 30s 定时器 + 启动/写入前清扫陈旧残留），宿主崩溃也不残留堆积
- Linux：可选 `notify-send`（libnotify；未安装时静默跳过）
- 通知走系统级通道，不经浏览器 Notification API
- 生命周期脚本：**无**（无 preinstall/install/postinstall/prepare）

## 权限

**权限等级：medium**（有限范围）：host 半区 spawn 本地通知命令（terminal-notifier / osascript / powershell.exe / notify-send），写入临时 .ps1 脚本（Windows，自删除）；注册一个官方 Connection RPC 通道（`/dsh-notify`，接收浏览器半区的页面可见性上报，走官方 Host/Origin + 浏览器认证围栏）；读取 settings 的 `notify` 与 `locale` namespace。不访问用户文件/会话数据，不发起外部网络请求。通知负载只作为 argv 传入，命令恒为字符串字面量，杜绝命令注入。

## 已知风险

- macOS 通知需在「系统设置 → 通知」中允许宿主 App（终端/Node）发送通知，否则静默丢失；设置卡片提供直达入口。
- terminal-notifier 的点击跳转依赖已废弃的 NSUserNotification 私有 API（macOS 26 上可能失效），届时自动降级为 osascript 仅展示。
- Linux 通知不可点击（notify-send 无可靠的点击回调通道）；声音由桌面主题控制，插件的声音开关在 Linux 上无效。
- 每次点击通知都会由浏览器新开一个标签页（URL 因 `#session=` 而不同，浏览器无法复用已有标签）——deep-link 会在新标签页里自动跳到目标会话。
- 所有通知失败均静默（fire-and-forget），不影响宿主进程。
- 聚焦抑制依赖浏览器半区上报（30s 续期，host 侧 75s 保鲜期）：页面崩溃/断连时最多 75s 后恢复通知；失败方向刻意选「宁可多通知，不可静默失效」。
- settings namespace 使用 `notify`（非 dsh- 前缀）：若与其它插件 namespace 撞名，后注册方会 throw；冲突时需改名为 `dsh-notify`。

## 开发

标准双半区结构，`lib/` 为构建产物：

```bash
pnpm install
pnpm typecheck   # 双 program（host + client），纯检查不产出
pnpm build       # tsc host + tsc client 声明（lib/types/client）+ tsdown client bundle
pnpm test        # node --test test/*.test.mjs
```

源码结构（host）：`index.ts` 组合器与 settings schema；`notify-events.ts` 事件编排（开关/去重/聚焦/文案组装）；`system-notify.ts` 平台通道；`notify-text.ts` 通知文案字典；`notify-policy.ts` 纯策略函数；`presence.ts` 聚焦状态机。

## License

MIT
