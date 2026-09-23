/**
 * 两端配置一致性钉子（源码级文本断言，风格同 settings-card-switch.test.mjs）。
 *
 * 防的是「配置漂移」这一类静默 bug：host settings schema 是权威源，client
 * 半区（NotifyConfig / DEFAULTS / bindConfigScope）是它的镜像。任一侧新增、
 * 改名或删除字段而另一侧没跟上时，表现是「开关点了没反应 / 设置不生效」，
 * 编译期完全无感——只能靠这三方字段集比对钉住。
 *
 * 同时钉住已删除的防重叠探测（overlap / probeServices）不得回流：那一轮
 * 优化的结论是「探针不可靠 + 与官方组件层重叠」，回流等于把噪音加回来。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const hostIndex = readFileSync(join(root, 'src', 'index.ts'), 'utf8')
const clientConfig = readFileSync(join(root, 'src', 'client', 'config.ts'), 'utf8')
const { zh, en } = await import('../src/client/locales.ts')

/** 提取源码里某段文本（正则捕获组 1）；缺失即测试失败（防正则静默失效）。 */
function blockOf(source, pattern, label) {
  const matched = source.match(pattern)
  assert.ok(matched, `${label}：正则未命中（源码结构变了，测试必须同步更新而不是静默放过）`)
  return matched[1]
}
/** 从一段源码块中按缩进提取字段名（排序后便于 deepEqual）。 */
function fieldsOf(block, pattern) {
  return [...block.matchAll(pattern)].map((m) => m[1]).sort()
}

// DSH 0.1.7 起 host 配置是入口模块顶层导出的 `export const Config = z.object({...})`
// （profile-backed forms，entry id 即 namespace），不再是 apply 内的
// `ctx.settings.register(ns, z.object({...}))`。
const schemaFields = fieldsOf(
  blockOf(hostIndex, /export const Config = z\.object\(\{([\s\S]*?)\n\}\)/, 'host Config schema'),
  /^\s{2}(\w+):/gm,
)
const interfaceFields = fieldsOf(
  blockOf(clientConfig, /export interface NotifyConfig \{([\s\S]*?)\n\}/, 'client NotifyConfig 接口'),
  /^\s{2}(\w+)\??:/gm,
)
const defaultsFields = fieldsOf(
  blockOf(clientConfig, /export const DEFAULTS: NotifyConfig = \{([\s\S]*?)\n\}/, 'client DEFAULTS'),
  /^\s{2}(\w+):/gm,
)

test('locales: zh 与 en 的 key 集完全一致，且无 overlap 残留词条', () => {
  const zhKeys = Object.keys(zh).sort()
  const enKeys = Object.keys(en).sort()
  assert.deepEqual(zhKeys, enKeys, 'zh/en 词条 key 集必须一致（漏译会让界面出现空文案）')
  assert.ok(zhKeys.length > 0, '词条表不得为空')
  const overlapKeys = zhKeys.filter((key) => key.toLowerCase().startsWith('overlap'))
  assert.deepEqual(overlapKeys, [], '防重叠功能已删除，不得残留 overlap* 词条')
  // 每个词条都要有非空文案（key 在、值为空同样表现为界面空白）。
  for (const key of zhKeys) {
    assert.notEqual(String(zh[key]).trim(), '', `zh.${key} 文案不得为空`)
    assert.notEqual(String(en[key]).trim(), '', `en.${key} 文案不得为空`)
  }
})

test('配置字段集三方一致: host schema / NotifyConfig 接口 / DEFAULTS（防两端漂移）', () => {
  assert.ok(schemaFields.length > 0, 'host schema 必须解析出字段（否则断言形同虚设）')
  assert.deepEqual(
    schemaFields,
    interfaceFields,
    'host settings schema 字段集必须与 client NotifyConfig 接口一致（新增字段要两端同步）',
  )
  assert.deepEqual(
    interfaceFields,
    defaultsFields,
    'NotifyConfig 接口字段集必须与 DEFAULTS 键集一致（缺默认值会让快照出现 undefined）',
  )
  assert.deepEqual(
    schemaFields,
    ['approval', 'enabled', 'error', 'sessionDone', 'sound', 'turn'],
    '配置字段集是契约的一部分：改名/删字段必须显式同步此断言与 client 半区',
  )
})

test('host schema: 已删除的 overlap / probeServices 不得回流', () => {
  assert.doesNotMatch(hostIndex, /\boverlap\b/, 'overlap 配置已删除（防重叠探测不可靠，勿回流）')
  assert.doesNotMatch(hostIndex, /\bprobeServices\b/, 'probeServices 配置已删除，勿回流')
  // client 半区：断言针对代码标记（字段名/字符串字面量），注释里提到旧字段名不该让测试变红。
  assert.doesNotMatch(clientConfig, /\bnext\.overlap\b|\bconfig\.overlap\b|['"]overlap['"]/, 'client 半区不得残留 overlap 处理分支')
  assert.doesNotMatch(clientConfig, /\bprobeServices\b/, 'client 半区不得残留 probeServices')
})

test('bindConfigScope: 逐字段白名单写入（每个 boolean 字段都有 typeof 守卫，无 overlap 分支）', () => {
  const body = blockOf(
    clientConfig,
    /export function bindConfigScope\(ctx: ClientContext\): \(\) => void \{([\s\S]*?)\n\}/,
    'bindConfigScope 函数体',
  )
  for (const field of interfaceFields) {
    assert.match(
      body,
      new RegExp(`typeof next\\.${field} === 'boolean'`),
      `bindConfigScope 必须对 ${field} 显式做 typeof 守卫（白名单写入，不整对象合并）`,
    )
    assert.match(
      body,
      new RegExp(`config\\.${field} = next\\.${field}`),
      `bindConfigScope 必须把 ${field} 写回本地快照`,
    )
  }
  // 非法类型必须被忽略：不得出现无守卫的整对象合并（如 Object.assign(config, next)）。
  assert.doesNotMatch(body, /Object\.assign\(\s*config/, '不得整对象合并快照（畸形值会污染配置）')
  // 断言针对代码标记（字段名），注释里提到旧字段名不该让测试变红。
  assert.doesNotMatch(body, /\bnext\.overlap\b|\bconfig\.overlap\b|['"]overlap['"]/, 'bindConfigScope 不得残留 overlap 处理分支')
  // null 快照（host 未就绪）必须被排除：typeof null === 'object' 是经典陷阱。
  assert.match(body, /value != null && typeof value === 'object'/, '快照必须是「非 null 的对象」才应用')
})
