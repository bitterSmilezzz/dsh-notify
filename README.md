# dsh-notify

DeepSeek Harness (DSH) 的**系统级桌面通知（Desktop Notifications）**：审批请求 / 轮次完成 / 后台会话完成 / Agent 出错时弹出系统通知，点击通知直接跳转浏览器对应会话。从 dsh-ui-tweaks 按功能拆分出的独立插件包。

## 功能

- 四类事件分别开关：审批（approval/request）、轮次完成（agent idle）、会话完成（agent/disposed）、Agent 出错（agent/error，同会话 30s 去重）
- 总开关 + 声音开关；通知音效为 Web Audio 合成（四类各不相同），设置卡片可试听
- **点击跳转**：通知携带 `http://127.0.0.1:3080/?session=<id>`，client 半区 deep-link 自动打开对应会话
- 按平台分派：macOS 用 terminal-notifier（可点击，缺失时 osascript 兜底仅展示）；Windows 用 PowerShell WinRT toast（Win10+ 自带，点击「查看会话」跳转）；其他平台静默跳过

## 安装

```bash
dsh plugin --profile <profile> add github:bitterSmilezzz/dsh-notify
# 或本地路径
dsh plugin --profile <profile> add <path-to-repo>
```

启用后通知开关在 **「设置 → 插件 → 配置」→ 桌面通知** 卡片（settings namespace `notify`），重启 web profile 生效。

## 外部依赖

- macOS：可选 `terminal-notifier`（`/opt/homebrew/bin/` 或 `/usr/local/bin/`，仅有点击跳转需要；缺失自动降级 osascript 仅展示）
- Windows：PowerShell 5+（Win10/11 自带，无第三方依赖）
- 通知走系统级（terminal-notifier / osascript / WinRT toast），不经浏览器 Notification API

## 权限

**权限等级：medium**（有限范围）：host 半区 spawn 本地通知命令（terminal-notifier / osascript / powershell.exe），写入临时 .ps1 脚本（Windows，自删除）；不访问用户文件/会话数据，不发起网络请求。通知负载只作为 argv 传入，命令恒为字符串字面量，杜绝命令注入。

## 已知风险

- macOS 通知需在「系统设置 → 通知」中允许宿主 App（终端/Node）发送通知，否则静默丢失；设置卡片提供直达入口。
- terminal-notifier 的点击跳转依赖已废弃的 NSUserNotification 私有 API（macOS 26 上可能失效），届时自动降级为 osascript 仅展示。
- 所有通知失败均静默（fire-and-forget），不影响宿主进程。

## 开发

标准双半区结构，`lib/` 为构建产物：

```bash
pnpm install
pnpm typecheck   # 双 program（host + client）
pnpm build       # tsc host + tsdown client bundle
```

## License

MIT