/**
 * 通知门控纯函数测试。这些函数是所有投递决策的判据本体——控制器只负责把
 * 事件喂进来，所以这里每条边界都要有用例，尤其是「坏输入一律不静音」的方向。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  approvalDetailOf, errorDedupKey, isTurnEnd, localizedTextOf, notificationTagOf,
  parseClockMinutes, pruneExpired, quietHoursActive, sessionLabelOf, summaryOf,
} from '../lib/notify-policy.js'

test('summaryOf: 空、undefined 与 null 归一为空串', () => {
  assert.equal(summaryOf(undefined), '')
  assert.equal(summaryOf(null), '')
  assert.equal(summaryOf(''), '')
})

test('summaryOf: 折叠换行与连续空白为单空格', () => {
  assert.equal(summaryOf('  第一行\n\n第二行   第三行 '), '第一行 第二行 第三行')
})

test('summaryOf: 恰好等于上限不截断', () => {
  assert.equal(summaryOf('x'.repeat(80), 80), 'x'.repeat(80))
})

test('summaryOf: 超上限截断并补省略号，总长不超过 max', () => {
  const out = summaryOf('y'.repeat(200), 80)
  assert.equal(out.length, 80)
  assert.ok(out.endsWith('…'))
})

test('summaryOf: max=1 边界不产生空切片', () => {
  assert.equal(summaryOf('abc', 1), 'a…')
})

test('summaryOf: 按码点截断，不劈开代理对', () => {
  const out = summaryOf('😀😀😀😀', 3)
  assert.equal(out, '😀😀…')
  // 孤立代理会产生 U+FFFD，这里必须没有。
  assert.doesNotMatch(out, /\uFFFD/u)
})

test('pruneExpired: 只删过期条目，窗口内的保留', () => {
  const map = new Map([['old', 0], ['fresh', 9_500]])
  pruneExpired(map, 10_000, 5_000)
  assert.deepEqual([...map.keys()], ['fresh'])
})

test('errorDedupKey: 同一会话同一信息同键，不同信息不同键', () => {
  assert.equal(errorDedupKey('s1', 'boom'), errorDedupKey('s1', 'boom'))
  assert.notEqual(errorDedupKey('s1', 'boom'), errorDedupKey('s1', 'other'))
  assert.notEqual(errorDedupKey('s1', 'boom'), errorDedupKey('s2', 'boom'))
})

test('localizedTextOf: 精确 locale 优先于主子标签，再回落 en', () => {
  const dict = { en: 'Approve?', zh: '批准？', 'zh-tw': '核准？' }
  assert.equal(localizedTextOf(dict, 'zh-TW'), '核准？')
  assert.equal(localizedTextOf(dict, 'zh-CN'), '批准？')
  assert.equal(localizedTextOf(dict, 'fr'), 'Approve?')
})

test('localizedTextOf: 空串视为缺失继续回落（不展示空横幅）', () => {
  assert.equal(localizedTextOf({ en: 'Fallback', zh: '' }, 'zh'), 'Fallback')
})

test('localizedTextOf: 畸形字典不抛错', () => {
  assert.equal(localizedTextOf(null, 'zh'), undefined)
  assert.equal(localizedTextOf(42, 'zh'), undefined)
  assert.equal(localizedTextOf({}, 'zh'), undefined)
  assert.equal(localizedTextOf({ zh: 7 }, 'zh'), undefined)
  assert.equal(localizedTextOf('纯字符串', 'zh'), '纯字符串')
})

test('approvalDetailOf: displayReason 优先，缺失回落 reason，都没有则 undefined', () => {
  assert.equal(approvalDetailOf({ displayReason: { en: 'Localized' }, reason: 'raw' }, 'en'), 'Localized')
  assert.equal(approvalDetailOf({ reason: 'raw' }, 'en'), 'raw')
  assert.equal(approvalDetailOf({}, 'en'), undefined)
  assert.equal(approvalDetailOf(undefined, 'en'), undefined)
})

test('sessionLabelOf: 空白标题视为无标签', () => {
  assert.equal(sessionLabelOf('会话一'), '会话一')
  assert.equal(sessionLabelOf('   '), undefined)
  assert.equal(sessionLabelOf(''), undefined)
  assert.equal(sessionLabelOf(undefined), undefined)
})

test('parseClockMinutes: 接受 9:05 与 09:05', () => {
  assert.equal(parseClockMinutes('09:05'), 545)
  assert.equal(parseClockMinutes('9:05'), 545)
  assert.equal(parseClockMinutes('00:00'), 0)
  assert.equal(parseClockMinutes('23:59'), 1439)
})

test('parseClockMinutes: 非法输入一律 undefined（不静音的方向）', () => {
  for (const bad of ['', '24:00', '12:60', 'nope', '12', '12:5', '-1:00', undefined, null]) {
    assert.equal(parseClockMinutes(bad), undefined, `应拒绝 ${String(bad)}`)
  }
})

test('quietHoursActive: 同日区间', () => {
  assert.equal(quietHoursActive(13 * 60, 12 * 60, 14 * 60), true)
  assert.equal(quietHoursActive(15 * 60, 12 * 60, 14 * 60), false)
  // 左闭右开：起点算在内，终点不算。
  assert.equal(quietHoursActive(12 * 60, 12 * 60, 14 * 60), true)
  assert.equal(quietHoursActive(14 * 60, 12 * 60, 14 * 60), false)
})

test('quietHoursActive: 跨午夜区间折返', () => {
  assert.equal(quietHoursActive(23 * 60, 22 * 60, 8 * 60), true)
  assert.equal(quietHoursActive(3 * 60, 22 * 60, 8 * 60), true)
  assert.equal(quietHoursActive(12 * 60, 22 * 60, 8 * 60), false)
})

test('quietHoursActive: 起止相同视为未配置（不能变成全天静音）', () => {
  assert.equal(quietHoursActive(0, 8 * 60, 8 * 60), false)
  assert.equal(quietHoursActive(12 * 60, 8 * 60, 8 * 60), false)
})

test('notificationTagOf: 非 Windows 按会话替换，Windows 不发 tag', () => {
  assert.equal(notificationTagOf('MacIntel', 's1'), 'dsh-notify:s1')
  assert.equal(notificationTagOf('Linux x86_64', 's1'), 'dsh-notify:s1')
  assert.equal(notificationTagOf('Win32', 's1'), undefined)
  assert.equal(notificationTagOf('Windows NT 10.0; Win64; x64', 's1'), undefined)
  // macOS 的 platform 串是 Darwin：`\bwin` 不能在这里命中（否则 mac 会被误判成 Windows）。
  assert.equal(notificationTagOf('Darwin', 's1'), 'dsh-notify:s1')
  assert.equal(notificationTagOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 's1'), 'dsh-notify:s1')
})

test('isTurnEnd: 只有 running true → false 才算一轮结束', () => {
  assert.equal(isTurnEnd(true, false), true)
  assert.equal(isTurnEnd(false, false), false)
  assert.equal(isTurnEnd(undefined, false), false)
  assert.equal(isTurnEnd(true, true), false)
  assert.equal(isTurnEnd(false, true), false)
})
