/**
 * dsh-notify — 通知门控纯函数（host/client 共享，零 I/O、零平台依赖）。
 *
 * 这些判定被 node --test 直接覆盖：正文单行化与截断、去重指纹、审批取词、
 * 免打扰时段判定、跨平台 tag 策略。它们不含 DOM/node API，所以 client 半区
 * 可以原样 import，测试也能在纯 Node 里跑。
 */
/** 单行化 + 限长（≤max 码点，尾部 …）。按码点截断而非 UTF-16 code unit：
 *  slice 可能切在代理对中间产生孤立代理（半个 emoji 渲染成 �），
 *  用 Array.from 按码点展开后再截，代理对不会被劈开。但码点不等于字素簇：
 *  基字符+变音符组合（如 á = a + U+0301）与 ZWJ emoji 序列仍可能恰在边界被
 *  劈开——截断语义按码点计，仅影响尾部展示，不影响可读性判定。
 *  `text == null`（宽松判等）同时覆盖 undefined 与运行时传入的 null——
 *  Remote 事件字段在旧版协议/畸形数据下可能为 null，绝不能抛错
 *  （通知是增益不是依赖）。
 * @param text - 原始文本（可为空/缺失）。
 * @param max - 最大码点数，默认 120。
 * @returns 单行化并截断后的文本；空输入返回空串。
 */
export function summaryOf(text, max = 120) {
    if (text == null || text === '')
        return '';
    const oneLine = text.replace(/\s+/gu, ' ').trim();
    if (oneLine.length <= max)
        return oneLine;
    // `max - 1` 保证省略号计入总长；max≤1 时仍产出一个字符（不出现空切片）。
    const cut = Array.from(oneLine).slice(0, Math.max(1, max - 1));
    return `${cut.join('')}…`;
}
/**
 * 清理去重 Map 的过期条目。每次事件都先清一遍（不只等 size 到上限）：
 * Map 只保留窗口内的活跃记录，长期运行后不会堆积过期条目；Map 大小
 * 等于窗口内活跃会话数（通常个位数），逐条遍历开销可忽略。
 * @param map - 去重表（时间戳）。
 * @param now - 当前时间戳（毫秒）。
 * @param windowMs - 去重窗口。
 */
export function pruneExpired(map, now, windowMs) {
    for (const [id, at] of map) {
        if (now - at >= windowMs)
            map.delete(id);
    }
}
/**
 * error 去重指纹：会话 id + 消息文本（截断拼接，确定性、无散列依赖）。
 * 同一会话的同一错误在去重窗口内只通知一次；不同错误（消息不同）在同一
 * 窗口内各自通知——用户修复后窗口内出现的新错误不再被旧去重键吞掉。
 * @param sessionId - 会话身份。
 * @param message - 错误文本。
 * @returns 去重键。
 */
export function errorDedupKey(sessionId, message) {
    return `${sessionId}\u0001${message.slice(0, 128)}`;
}
/**
 * 本地化字典取词：`LocalizedText`（`{ en, [locale] }`），解析顺序
 * 精确 locale 键 → 主子标签键 → `en` → 字典首个非空值。
 *
 * 与官方 `locale.resolveText` 同向，但有两处刻意差异（client 半区拿不到
 * 官方 resolveText 的完整 fallback 链，只能自实现，先记录差异免得日后误以为
 * 完全等价）：
 * 1. 官方链是「当前 locale（含其声明 fallback，如 zh→en）逐级 `??` 回落」，
 *    且**空串是合法翻译**（`??` 不跳过空串）；这里把空串视作缺失继续回落——
 *    通知正文出现空白条目等于没通知，落到 en 比展示空文本好。
 * 2. 官方链按 LocaleDefinition 的 fallback 声明走；这里简化为「主子标签 → en」，
 *    因为 displayReason 的键由各 asker 自填，不受声明链约束。
 * 两者共同点是绝不抛错：畸形字典（null / 空值 / 非字符串值）一律继续回落。
 * @param dict - displayReason 字典（运行时可能缺失或畸形）。
 * @param preference - locale settings 的 preference 字段（如 `zh-CN`）。
 * @returns 取到的非空文本；全都不可用时 undefined。
 */
