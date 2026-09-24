import z from '@deepseek-ai/schemastery';
import { applySystemNotify } from "./notify-events.js";
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
export const name = 'dsh-notify';
/**
 * 顶层 Config：全部字段 volatile，桌面通知的所有开关都支持不重启热改。
 * 默认全开（`enabled` 为总开关，取消勾选后保留分项值）。
 *
 * volatile 字段在运行时是 `Volatile<T>` 引用（官方 `plainOptions()` 同款语义：
 * 每次读 `.get()` 拿当前值，热改后无需重挂插件），所以接口字段标 Volatile。
 * 注意按官方范式（llm-deepseek）不加 `z<Config>` 泛型标注：volatile 会让
 * ObjectS 的形状与接口产生逆变冲突，官方 volatile Config 一律省略泛型。
 */
export const Config = z.object({
    enabled: z.boolean().default(true).volatile(),
    approval: z.boolean().default(true).volatile(),
    turn: z.boolean().default(true).volatile(),
    sessionDone: z.boolean().default(true).volatile(),
    error: z.boolean().default(true).volatile(),
    sound: z.boolean().default(true).volatile(),
});
export function apply(ctx, config) {
    // 系统级桌面通知：监听 Cordis 事件，读 config 判断开关。
    // volatile 字段每次显式解引用，所以热改后同一份闭包拿到的是最新值。
    const notifyConfig = () => ({
        enabled: config.enabled.get(),
        approval: config.approval.get(),
        turn: config.turn.get(),
        sessionDone: config.sessionDone.get(),
        error: config.error.get(),
        sound: config.sound.get(),
    });
    // 深链基址：惰性读 webServer 实际监听端口（官方 dsh-web-app 同款读取），每次通知
    // 都重新解析——apply 早于 webServer 就绪、或用 --port 起非默认端口时，
    // 一次性快照会永久停在回落值、点击跳转静默失效。
    const baseUrlOf = () => {
        const webServer = ctx.get('webServer');
        const port = typeof webServer?.port === 'number' && webServer.port > 0 ? webServer.port : 3080;
        return `http://127.0.0.1:${port}`;
    };
    applySystemNotify(ctx, notifyConfig, baseUrlOf);
}
//# sourceMappingURL=index.js.map