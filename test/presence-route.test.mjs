/**
 * 聚焦上报路由（src/presence-route.ts）：
 *   - 协议：POST JSON `{ visible: boolean }` → 204；畸形 → 400；非 POST → 405；
 *   - 信任围栏：官方 connection.requestRejection 判定 401/403 时直接短路
 *     （不解析 body、不回调 report）；
 *   - handler 内异常一律吞掉回 500（通知是增益不是依赖，绝不影响宿主）。
 * 路由注册用注入替身（不起真实服务器），直连 src 走 node 原生 type-stripping。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { PRESENCE_ROUTE, registerPresenceRoute } = await import('../src/presence-route.ts')

/** 假请求：异步可迭代的 body。 */
function makeReq(method, body) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  return {
    method,
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk },
  }
}

/** 假响应：记录状态码。 */
function makeRes() {
  const seen = { status: undefined }
  return { seen, res: { writeHead: (status) => { seen.status = status }, end: () => {} } }
}

/** 装一次路由，返回 { path, call(req, res), reports, disposed }。 */
function mount(options = {}) {
  const registered = []
  const reports = []
  const dispose = registerPresenceRoute({
    register: (route) => { registered.push(route); return () => { registered.pop() } },
    guard: options.guard ?? (() => undefined),
    report: (visible) => { reports.push(visible) },
  })
  assert.equal(registered.length, 1, '注册一条路由')
  return { route: registered[0], reports, dispose }
}

test('聚焦路由: 路径是精确的 /api/dsh-notify/presence（与 client 半区一致）', () => {
  const { route } = mount()
  assert.equal(PRESENCE_ROUTE, '/api/dsh-notify/presence')
  assert.equal(route.kind, 'exact', '必须是 exact route（不与 /api prefix 通道抢路）')
  assert.equal(route.path, PRESENCE_ROUTE)
})

test('聚焦路由: 合法 POST 回 204 并回调 report(visible)', async () => {
  const { route, reports } = mount()
  const a = makeRes()
  await route.handler(makeReq('POST', { visible: true }), a.res)
  assert.equal(a.seen.status, 204)
  const b = makeRes()
  await route.handler(makeReq('POST', { visible: false }), b.res)
  assert.equal(b.seen.status, 204)
  assert.deepEqual(reports, [true, false], '按顺序上报可见性')
})

test('聚焦路由: 畸形 payload（缺字段/非布尔/非 JSON/空 body）一律 400 且不回调', async () => {
  const { route, reports } = mount()
  const cases = [
    { visible: 'yes' },
    { visible: 1 },
    {},
    null,
    undefined, // 空 body
  ]
  for (const body of cases) {
    const { seen, res } = makeRes()
    await route.handler(makeReq('POST', body), res)
    assert.equal(seen.status, 400, `payload ${JSON.stringify(body)} 应回 400`)
  }
  assert.deepEqual(reports, [], '畸形输入不得触发上报')
})

test('聚焦路由: 非 JSON body（解析失败）回 400', async () => {
  const { route, reports } = mount()
  const req = {
    method: 'POST',
    async *[Symbol.asyncIterator]() { yield Buffer.from('not-json{') },
  }
  const { seen, res } = makeRes()
  await route.handler(req, res)
  assert.equal(seen.status, 400)
  assert.deepEqual(reports, [])
})

test('聚焦路由: 非 POST 方法回 405（GET/HEAD/DELETE）', async () => {
  const { route, reports } = mount()
  for (const method of ['GET', 'HEAD', 'DELETE']) {
    const { seen, res } = makeRes()
    await route.handler(makeReq(method, { visible: true }), res)
    assert.equal(seen.status, 405, `${method} 应回 405`)
  }
  assert.deepEqual(reports, [], '方法不符不得触发上报')
})

test('聚焦路由: 信任围栏 401/403 直接短路（不解析 body、不回调）', async () => {
  for (const rejection of [401, 403]) {
    const { route, reports } = mount({ guard: () => rejection })
    const { seen, res } = makeRes()
    await route.handler(makeReq('POST', { visible: true }), res)
    assert.equal(seen.status, rejection, `围栏判定 ${rejection} 时原样返回`)
    assert.deepEqual(reports, [], '围栏拒绝时不得触发上报')
  }
})

test('聚焦路由: body 超限（>4KB）回 400，不缓冲无限增长', async () => {
  const { route } = mount()
  const big = 'x'.repeat(8192)
  const req = {
    method: 'POST',
    async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify({ visible: true, pad: big })) },
  }
  const { seen, res } = makeRes()
  await route.handler(req, res)
  assert.equal(seen.status, 400)
})

test('聚焦路由: handler 内异常被吞掉回 500（绝不冒泡进宿主）', async () => {
  const { route } = mount({ guard: () => { throw new Error('guard exploded') } })
  const { seen, res } = makeRes()
  await route.handler(makeReq('POST', { visible: true }), res)
  assert.equal(seen.status, 500)
})

test('聚焦路由: dispose 可回收（随 fiber 卸载）', () => {
  const { dispose } = mount()
  assert.equal(typeof dispose, 'function')
  dispose() // 幂等：不抛错
})
