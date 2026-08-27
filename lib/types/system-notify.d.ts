import type { Context } from '@deepseek-ai/cordis';
/** 通知开关（与 settings schema 的 notify 子对象一致）。 */
export interface NotifyConfig {
    enabled: boolean;
    approval: boolean;
    turn: boolean;
    sessionDone: boolean;
    error: boolean;
}
/**
 * 安装系统通知：注册事件监听（轮次完成/审批/错误），读 settings 配置判断
 * 总开关与各事件开关。点击通知跳转浏览器对应会话（client 读 `?session=`）。
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照）。
 * @param baseUrl - 浏览器地址（默认 3080）。
 */
export declare function applySystemNotify(ctx: Context & {
    on: Context['on'];
}, configOf: () => NotifyConfig, baseUrl?: string): void;
//# sourceMappingURL=system-notify.d.ts.map