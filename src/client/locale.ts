/**
 * dsh-notify — shared client types.
 *
 * 组件与控制器间共享的翻译函数签名（来自 ctx.locale.bind 的收窄面）。
 */

/** Locale-bound translate function (from ctx.locale.bind). */
export type LocaleT = (key: string, params?: Record<string, string | number>) => string