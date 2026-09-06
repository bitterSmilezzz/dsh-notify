import { test } from 'node:test'
import assert from 'node:assert/strict'

// 直连 src（node 26 原生 type-stripping；本模块只依赖 node 内建与类型擦除）。
const mod = await import('../src/client/deep-link.ts')
const { sessionIdFromLocation } = mod

test('deep-link 解析：优先 #session= fragment（rc.1 token 鉴权新形态）', () => {
  // token 交换后浏览器落在 `/`，fragment 被 303 重定向保留。
  assert.equal(sessionIdFromLocation('', '#session=abc123'), 'abc123')
  assert.equal(sessionIdFromLocation('?token=t1', '#session=abc123'), 'abc123')
  // fragment 带额外参数时仍能取到 session。
  assert.equal(sessionIdFromLocation('', '#session=abc123&from=notify'), 'abc123')
})

test('deep-link 解析：回落 ?session= 查询参数（旧形态）', () => {
  assert.equal(sessionIdFromLocation('?session=old-id', ''), 'old-id')
  // 旧形态与新形态并存时 fragment 优先。
  assert.equal(sessionIdFromLocation('?session=old-id', '#session=new-id'), 'new-id')
})

test('deep-link 解析：两者皆缺失或为空返回 null', () => {
  assert.equal(sessionIdFromLocation('', ''), null)
  assert.equal(sessionIdFromLocation('?token=t1', ''), null)
  assert.equal(sessionIdFromLocation('?session=', '#session='), null)
  assert.equal(sessionIdFromLocation('?foo=bar', '#baz=qux'), null)
})

test('deep-link 解析：特殊字符经 URL 编码往返一致', () => {
  // sessionId 可能含空格/加号/中文等，host 侧 encodeURIComponent 编码进 hash，
  // URLSearchParams 解析时解码回原值——往返必须一致。
  for (const id of ['a b', 'a+b', 'a&b', '中文会话', 'a#b', 'a/b?c=1']) {
    const encoded = encodeURIComponent(id)
    assert.equal(sessionIdFromLocation('', `#session=${encoded}`), id, id)
    assert.equal(sessionIdFromLocation(`?session=${encoded}`, ''), id, id)
  }
})
