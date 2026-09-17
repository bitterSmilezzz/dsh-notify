/**
 * dsh-notify — client configuration model.
 *
 * 配置权威源是 host settings 服务（namespace `notify`）。本模块持有运行时
 * 快照 `config`（控制器同步读取），提供 host scope 的绑定与写入。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** 统一配置对象：与 host settings schema 结构一致（字段漂移由测试钉住）。 */
export interface NotifyConfig {
    enabled: boolean;
    approval: boolean;
    turn: boolean;
    sessionDone: boolean;
    error: boolean;
    sound: boolean;
}
/** 配置默认值（与 host schema 的 default 一致）。 */
export declare const DEFAULTS: NotifyConfig;
/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
export declare const config: NotifyConfig;
/**
 * 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写
 * 本地快照并广播。
 * @param ctx - client root context。
 * @returns 订阅 disposer（随 fiber 清理）。
 */
export declare function bindConfigScope(ctx: ClientContext): () => void;
/**
 * 更新一个配置字段：改本地快照 → 广播 → 写 host settings。
 * @param field - 配置字段名。
 * @param mutator - 修改快照的闭包（同步执行后读取新值写 host）。
 */
export declare function setConfig(field: keyof NotifyConfig, mutator: () => void): void;
//# sourceMappingURL=config.d.ts.map