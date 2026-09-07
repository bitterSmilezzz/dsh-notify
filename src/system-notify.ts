/**
 * dsh-notify — system-level desktop notifications (host side).
 *
 * 监听 Cordis 事件发系统通知，按平台分派：
 *   - macOS:   terminal-notifier（-open 点击跳转浏览器对应会话），缺失或
 *             运行失败时 osascript 兜底（不可点击，仅显示）
 *   - Windows: PowerShell WinRT toast（点击「查看会话」跳转，无 openUrl 时仅展示）
 *   - 其他平台: 静默跳过（桌面通知没有通用入口，增益不是依赖）
 *
 * 开关读 host settings 的 `notify` namespace（与 client 设置卡片共享同一
 * 配置）。通知是增益不是依赖：所有失败静默，绝不拖垮宿主进程（含 spawn 的
 * 异步 error，必须被消费，否则 unhandled 'error' 会崩掉整个宿主）。
 *
 * 注入安全（两条约束，都是硬性的）：
 *   - spawn 调用点的 command 一律是字符串字面量，候选路径逐个判断后再用
 *     各自的字面量封装，绝不把变量当命令；
 *   - 通知负载（标题/正文/URL）只作为 argv 传入：Windows 的 toast 脚本是
 *     -File 执行的静态 .ps1，负载经命名参数进入，脚本内用
 *     SecurityElement.Escape 构造 XML，不拼进命令字符串；静音开关经
 *     环境变量 DSH_NOTIFY_SILENT 传入（不占 param 参数位，测试钉住
 *     param 三参形态不变）。
 */
import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { ApprovalRequest, ApprovalOutcome } from '@deepseek-ai/dsh-user-approval';
import type {} from '@deepseek-ai/dsh-user-approval';
// Type-only: pulls the @deepseek-ai/cordis Events merge (agent/status, agent/error).
import type {} from '@deepseek-ai/dsh-agent';
import type { Context } from '@deepseek-ai/cordis';
import { agentModelLabel, errorDedupKey, isSubagent, NOTIFY_EVENTS, probeOfficialNotify, pruneExpired, summaryOf, type ProbeState } from './notify-policy.ts'
// Type-only: pulls the host Connection service merge (ctx.connection) for the
// authenticated deep-link URL（带进程 token，首次点击无需手动种 cookie）。
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';

/** 通知开关（与 settings schema 的 notify 子对象一致）。 */
export interface NotifyConfig {
  enabled: boolean
  approval: boolean
  turn: boolean
  sessionDone: boolean
  error: boolean
  /** 提示音：true=显式 Glass（macOS）/系统默认音（Windows）；false=跟随系统默认（macOS）/真静音（Windows）。 */
  sound: boolean
  /**
   * 与其他通知源（官方/生态）冲突时的策略：
   *   - 'auto'（默认）：探测到其他通知源即跳过自身通知（防双份刷屏）；
   *   - 'mine'：忽略探测结果，始终用自己的（主动双开，自负重复风险）。
   */
  overlap: 'auto' | 'mine'
  /** 追加的候选探测 service 名（settings probeServices；每次探测时随 configOf() 读取，改配置即时生效）。 */
  probeServices: readonly string[]
}

/** 当前宿主平台（spawn 前分派，避免在不适用的平台上尝试不存在的二进制）。 */
const PLATFORM: NodeJS.Platform = process.platform

/** AppleScript 单行脚本：负载经 `--` argv 传入（on run argv）。
 *  导出仅供注入不变量测试（test/system-notify.test.mjs）钉住
 *  「负载走 argv、脚本体零插值」约束。 */
export const OSASCRIPT_NOTIFY = 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv) sound name "Glass"\nend run'
/** sound 关闭时的变体：不带 sound name 子句 → 跟随系统默认提示音。
 *  macOS 侧 terminal-notifier / osascript 都拿不到真静音（无 "none" 取值），
 *  故本开关的语义是「Glass 内置音」与「系统默认音」之差，不是静音。 */
export const OSASCRIPT_NOTIFY_DEFAULT_SOUND = 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv)\nend run'

