/**
 * 聚焦感知状态机（src/presence.ts）的回归钉子。
 *
 * 语义要点：
 *  - payload 只接受 `{ visible: boolean }`，其余（非对象 / visible 非布尔）
 *    一律 undefined 由调用方拒绝——畸形 payload 不得污染可见状态；
 *  - 抑制条件是「可见 且 上报在 TTL 内」，判定是 `< TTL`（恰好到期即恢复
 *    通知：宁可多通知，不可静默失效）；
 *  - 多标签页 last-write-wins（最近一次上报为准）。
 *
 * 纯状态机无 I/O，直连 src；时刻一律注入，不依赖真实时钟。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  PRESENCE_TTL_MS,
  parsePresencePayload,
  createPresenceTracker,
} = await import('../src/presence.ts')

test('聚焦常量: TTL 与契约一致（client 每 30s 续期，容忍两次丢失）', () => {
  assert.equal(PRESENCE_TTL_MS, 75_000, 'TTL 75s')
})

test('parsePresencePayload: 只接受 { visible: boolean }，正常路径取布尔值', () => {
  assert.equal(parsePresencePayload({ visible: true }), true, 'visible:true 解析为 true')
  assert.equal(parsePresencePayload({ visible: false }), false, 'visible:false 解析为 false')
  assert.equal(parsePresencePayload({ visible: true, extra: 'ignored' }), true, '多余字段不影响解析')
})

test('parsePresencePayload: 非对象 / visible 非布尔一律 undefined（绝不抛错）', () => {
  const malformed = [null, undefined, 'x', 123, {}, { visible: 'yes' }, { visible: 1 }, { visible: null }, [], true]
  for (const payload of malformed) {
    assert.doesNotThrow(() => parsePresencePayload(payload), `payload ${JSON.stringify(payload)} 不得抛错`)
    assert.equal(
      parsePresencePayload(payload),
      undefined,
      `payload ${JSON.stringify(payload)} 必须被判为不合法（否则畸形上报会污染可见状态）`,
    )
  }
})

test('tracker: 初始不抑制；report(true) 后在 TTL 边界内抑制、到期即恢复', () => {
  const tracker = createPresenceTracker()
  assert.equal(tracker.shouldSuppress(1000), false, '未收到上报时不得抑制（失败方向是多通知）')
  tracker.report(true, 1000)
  assert.equal(tracker.shouldSuppress(1000), true, '刚上报可见即抑制')
  assert.equal(tracker.shouldSuppress(1000 + PRESENCE_TTL_MS - 1), true, 'TTL 内（-1ms）仍抑制')
  assert.equal(tracker.shouldSuppress(1000 + PRESENCE_TTL_MS), false, 'TTL 到期（恰好 = TTL）必须恢复通知')
  assert.equal(tracker.shouldSuppress(1000 + PRESENCE_TTL_MS + 1), false, '超期后不抑制')
})

test('tracker: report(false) 立即恢复通知；last-write-wins 取最近一次上报', () => {
  const tracker = createPresenceTracker()
  tracker.report(true, 5000)
  assert.equal(tracker.shouldSuppress(5000), true, '可见时抑制')
  tracker.report(false, 5000)
  assert.equal(tracker.shouldSuppress(5000), false, '上报不可见后立刻恢复通知')
  // 多标签页：后到的上报覆盖前一次（含「可见 → 不可见」方向）。
  tracker.report(true, 6000)
  tracker.report(false, 6001)
  assert.equal(tracker.shouldSuppress(6001), false, '后到的 false 覆盖先前的 true')
  tracker.report(true, 7000)
  tracker.report(true, 7001)
  assert.equal(tracker.shouldSuppress(7001 + PRESENCE_TTL_MS - 1), true, 'TTL 从最近一次上报起算，不是第一次')
})

test('tracker: 省略 now 参数时用 Date.now()（client/host 生产路径形态）', () => {
  const tracker = createPresenceTracker()
  tracker.report(true)
  assert.equal(tracker.shouldSuppress(), true, '不传时刻时按真实时钟判定，刚上报应抑制')
  tracker.report(false)
  assert.equal(tracker.shouldSuppress(), false, '不传时刻时 report(false) 后应恢复通知')
})