export function localizedTextOf(dict, preference) {
    if (typeof dict === 'string')
        return dict === '' ? undefined : dict;
    if (typeof dict !== 'object' || dict === null)
        return undefined;
    const table = dict;
    const en = typeof table.en === 'string' ? table.en : '';
    if (typeof preference !== 'string')
        return en !== '' ? en : firstNonEmpty(table);
    const normalized = preference.trim().toLowerCase();
    const primary = normalized.split(/[-_]/u, 1)[0] ?? '';
    if (primary === '')
        return en !== '' ? en : firstNonEmpty(table);
    // 精确 locale 键（`zh-tw`）优先于主子标签键（`zh`）——键名统一小写后比较。
    const exact = table[normalized];
    if (typeof exact === 'string' && exact !== '')
        return exact;
    const byPrimary = table[primary];
    if (typeof byPrimary === 'string' && byPrimary !== '')
        return byPrimary;
    return en !== '' ? en : firstNonEmpty(table);
}
/** 字典里第一个非空字符串值（en 也缺失时的最后兜底，迭代顺序不确定但不抛错）。 */
function firstNonEmpty(table) {
    for (const value of Object.values(table)) {
        if (typeof value === 'string' && value !== '')
            return value;
    }
    return undefined;
}
/**
 * 审批通知正文取词：优先 `displayReason`（本地化提示，DSH rc.2 新增），缺失时
 * 回落 `reason`（审计用原始文本，旧版协议与只填 reason 的 asker 都走这条）。
 * @param req - 审批请求（client 侧投影字段）。
 * @param preference - 当前语言偏好。
 * @returns 正文可用的提示文本；两者都不可用时 undefined（调用方只展示工具名）。
 */
export function approvalDetailOf(req, preference) {
    if (req == null)
        return undefined;
    const localized = localizedTextOf(req.displayReason, preference);
    if (localized !== undefined && localized !== '')
        return localized;
    return typeof req.reason === 'string' && req.reason !== '' ? req.reason : undefined;
}
/**
 * 会话身份标签：优先会话标题（用户认得），回落 undefined 由调用方用固定文案。
 * @param title - 会话列表行的标题（`title` 或 `displayTitle`）。
 * @returns 非空标题；缺失或空串时 undefined。
 */
export function sessionLabelOf(title) {
    if (typeof title !== 'string')
        return undefined;
    const trimmed = title.trim();
    return trimmed === '' ? undefined : trimmed;
}
/**
 * 把 `HH:MM` 解析成「当日第几分钟」。
 * 接受 `9:05` / `09:05` 两种写法（用户在输入框里手打时容易漏前导零），
 * 非法输入（越界、非数字、缺分隔符）一律返回 undefined——调用方据此把
 * 免打扰视为未配置，绝不因为一个坏字符串就永久静音（失败方向选「宁可多提醒」）。
 * @param value - 形如 `HH:MM` 的字符串。
 * @returns 0..1439 的分钟数；非法时 undefined。
 */
export function parseClockMinutes(value) {
    if (typeof value !== 'string')
        return undefined;
    const match = /^(\d{1,2}):(\d{2})$/u.exec(value.trim());
    if (match === null)
        return undefined;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute))
        return undefined;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59)
        return undefined;
    return hour * 60 + minute;
}
/**
 * 免打扰时段是否生效。支持跨午夜（如 22:00 → 08:00）：起点大于终点时
 * 判定区间折返。起止相同视为「未配置」（否则会变成全天静音）。
 * @param nowMinutes - 当前本地时间「当日第几分钟」（0..1439）。
 * @param startMinutes - 起点分钟数。
 * @param endMinutes - 终点分钟数。
 * @returns 处于免打扰区间时为 true。
 */
export function quietHoursActive(nowMinutes, startMinutes, endMinutes) {
    if (startMinutes === endMinutes)
        return false;
    if (startMinutes < endMinutes)
        return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}