/**
 * Windows toast 脚本（-File 执行，纯静态）：负载经命名参数（argv）进入，
 * 脚本内用 SecurityElement.Escape 构造 XML（标题/正文/URL 不经过命令行）。
 * AUMID 借用 Windows PowerShell 的已注册身份展示 toast（无需额外安装）。
 * 末尾自删除脚本文件；脚本体里的 `$Title/$Body/$OpenUrl/$xml` 等均为
 * PowerShell 变量，与 JS 插值无关（本源码没有任何 `${...}` 拼入用户数据）。
 * 导出仅供注入不变量测试钉住「脚本体零 JS 插值」约束。
 */
export const POWERSHELL_TOAST_PS1 = [
  'param([string]$Title, [string]$Body, [string]$OpenUrl)',
  // JS 侧对以 `-` 开头的值加了装饰性前导空格（防绑定器把 `-foo` 误解析为
  // 参数名，见 psNamedArgs）；绑定后这里 TrimStart 去掉，toast 展示不会
  // 出现多余前导空格。null 防御：param 未传时值为 $null，if 先判空。
  'if ($Title) { $Title = $Title.TrimStart() }',
  'if ($Body) { $Body = $Body.TrimStart() }',
  'if ($OpenUrl) { $OpenUrl = $OpenUrl.TrimStart() }',
  'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
  '$null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]',
  '$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]',
  '$esc = { param($t) [System.Security.SecurityElement]::Escape([string]$t) }',
  // sound 关闭标志经环境变量传入（不占 param 参数位，param 行保持测试钉住的三参形态）。
  '$Silent = $env:DSH_NOTIFY_SILENT -eq \'1\'',
  'try {',
  '  $actions = ""',
  '  if ($OpenUrl) { $actions = \'<actions><action content="查看会话" activationType="protocol" arguments="\' + (& $esc $OpenUrl) + \'"/></actions>\' }',
  // sound 关闭时在 XML 里放 <audio silent="true"/>（WinRT 真静音）：
  // toast XML 的 audio 元素位于 visual 之后；$Silent 是独立开关，与 $OpenUrl 无关。
  '  $audio = ""',
  '  if ($Silent) { $audio = \'<audio silent="true"/>\' }',
  '  $xml = \'<toast><visual><binding template="ToastGeneric"><text>\' + (& $esc $Title) + \'</text><text>\' + (& $esc $Body) + \'</text></binding></visual>\' + $audio + $actions + \'</toast>\'',
  '  $doc = New-Object Windows.Data.Xml.Dom.XmlDocument',
  '  $doc.LoadXml($xml)',
  '  $toast = New-Object Windows.UI.Notifications.ToastNotification $doc',
  '  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(\'{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe\').Show($toast)',
  '} finally {',
  '  # 无论 toast 是否抛出（如 WinRT 不可用），都要清理临时脚本，避免 /tmp 累积',
  '  Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue',
  '}',
].join('\n')

/**
 * 注册 terminal-notifier 失败兜底：exec 失败（error 事件）、运行期失败
 * （exit 非 0）都可能先后到达，防双发标志位保证合计只兜底一次（否则
 * exit+error 双触发会重复弹 osascript 通知）。exit code 0 视为已成功发送，
 * 不兜底；被信号杀死（code null）同样视为未发送。导出仅供测试注入假 child
 * 验证「exit 非 0 → 兜底 + 防双发」（test/system-notify-fallback.test.mjs）。
 */
export function registerNotifierFallback(child: ChildProcess, onFallback?: () => void): void {
  let fellBack = false
  const fallbackOnce = (): void => {
    if (fellBack) return
    fellBack = true
    onFallback?.()
  }
  child.on('error', fallbackOnce) // exec 失败（存在但不可执行）→ 兜底通道
  child.on('exit', (code) => {
    // macOS 26 起 NSUserNotification 点击 API 失效，terminal-notifier 存在
    // 也会以非 0 退出：通知未成功发送 → 兜底通道（退化不可点击，仍有可见）。
    if (code !== 0) fallbackOnce()
  })
}

/**
 * 后台启动一个子进程，失败全程静默。每个 spawn 调用点的 command 都是
 * 字符串字面量（注入约束），所以一个命令一个薄封装；异步 'error' 必须被
 * 消费（否则 Node 以 unhandled 'error' 崩溃宿主），同步 throw 也吞掉。
 * macOS 上 detached 让通知进程在宿主退出后仍可存活；Windows 上
 * windowsHide 避免闪出控制台窗口。
 */
