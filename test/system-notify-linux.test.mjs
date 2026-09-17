/**
 * Linux 通知通道（src/system-notify.ts 的 findOnPath / notifySendArgs /
 * notifyLinux）的回归钉子。
 *
 * 手法同 system-notify-events.test.mjs：CJS 内建（node:child_process /
 * node:fs）的 ESM 具名导入是活绑定，用 createRequire 拿到 CJS exports 后
 * 直接改写属性，被测模块即拿到替身。被测模块运行时只依赖 node 内建与
 * ./notify-policy.ts，直连 src 走 node 原生 type-stripping。
 *
 * 要点：
 *  - notify-send 的标题/正文是位置参数，以 `-` 开头会被 GOption 当选项名，
 *    必须由 `--` 终止符兜住；
 *  - 探测只决定「是否值得尝试」，spawn 的 command 恒为字面量 'notify-send'
 *    （注入约束）；未装 libnotify 时静默跳过，不 spawn；
 *  - Linux 无点击跳转通道、声音由桌面主题控制 → notifyLinux 只吃两个参数。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { join } from 'node:path'

// —— 注入替身必须早于被测模块 import ——
const require = createRequire(import.meta.url)
const cp = require('node:child_process')
const fs = require('node:fs')

/** spawn 替身：记录 {cmd,args,opts}，返回带 unref() 的 EventEmitter child。 */
const spawned = []
cp.spawn = (cmd, args, opts) => {
  const child = new EventEmitter()
  child.unref = () => {}
  spawned.push({ cmd, args, opts, child })
  return child
}
/** existsSync 替身：默认「什么都没装」，个别用例临时改成按需命中。 */
let existsImpl = () => false
fs.existsSync = (path) => existsImpl(path)

const { findOnPath, notifySendArgs, notifyLinux } = await import('../src/system-notify.ts')

/** 最近一次 spawn 记录。 */
const lastSpawn = () => spawned[spawned.length - 1]

test('notifySendArgs: 固定前缀 + `--` 终止符，`-` 开头的负载仍排在 -- 之后', () => {
  assert.deepEqual(
    notifySendArgs('标题', '正文'),
    ['-a', 'DSH', '-t', '10000', '--', '标题', '正文'],
    'argv 形态必须与契约逐项一致（-a 来源名 / -t 10s 自动消失 / -- 终止选项）',
  )
  // GOption 误解析防线：标题/正文以 `-` 开头时，`--` 必须仍在它们之前。
  const dashed = notifySendArgs('-u critical', '--help')
  assert.deepEqual(dashed, ['-a', 'DSH', '-t', '10000', '--', '-u critical', '--help'], '负载以 - 开头时仍原样位于 -- 之后')
  assert.equal(dashed.indexOf('--'), 4, '-- 终止符位置固定（不得被负载挤走）')
  assert.ok(dashed.indexOf('--') < dashed.indexOf('-u critical'), '-- 必须早于负载')
})

test('findOnPath: 命中 PATH 中第一个存在的条目（返回 join(dir, name)）', () => {
  const exists = (path) => path === join('/b', 'notify-send')
  assert.equal(findOnPath('notify-send', '/a:/b', exists, ':'), join('/b', 'notify-send'), '跳过不存在的 /a，命中 /b')
  assert.equal(
    findOnPath('notify-send', '/a:/b', (path) => path === join('/a', 'notify-send'), ':'),
    join('/a', 'notify-send'),
    '第一个条目存在时直接命中，不看后续条目',
  )
})

test('findOnPath: PATH 为空或未设置时返回 null（不探测任何条目）', () => {
  let probed = 0
  const exists = () => { probed += 1; return true }
  assert.equal(findOnPath('notify-send', '', exists, ':'), null, '空串 PATH 返回 null')
  // 注意 JS 语义：显式传 undefined 会触发默认参数（process.env.PATH），
  // 所以「PATH 未设置」必须通过清空 process.env.PATH 复现，不能传 undefined。
  const originalPath = process.env.PATH
  try {
    delete process.env.PATH
    assert.equal(findOnPath('notify-send', undefined, exists, ':'), null, 'PATH 未设置时返回 null')
    process.env.PATH = ''
    assert.equal(findOnPath('notify-send', undefined, exists, ':'), null, 'PATH 为空串时返回 null')
  } finally {
    if (originalPath === undefined) delete process.env.PATH
    else process.env.PATH = originalPath
  }
  assert.equal(probed, 0, '三种情况下都不得调用存在性判定（不做无谓 stat）')
})

