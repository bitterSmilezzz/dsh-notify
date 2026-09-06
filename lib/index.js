import z from '@deepseek-ai/schemastery';
import { applySystemNotify, systemNotify } from "./system-notify.js";
/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export const NOTIFY_SETTINGS_NAMESPACE = 'notify';
export const name = 'dsh-notify';
export const inject = [
    'settings',
];
export function apply(ctx, _config = {}) {
    // 插件配置 namespace：client 设置卡片与 host 通知逻辑共享同一份配置。
    const notifyScope = ctx.settings.register(NOTIFY_SETTINGS_NAMESPACE, z.object({
        enabled: z.boolean().default(true),
        approval: z.boolean().default(true),
        turn: z.boolean().default(true),
        sessionDone: z.boolean().default(true),
        error: z.boolean().default(true),
        sound: z.boolean().default(true),
        overlap: z.union([z.const('auto'), z.const('mine')]).default('auto'),
        probeServices: z.array(z.string()).default([]),
    }));
    // 系统级桌面通知：监听 Cordis 事件，读 settings 配置判断开关。
    const notifyConfig = () => {
        const value = notifyScope.get();
        return {
            enabled: value.enabled ?? true,
            approval: value.approval ?? true,
            turn: value.turn ?? true,
            sessionDone: value.sessionDone ?? true,
            error: value.error ?? true,
            sound: value.sound ?? true,
            overlap: value.overlap ?? 'auto',
        };
    };
    // 暂停/恢复提示：仅在探测状态翻转时发一次（首次探测不发）。
    let prevProbe;
    const onProbeChange = (state) => {
        if (prevProbe !== undefined && prevProbe.official !== state.official) {
            if (state.official) {
                systemNotify('dsh-notify 已自动暂停', `检测到其他通知源（${state.source ?? '未知'}），已暂停自身通知；可在设置中改为「始终用本插件」恢复。`, undefined, false);
            }
            else {
                systemNotify('dsh-notify 已恢复', '其他通知源已消失，桌面通知恢复由本插件接管。', undefined, false);
            }
        }
        prevProbe = state;
    };
    // 深链基址：惰性读 webServer 实际监听端口（官方 dsh-web-app 同款读取），每次通知
    // 都重新解析——apply 早于 webServer 就绪、或用 --port 起非默认端口时，
    // 一次性快照会永久停在回落值、点击跳转静默失效。
    const baseUrlOf = () => {
        const webServer = ctx.get('webServer');
        const port = typeof webServer?.port === 'number' && webServer.port > 0 ? webServer.port : 3080;
        return `http://127.0.0.1:${port}`;
    };
    const probeServices = notifyScope.get()?.probeServices ?? [];
    applySystemNotify(ctx, notifyConfig, baseUrlOf, probeServices, onProbeChange);
}
//# sourceMappingURL=index.js.map