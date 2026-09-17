/**
 * 挂载音频预热：注册 document 级预热监听，返回 disposer 移除监听并关闭
 * AudioContext。由插件 fiber 的 ctx.effect 挂载，避免模块副作用在插件
 * update/HMR 时残留（每次 update 旧监听不清理会重复累积）。
 */
export declare function mountSoundWarmup(): () => void;
/**
 * 播放试听音效（受 config.sound 开关控制）。
 * force=true 时无视声音开关直接播放——设置卡片的「试听」走这个分支：
 * 试听的目的就是让用户在关闭声音后仍能确认音效，不应被开关静默吞掉。
 */
export declare function playSound(force?: boolean): void;
//# sourceMappingURL=sound.d.ts.map