/**
 * 通知的会话级 `tag`：同一会话的新通知替换旧卡，避免并行会话刷屏
 * （ccnotify / omdsh 的通行做法）。
 *
 * **Windows 例外**：社区实测（Zhiyi-Zhao/dsh-notify）带 `tag` 的
 * `new Notification()` 在 Windows 上会被浏览器接受但 toast 永不送达。
 * 该结论是单机实测而非普遍规律，但「不弹」比「不替换」代价大得多，
 * 因此 Windows 一律不发 tag（退化为堆叠），其余平台按会话替换。
 *
 * 判据按整词匹配 `win`：`Win32` / `Windows NT …` 命中，而 macOS 的
 * `Darwin` 不会（`r` 与 `w` 之间没有词边界，`\bwin` 不成立）。
 * @param platform - `navigator.platform` 或 userAgent 形态的平台串。
 * @param sessionId - 会话身份。
 * @returns tag 字符串；Windows 返回 undefined。
 */
export function notificationTagOf(platform, sessionId) {
    if (/\bwin/iu.test(platform))
        return undefined;
    return `dsh-notify:${sessionId}`;
}
/**
 * 「一次运行一条通知」的判定：会话从 running 变 idle 才算本轮真正结束。
 * 中间态（running 仍为 true）不触发，避免多轮 goal / 工具连续调用时刷屏。
 * @param previous - 上一次观测到的 running 状态（未观测过为 undefined）。
 * @param next - 本次观测到的 running 状态。
 * @returns 本次观测构成「一轮结束」时为 true。
 */
export function isTurnEnd(previous, next) {
    return previous === true && next === false;
}
/**
 * 各类事件的通知音色。
 *
 * 设计约束：同类事件复用一个 motif（用户记住的是「听起来像什么」，不是乐谱），
 * 不同类别靠音高走向与节奏区分轻重：
 *   - 需要动手的（审批/提问）上行、双音、时长偏长——最容易被注意到；
 *   - 故障（出错）下行小三度，听感下沉；
 *   - 高频的（轮次完成）单音轻响，避免长时间使用后烦躁；
 *   - 收束类（会话结束）双音下行；
 *   - 子代理与轮次完成同款但更轻（它默认关闭，开启后也不该喧宾夺主）。
 *
 * 全部 ≤0.6s：通知音是提示不是铃声，长音会与语音/会议冲突。
 */
export const SOUND_PATTERNS = {
    approval: [
        { frequency: 784, start: 0, duration: 0.14, wave: 'sine', gain: 0.16 },
        { frequency: 1047, start: 0.16, duration: 0.26, wave: 'sine', gain: 0.16 },
    ],
    question: [
        { frequency: 784, start: 0, duration: 0.14, wave: 'sine', gain: 0.16 },
        { frequency: 1047, start: 0.16, duration: 0.26, wave: 'sine', gain: 0.16 },
    ],
    turn: [
        { frequency: 880, start: 0, duration: 0.16, wave: 'sine', gain: 0.12 },
    ],
    sessionDone: [
        { frequency: 659, start: 0, duration: 0.14, wave: 'sine', gain: 0.13 },
        { frequency: 523, start: 0.16, duration: 0.24, wave: 'sine', gain: 0.13 },
    ],
    error: [
        { frequency: 440, start: 0, duration: 0.16, wave: 'triangle', gain: 0.16 },
        { frequency: 349, start: 0.18, duration: 0.3, wave: 'triangle', gain: 0.16 },
    ],
    subagent: [
        { frequency: 880, start: 0, duration: 0.16, wave: 'sine', gain: 0.08 },
    ],
};
/**
 * 通知是否应静音系统声。
 *
 * 打开音效时静音系统声（只响自绘那一份，不叠成双声）；关闭音效时同样静音
 * ——否则「关闭声音」只关掉了自绘音，系统提示音照响，开关语义就错了。
 * @returns 恒为 true：声音完全由本插件的合成音承担。
 */
export function systemSoundSuppressed() {
    return true;
}
//# sourceMappingURL=notify-policy.js.map