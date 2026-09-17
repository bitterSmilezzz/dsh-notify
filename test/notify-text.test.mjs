/**
 * 通知文案字典（src/notify-text.ts）的回归钉子：
 *  1) zh/en 的 key 集必须完全一致——英文漏译时中文用户读得到、英文用户读
 *     到 `undefined`，是通知类插件最容易漏的静默退化；
 *  2) 取词函数 notifyTextOf 只认主语言子标签（`en-US` → en），其余一切
 *     缺失/畸形偏好回落中文，且**绝不抛错**（通知是增益不是依赖）。
 *
 * 纯数据 + 纯函数，直连 src（node 原生 type-stripping），无需注入替身。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { NOTIFY_TEXTS, ZH_NOTIFY_TEXT, EN_NOTIFY_TEXT, notifyTextOf } = await import('../src/notify-text.ts')

/** 字符串型条目（Named 变体是函数，单独断言）。 */
const STRING_FIELDS = [
  'turnTitle',
  'turnBody',
  'approvalTitle',
  'approvalToolFallback',
  'errorTitle',
  'errorUnknown',
  'sessionDoneTitle',
  'sessionDoneBody',
]
/** 函数型条目：接收会话身份（会话标题或模型名）并回显。 */
const NAMED_FIELDS = ['turnBodyNamed', 'sessionDoneBodyNamed']

test('文案字典: zh 与 en 的 key 集完全一致，NOTIFY_TEXTS.zh 就是同一份中文对象', () => {
  assert.deepEqual(
    Object.keys(ZH_NOTIFY_TEXT).sort(),
    Object.keys(EN_NOTIFY_TEXT).sort(),
    'zh/en key 集必须一致（漏译会让英文偏好读到 undefined）',
  )
  assert.deepEqual(
    Object.keys(NOTIFY_TEXTS).sort(),
    ['en', 'zh'],
    '字典索引只含 zh/en 两种语言',
  )
  assert.equal(NOTIFY_TEXTS.zh, ZH_NOTIFY_TEXT, 'NOTIFY_TEXTS.zh 必须与导出的中文对象同引用')
  assert.equal(NOTIFY_TEXTS.en, EN_NOTIFY_TEXT, 'NOTIFY_TEXTS.en 必须与导出的英文对象同引用')
  assert.deepEqual(
    Object.keys(ZH_NOTIFY_TEXT).sort(),
    [...STRING_FIELDS, ...NAMED_FIELDS].sort(),
    '字段集与 NotifyText 契约一致（新增/删除字段必须同步测试与两端文案）',
  )
})

test('文案字典: 字符串字段全为非空，Named 函数回显传入的会话身份', () => {
  for (const [locale, text] of Object.entries(NOTIFY_TEXTS)) {
    for (const field of STRING_FIELDS) {
      assert.equal(typeof text[field], 'string', `${locale}.${field} 必须是字符串`)
      assert.notEqual(text[field].trim(), '', `${locale}.${field} 不得为空文案（空标题的通知不可读）`)
    }
    for (const field of NAMED_FIELDS) {
      assert.equal(typeof text[field], 'function', `${locale}.${field} 必须是函数`)
      const rendered = text[field]('X')
      assert.equal(typeof rendered, 'string', `${locale}.${field}('X') 必须返回字符串`)
      assert.ok(rendered.includes('X'), `${locale}.${field} 必须回显会话身份（多会话可区分）`)
      assert.notEqual(rendered.trim(), '', `${locale}.${field}('X') 不得为空文案`)
      // 防御路径：会话身份读不出（undefined）或为空串时不得抛错（通知是增益不是依赖）。
      assert.doesNotThrow(() => text[field](undefined), `${locale}.${field} 对 undefined 入参不得抛错`)
      assert.doesNotThrow(() => text[field](''), `${locale}.${field} 对空串入参不得抛错`)
    }
  }
})

test('notifyTextOf: en 系偏好（含大小写与空白）取英文文案', () => {
  for (const preference of ['en', 'en-US', 'EN', ' en ', 'en_GB']) {
    const text = notifyTextOf(preference)
    assert.equal(text, EN_NOTIFY_TEXT, `偏好 ${JSON.stringify(preference)} 必须取英文字典`)
    assert.equal(text.turnTitle, 'Turn finished', `偏好 ${JSON.stringify(preference)} 的英文标题`)
  }
})

test('notifyTextOf: 中文/缺失/畸形偏好一律回落中文（含非字符串）', () => {
  for (const preference of ['zh', 'zh-CN', undefined, null, '', 123, {}, 'fr']) {
    const text = notifyTextOf(preference)
    assert.equal(text, ZH_NOTIFY_TEXT, `偏好 ${JSON.stringify(preference)} 必须回落中文字典`)
    assert.equal(text.turnTitle, '轮次完成', `偏好 ${JSON.stringify(preference)} 的中文标题`)
  }
})

test('notifyTextOf: 对任意畸形输入绝不抛错（通知是增益不是依赖）', () => {
  const weird = [undefined, null, '', '   ', 0, 1, 123, NaN, true, false, {}, [], () => {}, Symbol('x'), 10n, new Date(0), Object.create(null)]
  // 描述符必须自带兜底：Symbol / BigInt / 无原型对象用 String() 会抛错。
  const label = (value) => {
    try {
      return typeof value === 'symbol' || typeof value === 'bigint' ? String(value) : JSON.stringify(value) ?? typeof value
    } catch {
      return Object.prototype.toString.call(value)
    }
  }
  for (const preference of weird) {
    assert.doesNotThrow(() => notifyTextOf(preference), `notifyTextOf 对 ${label(preference)} 不得抛错`)
    assert.equal(notifyTextOf(preference), ZH_NOTIFY_TEXT, `${label(preference)} 不是 en 系偏好，必须回落中文`)
  }
})
