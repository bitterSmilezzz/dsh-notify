import z from '@deepseek-ai/schemastery';
import { applySystemNotify } from "./notify-events.js";
/** 插件配置页的 settings namespace：与 entry id（cordis.patch.yml 的 `id`）一致。 */
export const NOTIFY_SETTINGS_NAMESPACE = 'notify';
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