test('findOnPath: 空条目跳过、exists 抛错跳过并继续找（绝不冒泡）', () => {
  assert.doesNotThrow(() => findOnPath('notify-send', '::/a', () => false, ':'), '空条目不得抛错')
  assert.equal(findOnPath('notify-send', '::/a', () => false, ':'), null, '全空条目 → null')
  // 权限等场景下 exists 可能抛错：该条目跳过，后续条目仍要参与查找。
  const exists = (path) => {
    if (path.startsWith(join('/a', ''))) throw new Error('EACCES')
    return path === join('/b', 'notify-send')
  }
  assert.equal(findOnPath('notify-send', '/a:/b', exists, ':'), join('/b', 'notify-send'), '抛错条目跳过后命中后续条目')
  assert.doesNotThrow(() => findOnPath('notify-send', '/a', () => { throw new Error('EACCES') }, ':'), '全部条目抛错也不得冒泡')
})

test('findOnPath: 自定义 separator 生效（Windows 风格 ; 与空条目混用）', () => {
  const exists = (path) => path === join('/c', 'notify-send')
  assert.equal(findOnPath('notify-send', '/a;/c', exists, ';'), join('/c', 'notify-send'), '按 ; 切分并命中 /c')
  assert.equal(findOnPath('notify-send', '/a:/c', exists, ';'), null, 'separator 为 ; 时 : 不再切分')
  assert.equal(findOnPath('notify-send', ';/a;/c', exists, ';'), join('/c', 'notify-send'), '前导空条目跳过')
})

test('notifyLinux: 未探测到 notify-send 时静默跳过，绝不 spawn', () => {
  spawned.length = 0
  existsImpl = () => false
  notifyLinux('标题', '正文')
  assert.equal(spawned.length, 0, 'libnotify 缺失时不得 spawn（增益不是依赖）')
})

test('notifyLinux: 命中时以字面量 notify-send + notifySendArgs 启动，stdio ignore', () => {
  spawned.length = 0
  existsImpl = (path) => path.endsWith(join('bin', 'notify-send'))
  notifyLinux('轮次完成', '该会话已结束一轮')
  assert.equal(spawned.length, 1, '探测命中必须发一次通知')
  const call = lastSpawn()
  assert.equal(call.cmd, 'notify-send', 'command 必须是字符串字面量（注入约束：不得用探测到的路径）')
  assert.deepEqual(call.args, notifySendArgs('轮次完成', '该会话已结束一轮'), 'argv 必须与 notifySendArgs 逐项一致')
  assert.equal(call.opts.stdio, 'ignore', 'stdio 必须 ignore（子进程输出不得拖住宿主）')
  assert.equal(call.opts.detached, true, 'detached 让通知进程在宿主退出后仍可存活')
})

test('notifyLinux: 只接受 (title, body)——sound/openUrl 在 Linux 上无通道', () => {
  assert.equal(notifyLinux.length, 2, 'notifyLinux 签名恒为两参（Linux 通知不可点击、声音由主题控制）')
  spawned.length = 0
  existsImpl = (path) => path.endsWith(join('bin', 'notify-send'))
  // 调用形态：多传的参数必须被忽略（JS 层面不报错，argv 里不得出现）。
  notifyLinux('标题', '正文', 'https://example.com/session', true)
  const call = lastSpawn()
  assert.deepEqual(call.args, notifySendArgs('标题', '正文'), '多余的 openUrl/sound 不得进入 argv')
  assert.ok(!call.args.includes('https://example.com/session'), 'Linux 通知不带跳转 URL')
})