function spawnNotifierSilicon(args: readonly string[], onFallback?: () => void): void {
  try {
    const child = spawn('/opt/homebrew/bin/terminal-notifier', [...args], { stdio: 'ignore', detached: true, windowsHide: true })
    registerNotifierFallback(child, onFallback)
    child.unref()
  } catch {
    onFallback?.() // 同步失败（参数非法等）→ 兜底通道（无 child，无双发风险）
  }
}

function spawnNotifierIntel(args: readonly string[], onFallback?: () => void): void {
  try {
    const child = spawn('/usr/local/bin/terminal-notifier', [...args], { stdio: 'ignore', detached: true, windowsHide: true })
    registerNotifierFallback(child, onFallback)
    child.unref()
  } catch {
    onFallback?.() // 同步失败（参数非法等）→ 兜底通道（无 child，无双发风险）
  }
}

function spawnOsascript(args: readonly string[]): void {
  try {
    const child = spawn('osascript', [...args], { stdio: 'ignore', detached: true, windowsHide: true })
    child.on('error', () => {})
    child.unref()
  } catch {
    // 同步失败（参数非法等）同样静默。
  }
}

/**
 * 后台启动 powershell.exe（WinRT toast）。失败全程静默。spawn 调用点的
 * command 是字符串字面量（注入约束）；异步 'error' 必须被消费。返回 child
 * 供调用方注册 exit/超时兜底清理（见 notifyWindows），失败返回 undefined。
 */
function spawnPowershell(args: readonly string[], opts: { onErrorCleanup?: () => void; env?: Record<string, string> } = {}): ChildProcess | undefined {
  const { onErrorCleanup, env } = opts
  try {
    const child = spawn('powershell.exe', [...args], { stdio: 'ignore', detached: false, windowsHide: true, ...(env ? { env: { ...process.env, ...env } } : {}) })
    child.on('error', () => {
      onErrorCleanup?.() // spawn 失败（脚本未运行）：兜底删临时文件
    })
    child.unref()
    return child
  } catch {
    // 同步失败（参数非法等）同样静默。
    onErrorCleanup?.()
    return undefined
  }
}

/** 临时 .ps1 的 JS 侧兜底清理延迟：脚本自身 finally 自删是主路径，
 *  这里只兜底「宿主在脚本执行前被杀 / spawn 后未运行」的极端残留。 */
const PS_CLEANUP_FALLBACK_MS = 30_000

/** 陈旧 .ps1 判定阈值：写入后超过该时长仍未自删的文件视为残留。
 *  正常脚本从写入到 powershell 执行完毕只有数秒，60s 足以排除「正在执行」
 *  的脚本；只有宿主崩溃/进程被杀等极端场景才会跨过这条线。 */
const PS_STALE_MS = 60_000

/**
 * 清扫 tmpdir 里陈旧的 `dsh-notify-*.ps1` 残留。主清理路径是脚本自身
 * finally 自删 + JS 30s 定时器，但它们都在宿主进程存活时才能生效；宿主
 * 整体崩溃时这两条路径都会失效，残留只能靠下一次写入前清扫兜住。
 * 每次写入新脚本前调用（低频：只有 win32 通知才会触发），把超过
 * PS_STALE_MS 的旧文件删掉，防止长期运行 / 多次崩溃后 /tmp 累积。
 * @param dir - 扫描目录（默认系统临时目录；注入便于测试）。
 * @param now - 当前时间戳（注入便于测试）。
 * @param staleMs - 视为残留的 mtime 阈值。
 * @returns 删除的文件数。
 */
export function pruneStalePs1Scripts(dir = tmpdir(), now = Date.now(), staleMs = PS_STALE_MS): number {
  let removed = 0
  try {
    for (const name of readdirSync(dir)) {
      if (!name.startsWith('dsh-notify-') || !name.endsWith('.ps1')) continue
      try {
        if (now - statSync(join(dir, name)).mtimeMs >= staleMs) {
          unlinkSync(join(dir, name))
          removed += 1
        }
      } catch {
        // 单个文件 stat/unlink 失败（已被脚本自删、权限等）：跳过，不中断清扫。
      }
    }
  } catch {
    // tmpdir 不可读等整体失败：静默（清扫是兜底，不是主路径）。
  }
  return removed
}

