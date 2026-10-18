/**
 * dsh-notify — host half.
 *
 * 本插件**不再由 host 发送系统通知**。桌面通知全部由 client 半区的 Web
 * Notification API 发出（见 `src/client/notifications.ts`）——在 DSH 桌面壳
 * 里那就是系统原生通知：发送方身份是 App 本身（不是 terminal-notifier /
 * Script Editor / powershell.exe），且 Electron 壳对非 media 权限一律放行
 * （apps/desktop/src/microphone-permissions.ts 的 `if (permission !== 'media')
 * { callback(true); return }`），因此免授权、免签名、免外部二进制。
 *
 * 于是 host 半区只剩一件事：持有 profile-backed 的 Config schema，供官方
 * 「插件配置表单」读写。通知策略、事件订阅、通道全在 client 半区。
 *
 * 配置契约（DSH 0.1.7 起 profile-backed forms）：入口模块顶层导出
 * `Config`（schemastery 对象）+ `apply(ctx, config)` 函数插件，namespace 由
 * entry id（`cordis.patch.yml` 的 `id: dsh-notify`）提供。字段全部标
 * `.volatile()`——没有 volatile 标记的 entry 不会进入 `describe()`，官方配置页
 * 与 client 写入会静默失效。
 */
import type { Volatile } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/**
 * 配置 namespace 由 **profile entry id** 提供：host 半区不自己命名，
 * `cordis.patch.yml` 的 `id: dsh-notify` 就是 namespace，client 半区用同一个
 * 字符串 `configForms.get('dsh-notify')`。两处字符串的一致性由
 * `test/config-parity.test.mjs` 钉住。
 */
export declare const name = "dsh-notify";
/**
 * Host 半区没有硬依赖的服务：配置注入由 Loader 直接交给 apply 第二参，
 * 通知逻辑全在 client 半区。空数组也必须**显式导出**——伞仓库准入契约
 * （`validate-plugin.mjs` 的 `[inject]` 项）按存在性检查这一声明。
 */
export declare const inject: string[];
/** Host plugin configuration：通知总开关、各事件开关、免打扰时段与摘要开关。 */
export interface Config {
    enabled: Volatile<boolean>;
    approval: Volatile<boolean>;
    question: Volatile<boolean>;
    turn: Volatile<boolean>;
    sessionDone: Volatile<boolean>;
    error: Volatile<boolean>;
    subagent: Volatile<boolean>;
    sound: Volatile<boolean>;
    summary: Volatile<boolean>;
    quietHours: Volatile<boolean>;
    quietStart: Volatile<string>;
    quietEnd: Volatile<string>;
}
/**
 * 顶层 Config：全部字段 volatile，所有开关都支持不重启热改。
 * 默认除子代理完成外全开（`enabled` 为总开关，取消勾选后保留分项值）；
 * 免打扰默认关闭。
 *
 * volatile 字段在运行时是 `Volatile<T>` 引用（官方 `plainOptions()` 同款语义：
 * 每次读 `.get()` 拿当前值，热改后无需重挂插件），所以接口字段标 Volatile。
 * 注意按官方范式（llm-deepseek）不加 `z<Config>` 泛型标注：volatile 会让
 * ObjectS 的形状与接口产生逆变冲突，官方 volatile Config 一律省略泛型。
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    approval: z<boolean, boolean, "volatile-defined">;
    question: z<boolean, boolean, "volatile-defined">;
    turn: z<boolean, boolean, "volatile-defined">;
    sessionDone: z<boolean, boolean, "volatile-defined">;
    error: z<boolean, boolean, "volatile-defined">;
    subagent: z<boolean, boolean, "volatile-defined">;
    sound: z<boolean, boolean, "volatile-defined">;
    summary: z<boolean, boolean, "volatile-defined">;
    quietHours: z<boolean, boolean, "volatile-defined">;
    quietStart: z<string, string, "volatile-defined">;
    quietEnd: z<string, string, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    approval: z<boolean, boolean, "volatile-defined">;
    question: z<boolean, boolean, "volatile-defined">;
    turn: z<boolean, boolean, "volatile-defined">;
    sessionDone: z<boolean, boolean, "volatile-defined">;
    error: z<boolean, boolean, "volatile-defined">;
    subagent: z<boolean, boolean, "volatile-defined">;
    sound: z<boolean, boolean, "volatile-defined">;
    summary: z<boolean, boolean, "volatile-defined">;
    quietHours: z<boolean, boolean, "volatile-defined">;
    quietStart: z<string, string, "volatile-defined">;
    quietEnd: z<string, string, "volatile-defined">;
}>>, "plain">;
/**
 * Host 半区不参与通知投递：这里刻意什么都不做。
 *
 * 保留 `apply` 是 Loader 的函数插件形态要求（named export `apply`），也让
 * 后续需要 host 侧事实（如后台 job 计数）时有落点；当前没有任何 host 侧
 * 副作用，因而也没有需要随 fiber 回收的注册。
 *
 * @param _ctx - host context（当前未使用）。
 * @param _config - 校验后的 volatile 配置（当前未使用）。
 */
export declare function apply(_ctx: Context, _config: Config): void;
//# sourceMappingURL=index.d.ts.map