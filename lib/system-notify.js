/**
 * dsh-notify — system-level desktop notifications (host side).
 *
 * 监听 Cordis 事件发系统通知，按平台分派：
 *   - macOS:   terminal-notifier（-open 点击跳转浏览器对应会话），缺失时
 *             osascript 兜底（不可点击，仅显示）
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
 *     SecurityElement.Escape 构造 XML，不拼进命令字符串。
 */
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
/** 当前宿主平台（spawn 前分派，避免在不适用的平台上尝试不存在的二进制）。 */
const PLATFORM = process.platform;
/** AppleScript 单行脚本：负载经 `--` argv 传入（on run argv）。 */
const OSASCRIPT_NOTIFY = 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv) sound name "Glass"\nend run';
/**
 * Windows toast 脚本（-File 执行，纯静态）：负载经命名参数（argv）进入，
 * 脚本内用 SecurityElement.Escape 构造 XML（标题/正文/URL 不经过命令行）。
 * AUMID 借用 Windows PowerShell 的已注册身份展示 toast（无需额外安装）。
 * 末尾自删除脚本文件；脚本体里的 `$Title/$Body/$OpenUrl/$xml` 等均为
 * PowerShell 变量，与 JS 插值无关（本源码没有任何 `${...}` 拼入用户数据）。
 */
const POWERSHELL_TOAST_PS1 = [
    'param([string]$Title, [string]$Body, [string]$OpenUrl)',
    'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
    '$null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]',
    '$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]',
    '$esc = { param($t) [System.Security.SecurityElement]::Escape([string]$t) }',
    '$actions = ""',
    'if ($OpenUrl) { $actions = \'<actions><action content="查看会话" activationType="protocol" arguments="\' + (& $esc $OpenUrl) + \'"/></actions>\' }',
    '$xml = \'<toast><visual><binding template="ToastGeneric"><text>\' + (& $esc $Title) + \'</text><text>\' + (& $esc $Body) + \'</text></binding></visual>\' + $actions + \'</toast>\'',
    '$doc = New-Object Windows.Data.Xml.Dom.XmlDocument',
    '$doc.LoadXml($xml)',
    '$toast = New-Object Windows.UI.Notifications.ToastNotification $doc',
    '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(\'{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe\').Show($toast)',
    'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue',
].join('\n');
/**
 * 后台启动一个子进程，失败全程静默。每个 spawn 调用点的 command 都是
 * 字符串字面量（注入约束），所以一个命令一个薄封装；异步 'error' 必须被
 * 消费（否则 Node 以 unhandled 'error' 崩溃宿主），同步 throw 也吞掉。
 * macOS 上 detached 让通知进程在宿主退出后仍可存活；Windows 上
 * windowsHide 避免闪出控制台窗口。
 */
function spawnNotifierSilicon(args) {
    try {
        const child = spawn('/opt/homebrew/bin/terminal-notifier', [...args], { stdio: 'ignore', detached: true, windowsHide: true });
        child.on('error', () => { });
        child.unref();
    }
    catch {
        // 同步失败（参数非法等）同样静默。
    }
}
function spawnNotifierIntel(args) {
    try {
        const child = spawn('/usr/local/bin/terminal-notifier', [...args], { stdio: 'ignore', detached: true, windowsHide: true });
        child.on('error', () => { });
        child.unref();
    }
    catch {
        // 同步失败（参数非法等）同样静默。
    }
}
function spawnOsascript(args) {
    try {
        const child = spawn('osascript', [...args], { stdio: 'ignore', detached: true, windowsHide: true });
        child.on('error', () => { });
        child.unref();
    }
    catch {
        // 同步失败（参数非法等）同样静默。
    }
}
function spawnPowershell(args, onErrorCleanup) {
    try {
        const child = spawn('powershell.exe', [...args], { stdio: 'ignore', detached: false, windowsHide: true });
        child.on('error', () => {
            onErrorCleanup?.(); // spawn 失败（脚本未运行）：兜底删临时文件
        });
        child.unref();
    }
    catch {
        // 同步失败（参数非法等）同样静默。
        onErrorCleanup?.();
    }
}
/** 已探测到的 terminal-notifier 路径（缓存）：notifyMac 每次通知都 existsSync
 * 探测太浪费——进程存续期内该路径不会变，首次探测后复用（null = 未探测）。 */
