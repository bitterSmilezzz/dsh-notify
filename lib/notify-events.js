import { approvalDetailOf, errorDedupKey, isSubagent, NOTIFY_EVENTS, pruneExpired, sessionLabelOf, summaryOf } from "./notify-policy.js";
import { notifyTextOf } from "./notify-text.js";
import { createPresenceTracker } from "./presence.js";
import { registerPresenceRoute } from "./presence-route.js";
import { systemNotify } from "./system-notify.js";
/** 通知正文最大长度（超出截断加 …），保持 toast/横幅美观统一。 */
const NOTIFY_BODY_MAX = 80;
/** 轮次完成去重窗口：同一 agent 5s 内只发一条，避免 HMR/会话快速重载连发刷屏。 */
const TURN_DEDUP_MS = 5_000;
/** 出错去重窗口：同一 agent 的同一错误 30s 内只发一条。 */
const ERROR_DEDUP_MS = 30_000;
/** 官方 locale 插件的 settings namespace 与偏好字段。 */
const LOCALE_SETTINGS_NAMESPACE = 'locale';
const LOCALE_PREFERENCE_FIELD = 'preference';
/**
 * 语言偏好的读取缓存时长。`settings.describe()` 会为每个 namespace 克隆
 * 组合层与用户层（部署可能装着 llm-pi-ai 这类大配置），每次通知都读一遍
 * 不划算；缓存 30s 的代价只是切换语言后最多 30s 内通知仍用旧语言。
 */
const LOCALE_CACHE_MS = 30_000;
/**
 * 安装系统通知：注册事件监听，读 settings 配置判断总开关与各事件开关，
 * 并接收浏览器半区的聚焦上报（页面可见时抑制非阻塞事件的通知）。
 *
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照）。
 * @param baseUrl - 浏览器地址（默认 3080；函数形式每次重新解析端口）。
 */
