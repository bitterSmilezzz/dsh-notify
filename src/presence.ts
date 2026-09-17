/**
 * dsh-notify — 聚焦感知（host 侧状态机）。
 *
 * 浏览器半区在页面可见性变化时经官方 Connection RPC 通道上报（channel
 * `/dsh-notify`，endpoint `presence`，payload `{ visible }`）；host 在发通知
 * 前查一次：页面可见且上报新鲜 → 用户正看着界面，系统通知是纯噪音，跳过。
 *
 * 保鲜期（TTL）是必须的：可见状态靠 client 定时续期（见 client/presence.ts），
 * 页面崩溃 / 网络断开 / client 未加载时续期停止，TTL 一到即恢复通知——
 * 「宁可多通知，不可静默失效」是通知类插件的失败方向铁律。
 *
 * 本模块只做状态与判定（无 I/O、无 ctx），node --test 直接覆盖；通道注册与
 * 通知编排见 notify-events.ts。
 */

/** 聚焦上报的 RPC 通道（官方 Connection 通道格式：单段 `/name`）。 */
export const PRESENCE_RPC_CHANNEL = '/dsh-notify'

/** 聚焦上报的 endpoint 名（channel 内相对路径）。 */
export const PRESENCE_ENDPOINT = 'presence'

/**
 * 可见状态的保鲜期。client 可见时每 30s 续期一次，75s 容忍两次连续丢失
 * （一次丢包 / 一次定时器节流），又足够短到页面崩溃后一分钟内恢复通知。
 */
export const PRESENCE_TTL_MS = 75_000

/**
 * 解析 client 上报的 payload：只接受 `{ visible: boolean }`。
 * 结构化读取 + 严格类型：畸形 payload（非对象 / visible 非布尔）返回
 * undefined 由调用方拒绝，绝不抛错（通知是增益不是依赖）。
 * @param payload - RPC 解码后的 payload（不可信）。
 * @returns visible 布尔值；payload 不合法时 undefined。
 */
export function parsePresencePayload(payload: unknown): boolean | undefined {
  if (payload === null || typeof payload !== 'object') return undefined
  const visible = (payload as { visible?: unknown }).visible
  return typeof visible === 'boolean' ? visible : undefined
}

/** 聚焦状态：最近一次上报的可见性与时刻。 */
export interface PresenceTracker {
  /**
   * 记录一次上报。
   * @param visible - 页面是否可见（client 的 document.visibilityState）。
   * @param now - 当前时刻（注入便于测试）。
   */
  report(visible: boolean, now?: number): void
  /**
   * 是否应抑制系统通知：页面可见且上报仍在保鲜期内。
   * @param now - 当前时刻（注入便于测试）。
   */
  shouldSuppress(now?: number): boolean
}

/**
 * 创建聚焦状态机。多标签页下按「最近一次上报为准」（last-write-wins）：
 * 一个后台标签上报 false 会把可见状态清掉——失败方向是「多弹一次通知」，
 * 而不是静默漏掉，这是刻意选择的安全侧。
 */
export function createPresenceTracker(): PresenceTracker {
  let visible = false
  let at = 0
  return {
    report(next: boolean, now = Date.now()): void {
      visible = next
      at = now
    },
    shouldSuppress(now = Date.now()): boolean {
      return visible && now - at < PRESENCE_TTL_MS
    },
  }
}
