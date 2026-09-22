import { type ChildProcess } from 'node:child_process';
/** AppleScript 单行脚本：负载经 `--` argv 传入（on run argv）。
 *  导出仅供注入不变量测试（test/system-notify.test.mjs）钉住
 *  「负载走 argv、脚本体零插值」约束。 */
export declare const OSASCRIPT_NOTIFY = "on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv) sound name \"Glass\"\nend run";
/** sound 关闭时的变体：不带 sound name 子句 → 跟随系统默认提示音。
 *  macOS 侧 terminal-notifier / osascript 都拿不到真静音（无 "none" 取值），
 *  故本开关的语义是「Glass 内置音」与「系统默认音」之差，不是静音。 */
export declare const OSASCRIPT_NOTIFY_DEFAULT_SOUND = "on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv)\nend run";
/**
 * Windows toast 脚本（-File 执行，纯静态）：负载经命名参数（argv）进入，
 * 脚本内用 SecurityElement.Escape 构造 XML（标题/正文/URL 不经过命令行）。
 * AUMID 借用 Windows PowerShell 的已注册身份展示 toast（无需额外安装）。
 * 末尾自删除脚本文件；脚本体里的 `$Title/$Body/$OpenUrl/$xml` 等均为
 * PowerShell 变量，与 JS 插值无关（本源码没有任何 `${...}` 拼入用户数据）。
 * 导出仅供注入不变量测试钉住「脚本体零 JS 插值」约束。
 */
export declare const POWERSHELL_TOAST_PS1: string;
/**
 * 注册 terminal-notifier 失败兜底：exec 失败（error 事件）、运行期失败
 * （exit 非 0）都可能先后到达，防双发标志位保证合计只兜底一次（否则
 * exit+error 双触发会重复弹 osascript 通知）。exit code 0 视为已成功发送，
 * 不兜底；被信号杀死（code null）同样视为未发送。导出仅供测试注入假 child
 * 验证「exit 非 0 → 兜底 + 防双发」（test/system-notify-fallback.test.mjs）。
 */
export declare function registerNotifierFallback(child: ChildProcess, onFallback?: () => void): void;
/** 陈旧 .ps1 判定阈值（导出供测试与诊断断言契约）。 */
export declare const PS_STALE_MS = 60000;
/** 清扫的最小间隔：清扫的目的是「宿主崩溃后残留不累积」，而残留要 PS_STALE_MS
 *  才会被判陈旧——所以清扫频率远低于通知频率纯属浪费（每条 Windows 通知都
 *  readdir 整个 tmpdir，其他应用残留多时是可感知的同步 I/O 抖动）。
 *  取 PS_STALE_MS 的一半：即使刚扫完 30s 又来一条通知，最坏情况也只是让某个
 *  残留多活 30s，不影响「不累积」的目标。 */
export declare const PS_PRUNE_INTERVAL_MS: number;
/**
 * 清扫 tmpdir 里陈旧的 `dsh-notify-*.ps1` 残留。主清理路径是脚本自身
 * finally 自删 + JS 30s 定时器，但它们都在宿主进程存活时才能生效；宿主
 * 整体崩溃时这两条路径都会失效，残留只能靠下一次写入前清扫兜住。
 * 写入新脚本前调用（带 PS_PRUNE_INTERVAL_MS 节流），把超过 PS_STALE_MS 的
 * 旧文件删掉，防止长期运行 / 多次崩溃后 /tmp 累积。
 * @param dir - 扫描目录（默认系统临时目录；注入便于测试）。
 * @param now - 当前时间戳（注入便于测试）。
 * @param staleMs - 视为残留的 mtime 阈值。
 * @returns 删除的文件数（被节流跳过时返回 0）。
 */
export declare function pruneStalePs1Scripts(dir?: string, now?: number, staleMs?: number): number;
/**
 * 在 PATH 中查找一个可执行文件，返回命中路径（找不到返回 null）。
 * 纯查询：不 spawn、不做 shell 展开、不缓存。用于 Linux 侧判断
 * notify-send 是否值得尝试（命令本身仍以字面量 spawn，见 spawnNotifySend）。
 * @param name - 可执行文件名（不含路径分隔符）。
 * @param pathEnv - PATH 变量值（默认 process.env.PATH）。
 * @param exists - 存在性判定（注入便于测试；默认 node:fs existsSync）。
 * @param separator - PATH 条目分隔符（注入便于测试；默认平台分隔符）。
 */
export declare function findOnPath(name: string, pathEnv?: string | undefined, exists?: (path: string) => boolean, separator?: string): string | null;
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
export declare function psNamedArgs(title: string, body: string, openUrl?: string): string[];
/**
 * 构造传给 notify-send 的 argv。
 * 标题/正文是位置参数，若以 `-` 开头会被 GOption 解析成选项名——用 `--`
 * 显式终止选项解析，负载再原样跟随。`-a DSH` 让通知来源显示为 DSH 而非
 * 脚本名；`-t 10000` 让通知 10s 后自动消失（不堆积在通知中心）。
 * 导出仅供测试钉住 argv 形态与 `--` 终止符。
 */
export declare function notifySendArgs(title: string, body: string): string[];
/** macOS 通知：osascript 为主（稳定可靠，带系统声音）。terminal-notifier
 * 的点击跳转依赖已废弃的 NSUserNotification 私有图标 API（macOS 26 失效），
 * 仅在需要点击跳转且二进制存在时使用，作为 osascript 的补充。
 * 导出仅供测试注入 node:child_process/node:fs 后验证兜底链（test/）。 */
export declare function notifyMac(title: string, body: string, openUrl: string | undefined, sound: boolean): void;
/**
 * Linux 通知：notify-send（libnotify；GNOME/KDE/XFCE 等桌面发行版普遍预装）。
 * 展示型通知——notify-send 没有可靠的"点击回调"通道（-A 需进程长驻等待，
 * 与 fire-and-forget 语义冲突），故 Linux 上通知不可点击；未安装
 * notify-send 时静默跳过（增益不是依赖）。sound 开关在 Linux 上无效：
 * 通知声音由桌面主题/系统设置控制，libnotify 无逐条覆盖接口。
 * 导出仅供测试注入 node:child_process 后验证 argv 形态（test/）。
 */
export declare function notifyLinux(title: string, body: string): void;
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
export declare function systemNotify(title: string, body: string, openUrl: string | undefined, sound: boolean): void;
//# sourceMappingURL=system-notify.d.ts.map