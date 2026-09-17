/**
 * dsh-notify — system-level desktop notifications (host side, platform channels).
 *
 * 平台分派：
 *   - macOS:   terminal-notifier（-open 点击跳转浏览器对应会话），缺失或
 *             运行失败时 osascript 兜底（不可点击，仅显示）
 *   - Windows: PowerShell WinRT toast（点击「查看会话」跳转，无 openUrl 时仅展示）
 *   - Linux:   notify-send（libnotify，展示型通知；无点击跳转通道）
 *   - 其他平台: 静默跳过（桌面通知没有通用入口，增益不是依赖）
 *
 * 通知是增益不是依赖：所有失败静默，绝不拖垮宿主进程（含 spawn 的异步
 * error，必须被消费，否则 unhandled 'error' 会崩掉整个宿主）。
 *
 * 注入安全（两条约束，都是硬性的）：
 *   - spawn 调用点的 command 一律是字符串字面量，候选路径逐个判断后再用
 *     各自的字面量封装，绝不把变量当命令（PATH 探测只用于"是否存在"判定，
 *     命令本身仍是字面量，由 OS 按 PATH 解析）；
 *   - 通知负载（标题/正文/URL）只作为 argv 传入：Windows 的 toast 脚本是
 *     -File 执行的静态 .ps1，负载经命名参数进入，脚本内用
 *     SecurityElement.Escape 构造 XML，不拼进命令字符串；静音开关经
 *     环境变量 DSH_NOTIFY_SILENT 传入（不占 param 参数位，测试钉住
 *     param 三参形态不变）。
 *
 * 事件监听与通知编排在 notify-events.ts（本模块只负责"怎么发"）。
 */
import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawn } from 'node:child_process';
/** 当前宿主平台（spawn 前分派，避免在不适用的平台上尝试不存在的二进制）。 */
const PLATFORM = process.platform;
/** AppleScript 单行脚本：负载经 `--` argv 传入（on run argv）。
 *  导出仅供注入不变量测试（test/system-notify.test.mjs）钉住
 *  「负载走 argv、脚本体零插值」约束。 */
export const OSASCRIPT_NOTIFY = 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv) sound name "Glass"\nend run';
/** sound 关闭时的变体：不带 sound name 子句 → 跟随系统默认提示音。
 *  macOS 侧 terminal-notifier / osascript 都拿不到真静音（无 "none" 取值），
 *  故本开关的语义是「Glass 内置音」与「系统默认音」之差，不是静音。 */
export const OSASCRIPT_NOTIFY_DEFAULT_SOUND = 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv)\nend run';
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
].join('\n');
/**
 * 注册 terminal-notifier 失败兜底：exec 失败（error 事件）、运行期失败
 * （exit 非 0）都可能先后到达，防双发标志位保证合计只兜底一次（否则
 * exit+error 双触发会重复弹 osascript 通知）。exit code 0 视为已成功发送，
 * 不兜底；被信号杀死（code null）同样视为未发送。导出仅供测试注入假 child
 * 验证「exit 非 0 → 兜底 + 防双发」（test/system-notify-fallback.test.mjs）。
 */
export function registerNotifierFallback(child, onFallback) {
    let fellBack = false;
    const fallbackOnce = () => {
        if (fellBack)
            return;
        fellBack = true;
        onFallback?.();
    };
    child.on('error', fallbackOnce); // exec 失败（存在但不可执行）→ 兜底通道
    child.on('exit', (code) => {
        // macOS 26 起 NSUserNotification 点击 API 失效，terminal-notifier 存在
        // 也会以非 0 退出：通知未成功发送 → 兜底通道（退化不可点击，仍有可见）。
        if (code !== 0)
            fallbackOnce();
    });
}
/**
 * 后台启动一个子进程，失败全程静默。每个 spawn 调用点的 command 都是
 * 字符串字面量（注入约束），所以一个命令一个薄封装；异步 'error' 必须被
 * 消费（否则 Node 以 unhandled 'error' 崩溃宿主），同步 throw 也吞掉。
 * macOS 上 detached 让通知进程在宿主退出后仍可存活；Windows 上
 * windowsHide 避免闪出控制台窗口。
 */
