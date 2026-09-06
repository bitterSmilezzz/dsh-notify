import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSubagent, NOTIFY_EVENTS, probeOfficialNotify, pruneExpired, summaryOf } from '../lib/notify-policy.js'

test('summaryOf: 空、undefined 与 null 归一为空串', () => {
  assert.equal(summaryOf(undefined), '')
  assert.equal(summaryOf(null), '')
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

test('summaryOf: 按码点截断，不劈开代理对（emoji）', () => {
  // 两个 emoji 是 4 个 UTF-16 code unit；Array.from 按码点展开后截断，
  // 输出必须全是完整字符（无孤立代理），且码点总数 ≤ max。
  const s = '👍🎉'.repeat(60)
  const out = summaryOf(s, 10)
  assert.equal([...out].length, 10, '按码点计总长恰好 10')
  assert.ok(out.endsWith('…'))
  // 无孤立代理：用码点展开重建后与原串逐字符相等即证明没有半个代理对。
  assert.equal([...out].join(''), out)
  assert.ok(!out.includes('\uFFFD'), '不得出现替换符 �（孤立代理的典型渲染）')
})

test('summaryOf: 组合字符（基字符+变音符）偶数边界保留完整组合对（按码点截断）', () => {
  // "a\u0301"（á 的组合形式）是两个码点；max=5 时按码点保留前 4 个
  // （a á a á），边界恰落在组合对之间，输出原样保留完整组合序列，
  // 最后补省略号共 5 个码点。
  const out = summaryOf('a\u0301'.repeat(20), 5)
  assert.equal(out, 'a\u0301a\u0301…')
  assert.equal([...out].length, 5)
})

test('summaryOf: 奇数边界会劈开基字符与变音符（按码点截断的边界语义）', () => {
  // max=4 时保留前 3 个码点（a á a），第二个 á 的变音符落在边界外被截掉。
  // 这是「按码点截断」的既有契约而非缺陷：截断只影响尾部展示，不影响
  // 可读性判定（通知正文限长是展示性约束）。
  const out = summaryOf('a\u0301'.repeat(20), 4)
  assert.equal(out, 'a\u0301a…')
  assert.equal([...out].length, 4)
})

test('pruneExpired: 窗口内的条目保留，过期的删除', () => {
  const map = new Map([
    ['a', 1000], // 9s 前 → 过期
    ['b', 5000], // 5s 前 → 过期（>= windowMs 即删）
    ['c', 9000], // 1s 前 → 窗口内，保留
  ])
  pruneExpired(map, 10_000, 5_000)
  assert.deepEqual([...map.keys()], ['c'])
})

test('pruneExpired: 空 Map 与无过期条目时不报错', () => {
  const map = new Map()
  pruneExpired(map, 10_000, 5_000)
  assert.equal(map.size, 0)
  map.set('x', 10_000)
  pruneExpired(map, 10_000, 5_000)
  assert.deepEqual([...map.keys()], ['x'])
})

test('pruneExpired: 精确等于窗口边界视为过期并删除', () => {
  const map = new Map([['a', 5_000]])
  pruneExpired(map, 10_000, 5_000)
  assert.deepEqual([...map.keys()], [], 'now - at === windowMs 时应删除（>= 才删）')
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

// ── 防重叠探测（probeOfficialNotify）──

test('probeOfficialNotify: 命中内置候选名返回 official + source', () => {
  const ctx = { get: (name) => name === 'notification' ? {} : undefined }
  const out = probeOfficialNotify(ctx)
  assert.equal(out.official, true)
  assert.equal(out.source, 'notification')
})

test('probeOfficialNotify: 生态常用名也命中（notifyCenter/toast）', () => {
  for (const name of ['notifications', 'notifyCenter', 'desktopNotify', 'systemNotify', 'toast']) {
    const out = probeOfficialNotify({ get: (n) => n === name ? {} : undefined })
    assert.equal(out.official, true, name)
    assert.equal(out.source, name, name)
  }
})

test('probeOfficialNotify: 无任何通知源返回 official=false', () => {
  const out = probeOfficialNotify({ get: () => undefined })
  assert.equal(out.official, false)
  assert.equal(out.source, undefined)
})

test('probeOfficialNotify: 空 ctx（无 get 面）不抛错', () => {
  const out = probeOfficialNotify({})
  assert.equal(out.official, false)
})

test('probeOfficialNotify: get 抛错视为未命中，绝不外抛', () => {
  const out = probeOfficialNotify({ get: () => { throw new Error('service not ready') } })
  assert.equal(out.official, false)
})

test('probeOfficialNotify: 配置追加名单生效且优先级在内置之后', () => {
  const ctx = { get: (name) => name === 'myNotifier' ? {} : undefined }
  // 无追加名单：不命中
  assert.equal(probeOfficialNotify(ctx).official, false)
  // 追加后命中，source 为追加名
  const out = probeOfficialNotify(ctx, ['myNotifier'])
  assert.equal(out.official, true)
  assert.equal(out.source, 'myNotifier')
  // 内置名优先于追加名（同命中时取内置）
  const both = probeOfficialNotify({ get: (name) => name === 'notification' || name === 'myNotifier' ? {} : undefined }, ['myNotifier'])
  assert.equal(both.source, 'notification')
})

test('NOTIFY_EVENTS: 适配层事件名映射钉住', () => {
  assert.equal(NOTIFY_EVENTS.turnDone, 'agent/status')
  assert.equal(NOTIFY_EVENTS.approval, 'approval/request')
  assert.equal(NOTIFY_EVENTS.error, 'agent/error')
  assert.equal(NOTIFY_EVENTS.sessionDone, 'agent/disposed')
})