export function applySystemNotify(ctx, configOf, baseUrl = 'http://127.0.0.1:3080') {
    const presence = createPresenceTracker();
    // 聚焦通道：client 半区把页面可见性 POST 到 /api/dsh-notify/presence。
    // 路由注册走 `ctx.webServer.register`（exact route），信任围栏复用官方
    // `connection.requestRejection`（Host/Origin 检查 + 浏览器认证，与 /api 共享
    // 通道同一套）。两个服务都是可选的（非 web 部署没有），用 scoped inject：
    // 任一缺失时只跳过聚焦感知（通知照常，判定恒为"不可见"）；注册随子 fiber
    // 回收（ctx.effect）。
    // 不用 `connection.rpc.handle`：它内部用 owner.webServer 注册 prefix route，
    // 而该 owner ctx 解析不到调用者声明的 webServer 依赖（实测抛
    // "cannot get property webServer without inject"、注册静默失败），见
    // presence-route.ts 头注释。
    ctx.inject(['connection', 'webServer'], (connectionCtx) => {
        const connection = connectionCtx.get('connection');
        const webServer = connectionCtx.get('webServer');
        if (connection === undefined || typeof webServer?.register !== 'function')
            return;
        connectionCtx.effect(() => registerPresenceRoute({
            register: (route) => webServer.register(route),
            guard: (req) => connection.requestRejection(req),
            report: (visible) => presence.report(visible),
        }), 'dsh-notify: presence route');
    });
    // 通知文案：跟随官方 locale 设置的语言偏好，读不到回落中文（见 notify-text.ts）。
    let localeCache;
    /** 当前语言偏好（带缓存）。本地化字典取词（displayReason）与文案字典共用一份。 */
    const preferenceOf = () => {
        const now = Date.now();
        if (localeCache !== undefined && now - localeCache.at < LOCALE_CACHE_MS) {
            return localeCache.preference;
        }
        let preference;
        try {
            const descriptor = ctx.settings.describe().find((item) => item.ns === LOCALE_SETTINGS_NAMESPACE);
            preference = descriptor?.value?.[LOCALE_PREFERENCE_FIELD];
        }
        catch {
            preference = undefined; // settings 未就绪/读取失败：回落中文
        }
        localeCache = { at: now, preference };
        return preference;
    };
    const textOf = () => notifyTextOf(preferenceOf());
    // 会话身份标签：优先官方 sessionTitle 折叠出的会话标题（用户认得），
    // 回落模型名（AgentOptions），都没有则 undefined 由调用方用固定文案。
    const sessionLabel = (agent) => {
        let title;
        try {
            const service = ctx.get('sessionTitle');
            const session = agent?.session;
            if (typeof service?.get === 'function' && session != null) {
                const snapshot = service.get(session);
                if (typeof snapshot?.title === 'string')
                    title = snapshot.title;
            }
        }
        catch {
            title = undefined; // 服务缺失/会话已销毁：回落模型名
        }
        return sessionLabelOf(title, agent);
    };
    // 深链基址：惰性读 webServer 实际监听端口（官方 dsh-web-app 同款读取），每次通知
    // 都重新解析——apply 早于 webServer 就绪、或用 --port 起非默认端口时，
    // 一次性快照会永久停在回落值、点击跳转静默失效。
    const sessionOpenUrl = (sessionId) => {
        const base = typeof baseUrl === 'function' ? baseUrl() : baseUrl;
        // rc.1 起 web 界面默认启用进程 token 鉴权（本机 127.0.0.1 同样 401）：
        // 直接打开 `/?session=` 在浏览器无 cookie 时会撞认证墙。这里用官方
        // authenticatedUrl 带上进程 token，session 改走 `#` fragment——token 交换
        // 的 303 重定向会保留 fragment（RFC 7231 §7.1.2），client 读 hash 即可
        // 完成「首次认证 + 会话跳转」二合一；已认证浏览器直接命中同一 fragment。
        // connection 服务缺失时降级为旧的无 token URL（行为与以前一致）。
        // ⚠ 必须用 `ctx.get` 而不是 `ctx.connection` 属性访问：Cordis 的 ctx 是
        // traceable proxy，读未在 `inject` 里声明的 service 属性会抛
        // `cannot get property "connection" without inject`（cordis lib/index.js
        // 的 ReflectService.handler.get）。本 fiber 的 inject 只有
        // ['settings']，属性访问的抛点又在外层 try 之外（早于下行 try），异常会
        // 冒泡到各 handler 的 safe() 被静默吞掉 → 四类通知全部不发出。
        // `ctx.get` 无 inject 要求（官方 dsh-web-app 的 webServer 读取同款，
        // 见 deepseek-harness/packages/bundle/web-app/src/index.ts:66）。
        const connection = ctx.get('connection');
        try {
            const authenticated = connection?.authenticatedUrl(base) ?? base;
            return `${authenticated}#session=${encodeURIComponent(sessionId)}`;
        }
        catch {
            return `${base}/?session=${encodeURIComponent(sessionId)}`;
        }
    };
    /** 通知是增益不是依赖：任何处理器内的异常都不允许冒泡进事件总线。 */
    const safe = (run) => {
        try {
            run();
        }
        catch {
            /* 观察失败静默 */
        }
    };
    // 轮次完成：agent 从 running 回到 idle。
    const lastTurnAt = new Map();
    ctx.on(NOTIFY_EVENTS.turnDone, (payload) => {
        safe(() => {
            const cfg = configOf();
            if (!cfg.enabled || !cfg.turn)
                return;
            if (payload.status !== 'idle')
                return;
            if (isSubagent(payload.agent))
                return;
            if (presence.shouldSuppress())
                return; // 非阻塞事件：用户正看着界面就不打扰
            const now = Date.now();
            pruneExpired(lastTurnAt, now, TURN_DEDUP_MS);
            if (now - (lastTurnAt.get(payload.agent.id) ?? 0) < TURN_DEDUP_MS)
                return;
            lastTurnAt.set(payload.agent.id, now);
            const text = textOf();
            const label = sessionLabel(payload.agent);
            const body = label !== undefined ? text.turnBodyNamed(label) : text.turnBody;
            systemNotify(text.turnTitle, body, sessionOpenUrl(payload.agent.id), cfg.sound);
        });
    }, { global: true });
    // 审批请求：waterfall 事件，只观察必须 next() 委托。通知体包 try/catch——
    // configOf 或属性访问一旦同步抛出，next() 不执行会否决整条链（卡死审批流）。
    // 不做聚焦抑制：审批是阻塞性的（用户不点就卡住），且官方审批 UI 只在对应
    // 会话内出现，用户在看别的会话时看不到。
    ctx.on(NOTIFY_EVENTS.approval, (req, next) => {
        try {
            const cfg = configOf();
            if (!isSubagent(req.agent) && cfg.enabled && cfg.approval) {
                const text = textOf();
                // toolName 运行时可能缺失（宿主协议旧版/畸形 payload）：`${undefined}`
                // 会展示成字面 "undefined"，缺失时用可读兜底文案。
                const toolName = req.toolName ?? text.approvalToolFallback;
                // rc.2 起审批事件带 displayReason（本地化提示文本），reason 是审计用原始
                // 文本：通知是给用户读的，优先本地化版本，缺失回落 reason（旧版协议/
                // 只填 reason 的 asker）。取词在 notify-policy.ts（纯函数，可测）。
                const detailText = approvalDetailOf(req, preferenceOf());
                const detail = detailText !== undefined
                    ? `${toolName} · ${detailText}`
                    : toolName;
                const label = sessionLabel(req.agent);
                systemNotify(text.approvalTitle, summaryOf(label !== undefined ? `${label} · ${detail}` : detail, NOTIFY_BODY_MAX), sessionOpenUrl(req.agent.id), cfg.sound);
            }
        }
        catch { /* 通知是增益不是依赖：观察失败不阻断审批链 */ }
        return next();
    }, { global: true });
    // 错误：受总开关 + error 子开关控制。去重键是 agent id + 消息指纹——
    // 同一会话的同一错误 30s 内只发一条避免刷屏，但用户修复后出现的
    // 不同错误在同一窗口内仍会各自通知（不被旧去重键吞掉）。
    // 每次事件先清理已过期条目，防止长期运行后无界增长（见 pruneExpired）。
    // 不做聚焦抑制：错误要送达（用户可能在看别的会话）。
    const lastErrorAt = new Map();
    ctx.on(NOTIFY_EVENTS.error, (payload) => {
        safe(() => {
            const cfg = configOf();
            if (!cfg.enabled || !cfg.error)
                return;
            if (isSubagent(payload.agent))
                return;
            const now = Date.now();
            // 解析边界：Error 实例优先 message；空 message 回退 name；非 Error 原样输出；
            // 完全缺失兜底本地化的「未知错误」。绝不抛（safe 内）。
            const text = textOf();
            const detail = payload.error instanceof Error
                ? payload.error.message || payload.error.name || text.errorUnknown
                : String(payload.error ?? text.errorUnknown);
            const key = errorDedupKey(payload.agent.id, detail);
            pruneExpired(lastErrorAt, now, ERROR_DEDUP_MS);
            if (now - (lastErrorAt.get(key) ?? 0) < ERROR_DEDUP_MS)
                return;
            lastErrorAt.set(key, now);
            // 正文拼上会话身份区分来源（agent/error 的 payload 同为 Agent）。
            const label = sessionLabel(payload.agent);
            systemNotify(text.errorTitle, summaryOf(label !== undefined ? `${label} · ${detail}` : detail, NOTIFY_BODY_MAX), sessionOpenUrl(payload.agent.id), cfg.sound);
        });
    }, { global: true });
    // 会话完成：agent 被销毁即视为会话结束（与轮次完成区分开）。
    // 注意不给 openUrl：dispose() 的顺序是「emit agent/disposed → 从 session store
    // 移除该会话 → client 收到 api-session/removed」，等用户点击通知（通常数秒后）
    // 时该 session 已不在列表快照里，client deep-link 会等满 15s 超时才放弃
    // （deep-link.ts 的 byId 查找），反而让「点击」这个动作看起来失灵。
    // 会话已销毁，跳过去也没有可打开的对象——诚实降级为不可点击。
    ctx.on(NOTIFY_EVENTS.sessionDone, (payload) => {
        safe(() => {
            const cfg = configOf();
            if (!cfg.enabled || !cfg.sessionDone)
                return;
            if (isSubagent(payload.agent))
                return;
            if (presence.shouldSuppress())
                return; // 非阻塞事件：同轮次完成
            const text = textOf();
            const label = sessionLabel(payload.agent);
            const body = label !== undefined ? text.sessionDoneBodyNamed(label) : text.sessionDoneBody;
            systemNotify(text.sessionDoneTitle, body, undefined, cfg.sound);
        });
    }, { global: true });
}
//# sourceMappingURL=notify-events.js.map