let notifierPath = undefined;
/** macOS 通知：osascript 为主（稳定可靠，带系统声音）。terminal-notifier
 * 的点击跳转依赖已废弃的 NSUserNotification 私有图标 API（macOS 26 失效），
 * 仅在需要点击跳转且二进制存在时使用，作为 osascript 的补充。 */
function notifyMac(title, body, openUrl) {
    if (openUrl !== undefined && openUrl !== '') {
        // 候选路径逐个判断（仅首次）：spawn 的 command 恒为字面量。
        if (notifierPath === undefined) {
            if (existsSync('/opt/homebrew/bin/terminal-notifier')) {
                notifierPath = '/opt/homebrew/bin/terminal-notifier';
            }
            else if (existsSync('/usr/local/bin/terminal-notifier')) {
                notifierPath = '/usr/local/bin/terminal-notifier';
            }
            else {
                notifierPath = null;
            }
        }
        if (notifierPath === '/opt/homebrew/bin/terminal-notifier') {
            spawnNotifierSilicon(['-message', body, '-title', title, '-open', openUrl, '-sound', 'Glass']);
            return;
        }
        if (notifierPath === '/usr/local/bin/terminal-notifier') {
            spawnNotifierIntel(['-message', body, '-title', title, '-open', openUrl, '-sound', 'Glass']);
            return;
        }
    }
    spawnOsascript(['-e', OSASCRIPT_NOTIFY, '--', title, body]);
}
/**
 * Windows 通知：PowerShell WinRT toast（Win10+ 自带，无第三方依赖）。
 * 把静态 .ps1 写到临时目录后以 -File 执行，标题/正文/URL 作为命名参数
 * （argv）传入；脚本内用 SecurityElement.Escape 构造 XML 负载并自删除，
 * 用户数据不经过命令行，杜绝命令注入。
 */
function notifyWindows(title, body, openUrl) {
    let psPath;
    try {
        psPath = join(tmpdir(), `dsh-notify-${randomUUID()}.ps1`);
        writeFileSync(psPath, POWERSHELL_TOAST_PS1, 'utf8');
    }
    catch {
        return; // 临时脚本写入失败：静默
    }
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', psPath, '-Title', title, '-Body', body];
    if (openUrl !== undefined && openUrl !== '')
        args.push('-OpenUrl', openUrl);
    // spawn 失败兜底删除临时脚本（正常流程由脚本内自删）。
    spawnPowershell(args, () => {
        try {
            unlinkSync(psPath);
        }
        catch { /* 已删除则忽略 */ }
    });
}
/**
 * 发一条系统通知。fire-and-forget：所有失败静默，不影响主流程。
 * @param title - 通知标题。
 * @param body - 通知正文。
 * @param openUrl - 点击通知要打开的 URL（浏览器会话 deep-link）；为空则不可点击。
 */
function systemNotify(title, body, openUrl) {
    switch (PLATFORM) {
        case 'darwin':
            notifyMac(title, body, openUrl);
            return;
        case 'win32':
            notifyWindows(title, body, openUrl);
            return;
        default:
            // 其他平台没有可靠的桌面通知入口：静默跳过（增益不是依赖）。
            return;
    }
}
/** 单行化 + 限长（≤max 字符，尾部 …）。 */
function summaryOf(text, max = 120) {
    if (text === undefined || text === '')
        return '';
    const oneLine = text.replace(/\s+/gu, ' ').trim();
    return oneLine.length <= max ? oneLine : `${oneLine.slice(0, Math.max(1, max - 1))}…`;
}
/**
 * subagent 会话过滤：SessionHeader.origin === 'subagent'（dsh-session 官方判定，
 * 如 session-controller history.js）。subagent 也会打 agent/status/error/disposed
 * 全局事件——通知噪音且深链指向会话列表没有的 id（client 空等超时，点击无响应）。
 * 结构化读取：类型面不可达时 undefined 一律视为主会话（行为与旧版一致）。
 */