/**
 * 构造传给 powershell.exe 的脚本命名参数 argv。
 *
 * 保持 `-Name value` 分离形式（含空格的值由 Node spawn 自动加引号、PowerShell
 * 正常绑定）。唯一要防的是「值以 `-` 开头」：`-Body -foo` 时 PowerShell 参数
 * 绑定器会把 `-foo` 误解析为参数名而非值（绑定失败/报错）。修复：仅在值以
 * `-` 开头时给值加一个前导空格，token 变成非参数名形态（` -foo`），绑定器
 * 照常取值；随后 .ps1 脚本的 `if ($X) { $X = $X.TrimStart() }` 会把装饰性
 * 前导空格去掉，toast 展示无感知（spawn 不走 shell，argv 的 ` -foo` 经 Node
 * 命令行序列化（含空格 token 加引号）原样到达 PowerShell 绑定器，前导空格
 * 保留——所以装饰空格必须由脚本侧清掉）。
 *
 * 不用 `-Name:value` 冒号形式：值含空格时会被拆成两个 token，后段还会位置
 * 绑定到 $OpenUrl（错误地构造跳转 URL）。负载仍经命名参数进入脚本，param
 * 形态与「负载走命名参数」不变量不变；command 恒为字面量 'powershell.exe'。
 * 导出仅供测试钉住「`-` 前缀值加空格前缀」这一约束。
 */
export function psNamedArgs(title: string, body: string, openUrl?: string): string[] {
  const dashSafe = (v: string): string => (v.startsWith('-') ? ` ${v}` : v)
  const args = ['-Title', dashSafe(title), '-Body', dashSafe(body)]
  if (openUrl !== undefined && openUrl !== '') args.push('-OpenUrl', dashSafe(openUrl))
  return args
}

/**
 * 探测 terminal-notifier 路径。每次通知前调用（不缓存）：
 * existsSync 是微秒级 stat，通知频率低（turn/error 均有去重），
 * 代价可忽略；不做进程内缓存还能即时发现会话存续期内后装的
 * terminal-notifier（缓存会让它在本会话内永远不可见）。
 */
function detectNotifierPath(): string | null {
  if (existsSync('/opt/homebrew/bin/terminal-notifier')) return '/opt/homebrew/bin/terminal-notifier'
  if (existsSync('/usr/local/bin/terminal-notifier')) return '/usr/local/bin/terminal-notifier'
  return null
}

/** macOS 通知：osascript 为主（稳定可靠，带系统声音）。terminal-notifier
 * 的点击跳转依赖已废弃的 NSUserNotification 私有图标 API（macOS 26 失效），
 * 仅在需要点击跳转且二进制存在时使用，作为 osascript 的补充。
 * 导出仅供测试注入 node:child_process/node:fs 后验证兜底链（test/）。 */
export function notifyMac(title: string, body: string, openUrl: string | undefined, sound: boolean): void {
  const soundArgs = sound ? ['-sound', 'Glass'] : []
  // osascript 兜底：terminal-notifier 缺失（探测为 null）、存在但执行失败
  // （existsSync 只证明文件在，quarantine/权限/损坏安装会让 exec 报 error）
  // 或运行期失败（macOS 26 起点击 API 失效，exit 非 0）都必须仍有通知可见，
  // 只是退化为不可点击；exit+error 双触发只兜底一次（见 registerNotifierFallback）。
  const osascriptFallback = (): void =>
    spawnOsascript(['-e', sound ? OSASCRIPT_NOTIFY : OSASCRIPT_NOTIFY_DEFAULT_SOUND, '--', title, body])
  if (openUrl !== undefined && openUrl !== '') {
    // 每次通知前重新探测（见 detectNotifierPath 注释）；spawn 的 command 恒为字面量。
    const notifierPath = detectNotifierPath()
    if (notifierPath === '/opt/homebrew/bin/terminal-notifier') {
      spawnNotifierSilicon(['-message', body, '-title', title, '-open', openUrl, ...soundArgs], osascriptFallback)
      return
    }
    if (notifierPath === '/usr/local/bin/terminal-notifier') {
      spawnNotifierIntel(['-message', body, '-title', title, '-open', openUrl, ...soundArgs], osascriptFallback)
      return
    }
  }
  osascriptFallback()
}

