/**
 * dsh-notify — host half（组合器）。
 *
 * 监听 Cordis 事件发系统桌面通知（平台通道见 system-notify.ts，事件编排见
 * notify-events.ts），点击通知跳转浏览器对应会话（client 半区的 deep-link
 * 读取 `#session=`）。
 *
 * 配置契约：host Config namespace `notify` 为权威源（client 设置卡片与 host
 * 通知逻辑共享同一配置）：
 *   - notify: { enabled, approval, turn, sessionDone, error, sound }
 *
 * DSH 0.1.7 起 settings 走 profile-backed forms 架构：插件在入口模块顶层
 * 导出 `Config`（schemastery 对象）+ `apply(ctx, config)` 函数插件，
 * namespace 由 entry id（`cordis.patch.yml` 的 `id`）提供，Cordis 把校验后的
 * 配置直接注入 apply 第二参。字段全部标 `.volatile()`——没有 volatile 标记的
 * entry 不会进入 `describe()`，官方配置页与 client 写入会静默失效。
 *
 * 聚焦感知：client 半区经官方 Connection RPC 通道上报页面可见性，可见时
 * 抑制「轮次完成 / 会话完成」这类非阻塞通知（见 notify-events.ts 分级说明）。
 *
 * connection / sessionTitle / webServer 都是可选能力，一律 `ctx.get` /
 * scoped inject 读取，缺失时优雅降级（通知是增益不是依赖）。
 */
import type { Volatile } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/**
 * 配置 namespace 由 **profile entry id** 提供（DSH 0.1.7 profile-backed forms）：
 * host 半区不自己命名，`cordis.patch.yml` 的 `id: dsh-notify` 就是 namespace，
 * client 半区用同一个字符串 `configForms.get('dsh-notify')`。
 *
 * 这里**不再导出**自己的 namespace 常量——0.1.4 之前的 `ctx.settings.register(ns, ...)`
 * 需要它，0.1.7 上游 API 移除后它就成了第二个真相源（此前的 `'notify'` 与 entry id
 * `'dsh-notify'` 已经分叉，而它没有任何调用方）。两处字符串的一致性改由
 * `test/config-parity.test.mjs` 的 entry-id 钉住（与 dsh-asr-voice 同一套做法）。
 */
export declare const name = "dsh-notify";
/** Host plugin configuration：通知总开关与各事件分项开关。 */
export interface Config {
    enabled: Volatile<boolean>;
    approval: Volatile<boolean>;
    turn: Volatile<boolean>;
    sessionDone: Volatile<boolean>;
    error: Volatile<boolean>;
    sound: Volatile<boolean>;
}
/**
 * 顶层 Config：全部字段 volatile，桌面通知的所有开关都支持不重启热改。
 * 默认全开（`enabled` 为总开关，取消勾选后保留分项值）。
 *
 * volatile 字段在运行时是 `Volatile<T>` 引用（官方 `plainOptions()` 同款语义：
 * 每次读 `.get()` 拿当前值，热改后无需重挂插件），所以接口字段标 Volatile。
 * 注意按官方范式（llm-deepseek）不加 `z<Config>` 泛型标注：volatile 会让
 * ObjectS 的形状与接口产生逆变冲突，官方 volatile Config 一律省略泛型。
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    approval: z<boolean, boolean, "volatile-defined">;
    turn: z<boolean, boolean, "volatile-defined">;
    sessionDone: z<boolean, boolean, "volatile-defined">;
    error: z<boolean, boolean, "volatile-defined">;
    sound: z<boolean, boolean, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    approval: z<boolean, boolean, "volatile-defined">;
    turn: z<boolean, boolean, "volatile-defined">;
    sessionDone: z<boolean, boolean, "volatile-defined">;
    error: z<boolean, boolean, "volatile-defined">;
    sound: z<boolean, boolean, "volatile-defined">;
}>>, "plain">;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map