function spawnNotifierSilicon(args, onFallback) {
    try {
        const child = spawn('/opt/homebrew/bin/terminal-notifier', [...args], { stdio: 'ignore', detached: true, windowsHide: true });
        registerNotifierFallback(child, onFallback);
        child.unref();
    }
    catch {
        onFallback?.(); // 同步失败（参数非法等）→ 兜底通道（无 child，无双发风险）
    }
}
function spawnNotifierIntel(args, onFallback) {
    try {
        const child = spawn('/usr/local/bin/terminal-notifier', [...args], { stdio: 'ignore', detached: true, windowsHide: true });
        registerNotifierFallback(child, onFallback);
        child.unref();
    }
    catch {
        onFallback?.(); // 同步失败（参数非法等）→ 兜底通道（无 child，无双发风险）
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
/**
 * 后台启动 notify-send（Linux，libnotify）。失败全程静默。command 是字符串
 * 字面量（注入约束）：探测（findOnPath）只决定"是否值得尝试"，实际由 OS
 * 按 PATH 解析该字面量——两者之间即使发生 TOCTOU，结果也只是 spawn 失败后
 * 被静默吞掉，通知是增益不是依赖。
 */
function spawnNotifySend(args) {
    try {
        const child = spawn('notify-send', [...args], { stdio: 'ignore', detached: true, windowsHide: true });
        child.on('error', () => { });
        child.unref();
    }
    catch {
        // 同步失败（参数非法等）同样静默。
    }
}
/**
 * 后台启动 powershell.exe（WinRT toast）。失败全程静默。spawn 调用点的
 * command 是字符串字面量（注入约束）；异步 'error' 必须被消费。返回 child
 * 供调用方注册 exit/超时兜底清理（见 notifyWindows），失败返回 undefined。
 */
function spawnPowershell(args, opts = {}) {
    const { onErrorCleanup, env } = opts;
    try {
        const child = spawn('powershell.exe', [...args], { stdio: 'ignore', detached: false, windowsHide: true, ...(env ? { env: { ...process.env, ...env } } : {}) });
        child.on('error', () => {
            onErrorCleanup?.(); // spawn 失败（脚本未运行）：兜底删临时文件
        });
        child.unref();
        return child;
    }
    catch {
        // 同步失败（参数非法等）同样静默。
        onErrorCleanup?.();
        return undefined;
    }
}
/** 临时 .ps1 的 JS 侧兜底清理延迟：脚本自身 finally 自删是主路径，
 *  这里只兜底「宿主在脚本执行前被杀 / spawn 后未运行」的极端残留。 */
const PS_CLEANUP_FALLBACK_MS = 30_000;
/** 陈旧 .ps1 判定阈值：写入后超过该时长仍未自删的文件视为残留。
 *  正常脚本从写入到 powershell 执行完毕只有数秒，60s 足以排除「正在执行」
 *  的脚本；只有宿主崩溃/进程被杀等极端场景才会跨过这条线。 */
const PS_STALE_MS = 60_000;
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
export function pruneStalePs1Scripts(dir = tmpdir(), now = Date.now(), staleMs = PS_STALE_MS) {
    let removed = 0;
    try {
        for (const name of readdirSync(dir)) {
            if (!name.startsWith('dsh-notify-') || !name.endsWith('.ps1'))
                continue;
            try {
                if (now - statSync(join(dir, name)).mtimeMs >= staleMs) {
                    unlinkSync(join(dir, name));
                    removed += 1;
                }
            }
            catch {
                // 单个文件 stat/unlink 失败（已被脚本自删、权限等）：跳过，不中断清扫。
            }
        }
    }
    catch {
        // tmpdir 不可读等整体失败：静默（清扫是兜底，不是主路径）。
    }
    return removed;
}
/**
 * 在 PATH 中查找一个可执行文件，返回命中路径（找不到返回 null）。
 * 纯查询：不 spawn、不做 shell 展开、不缓存。用于 Linux 侧判断
 * notify-send 是否值得尝试（命令本身仍以字面量 spawn，见 spawnNotifySend）。
 * @param name - 可执行文件名（不含路径分隔符）。
 * @param pathEnv - PATH 变量值（默认 process.env.PATH）。
 * @param exists - 存在性判定（注入便于测试；默认 node:fs existsSync）。
 * @param separator - PATH 条目分隔符（注入便于测试；默认平台分隔符）。
 */
export function findOnPath(name, pathEnv = process.env.PATH, exists = existsSync, separator = delimiter) {
    if (pathEnv === undefined || pathEnv === '')
        return null;
    for (const dir of pathEnv.split(separator)) {
        if (dir === '')
            continue;
        const candidate = join(dir, name);
        try {
            if (exists(candidate))
                return candidate;
        }
        catch {
            // 单个条目判定失败（权限等）：跳过，继续找。
        }
    }
    return null;
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
export function psNamedArgs(title, body, openUrl) {
    const dashSafe = (v) => (v.startsWith('-') ? ` ${v}` : v);
    const args = ['-Title', dashSafe(title), '-Body', dashSafe(body)];
    if (openUrl !== undefined && openUrl !== '')
        args.push('-OpenUrl', dashSafe(openUrl));
    return args;
}
/**
 * 构造传给 notify-send 的 argv。
 * 标题/正文是位置参数，若以 `-` 开头会被 GOption 解析成选项名——用 `--`
 * 显式终止选项解析，负载再原样跟随。`-a DSH` 让通知来源显示为 DSH 而非
 * 脚本名；`-t 10000` 让通知 10s 后自动消失（不堆积在通知中心）。
 * 导出仅供测试钉住 argv 形态与 `--` 终止符。
 */
export function notifySendArgs(title, body) {
    return ['-a', 'DSH', '-t', '10000', '--', title, body];
}
/**
 * 探测 terminal-notifier 路径。每次通知前调用（不缓存）：
 * existsSync 是微秒级 stat，通知频率低（turn/error 均有去重），
 * 代价可忽略；不做进程内缓存还能即时发现会话存续期内后装的
 * terminal-notifier（缓存会让它在本会话内永远不可见）。
 */
function detectNotifierPath() {
    if (existsSync('/opt/homebrew/bin/terminal-notifier'))
        return '/opt/homebrew/bin/terminal-notifier';
    if (existsSync('/usr/local/bin/terminal-notifier'))
        return '/usr/local/bin/terminal-notifier';
    return null;
}
/** macOS 通知：osascript 为主（稳定可靠，带系统声音）。terminal-notifier
 * 的点击跳转依赖已废弃的 NSUserNotification 私有图标 API（macOS 26 失效），
 * 仅在需要点击跳转且二进制存在时使用，作为 osascript 的补充。
 * 导出仅供测试注入 node:child_process/node:fs 后验证兜底链（test/）。 */
export function notifyMac(title, body, openUrl, sound) {
    const soundArgs = sound ? ['-sound', 'Glass'] : [];
    // osascript 兜底：terminal-notifier 缺失（探测为 null）、存在但执行失败
    // （existsSync 只证明文件在，quarantine/权限/损坏安装会让 exec 报 error）
    // 或运行期失败（macOS 26 起点击 API 失效，exit 非 0）都必须仍有通知可见，
    // 只是退化为不可点击；exit+error 双触发只兜底一次（见 registerNotifierFallback）。
    const osascriptFallback = () => spawnOsascript(['-e', sound ? OSASCRIPT_NOTIFY : OSASCRIPT_NOTIFY_DEFAULT_SOUND, '--', title, body]);
    if (openUrl !== undefined && openUrl !== '') {
        // 每次通知前重新探测（见 detectNotifierPath 注释）；spawn 的 command 恒为字面量。
        const notifierPath = detectNotifierPath();
        if (notifierPath === '/opt/homebrew/bin/terminal-notifier') {
            spawnNotifierSilicon(['-message', body, '-title', title, '-open', openUrl, ...soundArgs], osascriptFallback);
            return;
        }
        if (notifierPath === '/usr/local/bin/terminal-notifier') {
            spawnNotifierIntel(['-message', body, '-title', title, '-open', openUrl, ...soundArgs], osascriptFallback);
            return;
        }
    }
    osascriptFallback();
}
/**
 * Windows 通知：PowerShell WinRT toast（Win10+ 自带，无第三方依赖）。
 * 把静态 .ps1 写到临时目录后以 -File 执行，标题/正文/URL 作为命名参数
 * （argv）传入；脚本内用 SecurityElement.Escape 构造 XML 负载并自删除，
 * 用户数据不经过命令行，杜绝命令注入。
 * @param sound - 提示音开关（false → toast XML 加 <audio silent="true"/> 真静音）。
 */
function notifyWindows(title, body, openUrl, sound) {
    // 写入前先清扫陈旧残留：宿主崩溃时脚本自删与 30s 定时器都失效，只有
    // 下一次写入前的清扫能兜住（见 pruneStalePs1Scripts）。
    pruneStalePs1Scripts();
    let psPath;
    try {
        psPath = join(tmpdir(), `dsh-notify-${randomUUID()}.ps1`);
        writeFileSync(psPath, POWERSHELL_TOAST_PS1, 'utf8');
    }
    catch {
        return; // 临时脚本写入失败：静默
    }
    // 冒号形式传值：值以 `-` 开头时不会被绑定器误解析为参数名（见 psNamedArgs）。
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', psPath, ...psNamedArgs(title, body, openUrl)];
    // sound 关闭 → 环境变量通知脚本（保持 param 三参形态与「负载走命名参数」不变量）。
    const silentEnv = sound ? {} : { DSH_NOTIFY_SILENT: '1' };
    /** 删除临时脚本（幂等：已删/不存在则忽略）。 */
    const cleanup = () => {
        try {
            unlinkSync(psPath);
        }
        catch { /* 已删除则忽略 */ }
    };
    // 主路径：脚本内 finally 自删。兜底路径：
    //  - spawn 失败（脚本未运行）→ onErrorCleanup 立即删；
    //  - 子进程已退出（无论成败）→ exit 清掉超时定时器（文件此刻多半已由
    //    脚本自删，cleanup 幂等无害）；
    //  - 宿主在脚本执行前被杀、powershell 卡死未退出等极端场景 → 30s 超时
    //    强制删除（unref 定时器不拖住宿主退出，fire-and-forget 静默）。
    const child = spawnPowershell(args, { onErrorCleanup: cleanup, ...(sound ? {} : { env: silentEnv }) });
    if (child !== undefined) {
        const fallback = setTimeout(cleanup, PS_CLEANUP_FALLBACK_MS);
        fallback.unref?.();
        child.once('exit', () => clearTimeout(fallback));
    }
}
/**
 * Linux 通知：notify-send（libnotify；GNOME/KDE/XFCE 等桌面发行版普遍预装）。
 * 展示型通知——notify-send 没有可靠的"点击回调"通道（-A 需进程长驻等待，
 * 与 fire-and-forget 语义冲突），故 Linux 上通知不可点击；未安装
 * notify-send 时静默跳过（增益不是依赖）。sound 开关在 Linux 上无效：
 * 通知声音由桌面主题/系统设置控制，libnotify 无逐条覆盖接口。
 * 导出仅供测试注入 node:child_process 后验证 argv 形态（test/）。
 */
export function notifyLinux(title, body) {
    if (findOnPath('notify-send') === null)
        return; // 未装 libnotify：静默跳过
    spawnNotifySend(notifySendArgs(title, body));
}
/**
 * 发一条系统通知。fire-and-forget：所有失败静默，不影响主流程。
 * @param title - 通知标题（已本地化，见 notify-text.ts）。
 * @param body - 通知正文（已单行化/截断）。
 * @param openUrl - 点击通知要打开的 URL（浏览器会话 deep-link）；为空则不可点击
 *                  （Linux 恒不可点击，见 notifyLinux）。
 * @param sound - 提示音开关（macOS：true=显式 Glass，false=跟随系统默认音；
 *                Windows：false=toast XML `<audio silent="true"/>` 真静音；
 *                Linux：忽略——声音由桌面主题控制）。
 */
export function systemNotify(title, body, openUrl, sound) {
    switch (PLATFORM) {
        case 'darwin':
            notifyMac(title, body, openUrl, sound);
            return;
        case 'win32':
            notifyWindows(title, body, openUrl, sound);
            return;
        case 'linux':
            notifyLinux(title, body);
            return;
        default:
            // 其他平台没有可靠的桌面通知入口：静默跳过（增益不是依赖）。
            return;
    }
}
//# sourceMappingURL=system-notify.js.map