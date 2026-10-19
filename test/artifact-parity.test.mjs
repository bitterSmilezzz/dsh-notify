/**
 * 构建产物与源码一一对应（防「删了源文件、产物留在包里」）。
 *
 * `tsc --emitDeclarationOnly` 不会删除已没有源文件的旧 `.d.ts`，`tsdown` 也不
 * 清理 `lib/`（`clean: false`，因为 host/client 分两个构建步骤、互不清空）。
 * 于是删掉一个模块后，它的声明仍会躺进 npm 包——曾经真的发生过：
 * `src/client/sound.ts` 删除后 `lib/types/client/sound.d.ts` 一直随包发布。
 *
 * 这里只做一件事：`lib/types` 里的每个 `.d.ts` 都要有对应的源码，反之亦然。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')

/**
 * 递归收集某个目录下的文件，返回相对该目录的路径（用 `/` 分隔）。
 * @param {string} dir - 起始目录。
 * @param {(name: string) => boolean} accept - 文件名过滤。
 * @returns {string[]} 相对路径列表。
 */
function walk(dir, accept) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      out.push(...walk(full, accept))
    } else if (accept(entry.name)) {
      out.push(relative(dir, full))
    }
  }
  return out
}

/** 源码模块的模块路径（去掉扩展名，如 `client/config`、`notify-policy`）。 */
const sourceModules = new Set([
  ...walk(join(root, 'src'), (n) => /\.(ts|tsx)$/.test(n) && !n.endsWith('.test.ts')),
].map((p) => p.replace(/\.tsx?$/, '')))

/** 声明的模块路径（去掉 `.d.ts`）。 */
const builtModules = walk(join(root, 'lib/types'), (n) => n.endsWith('.d.ts'))
  .map((p) => p.replace(/\.d\.ts$/, ''))

test('每个 .d.ts 都有对应源码（删模块后必须清产物）', () => {
  const orphans = builtModules.filter((m) => !sourceModules.has(m))
  assert.deepEqual(orphans, [],
    `以下声明没有对应源码，会随 npm 包发布，请重跑 build 或删除：${orphans.join(', ') || '(无)'}`)
})

test('每个源码模块都有对应 .d.ts（build 产物不得落后于源码）', () => {
  const missing = [...sourceModules].filter((m) => !builtModules.includes(m))
  assert.deepEqual(missing, [],
    `以下源码缺 .d.ts，请重跑 build：${missing.join(', ') || '(无)'}`)
})

test('lib/ 存在且为目录（前置：build 已执行）', () => {
  assert.equal(statSync(join(root, 'lib')).isDirectory(), true)
})
