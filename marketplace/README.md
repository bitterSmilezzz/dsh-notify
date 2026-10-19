# marketplace/

各插件市场的投稿材料。每个市场一条，内容是**可复制的投稿载荷**，不是运行时资源
（`files` 白名单不含本目录，不进 npm 包）。

## awesome-dsh-plugin

`bitterSmilezzz__dsh-notify.yml` 是整个投稿：复制到
`awesome-dsh-plugin/awesome-dsh-plugin` 的 `data/plugins/` 下，开一个只含该文件的 PR。

已在本仓库本地验证：`node scripts/generate-readme.mjs` 能生成恰好一行，且分类
`notify` 在允许取值表内。`README.md` / `README.zh.md` 由维护方脚本生成，**不要手工提交**。

投稿前置（[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)）：

- 仓库声明 `dsh.bundle` manifest，并在旁边有 `cordis.patch.yml`（本仓库满足）；
- 仓库添加 `dsh-plugin` topic（已加）；
- 仓库创建满 1 天（2026-08-27 创建，满足）；
- 官方 `@deepseek-ai/*` 用 `peerDependencies` 而非 `dependencies`（本仓库零运行时依赖）；
- 描述属实、不带营销词。

## DSH-Store

不需要投稿文件：商城走 GitHub Issue 表单自动预检，读取仓库默认分支的
`package.json` + `cordis.patch.yml` + README。本地自检用
`npm run validate:registry`（见 `scripts/validate-registry.mjs`）。

## dsh-market / 插件内嵌市场索引

两者都消费同一份 catalog（`dsh-plugin-catalog` 的 format-1 `index.json`），由
awesome-dsh-plugin 的条目与 npm 发布信息生成，**不需要单独投稿**。卡片上展示的
兼容性来自 `package.json` 的 `engines.dsh`（存在时优先于 peerDependencies）与 README 截图。
