import z from '@deepseek-ai/schemastery';
/**
 * 配置 namespace 由 **profile entry id** 提供：host 半区不自己命名，
 * `cordis.patch.yml` 的 `id: dsh-notify` 就是 namespace，client 半区用同一个
 * 字符串 `configForms.get('dsh-notify')`。两处字符串的一致性由
 * `test/config-parity.test.mjs` 钉住。
 */
export const name = 'dsh-notify';
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
export const Config = z.object({
    enabled: z.boolean().default(true).volatile(),
    approval: z.boolean().default(true).volatile(),
    question: z.boolean().default(true).volatile(),
    turn: z.boolean().default(true).volatile(),
    sessionDone: z.boolean().default(true).volatile(),
    error: z.boolean().default(true).volatile(),
    subagent: z.boolean().default(false).volatile(),
    sound: z.boolean().default(true).volatile(),
    summary: z.boolean().default(true).volatile(),
    quietHours: z.boolean().default(false).volatile(),
    quietStart: z.string().default('22:00').volatile(),
    quietEnd: z.string().default('08:00').volatile(),
});
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
export function apply(_ctx, _config) {
    /* 通知的订阅与投递全在 client 半区（见 src/client/）。 */
}
//# sourceMappingURL=index.js.map