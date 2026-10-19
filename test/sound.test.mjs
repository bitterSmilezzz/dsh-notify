/**
 * 通知音效行为测试：驱动真实 `lib/client.js`，断言「哪个事件响什么音、什么时候不响」。
 *
 * 覆盖纯函数测不到的那一半：音色随事件类别投影、声音开关、节流、无声环境的
 * 静默降级，以及与系统提示音不叠加（通知恒 silent）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadClientBundle, makeClientContext } from './helpers/client-harness.mjs'
import { SOUND_PATTERNS } from '../src/notify-policy.ts'

/** 装载一份全新的插件实例 + 假环境。 */
function setup(options = {}) {
  const bundle = loadClientBundle(options)
  const harness = makeClientContext(options)
  bundle.exports.apply(harness.ctx)
  harness.setSessions(options.rows ?? [{ id: 's1', title: '会话一' }])
  harness.pushStatus(options.status ?? { s1: { running: true } })
  return { bundle, harness, notifications: bundle.notifications, audio: bundle.audio }
}

/** 播放过的频率序列。 */
function frequencies(audio) {
  return audio.played.map((p) => p.frequency)
}

test('音色随事件类别投影：审批上行、出错下行', () => {
  const { harness, audio } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  assert.deepEqual(frequencies(audio), SOUND_PATTERNS.approval.map((t) => t.frequency))

  const second = setup()
  second.harness.pushError('s1', 'boom')
  assert.deepEqual(frequencies(second.audio), SOUND_PATTERNS.error.map((t) => t.frequency))
})

test('轮次完成只响一个音，出错响两个音（轻重可区分）', () => {
  const turn = setup()
  turn.bundle.globals.document.visibilityState = 'hidden'
  turn.harness.pushStatus({ s1: { running: false } })
  assert.equal(turn.audio.played.length, SOUND_PATTERNS.turn.length)
  assert.equal(turn.audio.played.length, 1)

  const error = setup()
  error.harness.pushError('s1', 'boom')
  assert.equal(error.audio.played.length, 2)
})

test('声音开关关闭时不发声，但通知照常投递', () => {
  const { harness, notifications, audio } = setup({ config: { sound: false } })
  harness.pushError('s1', 'boom')
  assert.equal(notifications.instances.length, 1, '通知仍要送达')
  assert.deepEqual(audio.played, [], '不发声')
})

test('通知恒带 silent：音色由本插件合成，不与系统提示音叠加', () => {
  const { harness, notifications } = setup()
  harness.pushError('s1', 'boom')
  assert.equal(notifications.instances[0].options.silent, true)
})

test('关闭声音时通知同样 silent（关掉的是「有没有声音」，不是「哪种声音」）', () => {
  const { harness, notifications } = setup({ config: { sound: false } })
  harness.pushError('s1', 'boom')
  assert.equal(notifications.instances[0].options.silent, true)
})

test('节流：同类音效 300ms 内只响一次，不同类别互不影响', () => {
  const bundle = loadClientBundle()
  const harness = makeClientContext()
  bundle.exports.apply(harness.ctx)
  harness.setSessions([{ id: 's1', title: '会话一' }, { id: 's2', title: '会话二' }])
  harness.pushStatus({ s1: { running: true }, s2: { running: true } })

  // 同类别连发两条（不同会话）：只响一次。
  harness.pushError('s1', 'boom')
  const afterFirst = bundle.audio.played.length
  assert.ok(afterFirst > 0)
  harness.pushError('s2', 'other boom')
  assert.equal(bundle.audio.played.length, afterFirst, '同类音效被节流')

  // 不同类别：不受前一类的节流影响。
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  assert.ok(bundle.audio.played.length > afterFirst, '不同类别另响')
})

test('运行时不提供 AudioContext 时静默降级，通知照常投递', () => {
  const { harness, notifications, audio } = setup({ audio: false })
  assert.doesNotThrow(() => harness.pushError('s1', 'boom'))
  assert.equal(notifications.instances.length, 1, '通知仍送达')
  assert.deepEqual(audio.played, [])
})

test('AudioContext 随 fiber 卸载而关闭（不泄漏）', () => {
  // harness 把每个 ctx.effect 的返回值收进 harness.effects：逐个调用即模拟
  // client fiber 卸载。音效预热必须把自己的 disposer 交出去，否则 context 泄漏。
  const { bundle, harness } = setup()
  harness.pushError('s1', 'boom')
  assert.equal(bundle.audio.created, 1, '播放时创建了 context')
  for (const dispose of harness.effects) dispose()
  assert.equal(bundle.audio.closed, 1, '卸载时关闭 context')
})

test('每个图案都短于 0.7 秒且增益受限（不喧宾夺主）', () => {
  for (const [kind, tones] of Object.entries(SOUND_PATTERNS)) {
    const end = Math.max(...tones.map((t) => t.start + t.duration))
    assert.ok(end <= 0.7, `${kind} 时长 ${end}s 超过 0.7s`)
    for (const tone of tones) {
      assert.ok(tone.gain > 0 && tone.gain <= 0.2, `${kind} 增益 ${tone.gain} 越界`)
      assert.ok(tone.frequency >= 200 && tone.frequency <= 2000, `${kind} 频率 ${tone.frequency} 越界`)
    }
  }
})
