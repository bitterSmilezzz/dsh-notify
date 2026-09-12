# 更新日志

本文件记录 dsh-notify 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.1.10 起建立并回填：0.1.10 之前的历史以 GitHub Release 与 git tag 为准。

## [未发布]

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

[未发布]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.11...HEAD
[0.1.11]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/bitterSmilezzz/dsh-notify/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/bitterSmilezzz/dsh-notify/releases/tag/v0.1.9
