/**
 * 契约漂移守卫：这些不一致**都不会抛错**，只会静默失效，所以必须逐条钉住。
 *
 *   1. 词条：zh 是 key 集真相源，en 必须完整（漏一条就是英文界面少一块文案）；
 *   2. 配置字段与默认值：host schema ↔ client DEFAULTS 双向一致——只在一侧
 *      加字段，设置页要么不显示、要么显示了写不进去；
 *   3. entry id：`cordis.patch.yml` 的 `id` 就是 host Config 的 namespace，
 *      client 用同一个字符串去 `configForms.get()`；拿错字符串**不抛错**，
 *      只会拿到 unavailable 快照 → 卡片渲染成功但读写静默失效；
 *   4. 文案引用：`t('x')` 用到的 key 必须在词典里存在（否则界面上出现裸 key）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 直接读源码（node 26 原生 type-stripping）：client 半区只有 bundle 产物，
// 没有逐模块的 .js，所以词典必须从 .ts 源取。
const { zh, en } = await import('../src/client/locales.ts')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(root, relative), 'utf8')

const hostIndex = read('src/index.ts')
const clientConfig = read('src/client/config.ts')
const clientIndex = read('src/client/index.ts')
const patch = read('cordis.patch.yml')
const localesSource = read('src/client/locales.ts')
const settingsCard = read('src/client/settings-card.tsx')
const pkg = JSON.parse(read('package.json'))

/** 从 DEFAULTS 字面量里取出字段名（保持源码顺序）。 */
function defaultFields() {
  const block = /export const DEFAULTS[^{]*\{([\s\S]*?)\n\}/u.exec(clientConfig)?.[1] ?? ''
  return [...block.matchAll(/^\s{2}(\w+):/gmu)].map((m) => m[1])
}

test('词条：en 与 zh 的 key 集完全一致', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
})

test('词条：两边的值都是非空字符串', () => {
  for (const [lang, dict] of [['zh', zh], ['en', en]]) {
    for (const [key, value] of Object.entries(dict)) {
      assert.equal(typeof value, 'string', `${lang}.${key} 必须是字符串`)
      assert.notEqual(value.trim(), '', `${lang}.${key} 不能为空`)
    }
  }
})

test('配置字段：host schema 与 client DEFAULTS 双向一致', () => {
  const schemaFields = [...hostIndex.matchAll(/^\s{2}(\w+):\s*z\.(?:boolean|string)\(\)/gmu)].map((m) => m[1])
  assert.deepEqual([...schemaFields].sort(), [...defaultFields()].sort(),
    'host Config schema 与 client DEFAULTS 的字段集必须完全一致')
})

test('配置默认值：两侧同值（boolean 与时钟字符串）', () => {
  const clientDefaults = Object.fromEntries(
    [...(/export const DEFAULTS[^{]*\{([\s\S]*?)\n\}/u.exec(clientConfig)?.[1] ?? '')
      .matchAll(/^\s{2}(\w+):\s*(true|false|'[^']*')/gmu)]
      .map((m) => [m[1], m[2].replaceAll("'", '')]),
  )
  const hostDefaults = Object.fromEntries(
    [...hostIndex.matchAll(/^\s{2}(\w+):\s*z\.(?:boolean|string)\(\)\.default\((true|false|'[^']*')\)/gmu)]
      .map((m) => [m[1], m[2].replaceAll("'", '')]),
  )
  assert.deepEqual(hostDefaults, clientDefaults)
})

test('配置字段：client 逐个字段都有快照写入（漏一个就静默不生效）', () => {
  for (const field of defaultFields()) {
    assert.match(clientConfig, new RegExp(`next\\.${field}\\b`, 'u'),
      `client 快照合并缺少字段 ${field}`)
  }
})

test('配置字段：host schema 全部 volatile（不加会不进 describe()，设置页静默失效）', () => {
  const declarations = [...hostIndex.matchAll(/^\s{2}\w+:\s*z\.(?:boolean|string)\(\)[^\n]*/gmu)].map((m) => m[0])
  assert.equal(declarations.length, defaultFields().length)
  for (const line of declarations) assert.match(line, /\.volatile\(\)/u, `缺少 volatile：${line.trim()}`)
})

test('entry id：cordis.patch.yml / host name / client 常量三处一致', () => {
  const patched = /^\s*-\s*id:\s*(\S+)\s*$/mu.exec(patch)?.[1]
  assert.equal(patched, 'dsh-notify')
  assert.match(hostIndex, /export const name = 'dsh-notify'/u)
  assert.match(clientIndex, /export const name = 'dsh-notify'/u)
  assert.match(clientConfig, /const NOTIFY_ENTRY_ID = 'dsh-notify'/u)
})

test("文案引用：t('...') 的每个 key 都在词典里", () => {
  const used = new Set()
  for (const source of [settingsCard, read('src/client/notifications.ts'), clientIndex]) {
    for (const call of source.matchAll(/\bt\(([^)]*)\)/gu)) {
      for (const key of call[1].matchAll(/'(\w+)'/gu)) used.add(key[1])
    }
  }
  const missing = [...used].filter((key) => !(key in zh))
  assert.deepEqual(missing, [], `词典缺少这些 key：${missing.join(', ')}`)
  assert.ok(used.size >= 10, `提取到的文案 key 太少（${used.size}），正则可能已失效`)
})

test('client inject：声明覆盖控制器真正使用的服务提供方', () => {
  const inject = pkg.dsh?.client?.inject ?? []
  for (const required of [
    '@deepseek-ai/dsh-client-ui-session',
    '@deepseek-ai/dsh-api-session-controller',
    '@deepseek-ai/dsh-client-ui-primitives',
  ]) {
    assert.ok(inject.includes(required), `dsh.client.inject 缺少 ${required}`)
  }
})

test('词典源文件导出的键集与产物一致（防源/产物漂移）', () => {
  const sourceKeys = [...localesSource.matchAll(/^\s{2}(\w+):/gmu)].map((m) => m[1])
  // zh 与 en 的键各出现一次，所以源文件键数应为词典键数的两倍。
  assert.equal(sourceKeys.length, Object.keys(zh).length * 2)
})