/**
 * Windows 通知：PowerShell WinRT toast（Win10+ 自带，无第三方依赖）。
 * 把静态 .ps1 写到临时目录后以 -File 执行，标题/正文/URL 作为命名参数
 * （argv）传入；脚本内用 SecurityElement.Escape 构造 XML 负载并自删除，
 * 用户数据不经过命令行，杜绝命令注入。
 * @param sound - 提示音开关（false → toast XML 加 <audio silent="true"/> 真静音）。
 */
function notifyWindows(title: string, body: string, openUrl: string | undefined, sound: boolean): void {
  // 写入前先清扫陈旧残留：宿主崩溃时脚本自删与 30s 定时器都失效，只有
  // 下一次写入前的清扫能兜住（见 pruneStalePs1Scripts）。
  pruneStalePs1Scripts()
  let psPath: string
  try {
    psPath = join(tmpdir(), `dsh-notify-${randomUUID()}.ps1`)
    writeFileSync(psPath, POWERSHELL_TOAST_PS1, 'utf8')
  } catch {
    return // 临时脚本写入失败：静默
  }
  // 冒号形式传值：值以 `-` 开头时不会被绑定器误解析为参数名（见 psNamedArgs）。
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', psPath, ...psNamedArgs(title, body, openUrl)]
  // sound 关闭 → 环境变量通知脚本（保持 param 三参形态与「负载走命名参数」不变量）。
  const silentEnv = sound ? {} : { DSH_NOTIFY_SILENT: '1' }
  /** 删除临时脚本（幂等：已删/不存在则忽略）。 */
  const cleanup = (): void => {
    try { unlinkSync(psPath) } catch { /* 已删除则忽略 */ }
  }
  // 主路径：脚本内 finally 自删。兜底路径：
  //  - spawn 失败（脚本未运行）→ onErrorCleanup 立即删；
  //  - 子进程已退出（无论成败）→ exit 清掉超时定时器（文件此刻多半已由
  //    脚本自删，cleanup 幂等无害）；
  //  - 宿主在脚本执行前被杀、powershell 卡死未退出等极端场景 → 30s 超时
  //    强制删除（unref 定时器不拖住宿主退出，fire-and-forget 静默）。
  const child = spawnPowershell(args, { onErrorCleanup: cleanup, ...(sound ? {} : { env: silentEnv }) })
  if (child !== undefined) {
    const fallback = setTimeout(cleanup, PS_CLEANUP_FALLBACK_MS)
    fallback.unref?.()
    child.once('exit', () => clearTimeout(fallback))
  }
}

/**
 * 发一条系统通知。fire-and-forget：所有失败静默，不影响主流程。
 * 导出供组合器在防重叠探测翻转时发「已自动暂停/已恢复」提示。
 * @param title - 通知标题。
 * @param body - 通知正文。
 * @param openUrl - 点击通知要打开的 URL（浏览器会话 deep-link）；为空则不可点击。
 * @param sound - 提示音开关（macOS：true=显式 Glass，false=跟随系统默认音；
 *                Windows：false=toast XML `<audio silent="true"/>` 真静音）。
 */
export function systemNotify(title: string, body: string, openUrl: string | undefined, sound: boolean): void {
  switch (PLATFORM) {
    case 'darwin':
      notifyMac(title, body, openUrl, sound)
      return
    case 'win32':
      notifyWindows(title, body, openUrl, sound)
      return
    default:
      // 其他平台没有可靠的桌面通知入口：静默跳过（增益不是依赖）。
      return
  }
}

/**
 * 安装系统通知：注册事件监听（轮次完成/审批/错误），读 settings 配置判断
 * 总开关与各事件开关，并做其他通知源（官方/生态）的防重叠探测。点击通知
 * 跳转浏览器对应会话（client 读 `#session=`，兼容旧的 `?session=`）。
 *
 * 防重叠（auto 策略）：监听器在 apply 时注册、随 fiber 卸载；每条事件进来
 * 先经 shouldNotify() 判定（配置 + 探测），auto 且探测到其他通知源即跳过
 * 自身通知——对用户可观察行为等价于动态注销，且事件低频、无性能顾虑。
 * 探测状态变化（false↔true）经 onProbeChange 回抛，由组合器发自动暂停/
 * 恢复的系统提示。探测失败静默（通知是增益不是依赖）。
 *
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照；
 *                   追加探测候选 probeServices 也在这里，每次探测读取）。
 * @param baseUrl - 浏览器地址（默认 3080）。
 * @param onProbeChange - 探测状态变化回调（含首次探测）。
 */
