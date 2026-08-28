/**
 * dsh-notify — notification sounds (Web Audio synthesis).
 *
 * 四类通知各配一种音效（频率/时长/波形不同，便于区分）。AudioContext
 * 懒创建，首次用户交互时预热——否则后台页面无法出声。声音开关由
 * 配置快照（config.sound）控制。
 */
import { config } from './config.ts'

/** 四类通知的音效键。 */
export type SoundKind = 'approval' | 'question' | 'turn' | 'sessionDone'

let audioCtx: AudioContext | null = null
let audioReady = false

function ensureAudio(): boolean {
  try {
    if (typeof window === 'undefined') return false
    const AC = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return false
    if (audioCtx === null) audioCtx = new AC()
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
    audioReady = true
  } catch {
    audioReady = false
  }
  return audioReady
}

/** 首次用户交互时预热 AudioContext（后台页面弹出的通知才能出声）。 */
function warmAudio(): void {
  if (!audioReady) ensureAudio()
}

/**
 * 挂载音频预热：注册 document 级预热监听，返回 disposer 移除监听并关闭
 * AudioContext。由插件 fiber 的 ctx.effect 挂载，避免模块副作用在插件
 * update/HMR 时残留（每次 update 旧监听不清理会重复累积）。
 */
export function mountSoundWarmup(): () => void {
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', warmAudio, { passive: true })
    document.addEventListener('keydown', warmAudio, { passive: true })
  }
  return () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', warmAudio)
      document.removeEventListener('keydown', warmAudio)
    }
    if (audioCtx !== null) {
      try { void audioCtx.close() } catch { /* noop */ }
      audioCtx = null
    }
    audioReady = false
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.16): void {
  if (audioCtx === null) return
  const t0 = audioCtx.currentTime + start
  const osc = audioCtx.createOscillator()
  const g = audioCtx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(audioCtx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

const SOUND_PATTERNS: Record<SoundKind, () => void> = {
  approval: () => {
    tone(988, 0, 0.16, 'square', 0.10)
    tone(988, 0.2, 0.16, 'square', 0.10)
    tone(740, 0.4, 0.24, 'square', 0.10)
  },
  question: () => { tone(659, 0, 0.16); tone(880, 0.2, 0.3) },
  turn: () => { tone(523, 0, 0.16) },
  sessionDone: () => { tone(523, 0, 0.16); tone(659, 0.18, 0.16); tone(784, 0.36, 0.32) },
}

/** 同类音效节流窗口（ms）：连续通知（如瀑布审批）不重复堆叠音效节点。 */
const SOUND_THROTTLE_MS = 300
let lastPlayAt: Record<SoundKind, number> = {
  approval: 0, question: 0, turn: 0, sessionDone: 0,
}

/** 播放一类通知音效（受 config.sound 开关控制；同类 300ms 内去重）。 */
export function playSound(kind: SoundKind): void {
  if (!config.sound) return
  const now = performance.now()
  if (now - lastPlayAt[kind] < SOUND_THROTTLE_MS) return
  lastPlayAt[kind] = now
  if (!ensureAudio()) return
  SOUND_PATTERNS[kind]()
}