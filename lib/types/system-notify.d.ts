import type { Context } from '@deepseek-ai/cordis';
import { type ProbeState } from './notify-policy.ts';
/** 通知开关（与 settings schema 的 notify 子对象一致）。 */
export interface NotifyConfig {
    enabled: boolean;
    approval: boolean;
    turn: boolean;
    sessionDone: boolean;
    error: boolean;
    /** 提示音：true=显式 Glass（macOS）/系统默认音（Windows）；false=跟随系统默认（macOS）/真静音（Windows）。 */
    sound: boolean;
    /**
     * 与其他通知源（官方/生态）冲突时的策略：
     *   - 'auto'（默认）：探测到其他通知源即跳过自身通知（防双份刷屏）；
     *   - 'mine'：忽略探测结果，始终用自己的（主动双开，自负重复风险）。
     */
    overlap: 'auto' | 'mine';
}
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
export declare function pruneStalePs1Scripts(dir?: string, now?: number, staleMs?: number): number;
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
 * 发一条系统通知。fire-and-forget：所有失败静默，不影响主流程。
 * 导出供组合器在防重叠探测翻转时发「已自动暂停/已恢复」提示。
 * @param title - 通知标题。
 * @param body - 通知正文。
 * @param openUrl - 点击通知要打开的 URL（浏览器会话 deep-link）；为空则不可点击。
 * @param sound - 提示音开关（macOS：true=显式 Glass，false=跟随系统默认音；
 *                Windows：false=toast XML `<audio silent="true"/>` 真静音）。
 */
export declare function systemNotify(title: string, body: string, openUrl: string | undefined, sound: boolean): void;
/**
 * 安装系统通知：注册事件监听（轮次完成/审批/错误），读 settings 配置判断
 * 总开关与各事件开关，并做其他通知源（官方/生态）的防重叠探测。点击通知
 * 跳转浏览器对应会话（client 读 `#session=`，兼容旧的 `?session=`）。
 *
 * 防重叠（auto 策略）：监听器在 apply 时注册、随 fiber 卸载；每条事件进来
 * 先经 shouldNotify() 判定（配置 + 探测），auto 且探测到其他通知源即跳过
 * 自身通知——对用户可观察行为等价于动态注销，且事件低频、无性能顾虑。
 * 探测状态变化（false↔true）经 onProbeChange 回抛，由组合器更新只读
 * service 与提示用户。探测失败静默（通知是增益不是依赖）。
 *
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照）。
 * @param baseUrl - 浏览器地址（默认 3080）。
 * @param probeServices - 追加的候选探测 service 名（settings probeServices）。
 * @param onProbeChange - 探测状态变化回调（含首次探测）。
 */
export declare function applySystemNotify(ctx: Context, configOf: () => NotifyConfig, baseUrl?: string | (() => string), probeServices?: readonly string[], onProbeChange?: (state: ProbeState) => void): void;
//# sourceMappingURL=system-notify.d.ts.map