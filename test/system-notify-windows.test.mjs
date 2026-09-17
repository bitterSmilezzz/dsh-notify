/**
 * Windows 通知通道（src/system-notify.ts 的 notifyWindows，经 systemNotify
 * 的 win32 分支进入）的回归钉子。
 *
 * 平台陷阱：notifyWindows 是私有函数，平台在**模块加载时**读入常量
 * PLATFORM = process.platform。因此必须在 import 被测模块之前用
 * Object.defineProperty 覆盖 process.platform（文件末尾恢复原值）。
 *
 * 注入手法同 system-notify-events.test.mjs：CJS 内建（node:child_process /
 * node:fs）的 ESM 具名导入是活绑定，createRequire 改写属性即可让被测模块
 * 拿到替身。
 *
 * 要点：
 *  - 负载只经命名参数（argv）进入静态 -File 脚本，command 恒为字面量
 *    'powershell.exe'；值以 `-` 开头时加装饰前导空格防绑定器误解析；
 *  - 静音经环境变量 DSH_NOTIFY_SILENT 传入，必须**合并**而非替换 process.env；
 *  - spawn 失败（error 事件）必须兜底删掉临时 .ps1，且清理幂等。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const cp = require('node:child_process')
const fs = require('node:fs')

/** 原平台：文件末尾恢复（win32 只在本文件的测试进程内生效）。 */
const originalPlatform = process.platform
// 必须在 import 被测模块之前覆盖：模块顶层 PLATFORM 常量在加载时读取。
Object.defineProperty(process, 'platform', { value: 'win32', configurable: true, writable: true })

/** spawn 替身：记录 {cmd,args,opts}，返回带 unref/on/once 的 EventEmitter child。
 *  经可变间接层（spawnImpl）暴露：CJS 内建的具名导入对被测模块是加载时快照，
 *  运行时替换 cp.spawn 属性不会生效，只能在 import 前就位、测试内切换实现。 */
const spawned = []
let spawnImpl = (cmd, args, opts) => {
  const child = new EventEmitter()
  child.unref = () => {}
  spawned.push({ cmd, args, opts, child })
  return child
}
cp.spawn = (cmd, args, opts) => spawnImpl(cmd, args, opts)
/** fs 替身：记录写入/删除；readdirSync 恒空（陈旧清扫不参与本文件断言）。 */
const writes = []
const unlinks = []
let writeImpl = (path, data) => { writes.push({ path, data }) }
fs.writeFileSync = (path, data) => writeImpl(path, data)
let unlinkImpl = (path) => { unlinks.push(path) }
fs.unlinkSync = (path) => unlinkImpl(path)
fs.readdirSync = () => []
fs.statSync = () => { throw new Error('ENOENT: 清扫扫描不需要 stat') }

const { systemNotify, POWERSHELL_TOAST_PS1, psNamedArgs } = await import('../src/system-notify.ts')

/** 每个用例前清空替身记录。 */
function reset() {
  spawned.length = 0
  writes.length = 0
  unlinks.length = 0
}
const lastSpawn = () => spawned[spawned.length - 1]
/** argv 头部（-File 之前的固定开关 + 脚本路径）。 */
const ARGV_HEAD = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File']

test('win32: spawn powershell.exe，argv 为固定开关头 + -File <ps1> + 命名参数（无 openUrl 时不带 -OpenUrl）', () => {
  reset()
  systemNotify('轮次完成', '该会话已结束一轮', undefined, true)
  assert.equal(spawned.length, 1, 'win32 分支必须发一次通知')
  const call = lastSpawn()
  assert.equal(call.cmd, 'powershell.exe', 'command 必须是字符串字面量（注入约束）')
  assert.deepEqual(call.args.slice(0, 7), ARGV_HEAD, '固定开关头必须逐项一致（无控制台窗口、不加载 profile）')
  assert.match(call.args[7], /dsh-notify-[0-9a-f-]+\.ps1$/, '-File 后跟本次写入的临时脚本路径')
  assert.deepEqual(
    call.args.slice(8),
    ['-Title', '轮次完成', '-Body', '该会话已结束一轮'],
    '负载必须经命名参数进入（无 openUrl 时不追加 -OpenUrl）',
  )
  assert.ok(!call.args.includes('-OpenUrl'), 'openUrl 为空时不得出现 -OpenUrl')
  assert.equal(call.opts.stdio, 'ignore', 'stdio 必须 ignore')
  assert.equal(call.opts.windowsHide, true, 'windowsHide 避免闪出控制台窗口')
  assert.equal(call.opts.detached, false, 'Windows 侧不需要 detached（要拿到 exit 清定时器）')
})

test('win32: 有 openUrl 时末尾追加 [-OpenUrl, url]（点击跳转通道）', () => {
  reset()
  systemNotify('标题', '正文', 'https://127.0.0.1:3080/#session=a1', true)
  const call = lastSpawn()
  assert.deepEqual(
    call.args.slice(8),
    ['-Title', '标题', '-Body', '正文', '-OpenUrl', 'https://127.0.0.1:3080/#session=a1'],
    'openUrl 非空必须作为命名参数追加（顺序与 psNamedArgs 一致）',
  )
  // 空串与非空 undefined 语义一致：不追加（见 psNamedArgs）。
  reset()
  systemNotify('标题', '正文', '', true)
  assert.deepEqual(lastSpawn().args.slice(8), ['-Title', '标题', '-Body', '正文'], '空串 openUrl 不得追加 -OpenUrl')
})

