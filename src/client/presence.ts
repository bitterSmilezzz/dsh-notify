/**
 * dsh-notify — 聚焦上报（browser half）。
 *
 * 把「页面是否可见」经官方 Connection RPC 通道上报给 host（channel
 * `/dsh-notify`，endpoint `presence`，payload `{ visible }`）；host 据此抑制
 * 「轮次完成 / 会话完成」这类非阻塞通知（见 host 侧 notify-events.ts 的分级
 * 说明）——用户正看着界面时，系统通知是纯噪音。
 *
 * 协议（与 host 侧 presence.ts 一一对应）：
 *   - 可见时立即上报一次，并每 30s 续期（host TTL 75s，容忍两次连续丢失）；
 *   - 页面隐藏（切标签/最小化）时立即上报 false 并停止续期；
 *   - 关标签页时 visibilitychange 同样触发（hidden），上报失败也无妨——
 *     host 侧 TTL 一到即恢复通知（宁可多通知，不可静默失效）。
 *
 * 上报失败一律静默：通知是增益不是依赖，上报链路断掉只会退化成"照常通知"。
 * connection 是可选服务（非 web 部署没有它）→ scoped inject，缺失时整个
 * 上报链路跳过，不影响卡片/深链等其它半区功能。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'

/** 聚焦上报的 RPC 通道（须与 host 侧 PRESENCE_RPC_CHANNEL 一致）。 */
const CHANNEL = '/dsh-notify'
/** 聚焦上报的 endpoint 名（须与 host 侧 PRESENCE_ENDPOINT 一致）。 */
const ENDPOINT = 'presence'
/** 可见状态的续期间隔；host 侧 TTL（75s）是它的 2.5 倍。 */
const HEARTBEAT_MS = 30_000

/**
 * 挂载聚焦上报：可见性变化时上报，可见期间定时续期。随 client fiber 卸载
 * 回收（移除监听 + 清定时器）。
 * @param ctx - client root context。
 */
export function applyPresenceReporting(ctx: ClientContext): void {
  ctx.inject(['connection'], (connectionCtx) => {
    const connection = connectionCtx.get('connection') as ConnectionHandle | undefined
    const call = connection?.rpc?.call
    if (typeof call !== 'function' || connection === undefined) return
    connectionCtx.effect(() => {
      let timer: number | undefined
      const stopHeartbeat = (): void => {
        if (timer === undefined) return
        window.clearInterval(timer)
        timer = undefined
      }
      /** 上报一次；同步抛错与异步拒绝都静默（增益不是依赖）。 */
      const report = (visible: boolean): void => {
        try {
          void connection.rpc.call(CHANNEL, ENDPOINT, { visible }).catch(() => { /* 上报失败静默 */ })
        } catch { /* scope 失效等同步抛错同样静默 */ }
      }
      /** 同步当前可见性：立即上报，并按需起停续期定时器。 */
      const sync = (): void => {
        const visible = document.visibilityState === 'visible'
        report(visible)
        stopHeartbeat()
        if (visible) timer = window.setInterval(() => { report(true) }, HEARTBEAT_MS)
      }
      sync() // 挂载即同步一次，host 不必等到第一次切换才知道
      document.addEventListener('visibilitychange', sync)
      return () => {
        document.removeEventListener('visibilitychange', sync)
        stopHeartbeat()
      }
    }, 'dsh-notify: presence reporting')
  })
}
