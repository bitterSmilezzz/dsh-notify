import type { Context } from '@deepseek-ai/cordis';
/** 通知开关（与 settings schema 的 notify 子对象一致）。 */
export interface NotifyConfig {
    enabled: boolean;
    approval: boolean;
    turn: boolean;
    sessionDone: boolean;
    error: boolean;
    /** 提示音：true=显式 Glass，false=跟随系统默认（仅 macOS 分支消费）。 */
    sound: boolean;
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
 * 安装系统通知：注册事件监听（轮次完成/审批/错误），读 settings 配置判断
 * 总开关与各事件开关。点击通知跳转浏览器对应会话（client 读 `#session=`，
 * 兼容旧的 `?session=`）。
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照）。
 * @param baseUrl - 浏览器地址（默认 3080）。
 */
export declare function applySystemNotify(ctx: Context, configOf: () => NotifyConfig, baseUrl?: string | (() => string)): void;
//# sourceMappingURL=system-notify.d.ts.map