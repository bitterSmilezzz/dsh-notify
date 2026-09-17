/**
 * 设置卡片的控件与契约钉子：
 *  1) 所有开关一律走官方 `@deepseek-ai/dsh-client-ui-primitives` 的 `Switch`
 *     （对齐官方设置面板；官方控件自带 `role="switch"` / `aria-label` /
 *     `aria-checked`）。这条钉子防的是「又冒出一个自绘
 *     `input[type=checkbox][role=switch]`」——0.1.14 之前「音效」行正是这种
 *     残留，与官方组件层重叠。
 *  2) 卡片同时注册两代官方 slot 契约（旧 `settings.plugin.item`、新
 *     `plugins.bundle.config`），且两个注册共用同一组件——DSH 0.1.6 期间换过
 *     插件配置架构，只注册一个会让卡片在其中一代运行时里彻底消失。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const card = readFileSync(join(root, 'src', 'client', 'settings-card.tsx'), 'utf8')
const entry = readFileSync(join(root, 'src', 'client', 'index.ts'), 'utf8')

test('设置卡片：开关一律使用官方 Switch，不得残留自绘 input 开关', () => {
  assert.match(
    card,
    /import \{[^}]*\bSwitch\b[^}]*\} from '@deepseek-ai\/dsh-client-ui-primitives'/,
    'Switch 必须从官方 primitives 导入',
  )
  // 断言针对「标记」而不是散文：注释里提到这些属性名不该让测试变红。
  assert.doesNotMatch(card, /<input[^>]*type="checkbox"/, '自绘 checkbox 已对齐官方 Switch，不得回流')
  assert.doesNotMatch(card, /<input[^>]*role="switch"/, '开关角色必须由官方 Switch 提供，不得手写 input')
})

test('设置卡片：折叠箭头用官方图标，不自绘 svg', () => {
  assert.match(
    card,
    /import \{[^}]*\bIconChevronDownOutline14\b[^}]*\} from '@deepseek-ai\/dsh-client-ui-primitives'/,
    'chevron 必须用官方图标组件',
  )
  assert.doesNotMatch(card, /<svg\b/, '不得自绘 svg 图标（与官方组件层重叠）')
})

test('设置卡片：音效行由官方 Switch 承载，且仍写回 config.sound', () => {
  const start = card.indexOf("t('notifySound')")
  const end = card.indexOf("t('notifyTest')")
  assert.notEqual(start, -1, '音效行标题不得消失')
  assert.notEqual(end, -1, '试听按钮不得消失')
  const soundRow = card.slice(start, end)
  assert.match(soundRow, /<Switch\b/, '音效开关必须是官方 Switch')
  assert.match(soundRow, /checked=\{config\.sound\}/, '开关状态仍取自 config.sound')
  assert.match(
    soundRow,
    /setConfig\('sound', \(\) => \{ config\.sound = !config\.sound \}\)/,
    '翻转仍走既有的 setConfig 就地改写',
  )
  assert.match(soundRow, /label=\{t\('notifySound'\)\}/, '无障碍名仍由本地化词条提供')
})

test('设置卡片：同时注册旧 settings.plugin.item 与新 plugins.bundle.config 两代契约', () => {
  assert.match(entry, /slots\.inject\('settings\.plugin\.item'/, '旧契约（设置 → 插件 → 插件配置）必须注册')
  assert.match(entry, /name: 'settings\.plugin\.item'/)
  assert.match(entry, /key: NS/, '旧契约的 key 是 settings namespace')
  assert.match(entry, /slots\.inject\('plugins\.bundle\.config'/, '新契约（插件详情页）必须注册')
  assert.match(entry, /name: 'plugins\.bundle\.config'/)
  assert.match(entry, /key: PACKAGE_NAME/, '新契约的 key 是 bundle 的 package name')
  // 两个注册必须共用同一个 occupant（行为一致，避免两条渲染路径漂移）。
  assert.match(entry, /const card = \(props: NotifyCardOwnerProps\)/, '两个注册共用 card occupant')
})

test('设置卡片：新契约的 view 分支齐备（summary 一行 / page 表单 / 无 view 走旧外壳）', () => {
  assert.match(card, /view === 'summary'/, '必须处理 summary 视图')
  assert.match(card, /view === 'page'/, '必须处理 page 视图')
  assert.match(card, /LegacyCardShell/, '无 view（旧契约）时走自绘折叠外壳')
  // 旧契约的自绘外壳必须保留官方 PluginCard 同款的展开/收起无障碍名。
  assert.match(card, /t\(open \? 'collapse' : 'expand'\)/, '折叠头必须带官方同款无障碍名')
})
