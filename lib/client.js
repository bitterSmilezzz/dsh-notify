window.__ModuleLoader__.load({
	id: "@bittersmilezzz/dsh-notify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react_jsx_runtime = require("react/jsx-runtime");
		react_jsx_runtime = __toESM(react_jsx_runtime, 1);
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region src/client/locales.ts
		const zh = {
			masterTitle: "桌面通知",
			masterDesc: "审批/提问/轮次完成/会话完成/出错时弹系统通知，点击通知回到对应会话",
			groupEvents: "提醒事件",
			groupGeneral: "通用",
			groupQuiet: "免打扰",
			notifyTitle: "启用桌面通知",
			notifyDesc: "总开关；关闭后不再弹任何通知，分项设置保留",
			notifyApproval: "需要审批时提醒",
			notifyQuestion: "需要你回答时提醒",
			notifyTurn: "轮次完成时提醒",
			notifySessionDone: "会话结束时提醒",
			notifyError: "出错时提醒",
			notifySubagent: "子代理完成时提醒",
			notifySubagentDesc: "默认关闭——团队/子代理任务通常不需要逐条打扰",
			notifySummary: "通知正文显示详情",
			notifySummaryDesc: "关闭后正文只显示会话名，不把工作内容带到横幅上",
			notifySound: "通知声音",
			notifySoundDesc: "按事件区分音色：审批上行、出错下行、完成轻响",
			notifyTest: "试听：发一条测试通知",
			notifyQuiet: "开启免打扰时段",
			notifyQuietDesc: "该时段内不弹「轮次完成/会话完成/子代理」提醒；审批、提问与出错不受影响",
			notifyQuietStart: "开始",
			notifyQuietEnd: "结束",
			notifyQuietHint: "支持跨午夜，例如 22:00 → 08:00",
			permTitle: "通知权限",
			permDesc: "桌面 App 默认已允许；浏览器首次需要你点一下授权",
			permGrant: "开启通知",
			permGranted: "已授权",
			permDenied: "已被拒绝——请在浏览器/系统的站点设置里允许通知",
			permUnsupported: "当前运行时不支持系统通知",
			notifySaveFailed: "通知设置保存失败——可能不会在重启后保留，请重试",
			expand: "展开设置",
			collapse: "收起设置",
			titleApproval: "需要审批",
			titleQuestion: "需要你的回答",
			titleTurn: "轮次完成",
			titleSessionDone: "会话已结束",
			titleError: "Agent 出错",
			titleSubagent: "子代理完成",
			bodyTurn: "已完成",
			bodySessionDone: "已结束",
			bodyUnknownError: "未知错误",
			approvalToolFallback: "某个工具",
			questionPlanReview: "待审阅计划"
		};
		const en = {
			masterTitle: "Desktop notifications",
			masterDesc: "System notifications on approvals, questions, turn and session finish, and errors; clicking returns to that session",
			groupEvents: "Events",
			groupGeneral: "General",
			groupQuiet: "Quiet hours",
			notifyTitle: "Enable desktop notifications",
			notifyDesc: "Master switch; turning it off stops every notification while keeping the per-event settings",
			notifyApproval: "Notify on approval requests",
			notifyQuestion: "Notify when your answer is needed",
			notifyTurn: "Notify when a turn finishes",
			notifySessionDone: "Notify when a session ends",
			notifyError: "Notify on errors",
			notifySubagent: "Notify when a subagent finishes",
			notifySubagentDesc: "Off by default — team/subagent runs usually need no per-item interruption",
			notifySummary: "Show details in the body",
			notifySummaryDesc: "When off, the body shows only the session name instead of work content",
			notifySound: "Notification sound",
			notifySoundDesc: "Distinct tones per event: approvals rise, errors fall, completions stay light",
			notifyTest: "Preview: send a test notification",
			notifyQuiet: "Enable quiet hours",
			notifyQuietDesc: "No turn-end, session-end, or subagent alerts during this window; approvals, questions, and errors still arrive",
			notifyQuietStart: "From",
			notifyQuietEnd: "To",
			notifyQuietHint: "Crosses midnight, e.g. 22:00 → 08:00",
			permTitle: "Notification permission",
			permDesc: "The desktop app already allows notifications; a browser asks once",
			permGrant: "Enable notifications",
			permGranted: "Granted",
			permDenied: "Denied — allow notifications for this site in the browser or system settings",
			permUnsupported: "This runtime does not support system notifications",
			notifySaveFailed: "Failed to save notification settings — they may not persist after restart. Please retry.",
			expand: "Show settings",
			collapse: "Hide settings",
			titleApproval: "Approval needed",
			titleQuestion: "Your answer is needed",
			titleTurn: "Turn finished",
			titleSessionDone: "Session ended",
			titleError: "Agent error",
			titleSubagent: "Subagent finished",
			bodyTurn: "Finished",
			bodySessionDone: "Ended",
			bodyUnknownError: "Unknown error",
			approvalToolFallback: "a tool",
			questionPlanReview: "Plan awaiting review"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* dsh-notify — settings card styles (single `<style data-plugin-css="@bittersmilezzz/dsh-notify/client">`
		* tag, injected by the client apply and removed again on unload). Class names
		* are prefixed `dshn-` so they cannot collide with other plugins' styles.
		* Colors come only from `--dsw-*` theme tokens.
		*
		* 参数对齐官方插件配置卡片（ui-settings-plugins 的 PluginCard / fields 与
		* SubagentCard 的 section）：卡片描边 0.5px `border-l4`、圆角 16px、悬停与
		* 打开态换描边/背景，头部 14px/16px 内边距、标题 15px/600、说明 13px
		* `label-tertiary`，正文与字段分隔线 0.5px `border-l2`，次要按钮 outline 形态。
		*/
		const CSS = `
/* 旧契约（settings.plugin.item）的折叠卡片外壳；新契约由官方页面画外壳，
   这里只服务卡片自绘路径与表单内部排版。 */
.dshn-card{box-sizing:border-box;list-style:none;border:0.5px solid var(--dsw-alias-border-l4);border-radius:16px;background:var(--dsw-alias-bg-layer-3);transition:border-color .16s,background .16s}
.dshn-card:hover{border-color:var(--dsw-alias-label-dimmed)}
.dshn-cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
.dshn-header{width:100%;box-sizing:border-box;appearance:none;display:flex;align-items:center;gap:12px;border:0;border-radius:12px;background:none;color:inherit;font:inherit;text-align:left;padding:14px 16px;cursor:pointer}
.dshn-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dshn-headtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dshn-name{font-size:15px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary)}
.dshn-desc{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.dshn-chevron{flex:none;color:var(--dsw-alias-label-tertiary);transition:transform .16s}
.dshn-chevron.dshn-open{transform:rotate(180deg)}
.dshn-body{border-top:0.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}
/* 新契约（plugins.bundle.config）的表单外层：官方页面已画标题与面包屑，
   这里只给表单上下留白（对齐官方 SubagentCard 的 section 16px）。 */
.dshn-form{box-sizing:border-box;display:grid;gap:4px;padding:16px 0}
.dshn-group{display:grid;gap:4px}
.dshn-groupTitle{margin:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.04em}
.dshn-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.dshn-row:last-child{border-bottom:0}
.dshn-rowText{flex:1;min-width:0;display:grid;gap:2px}
.dshn-rowTitle{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}
.dshn-rowDesc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px}
.dshn-field{display:flex;align-items:center;gap:8px}
/* 次要操作按钮：对齐官方卡片内 discard 的 outline 形态。 */
.dshn-button{appearance:none;height:28px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:1.5;padding:0 14px;cursor:pointer}
.dshn-button:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}
.dshn-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dshn-button:disabled{opacity:.4;cursor:default}
/* 时段输入：与次要按钮同高同圆角，数字等宽，避免编辑时宽度跳动。 */
.dshn-clock{display:inline-flex;align-items:center;gap:6px}
.dshn-clockLabel{font-size:12.5px;color:var(--dsw-alias-label-tertiary)}
.dshn-input{appearance:none;height:28px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-variant-numeric:tabular-nums;padding:0 8px}
.dshn-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dshn-status{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshn-status.dshn-err{color:var(--dsw-alias-label-error)}
`;
		/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
		const config = {
			enabled: true,
			approval: true,
			question: true,
			turn: true,
			sessionDone: true,
			error: true,
			subagent: false,
			sound: true,
			summary: true,
			quietHours: false,
			quietStart: "22:00",
			quietEnd: "08:00"
		};
		/** host Config form 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
		let notifyForm;
		/** 广播配置变更（控制器/设置卡片监听，驱动重渲染与动态注册）。 */
		function announce() {
			window.dispatchEvent(new CustomEvent("dsh-notify:config", { detail: { ...config } }));
		}
		/**
		* host Config 的 entry id = settings namespace：必须与 host 半区
		* `cordis.patch.yml` 的 `id` 逐字相同（0.1.7 起 `configForms.get(entryId)` 与
		* `SettingsForms.update(ns)` 都按 entry id 定位）。拿错字符串**不抛错**，只会拿到
		* unavailable 快照 → 设置卡渲染成功但读写静默失效；一致性由
		* `test/config-parity.test.mjs` 的 entry-id 钉子守住。
		*/
		const NOTIFY_ENTRY_ID = "dsh-notify";
		/**
		* 绑定 host Config form 并订阅：首次读取当前值，之后 form 变化回写本地快照
		* 并广播。
		* @param ctx - client root context。
		* @returns 订阅 disposer（随 fiber 清理）。
		*/
		function bindConfigScope(ctx) {
			const scope = ctx.configForms.get(NOTIFY_ENTRY_ID);
			notifyForm = scope;
			const applySnapshot = () => {
				const value = scope.getSnapshot().value;
				if (value != null && typeof value === "object") {
					const next = value;
					if (typeof next.enabled === "boolean") config.enabled = next.enabled;
					if (typeof next.approval === "boolean") config.approval = next.approval;
					if (typeof next.question === "boolean") config.question = next.question;
					if (typeof next.turn === "boolean") config.turn = next.turn;
					if (typeof next.sessionDone === "boolean") config.sessionDone = next.sessionDone;
					if (typeof next.error === "boolean") config.error = next.error;
					if (typeof next.subagent === "boolean") config.subagent = next.subagent;
					if (typeof next.sound === "boolean") config.sound = next.sound;
					if (typeof next.summary === "boolean") config.summary = next.summary;
					if (typeof next.quietHours === "boolean") config.quietHours = next.quietHours;
					if (typeof next.quietStart === "string") config.quietStart = next.quietStart;
					if (typeof next.quietEnd === "string") config.quietEnd = next.quietEnd;
					announce();
				}
			};
			const unsub = scope.subscribe(applySnapshot);
			applySnapshot();
			return () => {
				unsub();
				if (notifyForm === scope) notifyForm = void 0;
			};
		}
		/**
		* 更新一个配置字段：改本地快照 → 广播 → 写 host Config。
		* @param field - 配置字段名。
		* @param mutator - 修改快照的闭包（同步执行后读取新值写 host）。
		*/
		function setConfig(field, mutator) {
			mutator();
			announce();
			if (notifyForm === void 0) return;
			const fail = () => {
				window.dispatchEvent(new CustomEvent("dsh-notify:config-error", { detail: { field } }));
			};
			try {
				notifyForm.set(field, config[field]).then((accepted) => {
					if (!accepted) fail();
				}, fail);
			} catch {
				fail();
			}
		}
		//#endregion
		//#region src/notify-policy.ts
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
		function summaryOf(text, max = 120) {
			if (text == null || text === "") return "";
			const oneLine = text.replace(/\s+/gu, " ").trim();
			if (oneLine.length <= max) return oneLine;
			return `${Array.from(oneLine).slice(0, Math.max(1, max - 1)).join("")}…`;
		}
		/**
		* 清理去重 Map 的过期条目。每次事件都先清一遍（不只等 size 到上限）：
		* Map 只保留窗口内的活跃记录，长期运行后不会堆积过期条目；Map 大小
		* 等于窗口内活跃会话数（通常个位数），逐条遍历开销可忽略。
		* @param map - 去重表（时间戳）。
		* @param now - 当前时间戳（毫秒）。
		* @param windowMs - 去重窗口。
		*/
		function pruneExpired(map, now, windowMs) {
			for (const [id, at] of map) if (now - at >= windowMs) map.delete(id);
		}
		/**
		* error 去重指纹：会话 id + 消息文本（截断拼接，确定性、无散列依赖）。
		* 同一会话的同一错误在去重窗口内只通知一次；不同错误（消息不同）在同一
		* 窗口内各自通知——用户修复后窗口内出现的新错误不再被旧去重键吞掉。
		* @param sessionId - 会话身份。
		* @param message - 错误文本。
		* @returns 去重键。
		*/
		function errorDedupKey(sessionId, message) {
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
		function localizedTextOf(dict, preference) {
			if (typeof dict === "string") return dict === "" ? void 0 : dict;
			if (typeof dict !== "object" || dict === null) return void 0;
			const table = dict;
			const en = typeof table.en === "string" ? table.en : "";
			if (typeof preference !== "string") return en !== "" ? en : firstNonEmpty(table);
			const normalized = preference.trim().toLowerCase();
			const primary = normalized.split(/[-_]/u, 1)[0] ?? "";
			if (primary === "") return en !== "" ? en : firstNonEmpty(table);
			const exact = table[normalized];
			if (typeof exact === "string" && exact !== "") return exact;
			const byPrimary = table[primary];
			if (typeof byPrimary === "string" && byPrimary !== "") return byPrimary;
			return en !== "" ? en : firstNonEmpty(table);
		}
		/** 字典里第一个非空字符串值（en 也缺失时的最后兜底，迭代顺序不确定但不抛错）。 */
		function firstNonEmpty(table) {
			for (const value of Object.values(table)) if (typeof value === "string" && value !== "") return value;
		}
		/**
		* 审批通知正文取词：优先 `displayReason`（本地化提示，DSH rc.2 新增），缺失时
		* 回落 `reason`（审计用原始文本，旧版协议与只填 reason 的 asker 都走这条）。
		* @param req - 审批请求（client 侧投影字段）。
		* @param preference - 当前语言偏好。
		* @returns 正文可用的提示文本；两者都不可用时 undefined（调用方只展示工具名）。
		*/
		function approvalDetailOf(req, preference) {
			if (req == null) return void 0;
			const localized = localizedTextOf(req.displayReason, preference);
			if (localized !== void 0 && localized !== "") return localized;
			return typeof req.reason === "string" && req.reason !== "" ? req.reason : void 0;
		}
		/**
		* 会话身份标签：优先会话标题（用户认得），回落 undefined 由调用方用固定文案。
		* @param title - 会话列表行的标题（`title` 或 `displayTitle`）。
		* @returns 非空标题；缺失或空串时 undefined。
		*/
		function sessionLabelOf(title) {
			if (typeof title !== "string") return void 0;
			const trimmed = title.trim();
			return trimmed === "" ? void 0 : trimmed;
		}
		/**
		* 把 `HH:MM` 解析成「当日第几分钟」。
		* 接受 `9:05` / `09:05` 两种写法（用户在输入框里手打时容易漏前导零），
		* 非法输入（越界、非数字、缺分隔符）一律返回 undefined——调用方据此把
		* 免打扰视为未配置，绝不因为一个坏字符串就永久静音（失败方向选「宁可多提醒」）。
		* @param value - 形如 `HH:MM` 的字符串。
		* @returns 0..1439 的分钟数；非法时 undefined。
		*/
		function parseClockMinutes(value) {
			if (typeof value !== "string") return void 0;
			const match = /^(\d{1,2}):(\d{2})$/u.exec(value.trim());
			if (match === null) return void 0;
			const hour = Number(match[1]);
			const minute = Number(match[2]);
			if (!Number.isInteger(hour) || !Number.isInteger(minute)) return void 0;
			if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return void 0;
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
		function quietHoursActive(nowMinutes, startMinutes, endMinutes) {
			if (startMinutes === endMinutes) return false;
			if (startMinutes < endMinutes) return nowMinutes >= startMinutes && nowMinutes < endMinutes;
			return nowMinutes >= startMinutes || nowMinutes < endMinutes;
		}
		/**
		* 通知的会话级 `tag`：同一会话的新通知替换旧卡，避免并行会话刷屏
		* （ccnotify / omdsh 的通行做法）。
		*
		* **Windows 例外**：社区实测（Zhiyi-Zhao/dsh-notify）带 `tag` 的
		* `new Notification()` 在 Windows 上会被浏览器接受但 toast 永不送达。
		* 该结论是单机实测而非普遍规律，但「不弹」比「不替换」代价大得多，
		* 因此 Windows 一律不发 tag，其余平台按会话替换。
		*
		* ⚠ Windows 上**并没有退化成堆叠**：替换并不依赖 `tag`，而是靠插件自己
		* 显式 `close()` 上一张同会话的卡（见 notifications.ts 的 `notify()`）。
		* `tag` 只是系统侧的合并兜底，去掉它不影响按会话替换。
		*
		* 判据按整词匹配 `win`：`Win32` / `Windows NT …` 命中，而 macOS 的
		* `Darwin` 不会（`r` 与 `w` 之间没有词边界，`\bwin` 不成立）。
		* @param platform - `navigator.platform` 或 userAgent 形态的平台串。
		* @param sessionId - 会话身份。
		* @returns tag 字符串；Windows 返回 undefined。
		*/
		function notificationTagOf(platform, sessionId) {
			if (/\bwin/iu.test(platform)) return void 0;
			return `dsh-notify:${sessionId}`;
		}
		/**
		* 通知类别的优先级档位。
		*
		* 只有审批与提问是阻塞性的：它们卡住会话，不处理就继续不下去，通知必须
		* 一直留在通知中心。其余事件都是「已经发生过了」的信息，被同会话的更新
		* 顶掉是合理的。
		* @param kind - 事件类别（`approval` / `question` / `turn` / …）。
		* @returns 该类别的优先级档位。
		*/
		function noticePriorityOf(kind) {
			return kind === "approval" || kind === "question" ? "blocking" : "info";
		}
		/**
		* 同一会话里，新通知是否顶掉旧通知。
		*
		* ⚠ 这条判定是「Windows 上审批通知会自己消失」的根因修复：
		* 旧实现无条件 `close()` 上一张同会话的卡，于是**随后的信息类通知
		* （轮次完成 / 出错 / 会话结束）会把还等着用户处理的审批卡关掉**。
		* Windows 上 `close()` 会把 toast 从通知中心摘掉，审批请求就此消失，
		* 用户回来只看到一条无关信息——恰恰是通知最该提醒的时候。
		*
		* 规则：**阻塞卡只被新的阻塞卡顶掉；信息卡只顶掉信息卡。** 阻塞卡与
		* 信息卡并存（各占一条 toast），直到用户点击、会话结束或被同类请求取代。
		* @param previous - 旧通知的档位。
		* @param next - 新通知的档位。
		* @returns 新通知顶掉旧通知时为 true。
		*/
		function replacesPreviousNotice(previous, next) {
			return next === "blocking" || previous === next;
		}
		/**
		* 「一次运行一条通知」的判定：会话从 running 变 idle 才算本轮真正结束。
		* 中间态（running 仍为 true）不触发，避免多轮 goal / 工具连续调用时刷屏。
		* @param previous - 上一次观测到的 running 状态（未观测过为 undefined）。
		* @param next - 本次观测到的 running 状态。
		* @returns 本次观测构成「一轮结束」时为 true。
		*/
		function isTurnEnd(previous, next) {
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
		const SOUND_PATTERNS = {
			approval: [{
				frequency: 784,
				start: 0,
				duration: .14,
				wave: "sine",
				gain: .16
			}, {
				frequency: 1047,
				start: .16,
				duration: .26,
				wave: "sine",
				gain: .16
			}],
			question: [{
				frequency: 784,
				start: 0,
				duration: .14,
				wave: "sine",
				gain: .16
			}, {
				frequency: 1047,
				start: .16,
				duration: .26,
				wave: "sine",
				gain: .16
			}],
			turn: [{
				frequency: 880,
				start: 0,
				duration: .16,
				wave: "sine",
				gain: .12
			}],
			sessionDone: [{
				frequency: 659,
				start: 0,
				duration: .14,
				wave: "sine",
				gain: .13
			}, {
				frequency: 523,
				start: .16,
				duration: .24,
				wave: "sine",
				gain: .13
			}],
			error: [{
				frequency: 440,
				start: 0,
				duration: .16,
				wave: "triangle",
				gain: .16
			}, {
				frequency: 349,
				start: .18,
				duration: .3,
				wave: "triangle",
				gain: .16
			}],
			subagent: [{
				frequency: 880,
				start: 0,
				duration: .16,
				wave: "sine",
				gain: .08
			}]
		};
		/**
		* 通知是否应静音系统声。
		*
		* 打开音效时静音系统声（只响自绘那一份，不叠成双声）；关闭音效时同样静音
		* ——否则「关闭声音」只关掉了自绘音，系统提示音照响，开关语义就错了。
		* @returns 恒为 true：声音完全由本插件的合成音承担。
		*/
		function systemSoundSuppressed() {
			return true;
		}
		//#endregion
		//#region src/client/sound.ts
		/** 当前 AudioContext；首次需要发声时创建。 */
		let audioCtx = null;
		/** 上一次同类音效的播放时间（毫秒），用于节流。 */
		const lastPlayedAt = /* @__PURE__ */ new Map();
		/** 同一类音效的最小间隔（毫秒）：连续通知不叠成噪音，也不堆节点。 */
		const THROTTLE_MS = 300;
		/**
		* 取 AudioContext 构造器（含 webkit 前缀兼容）。
		* @returns 构造器，运行时不提供音频能力时为 undefined。
		*/
		function audioCtor() {
			if (typeof window === "undefined") return void 0;
			const w = window;
			return w.AudioContext ?? w.webkitAudioContext;
		}
		/**
		* 确保 AudioContext 可用并处于 running。
		* @returns 可用的 context；运行时不支持或创建失败时 undefined。
		*/
		function ensureAudio() {
			const Ctor = audioCtor();
			if (Ctor === void 0) return void 0;
			try {
				audioCtx ??= new Ctor();
				if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
				return audioCtx;
			} catch {
				return;
			}
		}
		/**
		* 挂载音频预热：首次用户交互时创建/恢复 AudioContext。
		*
		* 必须由 fiber 持有 disposer——插件 update/HMR 时旧监听若不清会累积，
		* AudioContext 也会泄漏。
		* @returns disposer：移除监听并关闭 AudioContext。
		*/
		function mountSoundWarmup() {
			const warm = () => {
				ensureAudio();
			};
			if (typeof document !== "undefined") {
				document.addEventListener("pointerdown", warm, { passive: true });
				document.addEventListener("keydown", warm, { passive: true });
			}
			return () => {
				if (typeof document !== "undefined") {
					document.removeEventListener("pointerdown", warm);
					document.removeEventListener("keydown", warm);
				}
				if (audioCtx !== null) {
					try {
						audioCtx.close().catch(() => {});
					} catch {}
					audioCtx = null;
				}
				lastPlayedAt.clear();
			};
		}
		/**
		* 播一个音。
		* @param ctx - 音频上下文。
		* @param tone - 频率、起始偏移、时长、波形与增益。
		*/
		function playTone(ctx, tone) {
			const duration = Math.max(tone.duration, .05);
			const gain = Math.max(tone.gain, 1e-4);
			const start = ctx.currentTime + Math.max(tone.start, 0);
			const osc = ctx.createOscillator();
			const envelope = ctx.createGain();
			osc.type = tone.wave;
			osc.frequency.value = tone.frequency;
			envelope.gain.setValueAtTime(1e-4, start);
			envelope.gain.exponentialRampToValueAtTime(gain, start + .02);
			envelope.gain.exponentialRampToValueAtTime(1e-4, start + duration);
			osc.connect(envelope).connect(ctx.destination);
			osc.start(start);
			osc.stop(start + duration + .05);
			osc.addEventListener("ended", () => {
				try {
					envelope.disconnect();
				} catch {}
			}, { once: true });
		}
		/**
		* 播放某类事件的音效（受声音开关与节流控制）。
		*
		* @param kind - 事件类别，决定音色。
		* @param enabled - 声音开关当前值。
		* @param now - 当前时间（毫秒）；注入以便测试节流。
		*/
		function playNoticeSound(kind, enabled, now = Date.now()) {
			if (!enabled) return;
			const previous = lastPlayedAt.get(kind);
			if (previous !== void 0 && now - previous < THROTTLE_MS) return;
			const ctx = ensureAudio();
			if (ctx === void 0) return;
			lastPlayedAt.set(kind, now);
			try {
				for (const tone of SOUND_PATTERNS[kind]) playTone(ctx, tone);
			} catch {}
		}
		/**
		* 试听音效：无视声音开关，让用户在关闭开关后仍能确认音色。
		* @param kind - 要试听的事件音色。
		*/
		function previewNoticeSound(kind) {
			lastPlayedAt.delete(kind);
			playNoticeSound(kind, true);
		}
		//#endregion
		//#region src/client/notifications.ts
		/** 通知正文最大长度（超出截断加 …），保持系统横幅一行可读。 */
		const BODY_MAX = 96;
		/** 轮次完成去重窗口：同一会话 5s 内只发一条（running 抖动/重连会重复上报）。 */
		const TURN_DEDUP_MS = 5e3;
		/** 出错去重窗口：同一会话的同一错误 30s 内只发一条。 */
		const ERROR_DEDUP_MS = 3e4;
		/**
		* 持有 Notification 对象的最长时间。Electron 的点击/关闭回调在通知被 GC 后
		* 不再触发（Electron 通知的已知坑），而 `onclose` 并不保证到达，所以用一张
		* 有界表持有引用，超时兜底释放，避免长跑后无界增长。
		*/
		const HOLD_MS = 3e5;
		/** 设备平台串（Windows 上不发 tag，见 notificationTagOf 的契约）。 */
		function platformOf() {
			if (typeof navigator === "undefined") return "";
			return `${navigator.platform ?? ""} ${navigator.userAgent}`;
		}
		/** 页面当前是否「用户正在看」：可见且有焦点。 */
		function watchingNow() {
			if (typeof document === "undefined") return false;
			return document.visibilityState === "visible" && document.hasFocus();
		}
		/** 通知权限状态（`unsupported` 表示该运行时不提供 Notification）。 */
		function notificationPermission() {
			if (typeof Notification === "undefined") return "unsupported";
			return Notification.permission;
		}
		/**
		* 申请通知权限。**必须在用户手势里调用**（浏览器会静默拒绝无手势的请求）；
		* 桌面 App 恒为已授权，此调用直接返回 granted。
		* @returns 申请后的权限状态。
		*/
		async function requestNotificationPermission() {
			if (typeof Notification === "undefined") return "unsupported";
			if (Notification.permission !== "default") return Notification.permission;
			try {
				return await Notification.requestPermission();
			} catch {
				return Notification.permission;
			}
		}
		/**
		* 发一条测试通知（设置卡按钮用；同时消化掉浏览器对 requestPermission 的
		* 用户手势要求）。
		* @param title - 通知标题。
		* @param body - 通知正文。
		* @param sound - 是否发声。
		* @returns 实际投递成功时为 true。
		*/
		function sendTestNotification(title, body, sound) {
			if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
			try {
				const notification = new Notification(title, {
					body,
					silent: !sound
				});
				notification.onclick = () => {
					try {
						window.focus();
					} catch {}
				};
				return true;
			} catch {
				return false;
			}
		}
		/**
		* 安装通知控制器：订阅官方 client 事件并按策略投递系统通知。
		*
		* @param ctx - client root context。
		* @param runtime - 配置与文案读取面。
		* @param openSession - 打开会话（点击通知时的导航入口，见 navigation.ts）。
		*/
		function applyNotifications(ctx, runtime, openSession) {
			const sessions = ctx.get("sessions");
			const uiSession = ctx.get("uiSession");
			const remote = ctx.get("remote");
			if (sessions === void 0 || typeof sessions.list?.getSnapshot !== "function") return;
			if (uiSession === void 0 || typeof uiSession.sessionStatus?.subscribe !== "function") return;
			/** 已发出的通知（按会话）：既用于替换，也持有引用防 GC。 */
			const live = /* @__PURE__ */ new Map();
			/**
			* 阻塞性通知（审批 / 提问）单独记账：它们带 `requireInteraction`，**必须
			* 留在通知中心等人来点**，不能被同会话后续的信息类通知顶掉。
			*
			* Windows 上这条差别是生死问题：`close()` 会把 toast 从通知中心摘掉。
			* 旧实现用一张 `live` 表管所有通知，于是「审批卡 → 轮次完成」会把审批卡
			* 关掉，用户回到电脑只看到一条无关的完成提示，需要处理的那个请求凭空
			* 消失。分开记账后，信息类通知只顶掉同类，阻塞卡一直留到用户点击。
			*/
			const blockingLive = /* @__PURE__ */ new Map();
			/** 各类去重表。 */
			const lastTurnAt = /* @__PURE__ */ new Map();
			const lastErrorAt = /* @__PURE__ */ new Map();
			/** 上一条已通知的会话级时间（避免 completionUnread 与 running 边沿双发）。 */
			const lastNotifiedAt = /* @__PURE__ */ new Map();
			/** 上一次观测到的 running / pendingInteraction key。 */
			const running = /* @__PURE__ */ new Map();
			const pendingKeys = /* @__PURE__ */ new Map();
			/**
			* 会话标题与子代理标记的最后已知值：行被移除后（会话结束）仍要用它们判定
			* 「是不是子代理」与「正文写什么」。生命周期与行绑定——会话被移除时清掉，
			* 所以表的大小上界是「当前列表里的会话数」，不会随历史会话无界增长。
			*/
			const knownLabels = /* @__PURE__ */ new Map();
			const knownSubagent = /* @__PURE__ */ new Map();
			const platform = platformOf();
			/** 首次快照只建基线，不为历史状态补通知。 */
			let baselined = false;
			const snapshotOf = () => sessions.list.getSnapshot();
			/**
			* 记住一行的身份信息。会话被移除后 `byId` 里就没有它了，而「子代理不该弹」
			* 与「正文用会话名」这两条判定都要在移除之后继续成立，所以标记必须落缓存。
			*/
			const rememberRow = (sessionId) => {
				const row = snapshotOf().byId[sessionId];
				if (row === void 0) return;
				const label = sessionLabelOf(row.title ?? row.displayTitle);
				if (label !== void 0) knownLabels.set(sessionId, label);
				knownSubagent.set(sessionId, row.origin === "subagent");
			};
			/** 会话身份标签：标题 → 最后已知标题 → 短 id（用户至少能分辨是哪一个）。 */
			const labelOf = (sessionId) => {
				rememberRow(sessionId);
				return knownLabels.get(sessionId) ?? sessionId.slice(0, 8);
			};
			const isSubagent = (sessionId) => {
				rememberRow(sessionId);
				return knownSubagent.get(sessionId) === true;
			};
			const isMainView = (sessionId) => (snapshotOf().byId[sessionId]?.retainedBy?.mainView ?? 0) > 0;
			/** 免打扰：审批 / 提问 / 出错属阻塞性或故障类，不受免打扰限制。 */
			const quietNow = (kind, cfg) => {
				if (!cfg.quietHours) return false;
				if (kind === "approval" || kind === "question" || kind === "error") return false;
				const start = parseClockMinutes(cfg.quietStart);
				const end = parseClockMinutes(cfg.quietEnd);
				if (start === void 0 || end === void 0) return false;
				const now = /* @__PURE__ */ new Date();
				return quietHoursActive(now.getHours() * 60 + now.getMinutes(), start, end);
			};
			/** 类别开关。 */
			const kindEnabled = (kind, cfg) => {
				switch (kind) {
					case "approval": return cfg.approval;
					case "question": return cfg.question;
					case "turn": return cfg.turn;
					case "sessionDone": return cfg.sessionDone;
					case "error": return cfg.error;
					case "subagent": return cfg.subagent;
					default: return false;
				}
			};
			/**
			* 丢掉一条通知的持有引用。
			*
			* ⚠ 只在**存的就是这一条**时才删：同一会话可能同时有一条信息卡与一条阻塞
			* 卡（见 `blockingLive`），`onclose` 回调不知道自己是哪一条，无条件按会话删
			* 会误伤另一条——那条卡从此不再被替换，也不再被持有（Electron 通知被 GC 后
			* 点击回调不再触发）。
			* @param sessionId - 会话身份。
			* @param notification - 触发回调的那条通知。
			*/
			const release = (sessionId, notification) => {
				if (live.get(sessionId)?.notification === notification) live.delete(sessionId);
			};
			/** 丢掉一条阻塞性通知的持有引用（同 `release`：只删存着的那一条）。 */
			const releaseBlocking = (sessionId, notification) => {
				if (blockingLive.get(sessionId)?.notification === notification) blockingLive.delete(sessionId);
			};
			/** 策略过滤 + 真投递。所有失败静默。 */
			const notify = (notice) => {
				try {
					if (typeof Notification === "undefined") return;
					if (Notification.permission !== "granted") return;
					const cfg = runtime.config();
					if (!cfg.enabled) return;
					const kind = isSubagent(notice.sessionId) && notice.kind !== "subagent" ? "subagent" : notice.kind;
					if (!kindEnabled(kind, cfg)) return;
					if (quietNow(kind, cfg)) return;
					const priority = noticePriorityOf(kind);
					if (priority === "blocking") {
						const previousBlocking = blockingLive.get(notice.sessionId);
						if (previousBlocking !== void 0) {
							try {
								previousBlocking.notification.close();
							} catch {}
							releaseBlocking(notice.sessionId, previousBlocking.notification);
						}
					} else {
						const previous = live.get(notice.sessionId);
						if (previous !== void 0 && replacesPreviousNotice(previous.priority, priority)) {
							try {
								previous.notification.close();
							} catch {}
							release(notice.sessionId, previous.notification);
						}
					}
					const tag = notificationTagOf(platform, notice.sessionId);
					const notification = new Notification(notice.title, {
						body: notice.body,
						...tag === void 0 ? {} : { tag },
						silent: systemSoundSuppressed(),
						requireInteraction: kind === "approval" || kind === "question"
					});
					playNoticeSound(kind, cfg.sound);
					if (priority === "blocking") blockingLive.set(notice.sessionId, {
						notification,
						at: Date.now()
					});
					else live.set(notice.sessionId, {
						notification,
						at: Date.now(),
						priority
					});
					notification.onclick = () => {
						release(notice.sessionId, notification);
						releaseBlocking(notice.sessionId, notification);
						try {
							window.focus();
						} catch {}
						if (!openSession(notice.sessionId)) console.warn(`[dsh-notify] 会话 ${notice.sessionId} 打开失败：导航入口不可用`);
						try {
							notification.close();
						} catch {}
					};
					notification.onclose = () => {
						release(notice.sessionId, notification);
						releaseBlocking(notice.sessionId, notification);
					};
					notification.onerror = () => {
						release(notice.sessionId, notification);
						releaseBlocking(notice.sessionId, notification);
					};
					lastNotifiedAt.set(notice.sessionId, Date.now());
				} catch {}
			};
			/** 清理过期条目（onclose 未必到达，去重表也必须逐事件收敛）。 */
			const sweep = () => {
				const now = Date.now();
				for (const [key, entry] of live) if (now - entry.at >= HOLD_MS) live.delete(key);
				for (const [key, entry] of blockingLive) if (now - entry.at >= HOLD_MS) blockingLive.delete(key);
				pruneExpired(lastTurnAt, now, TURN_DEDUP_MS);
				pruneExpired(lastErrorAt, now, ERROR_DEDUP_MS);
				pruneExpired(lastNotifiedAt, now, HOLD_MS);
			};
			/**
			* 会话完成的公共判定：只要用户**没有正看着这个会话**就提醒。
			*   - 运行时已判定（`completionUnread`）= 后台会话跑完了，直接提醒；
			*   - 否则看「窗口是否在前台」：切到别的 App / 最小化时也要提醒；
			*   - 再看「主视图是不是这个会话」：正看着 A 而 B 跑完，B 必须提醒。
			* 三者取或：只要有一条说明用户看不见它，就不算打扰。
			*/
			const shouldNotifyCompletion = (sessionId, completionUnread) => completionUnread || !watchingNow() || !isMainView(sessionId);
			/** 正文：摘要关闭时只给会话标签，不把内容带到横幅上。 */
			const bodyWith = (cfg, label, detail) => bodyOf(cfg, label, detail);
			/** 轮次完成（含子代理）：带 5s 去重。 */
			const notifyTurn = (sessionId) => {
				const now = Date.now();
				if (now - (lastTurnAt.get(sessionId) ?? 0) < TURN_DEDUP_MS) return;
				lastTurnAt.set(sessionId, now);
				const subagent = isSubagent(sessionId);
				notify({
					kind: subagent ? "subagent" : "turn",
					sessionId,
					title: runtime.t(subagent ? "titleSubagent" : "titleTurn"),
					body: bodyWith(runtime.config(), labelOf(sessionId), runtime.t("bodyTurn"))
				});
			};
			/** 第一次拿到快照时只记录基线，不为已经发生的状态补通知。 */
			const baseline = (snapshot) => {
				for (const [sessionId, status] of snapshot) {
					running.set(sessionId, status.running);
					const key = status.pendingInteraction?.key;
					if (key !== void 0) pendingKeys.set(sessionId, key);
					labelOf(sessionId);
				}
			};
			ctx.effect(() => uiSession.sessionStatus.subscribe(() => {
				try {
					sweep();
					const snapshot = uiSession.sessionStatus.getSnapshot();
					if (!baselined) {
						baselined = true;
						baseline(snapshot);
						return;
					}
					const cfg = runtime.config();
					for (const [sessionId, status] of snapshot) {
						const pending = status.pendingInteraction;
						if (pending === void 0) pendingKeys.delete(sessionId);
						else if (pending.key !== pendingKeys.get(sessionId)) {
							pendingKeys.set(sessionId, pending.key);
							if (cfg.enabled) notify(pendingNotice(sessionId, pending, labelOf, runtime, cfg));
						}
						const previous = running.get(sessionId);
						running.set(sessionId, status.running);
						const ended = isTurnEnd(previous, status.running);
						const backgrounded = status.completionUnread === true && previous === void 0 && Date.now() - (lastNotifiedAt.get(sessionId) ?? 0) >= TURN_DEDUP_MS;
						if ((ended || backgrounded) && shouldNotifyCompletion(sessionId, status.completionUnread === true)) notifyTurn(sessionId);
					}
				} catch {}
			}), "dsh-notify: session status subscription");
			if (remote !== void 0 && typeof remote.$on === "function") ctx.effect(() => remote.$on("api-session/error", (sessionId, message) => {
				try {
					const cfg = runtime.config();
					const now = Date.now();
					const detail = summaryOf(message, BODY_MAX) || runtime.t("bodyUnknownError");
					const key = errorDedupKey(sessionId, detail);
					pruneExpired(lastErrorAt, now, ERROR_DEDUP_MS);
					if (now - (lastErrorAt.get(key) ?? 0) < ERROR_DEDUP_MS) return;
					lastErrorAt.set(key, now);
					notify({
						kind: "error",
						sessionId,
						title: runtime.t("titleError"),
						body: bodyWith(cfg, labelOf(sessionId), detail)
					});
				} catch {}
			}), "dsh-notify: session error subscription");
			ctx.effect(() => {
				let previous = new Set(snapshotOf().ids);
				return sessions.list.subscribe(() => {
					try {
						const next = new Set(snapshotOf().ids);
						for (const id of next) rememberRow(id);
						for (const lost of previous) {
							if (next.has(lost)) continue;
							const label = labelOf(lost);
							running.delete(lost);
							pendingKeys.delete(lost);
							notify({
								kind: "sessionDone",
								sessionId: lost,
								title: runtime.t("titleSessionDone"),
								body: bodyWith(runtime.config(), label, runtime.t("bodySessionDone"))
							});
							knownLabels.delete(lost);
							knownSubagent.delete(lost);
						}
						previous = next;
					} catch {}
				});
			}, "dsh-notify: session list subscription");
		}
		/** 正文：摘要关闭时只给会话标签，不把内容带到横幅上。 */
		function bodyOf(cfg, label, detail) {
			if (!cfg.summary) return label;
			return detail === "" ? label : summaryOf(`${label} · ${detail}`, BODY_MAX);
		}
		/** 审批 / 提问通知的组装（两类共用一个入口，判别在 `pending.kind`）。 */
		function pendingNotice(sessionId, pending, labelOf, runtime, cfg) {
			const label = labelOf(sessionId);
			const bodyWith = (detail) => bodyOf(cfg, label, detail);
			if (pending.kind === "approval") {
				const request = pending;
				const tool = typeof request.toolName === "string" && request.toolName !== "" ? request.toolName : runtime.t("approvalToolFallback");
				const detail = approvalDetailOf(request, runtime.activeLocale());
				return {
					kind: "approval",
					sessionId,
					title: runtime.t("titleApproval"),
					body: bodyWith(detail === void 0 ? tool : `${tool} · ${detail}`)
				};
			}
			const question = pending;
			const first = question.kind === "plan-review" ? runtime.t("questionPlanReview") : typeof question.questions?.[0]?.question === "string" ? question.questions[0].question : "";
			return {
				kind: "question",
				sessionId,
				title: runtime.t("titleQuestion"),
				body: bodyWith(summaryOf(first, BODY_MAX))
			};
		}
		//#endregion
		//#region src/client/settings-card.tsx
		/**
		* dsh-notify — settings card (plugins.bundle.config).
		*
		* 渲染在插件详情页（侧边栏 Plugins 面板 → 本插件 → 配置表单）：页面自己画
		* 标题/图标/面包屑，occupant 按 `view: 'summary' | 'page'` 渲染一行摘要或表单。
		* `view` 缺省（如更早的运行时）时退回自绘折叠外壳兜底。
		*
		* 开关走 config 快照（host Config 为权威源），拨动即写 host（无暂存/保存步）：
		* 开关的意图是即时的，不存在官方 staged 文本字段那种「未预览的写入」问题。
		* 时段输入是唯一的例外——它需要连续编辑（22:00 删成 2:00 不能中途落盘），
		* 所以在 blur/回车时才提交。
		*/
		/** 一个开关行：官方 Switch（对齐官方设置面板控件），点击开关切换。 */
		function ToggleRow({ title, desc, checked, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshn-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dshn-rowText",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshn-rowTitle",
						children: title
					}), desc ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshn-rowDesc",
						children: desc
					}) : null]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dshn-field",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
						checked,
						onChange,
						label: title
					})
				})]
			});
		}
		/**
		* 时段输入：本地 state 承接连续编辑，blur / 回车时才写 host。
		* 浏览器 `type="time"` 自带 `HH:MM` 形态与非空校验，非法值不会出现在这里。
		*/
		function ClockField({ label, value, onCommit }) {
			const [draft, setDraft] = react.useState(value);
			const [focused, setFocused] = react.useState(false);
			react.useEffect(() => {
				if (!focused) setDraft(value);
			}, [value, focused]);
			const commit = () => {
				if (draft !== value && draft !== "") onCommit(draft);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: "dshn-clock",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dshn-clockLabel",
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "time",
					className: "dshn-input",
					value: draft,
					onChange: (event) => setDraft(event.target.value),
					onFocus: () => setFocused(true),
					onBlur: () => {
						setFocused(false);
						commit();
					},
					onKeyDown: (event) => {
						if (event.key === "Enter") commit();
					}
				})]
			});
		}
		/** 通知权限行：桌面 App 恒为已授权，浏览器首次需要一次用户手势。 */
		function PermissionRow({ t }) {
			const [state, setState] = react.useState(() => notificationPermission());
			const grant = () => {
				requestNotificationPermission().then((next) => {
					setState(next);
					if (next === "granted") {
						sendTestNotification(t("titleTurn"), t("notifyTest"), config.sound);
						previewNoticeSound("turn");
					}
				});
			};
			const text = state === "granted" ? t("permGranted") : state === "denied" ? t("permDenied") : state === "unsupported" ? t("permUnsupported") : t("permDesc");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshn-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dshn-rowText",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshn-rowTitle",
						children: t("permTitle")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshn-rowDesc",
						children: text
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dshn-field",
					children: state === "default" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dshn-button",
						onClick: grant,
						children: t("permGrant")
					}) : null
				})]
			});
		}
		/** 通知设置表单主体：事件开关 + 通用 + 免打扰 + 权限。 */
		function NotifyForm({ t }) {
			const [saveFailed, setSaveFailed] = react.useState(false);
			const [, force] = react.useReducer((x) => x + 1, 0);
			react.useEffect(() => {
				const onConfig = () => {
					force();
					setSaveFailed(false);
				};
				const onError = () => setSaveFailed(true);
				window.addEventListener("dsh-notify:config", onConfig);
				window.addEventListener("dsh-notify:config-error", onError);
				return () => {
					window.removeEventListener("dsh-notify:config", onConfig);
					window.removeEventListener("dsh-notify:config-error", onError);
				};
			}, []);
			/** 翻转一个布尔开关（先改快照再写 host，见 setConfig）。 */
			const flip = (field) => () => setConfig(field, () => {
				config[field] = !config[field];
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshn-form",
				children: [
					saveFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dshn-status dshn-err",
						role: "alert",
						children: t("notifySaveFailed")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshn-group",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dshn-groupTitle",
								children: t("groupEvents")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifyTitle"),
								desc: t("notifyDesc"),
								checked: config.enabled,
								onChange: flip("enabled")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifyApproval"),
								checked: config.approval,
								onChange: flip("approval")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifyQuestion"),
								checked: config.question,
								onChange: flip("question")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifyTurn"),
								checked: config.turn,
								onChange: flip("turn")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifySessionDone"),
								checked: config.sessionDone,
								onChange: flip("sessionDone")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifyError"),
								checked: config.error,
								onChange: flip("error")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifySubagent"),
								desc: t("notifySubagentDesc"),
								checked: config.subagent,
								onChange: flip("subagent")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshn-group",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dshn-groupTitle",
								children: t("groupGeneral")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifySummary"),
								desc: t("notifySummaryDesc"),
								checked: config.summary,
								onChange: flip("summary")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshn-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dshn-rowText",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshn-rowTitle",
										children: t("notifySound")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshn-rowDesc",
										children: t("notifySoundDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshn-field",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
										checked: config.sound,
										onChange: flip("sound"),
										label: t("notifySound")
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PermissionRow, { t }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshn-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshn-rowText",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshn-rowTitle",
										children: t("notifyTest")
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshn-field",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshn-button",
										onClick: () => {
											sendTestNotification(t("titleTurn"), t("masterTitle"), config.sound);
											previewNoticeSound("turn");
										},
										children: t("notifyTest")
									})
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshn-group",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dshn-groupTitle",
								children: t("groupQuiet")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
								title: t("notifyQuiet"),
								desc: t("notifyQuietDesc"),
								checked: config.quietHours,
								onChange: flip("quietHours")
							}),
							config.quietHours ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshn-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshn-rowText",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshn-rowDesc",
										children: t("notifyQuietHint")
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dshn-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClockField, {
										label: t("notifyQuietStart"),
										value: config.quietStart,
										onCommit: (next) => setConfig("quietStart", () => {
											config.quietStart = next;
										})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClockField, {
										label: t("notifyQuietEnd"),
										value: config.quietEnd,
										onCommit: (next) => setConfig("quietEnd", () => {
											config.quietEnd = next;
										})
									})]
								})]
							}) : null
						]
					})
				]
			});
		}
		/**
		* 旧契约（settings.plugin.item）的折叠外壳兜底：`view` 缺省时（更早的运行时）
		* 官方页面不画标题，由卡片自绘，视觉参数对齐官方 PluginCard
		* （border-l4 / radius 16 / 打开态换背景与描边）。
		*/
		function LegacyCardShell({ t, children }) {
			const [open, setOpen] = react.useState(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dshn-card" + (open ? " dshn-cardOpen" : ""),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dshn-header",
					"aria-expanded": open,
					"aria-label": `${t(open ? "collapse" : "expand")}: ${t("masterTitle")}`,
					onClick: () => setOpen(!open),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshn-headtext",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshn-name",
							children: t("masterTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshn-desc",
							children: t("masterDesc")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { className: "dshn-chevron" + (open ? " dshn-open" : "") })]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshn-body",
					children
				}) : null]
			});
		}
		/**
		* 通知设置卡片主体。三种渲染路径：
		*   - `view: 'summary'`：插件详情页上的一行摘要；
		*   - `view: 'page'`：插件详情页里的配置表单（官方页面已画标题）；
		*   - 无 `view`：自绘折叠外壳兜底（更早的运行时）。
		*
		* ⚠ `view: 'summary'` 当前**不可达**：官方 PluginManagerPage 对
		* `plugins.bundle.config` 只以 `view: 'page'` 渲染（summary 只用于
		* `plugins.item` 座位）。保留它是防御性的（官方哪天在插件列表页也渲染本座位的
		* 摘要，这里就不用改代码），但**不要为它单独维护文案**——`masterDesc` 同时被
		* 无 view 的折叠外壳使用，不会变成死词条。
		*
		* @param props.t - locale 绑定（闭包传入）。
		* @param props.view - 插件详情页传入的视图选择。
		* @returns 卡片内容。
		*/
		function NotifySettingsCard({ t, view }) {
			if (view === "summary") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: t("masterDesc") });
			const form = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NotifyForm, { t });
			if (view === "page") return form;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LegacyCardShell, {
				t,
				children: form
			});
		}
		//#endregion
		//#region src/client/deep-link.ts
		/** deep-link 等待会话出现的最大时长（毫秒）。 */
		const LINK_TIMEOUT_MS = 15e3;
		/**
		* 从当前地址提取 deep-link 的会话 id：先读 `#session=` fragment（rc.1 token
		* 鉴权后的新形态，303 重定向保留 fragment），再回落 `?session=` 查询参数
		* （旧形态）。两者都缺失或为空时返回 null。
		*/
		function sessionIdFromLocation(search, hash) {
			const fromHash = new URLSearchParams(hash.replace(/^#/u, "")).get("session");
			if (fromHash !== null && fromHash !== "") return fromHash;
			const fromQuery = new URLSearchParams(search).get("session");
			return fromQuery !== null && fromQuery !== "" ? fromQuery : null;
		}
		/** 清除 deep-link 痕迹（fragment 与查询参数），避免刷新重复跳转。
		*  hash 用 URLSearchParams 解析而非 startsWith 前缀判断：`#session=` 可能
		*  不在 hash 首位（如 `#foo=1&session=abc`），前缀判断会漏清导致刷新重复跳转。 */
		function clearSessionParam() {
			const url = new URL(window.location.href);
			url.searchParams.delete("session");
			const hashParams = new URLSearchParams(url.hash.replace(/^#/u, ""));
			if (hashParams.has("session")) {
				hashParams.delete("session");
				url.hash = hashParams.size > 0 ? `#${hashParams.toString()}` : "";
			}
			window.history.replaceState({}, "", url);
		}
		/**
		* 处理 session deep-link。
		*
		* 加载与 hashchange 共用 attempt：新尝试先回收上一次的等待（幂等），
		* hash 里没有 session 时 attempt 直接 no-op。effect 的 disposer 同时
		* 移除 hashchange 监听并回收在途等待，随 client fiber 卸载。
		* @param ctx - client root context。
		* @param openSession - 打开会话的导航入口（见 navigation.ts）。
		*/
		function applySessionDeepLink(ctx, openSession) {
			ctx.effect(() => {
				const sessions = ctx.get("sessions");
				if (typeof sessions?.list?.subscribe !== "function" || typeof sessions?.list?.getSnapshot !== "function") return () => {};
				/** 打开会话并清除 deep-link 痕迹。open 失败（会话已销毁等）不清 URL：
				*  保留痕迹让用户可刷新/重试，console.warn 给出可见提示（不静默落首页）。 */
				const openAndClear = (sid) => {
					if (!openSession(sid)) {
						console.warn(`[dsh-notify] 会话 ${sid} 打开失败：URL 已保留，刷新可重试`);
						return;
					}
					clearSessionParam();
				};
				let inFlight;
				/** 尝试处理当前地址里的 deep-link。 */
				const attempt = () => {
					inFlight?.();
					inFlight = void 0;
					const sessionId = sessionIdFromLocation(window.location.search, window.location.hash);
					if (sessionId === null) return;
					if (sessions.list.getSnapshot().byId?.[sessionId] !== void 0) {
						openAndClear(sessionId);
						return;
					}
					let unsub;
					const timer = window.setTimeout(() => {
						if (unsub === void 0) return;
						unsub();
						unsub = void 0;
						console.warn(`[dsh-notify] 会话 ${sessionId} 未在 ${LINK_TIMEOUT_MS / 1e3}s 内出现：URL 已保留，刷新可重试`);
					}, LINK_TIMEOUT_MS);
					try {
						unsub = sessions.list.subscribe(() => {
							if (sessions.list.getSnapshot().byId?.[sessionId] === void 0) return;
							clearTimeout(timer);
							if (unsub !== void 0) unsub();
							openAndClear(sessionId);
						});
					} catch {
						clearTimeout(timer);
						console.warn(`[dsh-notify] 订阅会话列表失败：URL 已保留，刷新可重试`);
						return;
					}
					inFlight = () => {
						clearTimeout(timer);
						if (unsub !== void 0) unsub();
					};
				};
				attempt();
				window.addEventListener("hashchange", attempt);
				return () => {
					window.removeEventListener("hashchange", attempt);
					inFlight?.();
				};
			}, "dsh-notify: session deep-link");
		}
		//#endregion
		//#region src/client/navigation.ts
		/**
		* 造一个会话打开器：优先 `uiWorkspace.openSession`，回落旧版
		* `sessions.open`（更早的 DSH 版本），两者都不可用时返回 `false` 而非抛错。
		*
		* @param ctx - client root context（用于运行期解析服务）。
		* @returns 打开器；每次调用都重新解析服务，见模块头的激活顺序说明。
		*/
		function createOpenSession(ctx) {
			return (sessionId) => {
				const workspace = ctx.get("uiWorkspace");
				if (typeof workspace?.openSession === "function") try {
					workspace.openSession(sessionId);
					return true;
				} catch {
					return false;
				}
				const sessions = ctx.get("sessions");
				if (typeof sessions?.open === "function") try {
					sessions.open(sessionId);
					return true;
				} catch {
					return false;
				}
				return false;
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** locale 词条 namespace（与 host Config 的 entry id `dsh-notify` 是两件事）。 */
		const NS = "notify";
		/** 包名（`plugins.bundle.config` 的 key：bundle 的 package name）。 */
		const PACKAGE_NAME = "@bittersmilezzz/dsh-notify";
		const inject = [
			"slots",
			"locale",
			"configForms"
		];
		function apply(ctx) {
			ctx.effect(() => bindConfigScope(ctx), "dsh-notify: config form sync");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-notify: dictionaries");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "@bittersmilezzz/dsh-notify";
				tag.dataset.pluginCss = "@bittersmilezzz/dsh-notify/client";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "dsh-notify: styles");
			const locale = ctx.locale;
			const t = locale.bind(NS);
			const runtime = {
				config: () => ({ ...config }),
				t,
				activeLocale: () => locale.getLocale().active
			};
			ctx.effect(() => mountSoundWarmup(), "dsh-notify: sound warmup");
			const openSession = createOpenSession(ctx);
			applyNotifications(ctx, runtime, openSession);
			const card = (props) => react_jsx_runtime.jsx(NotifySettingsCard, {
				t,
				view: props?.view
			});
			ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: PACKAGE_NAME,
				locale: NS
			}, card));
			applySessionDeepLink(ctx, openSession);
		}
		const name = "dsh-notify";
		//#endregion
		exports.apply = apply;
		exports.en = en;
		exports.inject = inject;
		exports.name = name;
		exports.zh = zh;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map