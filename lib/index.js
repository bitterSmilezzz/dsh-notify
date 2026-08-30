import z from '@deepseek-ai/schemastery';
import { applySystemNotify } from "./system-notify.js";
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
        };
    };
    // 深链基址：从 webServer 服务推导实际监听端口（官方 dsh-web-app 同款读取），
    // 非 3080 部署的点击跳转不再失效；读不到回落默认值。
    const webServer = ctx.get('webServer');
    const port = typeof webServer?.port === 'number' && webServer.port > 0 ? webServer.port : 3080;
    applySystemNotify(ctx, notifyConfig, `http://127.0.0.1:${port}`);
}
//# sourceMappingURL=index.js.map