function isSubagent(agent) {
    const origin = agent?.session?.header?.origin;
    return origin === 'subagent';
}
/**
 * 安装系统通知：注册事件监听（轮次完成/审批/错误），读 settings 配置判断
 * 总开关与各事件开关。点击通知跳转浏览器对应会话（client 读 `?session=`）。
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照）。
 * @param baseUrl - 浏览器地址（默认 3080）。
 */
export function applySystemNotify(ctx, configOf, baseUrl = 'http://127.0.0.1:3080') {
    const sessionOpenUrl = (sessionId) => `${baseUrl}/?session=${encodeURIComponent(sessionId)}`;
    const enabled = () => configOf().enabled;
    // 轮次完成：agent 从 running 回到 idle。
    // payload 类型由 dsh-agent 的 Events 合并推断（agent: Agent; status: AgentStatus）。
    ctx.on('agent/status', (payload) => {
        if (payload.status !== 'idle')
            return;
        if (isSubagent(payload.agent))
            return;
        if (!enabled() || !configOf().turn)
            return;
        systemNotify('轮次完成', '该会话已结束一轮，可以切回查看', sessionOpenUrl(payload.agent.id));
    }, { global: true });
    // 审批请求：waterfall 事件，只观察必须 next() 委托。通知体包 try/catch——
    // configOf 或属性访问一旦同步抛出，next() 不执行会否决整条链（卡死审批流）。
    ctx.on('approval/request', (req, next) => {
        try {
            if (!isSubagent(req.agent) && enabled() && configOf().approval) {
                const detail = req.reason !== undefined && req.reason !== ''
                    ? `${req.toolName} · ${req.reason}`
                    : req.toolName;
                systemNotify('需要审批', summaryOf(detail, 80), sessionOpenUrl(req.agent.id));
            }
        }
        catch { /* 通知是增益不是依赖：观察失败不阻断审批链 */ }
        return next();
    }, { global: true });
    // 错误：受总开关 + error 子开关控制，同一会话 30s 内只发一条避免刷屏。
    // Map 只在写新时间戳时清理已过期的条目，防止长期运行后无界增长。
    const ERROR_DEDUP_MS = 30_000;
    const lastErrorAt = new Map();
    ctx.on('agent/error', (payload) => {
        if (isSubagent(payload.agent))
            return;
        if (!enabled() || !configOf().error)
            return;
        const now = Date.now();
        // 顺带清理早已过期的旧条目（≤30s 窗口外的记录不再有去重价值）。
        if (lastErrorAt.size >= 64) {
            for (const [id, at] of lastErrorAt) {
                if (now - at >= ERROR_DEDUP_MS)
                    lastErrorAt.delete(id);
            }
        }
        if (now - (lastErrorAt.get(payload.agent.id) ?? 0) < ERROR_DEDUP_MS)
            return;
        lastErrorAt.set(payload.agent.id, now);
        const detail = String((payload.error instanceof Error && payload.error.message) || payload.error || '未知错误');
        systemNotify('Agent 出错', summaryOf(detail, 80), sessionOpenUrl(payload.agent.id));
    }, { global: true });
    // 会话完成：agent 被销毁即视为会话结束（与轮次完成区分开）。
    ctx.on('agent/disposed', (payload) => {
        if (isSubagent(payload.agent))
            return;
        if (!enabled() || !configOf().sessionDone)
            return;
        systemNotify('会话完成', '该会话已完成，可以切回查看', sessionOpenUrl(payload.agent.id));
    }, { global: true });
}
//# sourceMappingURL=system-notify.js.map