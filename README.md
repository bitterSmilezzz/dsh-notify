# 桌面通知（Desktop Notifications）· dsh-notify

**DeepSeek Harness (DSH) 的桌面通知插件**：需要审批 / 需要你回答 / 轮次完成 / 会话结束 / Agent 出错时弹系统原生通知，**点击通知直接回到对应会话**。

[![npm](https://img.shields.io/npm/v/@bittersmilezzz/dsh-notify)](https://www.npmjs.com/package/@bittersmilezzz/dsh-notify)
[![license](https://img.shields.io/github/license/bitterSmilezzz/dsh-notify)](LICENSE)
[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)

- **仓库**：[github.com/bitterSmilezzz/dsh-notify](https://github.com/bitterSmilezzz/dsh-notify)
- **npm**：[@bittersmilezzz/dsh-notify](https://www.npmjs.com/package/@bittersmilezzz/dsh-notify)
- **问题反馈**：[Issues](https://github.com/bitterSmilezzz/dsh-notify/issues)
- **更新日志**：[CHANGELOG.md](CHANGELOG.md)
- **伞仓库（契约与校验）**：[bitterSmilezzz/dsh-plugins](https://github.com/bitterSmilezzz/dsh-plugins)

通知由渲染进程的 Web Notification API 发出——在桌面 App 里那就是系统原生通知，**发送方身份是 App 本身**，不需要 terminal-notifier / osascript / PowerShell 之类的外部程序，也不需要额外授权或签名。

## 功能

- **六类事件分别开关**：审批（`approval`）/ 提问（`question`）/ 轮次完成（`turn`）/ 会话结束（`sessionDone`）/ 出错（`error`）/ 子代理完成（`subagent`，默认关）
- **点击回到会话**：通知点击 → 聚焦窗口 + 在 App 内切到该会话（不再打开浏览器标签页）。
  导航走官方 `uiWorkspace.openSession`；DSH 0.1.x 的组合回落到 `sessions.open`
- **按会话聚合**：同一会话的新通知替换上一张卡，并行会话各自独立卡（Windows 除外，见「已知风险」）
- **只在看不见时打扰**：运行时已判定「后台会话跑完」或窗口不在前台时才提醒；正看着那个会话时不打扰。审批与提问是阻塞性的，**始终送达**
- **免打扰时段**：可设起止时间（支持跨午夜）；时段内只静音轮次完成 / 会话结束 / 子代理，审批、提问与出错不受影响
- **隐私开关**：关掉「正文显示详情」后，横幅只显示会话名，不把工作内容带到通知中心
- **按事件分类的音效**：音色由插件用 Web Audio 合成——Web Notification 无法指定音色，
  系统声只能开关、不能选。审批/提问上行双音、出错下行小三度、轮次完成单音轻响、
  会话结束双音下行；同类 300ms 节流，全部 ≤0.6s 且低增益。
  关闭时不出声，**系统提示音也一并关掉**（不会「关了还响」）
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

### 兼容性

要求 DSH `0.2.1-rc.2` 及以上（用到 `ctx.uiSession.sessionStatus` 的
`running` / `pendingInteraction` / `completionUnread` 三个事实，以及
`ctx.uiWorkspace.openSession` 会话导航入口）。

Node.js `^22.19.0 || >=24.0.0`。

## 外部依赖

**无。** 通知走渲染进程的 Web Notification API：

- 桌面 App（Electron）：DSH 壳对非 media 权限一律放行（`apps/desktop/src/microphone-permissions.ts`），因此 `Notification.permission` 恒为 `granted`，无授权弹窗，不依赖 App 签名或公证；
- 浏览器：首次需要一次用户手势，设置卡片的「开启通知」按钮负责这一步。

运行时依赖：**零**（官方 `@deepseek-ai/*` 包全部声明为 `peerDependencies`，由宿主的模块表提供）。

生命周期脚本：**无**（无 preinstall/install/postinstall/prepare，安装时不执行任何构建或第三方代码）。

## 权限

**权限等级：`low`**：插件不落盘、不 spawn 子进程、不发起外部网络请求、不读用户文件与会话数据。
client 半区只读取官方事件与状态（`ctx.uiSession.sessionStatus`、`api-session/error`、`ctx.sessions.list`），
并通过 Web Notification 通道投递；host 半区只持有一份 volatile 配置 schema，没有任何副作用。

| 能力 | 是否使用 |
| --- | --- |
| 文件读写 | 否 |
| 子进程 / Shell | 否 |
| 网络请求 | 否 |
| 凭据访问 | 否 |
| 读取会话内容 | 否（只读会话标题与运行状态） |
| 系统通知 | 是（Web Notification） |

## 已知风险

- **页面/窗口关闭后收不到通知**：Web Notification 依赖页面存活。桌面 App 收进托盘仍能收；完全退出则不能。
- **按会话替换，不堆叠**：同一会话的「轮次完成 / 出错 / 会话结束」互相替换，
  只留一条；并行会话各自独立。Windows 上同样成立——桌面版（Electron 44.7.0）
  实测带 `tag` 的通知**照常送达**，且同 `tag` 的第二条会替换第一条。
  只有「Windows + 浏览器」不发 `tag`（社区实测带 tag 不送达，单机结论，
  保守起见保留）。
- **审批 / 提问的通知不会被后续事件顶掉**：这两类带 `requireInteraction`，
  留在通知中心等人处理，且用独立的 `tag`。Windows 上关闭一条 toast 会把它
  **从通知中心摘掉**，若被同会话随后发生的「轮次完成 / 出错 / 会话结束」
  顶掉，用户回到电脑只看到一条无关提示，需要处理的请求凭空消失。
  信息类通知之间照常替换，审批卡与它们并存。
- **Windows 通知的来源署名是宿主 App 本身**（即 `DeepSeek Harness`），不是插件：
  通知由渲染进程的 Web Notification 发出，Windows 把它记在宿主 App 的身份下。
  若在 Windows「设置 → 系统 → 通知」里关掉该来源，本插件的通知会静默不弹。
- **macOS 首次通知可能被系统静默抑制**：系统设置里的「专注模式」「定时摘要」会把横幅收进摘要；若一条都看不到，先检查 系统设置 → 通知 → DeepSeek Harness。
- **多个客户端同时在线时会各弹一次**（桌面窗口 + 浏览器标签页）：去重是客户端本地的，跨客户端没有仲裁。
- **免打扰时段按本机时间判定**，跨时区/手动改表期间以当前系统时间为准。
- 若 profile 未装配 `dsh-client-ui-session`（自定义组合），插件会退化为「只有设置卡、不发通知」，不会报错。
- **导航入口缺失时只聚焦不跳转**：`uiWorkspace`（0.2 起）与旧版 `sessions.open` 都没有的组合下，
  点击通知仍会聚焦窗口并关闭卡片，跳转失败在开发者控制台留一条 `[dsh-notify]` 提示。

## 分发渠道

本插件通过以下公开渠道分发，主分发形态是 **npm 预构建包**（安装时无需构建）：

| 渠道 | 状态 |
| --- | --- |
| npm | [@bittersmilezzz/dsh-notify](https://www.npmjs.com/package/@bittersmilezzz/dsh-notify) |
| GitHub | [bitterSmilezzz/dsh-notify](https://github.com/bitterSmilezzz/dsh-notify)（每版打 tag） |
| awesome-dsh-plugin | 社区策展列表（`data/plugins/bitterSmilezzz__dsh-notify.yml`） |
| DSH-Store | 第三方商城，遵循[目录准入规则](https://github.com/AI-Scarlett/dsh-safe-plugin-manager/blob/main/registry/README.md) |
| dsh-market | 内置插件市场（读取同一份 catalog） |

**DSH-Store 准入自检**：固定源（40 位 commit）/ manifest 与 tag 一致 / 入口 ID 唯一且不动任何
`@deepseek-ai/*` 官方组件 / 无生命周期脚本 / 权限等级 `low` 已披露 / `npm run validate:registry` 通过。
校验脚本：

```bash
npm run validate:registry
```

## 开发

标准双半区结构，`lib/` 为构建产物：

```bash
pnpm install
pnpm typecheck          # 双 program（host + client），纯检查不产出
pnpm build              # tsc host + tsc client 声明 + tsdown client bundle
pnpm test               # node --test test/*.test.mjs
pnpm validate:registry  # DSH-Store 准入自检
```

源码结构（host）：`index.ts` 组合器与 volatile Config schema；`notify-policy.ts` 纯策略
（截断、去重键、本地化取词、时钟解析、免打扰判定、tag 策略）。

源码结构（client）：`notifications.ts` 事件订阅与投递控制器；`navigation.ts` 会话导航缝
（点击通知 / deep-link 共用，`uiWorkspace.openSession`，缺失时回落旧版 `sessions.open`）；
`config.ts` 配置快照与写路径；`settings-card.tsx` 设置卡片；`locales.ts` 文案；
`deep-link.ts` URL 深链。

测试分三层：`notify-policy.test.mjs`（纯函数）、`config-parity.test.mjs`（契约漂移守卫）、
`client-notifications.test.mjs`（**行为测试**：在 Node 里加载真实的 `lib/client.js` 产物，
配假 `Notification` / 假 `ctx`，断言什么事件在什么配置下真的弹了通知、弹出什么、点击后去哪里）。

## License

MIT