test('win32: 写入 dsh-notify-<uuid>.ps1，内容为模块导出的 POWERSHELL_TOAST_PS1（静态脚本零插值）', () => {
  reset()
  systemNotify('标题', '正文', undefined, true)
  assert.equal(writes.length, 1, '必须恰好写一个临时脚本')
  assert.match(writes[0].path, /dsh-notify-[0-9a-f-]+\.ps1$/, '临时脚本命名必须是 dsh-notify-<uuid>.ps1（陈旧清扫靠这个名字识别）')
  assert.equal(writes[0].data, POWERSHELL_TOAST_PS1, '写入内容必须等于模块导出的静态脚本（负载不进脚本正文）')
  assert.ok(!writes[0].data.includes('标题'), '用户负载不得被拼进脚本正文（注入约束）')
  assert.equal(lastSpawn().args[7], writes[0].path, '-File 指向本次写入的路径')
})

test('win32: sound=false 时 env 合并 DSH_NOTIFY_SILENT=1（保留原环境变量）；sound=true 时不传 env', () => {
  reset()
  systemNotify('标题', '正文', undefined, false)
  const silent = lastSpawn().opts.env
  assert.ok(silent, 'sound=false 必须传 env（静音标志经环境变量进入脚本）')
  assert.equal(silent.DSH_NOTIFY_SILENT, '1', '静音标志必须是字符串 1（脚本按 $env:... -eq \'1\' 判定）')
  assert.equal(silent.PATH, process.env.PATH, 'env 必须是合并而非替换（PATH 等原有变量仍在）')
  assert.equal(silent.HOME, process.env.HOME, '合并保留 HOME')
  // sound=true：不传 env，子进程继承宿主环境。
  reset()
  systemNotify('标题', '正文', undefined, true)
  assert.equal(lastSpawn().opts.env, undefined, 'sound=true 时不得传 env（继承宿主环境）')
})

test('win32: spawn 失败（error 事件）触发兜底 unlinkSync，且清理幂等不抛错', () => {
  reset()
  systemNotify('标题', '正文', undefined, true)
  const call = lastSpawn()
  const psPath = call.args[7]
  assert.equal(unlinks.length, 0, 'spawn 成功时不得立即删脚本（主路径是脚本 finally 自删）')
  call.child.emit('error', new Error('spawn powershell.exe ENOENT'))
  assert.deepEqual(unlinks, [psPath], 'error 事件必须兜底删掉临时脚本（脚本未运行，自删不会发生）')
  // 幂等：第二次清理（脚本已被删 / 已由 finally 自删）不得抛错。
  unlinkImpl = (path) => { unlinks.push(path); throw new Error('ENOENT: no such file') }
  try {
    assert.doesNotThrow(() => call.child.emit('error', new Error('late error')), '重复 error 事件的清理必须静默')
  } finally {
    unlinkImpl = (path) => { unlinks.push(path) }
  }
  assert.equal(unlinks.length, 2, '两次清理都尝试删除同一路径（unlink 的 ENOENT 被吞掉）')
})

test('win32: `-` 开头的标题/正文带装饰前导空格（防 PowerShell 绑定器误解析为参数名）', () => {
  reset()
  systemNotify('-标题', '--正文', undefined, true)
  const call = lastSpawn()
  assert.deepEqual(
    call.args.slice(8),
    psNamedArgs('-标题', '--正文'),
    '`-` 前缀负载必须与 psNamedArgs 的 dashSafe 语义一致',
  )
  assert.deepEqual(call.args.slice(8), ['-Title', ' -标题', '-Body', ' --正文'], '每个 `-` 前缀值前插一个空格')
  // 不以 `-` 开头时不得引入多余空格（否则 toast 会出现前导空白）。
  reset()
  systemNotify('标题', '正文', undefined, true)
  assert.deepEqual(lastSpawn().args.slice(8), ['-Title', '标题', '-Body', '正文'], '普通负载原样传递')
})

test('win32: 临时脚本写入失败时静默跳过（不 spawn、不抛错、无残留）', () => {
  reset()
  writeImpl = () => { throw new Error('EACCES: permission denied') }
  try {
    assert.doesNotThrow(() => systemNotify('标题', '正文', undefined, true), '写入失败不得冒泡（通知是增益不是依赖）')
  } finally {
    writeImpl = (path, data) => { writes.push({ path, data }) }
  }
  assert.equal(spawned.length, 0, '脚本写不出来时不得 spawn powershell（-File 指向不存在的文件）')
  assert.equal(unlinks.length, 0, '没有临时文件就没有清理动作')
})

test('win32: spawn 同步抛错时静默，并由 catch 分支兜底删掉临时脚本', () => {
  reset()
  spawnImpl = () => { throw new Error('EINVAL: bad args') }
  try {
    assert.doesNotThrow(() => systemNotify('标题', '正文', undefined, true), 'spawn 同步失败不得冒泡（否则拖垮宿主）')
  } finally {
    spawnImpl = (cmd, args, opts) => {
      const child = new EventEmitter()
      child.unref = () => {}
      spawned.push({ cmd, args, opts, child })
      return child
    }
  }
  assert.equal(spawned.length, 0, '抛错的 spawn 没有记录调用（替身行为）')
  assert.equal(unlinks.length, 1, '脚本从未运行 → 自删不会发生，必须由 catch 分支兜底清理')
  assert.match(unlinks[0], /dsh-notify-[0-9a-f-]+\.ps1$/, '兜底清理的是本次写入的临时脚本')
})

// 恢复平台：同进程后续代码（若有）不得看到被覆盖的 win32。
Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true, writable: true })