export function applySystemNotify(
  ctx: Context,
  configOf: () => NotifyConfig,
  baseUrl: string | (() => string) = 'http://127.0.0.1:3080',
  onProbeChange?: (state: ProbeState) => void,
): void {
  // 防重叠探测：惰性 + 状态缓存。lastProbe 记录最近结果，变化时回抛一次。
  // onProbeChange 回调自带 try/catch：观察方异常不得冒泡（probeNow 早于
  // safe 定义被首次调用，不能依赖后者）。
  let lastProbe: ProbeState = { official: false }
  const probeNow = (): ProbeState => {
    const state = probeOfficialNotify(ctx as unknown as { get(name: string): unknown }, configOf().probeServices)
    if (state.official !== lastProbe.official || state.source !== lastProbe.source) {
      lastProbe = state
      try { onProbeChange?.(state) } catch { /* 观察失败静默 */ }
    }
    return state
  }
  // 是否应发自身通知：总开关 + 冲突策略（mine 忽略探测；auto 探测到即停）。
  const shouldNotify = (): boolean => {
    const cfg = configOf()
    if (!cfg.enabled) return false
    if (cfg.overlap === 'mine') return true
    return !probeNow().official
  }
  // 首次探测：初始化状态（onProbeChange 首次回抛，让组合器尽早拿到状态）。
  // configOf 读取失败（scope 未就绪等）静默——通知是增益不是依赖。
  try { probeNow() } catch { /* 配置读取失败静默 */ }
  const sessionOpenUrl = (sessionId: string): string => {
    const base = typeof baseUrl === 'function' ? baseUrl() : baseUrl
    // rc.1 起 web 界面默认启用进程 token 鉴权（本机 127.0.0.1 同样 401）：
    // 直接打开 `/?session=` 在浏览器无 cookie 时会撞认证墙。这里用官方
    // authenticatedUrl 带上进程 token，session 改走 `#` fragment——token 交换
    // 的 303 重定向会保留 fragment（RFC 7231 §7.1.2），client 读 hash 即可
    // 完成「首次认证 + 会话跳转」二合一；已认证浏览器直接命中同一 fragment。
    // connection 服务缺失时降级为旧的无 token URL（行为与以前一致）。
    const connection = (ctx as Context & { connection?: HostConnectionHandle }).connection
    try {
      const authenticated = connection?.authenticatedUrl(base) ?? base
      return `${authenticated}#session=${encodeURIComponent(sessionId)}`
    } catch {
      return `${base}/?session=${encodeURIComponent(sessionId)}`
    }
  }
  // 启动即清扫一次残留：上次宿主崩溃（脚本自删与 30s 定时器都来不及）留下的
  // 陈旧 .ps1 在这里清掉，不必等下一次 win32 通知（见 pruneStalePs1Scripts）。
  if (PLATFORM === 'win32') pruneStalePs1Scripts()
  /** 通知是增益不是依赖：任何处理器内的异常都不允许冒泡进事件总线。 */
  const safe = (run: () => void): void => {
    try {
      run()
    } catch {
      /* 观察失败静默 */
    }
  }

  // 轮次完成：agent 从 running 回到 idle，同一 agent 5s 内只发一条，
  // 避免 HMR/会话快速重载等场景下连发多条刷屏。
  const TURN_DEDUP_MS = 5_000
  // 通知正文最大长度（超出截断加 …），保持 toast/横幅美观统一。
  const NOTIFY_BODY_MAX = 80
  const lastTurnAt = new Map<string, number>()
  ctx.on(NOTIFY_EVENTS.turnDone, (payload) => {
    safe(() => {
      if (!shouldNotify()) return
      if (payload.status !== 'idle') return
      if (isSubagent(payload.agent)) return
      const cfg = configOf()
      if (!cfg.enabled || !cfg.turn) return
      const now = Date.now()
      pruneExpired(lastTurnAt, now, TURN_DEDUP_MS)
      if (now - (lastTurnAt.get(payload.agent.id) ?? 0) < TURN_DEDUP_MS) return
      lastTurnAt.set(payload.agent.id, now)
      // 多会话并行时固定文案无法区分来源：正文拼上模型名（AgentOptions，
      // 取不到回落固定文案，绝不抛错——见 agentModelLabel）。
      const label = agentModelLabel(payload.agent)
      const body = label !== undefined ? `「${label}」已回复，可以切回查看` : '该会话已结束一轮，可以切回查看'
      systemNotify('轮次完成', body, sessionOpenUrl(payload.agent.id), cfg.sound)
    })
  }, { global: true })
  // 审批请求：waterfall 事件，只观察必须 next() 委托。通知体包 try/catch——
  // configOf 或属性访问一旦同步抛出，next() 不执行会否决整条链（卡死审批流）。
  ctx.on(NOTIFY_EVENTS.approval, (req: ApprovalRequest, next: () => Promise<ApprovalOutcome>): Promise<ApprovalOutcome> => {
    try {
      if (!shouldNotify()) return next()
      const cfg = configOf()
      if (!isSubagent(req.agent) && cfg.enabled && cfg.approval) {
        // toolName 运行时可能缺失（宿主协议旧版/畸形 payload）：`${undefined}`
        // 会展示成字面 "undefined"，缺失时用可读兜底文案。
        const toolName = req.toolName ?? '待审批操作'
        const detail = req.reason !== undefined && req.reason !== ''
          ? `${toolName} · ${req.reason}`
          : toolName
        // 正文拼上模型名（approval/request 的 payload 是 ApprovalRequestEvent，
        // agent 字段与 agent/status 同为 Agent，读 options.model/provider）。
        const label = agentModelLabel(req.agent)
        systemNotify('需要审批', summaryOf(label !== undefined ? `${label} · ${detail}` : detail, NOTIFY_BODY_MAX), sessionOpenUrl(req.agent.id), cfg.sound)
      }
    } catch { /* 通知是增益不是依赖：观察失败不阻断审批链 */ }
    return next()
  }, { global: true })
  // 错误：受总开关 + error 子开关控制。去重键是 agent id + 消息指纹——
  // 同一会话的同一错误 30s 内只发一条避免刷屏，但用户修复后出现的
  // 不同错误在同一窗口内仍会各自通知（不被旧去重键吞掉）。
  // 每次事件先清理已过期条目，防止长期运行后无界增长（见 pruneExpired）。
  const ERROR_DEDUP_MS = 30_000
  const lastErrorAt = new Map<string, number>()
  ctx.on(NOTIFY_EVENTS.error, (payload) => {
    safe(() => {
      if (!shouldNotify()) return
      if (isSubagent(payload.agent)) return
      const cfg = configOf()
      if (!cfg.enabled || !cfg.error) return
      const now = Date.now()
      // 解析边界：Error 实例优先 message；空 message 回退 name；非 Error 原样输出；
      // 完全缺失兜底「未知错误」。绝不抛（safe 内）。
      const detail = payload.error instanceof Error
        ? payload.error.message || payload.error.name || '未知错误'
        : String(payload.error ?? '未知错误')
      const key = errorDedupKey(payload.agent.id, detail)
      pruneExpired(lastErrorAt, now, ERROR_DEDUP_MS)
      if (now - (lastErrorAt.get(key) ?? 0) < ERROR_DEDUP_MS) return
      lastErrorAt.set(key, now)
      // 正文拼上模型名区分来源（agent/error 的 payload 同为 Agent）。
      const label = agentModelLabel(payload.agent)
      systemNotify('Agent 出错', summaryOf(label !== undefined ? `${label} · ${detail}` : detail, NOTIFY_BODY_MAX), sessionOpenUrl(payload.agent.id), cfg.sound)
    })
  }, { global: true })
  // 会话完成：agent 被销毁即视为会话结束（与轮次完成区分开）。
  ctx.on(NOTIFY_EVENTS.sessionDone, (payload) => {
    safe(() => {
      if (!shouldNotify()) return
      if (isSubagent(payload.agent)) return
      const cfg = configOf()
      if (!cfg.enabled || !cfg.sessionDone) return
      const label = agentModelLabel(payload.agent)
      const body = label !== undefined ? `「${label}」已完成，可以切回查看` : '该会话已完成，可以切回查看'
      systemNotify('会话完成', body, sessionOpenUrl(payload.agent.id), cfg.sound)
    })
  }, { global: true })
}
