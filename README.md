# @bittersmilezzz/dsh-notify

**桌面通知（Desktop Notifications）** —— DeepSeek Harness (DSH) 的桌面通知：需要审批 / 需要你回答 / 轮次完成 / 会话结束 / Agent 出错时弹系统原生通知，**点击通知直接回到对应会话**。

通知由渲染进程的 Web Notification API 发出——在桌面 App 里那就是系统原生通知，**发送方身份是 App 本身**，不需要 terminal-notifier / osascript / PowerShell 之类的外部程序，也不需要额外授权或签名。

## 功能

- **六类事件分别开关**：审批（`approval`）/ 提问（`question`）/ 轮次完成（`turn`）/ 会话结束（`sessionDone`）/ 出错（`error`）/ 子代理完成（`subagent`，默认关）
- **点击回到会话**：通知点击 → 聚焦窗口 + 在 App 内切到该会话（不再打开浏览器标签页）
- **按会话聚合**：同一会话的新通知替换上一张卡，并行会话各自独立卡（Windows 除外，见「已知风险」）
- **只在看不见时打扰**：运行时已判定「后台会话跑完」或窗口不在前台时才提醒；正看着那个会话时不打扰。审批与提问是阻塞性的，**始终送达**
- **免打扰时段**：可设起止时间（支持跨午夜）；时段内只静音轮次完成 / 会话结束 / 子代理，审批、提问与出错不受影响
- **隐私开关**：关掉「正文显示详情」后，横幅只显示会话名，不把工作内容带到通知中心
- **声音开关**：关闭后通知静音送达（由系统通道实现）
- **通知文案跟随界面语言**：读官方 locale 设置，中文/英文双语

## 安装

```bash
# npm（推荐）：包名 @bittersmilezzz/dsh-notify
dsh plugin --profile <profile> add @bittersmilezzz/dsh-notify
# 或从 GitHub
dsh plugin --profile <profile> add github:bitterSmilezzz/dsh-notify
# 或本地路径
dsh plugin --profile <profile> add <path-to-repo>
```

启用后开关在**桌面通知**卡片（settings namespace `notify`）。卡片注册到官方
`plugins.bundle.config` 契约，位置在：侧边栏 **Plugins** 面板 → 本插件 → **配置表单**。

> DSH 0.1.6-alpha.2 之前的旧契约 `settings.plugin.item`（设置 → 插件 → 配置）
> 已被上游退役（commit `90af3110b7`），本插件只注册新契约；更早的 DSH 版本会退化
> 为自绘折叠外壳兜底。

**安装/升级插件后需重启宿主生效；开关调整即时生效（拨动即写，无需保存）。**

要求 DSH `0.2.1-rc.2` 及以上（用到 `ctx.uiSession.sessionStatus` 的
`running` / `pendingInteraction` / `completionUnread` 三个事实）。

## 外部依赖

**无。** 通知走渲染进程的 Web Notification API：

- 桌面 App（Electron）：DSH 壳对非 media 权限一律放行（`apps/desktop/src/microphone-permissions.ts`），因此 `Notification.permission` 恒为 `granted`，无授权弹窗，不依赖 App 签名或公证；
- 浏览器：首次需要一次用户手势，设置卡片的「开启通知」按钮负责这一步。

生命周期脚本：**无**（无 preinstall/install/postinstall/prepare）。

## 权限

**权限等级：low**：插件不落盘、不 spawn 子进程、不发起外部网络请求、不读用户文件与会话数据。
client 半区只读取官方事件与状态（`ctx.uiSession.sessionStatus`、`api-session/error`、`ctx.sessions.list`），
并通过 Web Notification 通道投递；host 半区只持有一份 volatile 配置 schema，没有任何副作用。

## 已知风险

- **页面/窗口关闭后收不到通知**：Web Notification 依赖页面存活。桌面 App 收进托盘仍能收；完全退出则不能。
- **Windows 上不发 `tag`**：社区实测带 `tag` 的 `new Notification()` 会被浏览器接受但 toast 永不送达（Zhiyi-Zhao/dsh-notify，单机实测）。因此 Windows 退化为**堆叠**而不是按会话替换——不替换比不弹代价小。
- **macOS 首次通知可能被系统静默抑制**：系统设置里的「专注模式」「定时摘要」会把横幅收进摘要；若一条都看不到，先检查 系统设置 → 通知 → DeepSeek Harness。
- **多个客户端同时在线时会各弹一次**（桌面窗口 + 浏览器标签页）：去重是客户端本地的，跨客户端没有仲裁。
- **免打扰时段按本机时间判定**，跨时区/手动改表期间以当前系统时间为准。
- 若 profile 未装配 `dsh-client-ui-session`（自定义组合），插件会退化为「只有设置卡、不发通知」，不会报错。

## 开发

标准双半区结构，`lib/` 为构建产物：

```bash
pnpm install
pnpm typecheck   # 双 program（host + client），纯检查不产出
pnpm build       # tsc host + tsc client 声明 + tsdown client bundle
pnpm test        # node --test test/*.test.mjs
```

源码结构（host）：`index.ts` 组合器与 volatile Config schema；`notify-policy.ts` 纯策略
（截断、去重键、本地化取词、时钟解析、免打扰判定、tag 策略）。

源码结构（client）：`notifications.ts` 事件订阅与投递控制器；`config.ts` 配置快照与写路径；
`settings-card.tsx` 设置卡片；`locales.ts` 文案；`deep-link.ts` URL 深链。

测试分三层：`notify-policy.test.mjs`（纯函数）、`config-parity.test.mjs`（契约漂移守卫）、
`client-notifications.test.mjs`（**行为测试**：在 Node 里加载真实的 `lib/client.js` 产物，
配假 `Notification` / 假 `ctx`，断言什么事件在什么配置下真的弹了通知、弹出什么、点击后去哪里）。

## License

MIT
