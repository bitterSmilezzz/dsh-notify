/**
 * 审批通知调用点钉子（源码级文本断言，风格同 settings-card-switch.test.mjs）。
 *
 * 防的是「纯函数测全绿、调用点却绕过纯函数」这一类静默不一致：
 * `notify-policy.test.mjs` 测的是 `approvalDetailOf` 本身，覆盖不到它有没有被调用。
 * rc.2 引入 `displayReason` 后的正确形态是「审批通知正文经 approvalDetailOf 取词」——
 * 若有人把调用点改回直接读 `req.reason`，纯函数测试仍会全绿，而用户收到的又变成
 * 未经本地化的内部表述。这条钉子把调用点钉住。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const events = readFileSync(join(root, 'src', 'notify-events.ts'), 'utf8')

test('审批通知正文必须经 approvalDetailOf 取词（调用点守卫）', () => {
  assert.match(
    events,
    /const detailText = approvalDetailOf\(req, preferenceOf\(\)\)/,
    '审批分支必须用 approvalDetailOf 取词（优先 displayReason、缺失回落 reason）',
  )
})

test('审批通知不得直接展示 req.reason 或 req.displayReason（绕过本地化取词）', () => {
  const start = events.indexOf('NOTIFY_EVENTS.approval')
  assert.notEqual(start, -1, '找不到审批事件处理器：源码结构变了，钉子必须同步更新')
  const handler = events.slice(start, start + 4000)
  assert.doesNotMatch(handler, /req\.reason\b/, '不得绕过 approvalDetailOf 直接读 reason')
  assert.doesNotMatch(handler, /req\.displayReason\b/, '不得绕过 approvalDetailOf 直接读 displayReason')
})
