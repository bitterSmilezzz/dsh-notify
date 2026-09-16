/**
 * 设置卡片的开关控件契约：所有开关一律走官方
 * `@deepseek-ai/dsh-client-ui-primitives` 的 `Switch`（对齐官方设置面板；
 * 官方控件自带 `role="switch"` / `aria-label` / `aria-checked`）。
 *
 * 这条钉子防的是「又冒出一个自绘 `input[type=checkbox][role=switch]`」——
 * 0.1.14 之前「音效」行正是这种残留，与官方组件层重叠。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const card = readFileSync(join(root, 'src', 'client', 'settings-card.tsx'), 'utf8')

test('设置卡片：开关一律使用官方 Switch，不得残留自绘 input 开关', () => {
  assert.match(card, /import \{ Switch \} from '@deepseek-ai\/dsh-client-ui-primitives'/)
  // 断言针对「标记」而不是散文：注释里提到这些属性名不该让测试变红。
  assert.doesNotMatch(card, /<input[^>]*type="checkbox"/, '自绘 checkbox 已对齐官方 Switch，不得回流')
  assert.doesNotMatch(card, /<input[^>]*role="switch"/, '开关角色必须由官方 Switch 提供，不得手写 input')
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
