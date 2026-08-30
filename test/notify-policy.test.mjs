import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSubagent, summaryOf } from '../lib/notify-policy.js'

test('summaryOf: 空与 undefined 归一为空串', () => {
  assert.equal(summaryOf(undefined), '')
  assert.equal(summaryOf(''), '')
})

test('summaryOf: 折叠换行与连续空白为单空格', () => {
  assert.equal(summaryOf('  第一行\n\n第二行   第三行 '), '第一行 第二行 第三行')
})

test('summaryOf: 恰好等于上限不截断', () => {
  const s = 'x'.repeat(80)
  assert.equal(summaryOf(s, 80), s)
})

test('summaryOf: 超上限截断并补省略号，总长不超过 max', () => {
  const out = summaryOf('y'.repeat(200), 80)
  assert.equal(out.length, 80)
  assert.ok(out.endsWith('…'))
  assert.equal(out, 'y'.repeat(79) + '…')
})

test('summaryOf: max=1 边界不产生空切片', () => {
  assert.equal(summaryOf('abc', 1), 'a…')
})

test('summaryOf: 默认上限 120', () => {
  assert.equal(summaryOf('z'.repeat(300)).length, 120)
})

test('isSubagent: origin 为 subagent 判真', () => {
  assert.equal(isSubagent({ session: { header: { origin: 'subagent' } } }), true)
})

test('isSubagent: 主会话 origin 判假', () => {
  for (const origin of ['main', 'user', 'cli', '']) {
    assert.equal(isSubagent({ session: { header: { origin } } }), false, origin)
  }
})

test('isSubagent: 结构缺层 / null / 非对象一律视为主会话', () => {
  assert.equal(isSubagent(undefined), false)
  assert.equal(isSubagent(null), false)
  assert.equal(isSubagent({}), false)
  assert.equal(isSubagent({ session: {} }), false)
  assert.equal(isSubagent({ session: { header: {} } }), false)
  assert.equal(isSubagent('subagent'), false)
})
