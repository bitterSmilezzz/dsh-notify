/**
 * dsh-notify — 通知音效（Web Audio 合成）。
 *
 * 为什么不用系统提示音：Web Notification **无法指定音色**。`silent` 只能关掉
 * 系统声，具体响声由 macOS / Windows 的通知设置决定，插件改不了，也无法让
 * 「审批」与「轮次完成」听起来不一样。所以音效由本模块合成：
 *
 *   - 打开音效时通知带 `silent: true`，**只响自绘这一份**（不叠加系统声）；
 *   - 关闭音效时通知也带 `silent: true`——系统声一并关掉，开关语义才是
 *     「有没有声音」而不是「哪种声音」。
 *
 * 音色按事件分档（同一类事件复用一个 motif，靠音高与节奏区分轻重）：
 *   审批 / 提问 = 双音上行（需要你动手，最显眼）
 *   出错       = 下行小三度（故障，听感下沉）
 *   轮次完成   = 单音轻响（最高频，最克制）
 *   会话结束   = 双音下行（收束）
 *   子代理完成 = 与轮次完成同款，音量更低（默认关闭）
 *
 * AudioContext 懒创建：没有用户手势前浏览器会把它挂在 suspended，后台标签页
 * 尤其如此。因此挂 document 级预热监听，首次交互时 resume。
 */
import type { NoticeKind } from '../notify-policy.ts'
import { SOUND_PATTERNS, type Tone } from '../notify-policy.ts'

/** 浏览器侧的 AudioContext 构造器（webkit 前缀在旧 Safari 上仍需要）。 */
type AudioContextCtor = typeof AudioContext

/** 当前 AudioContext；首次需要发声时创建。 */
let audioCtx: AudioContext | null = null

/** 上一次同类音效的播放时间（毫秒），用于节流。 */
const lastPlayedAt = new Map<NoticeKind, number>()

/** 同一类音效的最小间隔（毫秒）：连续通知不叠成噪音，也不堆节点。 */
const THROTTLE_MS = 300

/**
 * 取 AudioContext 构造器（含 webkit 前缀兼容）。
 * @returns 构造器，运行时不提供音频能力时为 undefined。
 */
function audioCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w: { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor } = window
  return w.AudioContext ?? w.webkitAudioContext
}

/**
 * 确保 AudioContext 可用并处于 running。
 * @returns 可用的 context；运行时不支持或创建失败时 undefined。
 */
function ensureAudio(): AudioContext | undefined {
  const Ctor = audioCtor()
  if (Ctor === undefined) return undefined
  try {
    audioCtx ??= new Ctor()
    // suspended 是常态（浏览器要求用户手势后才允许出声）：resume 不阻塞发声，
    // 手势到达后自会推进入队的事件。
    if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => { /* 手势未到，等预热 */ })
    return audioCtx
  } catch {
    // 构造失败（超出 context 上限、被策略禁用）：静默，音效是增益不是依赖。
    return undefined
  }
}

/**
 * 挂载音频预热：首次用户交互时创建/恢复 AudioContext。
 *
 * 必须由 fiber 持有 disposer——插件 update/HMR 时旧监听若不清会累积，
 * AudioContext 也会泄漏。
 * @returns disposer：移除监听并关闭 AudioContext。
 */
export function mountSoundWarmup(): () => void {
  const warm = (): void => { ensureAudio() }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', warm, { passive: true })
    document.addEventListener('keydown', warm, { passive: true })
  }
  return () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', warm)
      document.removeEventListener('keydown', warm)
    }
    if (audioCtx !== null) {
      // close() 返回 Promise：rejection 不能冒泡成 unhandledRejection。
      try { void audioCtx.close().catch(() => { /* 已关闭 */ }) } catch { /* 已关闭 */ }
      audioCtx = null
    }
    lastPlayedAt.clear()
  }
}

/**
 * 播一个音。
 * @param ctx - 音频上下文。
 * @param tone - 频率、起始偏移、时长、波形与增益。
 */
function playTone(ctx: AudioContext, tone: Tone): void {
  // Web Audio 的指数斜坡要求目标值为正、且到达时间晚于起点，否则抛 RangeError。
  // 图案是常量，这里仍 clamp 一次，兜住未来误传的极端值。
  const duration = Math.max(tone.duration, 0.05)
  const gain = Math.max(tone.gain, 0.0001)
  const start = ctx.currentTime + Math.max(tone.start, 0)
  const osc = ctx.createOscillator()
  const envelope = ctx.createGain()
  osc.type = tone.wave
  osc.frequency.value = tone.frequency
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.02)
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(envelope).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
  // 播完断开：AudioNode 只要还连在图上就不会被回收，长会话里反复播放会累积。
  osc.addEventListener('ended', () => {
    try { envelope.disconnect() } catch { /* 已断开 */ }
  }, { once: true })
}

/**
 * 播放某类事件的音效（受声音开关与节流控制）。
 *
 * @param kind - 事件类别，决定音色。
 * @param enabled - 声音开关当前值。
 * @param now - 当前时间（毫秒）；注入以便测试节流。
 */
export function playNoticeSound(kind: NoticeKind, enabled: boolean, now: number = Date.now()): void {
  if (!enabled) return
  const previous = lastPlayedAt.get(kind)
  if (previous !== undefined && now - previous < THROTTLE_MS) return
  const ctx = ensureAudio()
  if (ctx === undefined) return
  lastPlayedAt.set(kind, now)
  try {
    for (const tone of SOUND_PATTERNS[kind]) playTone(ctx, tone)
  } catch {
    // 单个音失败（context 被关闭等）不影响其余音与通知本身。
  }
}

/**
 * 试听音效：无视声音开关，让用户在关闭开关后仍能确认音色。
 * @param kind - 要试听的事件音色。
 */
export function previewNoticeSound(kind: NoticeKind): void {
  // 试听不受开关与节流限制：它是一次显式的用户动作。
  lastPlayedAt.delete(kind)
  playNoticeSound(kind, true)
}
