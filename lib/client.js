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
		/**
		* dsh-notify — locale dictionaries (namespace `notify`).
		* Simplified Chinese is the key-set source of truth; the English dictionary is
		* checked complete against it (test/config-parity.test.mjs 钉住 key 集一致).
		* Product copy is Chinese-first per repo style.
		*/
		const zh = {
			masterTitle: "桌面通知",
			masterDesc: "审批/轮次完成/会话完成/出错时弹系统通知，点击跳转对应会话（macOS 可点击需 terminal-notifier；Linux 仅展示）",
			groupNotify: "桌面通知",
			notifyTitle: "桌面通知",
			notifyDesc: "Agent 轮次/审批/错误时弹系统通知",
			notifyApproval: "需要审批时提醒",
			notifyTurn: "轮次完成时提醒",
			notifySessionDone: "后台会话完成时提醒",
			notifyError: "出错时提醒",
			notifySound: "通知声音",
			notifySoundDesc: "开=播放提示音；关=静音（macOS 无法真静音，回落为系统默认音；Linux 由系统控制）",
			notifyTest: "试听",
			notifyPermTitle: "通知权限",
			notifyPermDesc: "若收不到系统通知，请在系统设置中允许「终端」/宿主 App 的通知",
			notifyPermOpen: "去系统设置开启",
			notifySaveFailed: "通知设置保存失败——可能不会在重启后保留，请重试",
			expand: "展开设置",
			collapse: "收起设置"
		};
		const en = {
			masterTitle: "Desktop notifications",
			masterDesc: "System notifications on approvals / turn & session finish / errors; clicking jumps to the session (clickable on macOS only with terminal-notifier; display-only on Linux)",
			groupNotify: "Desktop notifications",
			notifyTitle: "Desktop notifications",
			notifyDesc: "Show system notifications on agent turns, approvals, and errors",
			notifyApproval: "Remind on approval requests",
			notifyTurn: "Remind on turn finish",
			notifySessionDone: "Remind on background session finish",
			notifyError: "Remind on errors",
			notifySound: "Notification sound",
			notifySoundDesc: "On = play a sound; Off = silent (macOS cannot truly silence, falls back to the system default sound; Linux is controlled by the system)",
			notifyTest: "Preview",
			notifyPermTitle: "Notification permission",
			notifyPermDesc: "If notifications don't appear, allow notifications for the Terminal / host app in System Settings",
			notifyPermOpen: "Open System Settings",
			notifySaveFailed: "Failed to save notification settings — they may not persist after restart. Please retry.",
			expand: "Show settings",
			collapse: "Hide settings"
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
.dshn-status{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshn-status.dshn-err{color:var(--dsw-alias-label-error)}
`;
		/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
		const config = {
			enabled: true,
			approval: true,
			turn: true,
			sessionDone: true,
			error: true,
			sound: true
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
					if (typeof next.turn === "boolean") config.turn = next.turn;
					if (typeof next.sessionDone === "boolean") config.sessionDone = next.sessionDone;
					if (typeof next.error === "boolean") config.error = next.error;
					if (typeof next.sound === "boolean") config.sound = next.sound;
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
		//#region src/client/sound.ts
		/**
		* dsh-notify — 试听提示音（Web Audio 合成）。
		*
		* 单一上行三连音，仅供设置卡片「试听」按钮使用。桌面通知本身的提示音由
		* host 侧系统通知携带（macOS Glass / Windows toast），浏览器侧不重复播报，
		* 因此不再维护按事件分类的 pattern 集与节流表（无事件触发路径，属死代码，
		* 审查轮已删）。AudioContext 懒创建，首次用户交互时预热——否则后台页面
		* 无法出声。声音开关由配置快照（config.sound）控制。
		*/
		let audioCtx = null;
		let audioReady = false;
		function ensureAudio() {
			try {
				if (typeof window === "undefined") return false;
				const AC = window.AudioContext || window.webkitAudioContext;
				if (!AC) return false;
				if (audioCtx === null) audioCtx = new AC();
				if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
				audioReady = true;
			} catch {
				audioReady = false;
			}
			return audioReady;
		}
		/** 首次用户交互时预热 AudioContext（后台页面弹出的通知才能出声）。 */
		function warmAudio() {
			if (!audioReady) ensureAudio();
		}
		/**
		* 挂载音频预热：注册 document 级预热监听，返回 disposer 移除监听并关闭
		* AudioContext。由插件 fiber 的 ctx.effect 挂载，避免模块副作用在插件
		* update/HMR 时残留（每次 update 旧监听不清理会重复累积）。
		*/
		function mountSoundWarmup() {
			if (typeof document !== "undefined") {
				document.addEventListener("pointerdown", warmAudio, { passive: true });
				document.addEventListener("keydown", warmAudio, { passive: true });
			}
			return () => {
				if (typeof document !== "undefined") {
					document.removeEventListener("pointerdown", warmAudio);
					document.removeEventListener("keydown", warmAudio);
				}
				if (audioCtx !== null) {
					try {
						audioCtx.close().catch(() => {});
					} catch {}
					audioCtx = null;
				}
				audioReady = false;
			};
		}
		function tone(freq, start, dur, type = "sine", gain = .16) {
			if (audioCtx === null) return;
			const safeDur = Math.max(dur, .05);
			const safeGain = Math.max(gain, 1e-4);
			const t0 = audioCtx.currentTime + start;
			const osc = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			osc.type = type;
			osc.frequency.value = freq;
			g.gain.setValueAtTime(1e-4, t0);
			g.gain.exponentialRampToValueAtTime(safeGain, t0 + .02);
			g.gain.exponentialRampToValueAtTime(1e-4, t0 + safeDur);
			osc.connect(g).connect(audioCtx.destination);
			osc.start(t0);
			osc.stop(t0 + safeDur + .05);
			osc.addEventListener("ended", () => {
				try {
					g.disconnect();
				} catch {}
			}, { once: true });
		}
		/** 试听音效：上行三连音（523 → 659 → 784）。 */
		function previewPattern() {
			tone(523, 0, .16);
			tone(659, .18, .16);
			tone(784, .36, .32);
		}
		/**
		* 播放试听音效（受 config.sound 开关控制）。
		* force=true 时无视声音开关直接播放——设置卡片的「试听」走这个分支：
		* 试听的目的就是让用户在关闭声音后仍能确认音效，不应被开关静默吞掉。
		*/
		function playSound(force = false) {
			if (!force && !config.sound) return;
			if (!ensureAudio()) return;
			previewPattern();
		}
		//#endregion
		//#region src/client/settings-card.tsx
		/**
		* dsh-notify — settings card (plugins.bundle.config).
		*
		* 渲染在插件详情页（侧边栏 Plugins 面板 → 本插件 → 配置表单）：页面自己画
		* 标题/图标/面包屑，occupant 按 `view: 'summary' | 'page'` 渲染一行摘要或表单。
		* `view` 缺省（如更早的运行时）时退回自绘折叠外壳兜底。旧契约
		* `settings.plugin.item` 已在 dsh 0.1.6-alpha.2 退役（commit 90af3110b7），
		* 不再注册（见 client/index.ts）。
		*
		* 开关走 config 快照（host settings 为权威源），拨动即写 host（无暂存/保存步）：
		* 开关的意图是即时的，不存在官方 staged 文本字段那种「未预览的写入」问题。
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
		/** 宿主是否为 macOS（用于「去系统设置开启」入口的可见性判断：
		*  x-apple.systempreferences 深链只在 macOS 有效，Windows/Linux 展示了也无用）。 */
		const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
		/**
		* 通知设置表单主体：桌面通知开关分组 + 试听 + 权限入口。
		* @param props.t - locale 绑定的翻译函数。
		* @returns 表单内容（不含外壳，外壳由调用方按契约决定）。
		*/
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshn-form",
				children: [saveFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dshn-status dshn-err",
					role: "alert",
					children: t("notifySaveFailed")
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshn-group",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshn-groupTitle",
							children: t("groupNotify")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
							title: t("notifyTitle"),
							desc: t("notifyDesc"),
							checked: config.enabled,
							onChange: () => setConfig("enabled", () => {
								config.enabled = !config.enabled;
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
							title: t("notifyApproval"),
							checked: config.approval,
							onChange: () => setConfig("approval", () => {
								config.approval = !config.approval;
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
							title: t("notifyTurn"),
							checked: config.turn,
							onChange: () => setConfig("turn", () => {
								config.turn = !config.turn;
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
							title: t("notifySessionDone"),
							checked: config.sessionDone,
							onChange: () => setConfig("sessionDone", () => {
								config.sessionDone = !config.sessionDone;
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
							title: t("notifyError"),
							checked: config.error,
							onChange: () => setConfig("error", () => {
								config.error = !config.error;
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshn-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshn-rowText",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshn-rowTitle",
									children: t("notifySound")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshn-rowDesc",
									children: t("notifySoundDesc")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshn-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									checked: config.sound,
									onChange: () => setConfig("sound", () => {
										config.sound = !config.sound;
									}),
									label: t("notifySound")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dshn-button",
									onClick: () => playSound(true),
									children: t("notifyTest")
								})]
							})]
						}),
						IS_MAC ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshn-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshn-rowText",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshn-rowTitle",
									children: t("notifyPermTitle")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dshn-rowDesc",
									children: t("notifyPermDesc")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dshn-field",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dshn-button",
									onClick: () => {
										window.open("x-apple.systempreferences:com.apple.Notifications-Settings.extension", "_self");
									},
									children: t("notifyPermOpen")
								})
							})]
						}) : null
					]
				})]
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
		*/
		function applySessionDeepLink(ctx) {
			ctx.effect(() => {
				const sessions = ctx.get("sessions");
				if (typeof sessions?.open !== "function" || typeof sessions?.list?.subscribe !== "function" || typeof sessions?.list?.getSnapshot !== "function") return () => {};
				/** 打开会话并清除 deep-link 痕迹。open 失败（会话已销毁等）不清 URL：
				*  保留痕迹让用户可刷新/重试，console.warn 给出可见提示（不静默落首页）。 */
				const openAndClear = (sid) => {
					try {
						sessions.open(sid);
					} catch {
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
		//#region src/client/presence.ts
		/** 聚焦上报的精确路由（须与 host 侧 PRESENCE_ROUTE 一致）。 */
		const PRESENCE_ROUTE = "/api/dsh-notify/presence";
		/** 可见状态的续期间隔；host 侧 TTL（75s）是它的 2.5 倍。 */
		const HEARTBEAT_MS = 3e4;
		/**
		* 挂载聚焦上报：可见性变化时上报，可见期间定时续期。随 client fiber 卸载
		* 回收（移除监听 + 清定时器）。
		* @param ctx - client root context。
		*/
		function applyPresenceReporting(ctx) {
			ctx.effect(() => {
				let timer;
				const stopHeartbeat = () => {
					if (timer === void 0) return;
					window.clearInterval(timer);
					timer = void 0;
				};
				/** 上报一次；同步抛错与异步拒绝都静默（增益不是依赖）。 */
				const report = (visible) => {
					try {
						fetch(PRESENCE_ROUTE, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ visible })
						}).catch(() => {});
					} catch {}
				};
				/** 同步当前可见性：立即上报，并按需起停续期定时器。 */
				const sync = () => {
					const visible = document.visibilityState === "visible";
					report(visible);
					stopHeartbeat();
					if (visible) timer = window.setInterval(() => {
						report(true);
					}, HEARTBEAT_MS);
				};
				sync();
				document.addEventListener("visibilitychange", sync);
				return () => {
					document.removeEventListener("visibilitychange", sync);
					stopHeartbeat();
				};
			}, "dsh-notify: presence reporting");
		}
		//#endregion
		//#region src/client/index.ts
		/** 设置 namespace（host settings 的 `notify`）。 */
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
			ctx.effect(() => mountSoundWarmup(), "dsh-notify: sound warmup");
			const t = ctx.locale.bind(NS);
			const card = (props) => react_jsx_runtime.jsx(NotifySettingsCard, {
				t,
				view: props?.view
			});
			ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: PACKAGE_NAME,
				locale: NS
			}, card));
			applySessionDeepLink(ctx);
			applyPresenceReporting(ctx);
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