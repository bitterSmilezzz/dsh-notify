window.__ModuleLoader__.load({
	id: "dsh-notify",
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
		//#region src/client/locales.ts
		/**
		* dsh-notify — locale dictionaries (namespace `notify`).
		* Simplified Chinese is the key-set source of truth; the English dictionary is
		* checked complete against it. Product copy is Chinese-first per repo style.
		*/
		const zh = {
			masterTitle: "桌面通知",
			masterDesc: "审批/轮次完成/会话完成/出错时的系统级通知，点击可跳转会话",
			groupNotify: "桌面通知",
			notifyTitle: "桌面通知",
			notifyDesc: "你在其他标签页时弹出系统通知",
			notifyApproval: "需要审批时提醒",
			notifyTurn: "轮次完成时提醒",
			notifySessionDone: "后台会话完成时提醒",
			notifyError: "出错时提醒",
			notifySound: "通知声音",
			notifySoundDesc: "开=播提示音；关=静音（macOS 侧为系统默认音，无法真静音）",
			notifyTest: "试听",
			notifyPermTitle: "通知权限",
			notifyPermDesc: "若收不到系统通知，请在系统设置中允许「终端」/宿主 App 的通知",
			notifyPermOpen: "去系统设置开启",
			notifySaveFailed: "通知设置保存失败——可能不会在重启后保留，请重试",
			overlapTitle: "与其他通知源冲突时",
			overlapDesc: "官方或生态其他插件提供通知时：自动暂停本插件可避免重复弹窗；「始终用本插件」则忽略检测。自动暂停时会弹出系统提示",
			overlapAuto: "自动暂停（推荐）",
			overlapMine: "始终用本插件"
		};
		const en = {
			masterTitle: "Desktop notifications",
			masterDesc: "System notifications for approvals / turn & session finish / errors, click to jump to the session",
			groupNotify: "Desktop notifications",
			notifyTitle: "Desktop notifications",
			notifyDesc: "Show system notifications while you are on another tab",
			notifyApproval: "Remind on approval requests",
			notifyTurn: "Remind on turn finish",
			notifySessionDone: "Remind on background session finish",
			notifyError: "Remind on errors",
			notifySound: "Notification sound",
			notifySoundDesc: "On = play a sound; Off = silent (macOS falls back to system default sound, cannot truly silence)",
			notifyTest: "Preview",
			notifyPermTitle: "Notification permission",
			notifyPermDesc: "If notifications don't appear, allow notifications for the Terminal / host app in System Settings",
			notifyPermOpen: "Open System Settings",
			notifySaveFailed: "Failed to save notification settings — they may not persist after restart. Please retry.",
			overlapTitle: "When another notifier exists",
			overlapDesc: "When the official app or another plugin provides notifications: auto-pause this plugin to avoid duplicates, or always use this plugin. Auto-pause shows a system notice",
			overlapAuto: "Auto-pause (recommended)",
			overlapMine: "Always use this plugin"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* dsh-notify — settings card styles (single `<style data-plugin="dsh-notify">`
		* tag, injected by the client apply and removed again on unload). Class names
		* are prefixed `dshn-` so they cannot collide with other plugins' styles.
		* Colors come only from `--dsw-*` theme tokens.
		*/
		const CSS = `
.dshn-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;overflow:hidden;list-style:none}
.dshn-header{width:100%;box-sizing:border-box;display:flex;align-items:center;gap:12px;border:0;background:none;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;padding:14px 16px;cursor:pointer}
.dshn-header:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshn-headtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dshn-name{font-size:15px;line-height:1.4;font-weight:600}
.dshn-desc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.dshn-chevron{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);transform:rotate(0deg);transition:transform .15s ease}
.dshn-chevron.dshn-open{transform:rotate(180deg)}
.dshn-body{box-sizing:border-box;border-top:1px solid var(--dsw-alias-border-l2);padding:4px 16px 14px;display:grid;gap:4px}
.dshn-group{display:grid;gap:4px;padding-top:10px}
.dshn-groupTitle{margin:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.04em}
.dshn-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dshn-row:last-child{border-bottom:0}
.dshn-rowText{flex:1;min-width:0;display:grid;gap:2px}
.dshn-rowTitle{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}
.dshn-rowDesc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px}
.dshn-field{display:flex;align-items:center;gap:8px}
.dshn-field input[type=checkbox]{flex:none;width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary)}
.dshn-button{appearance:none;height:30px;border:1px solid transparent;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font:inherit;font-size:13px;line-height:1.5;padding:0 14px;cursor:pointer}
.dshn-button:hover:not(:disabled){filter:brightness(1.1)}
.dshn-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dshn-button:disabled{opacity:.4;cursor:default}
.dshn-status{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshn-status.dshn-err{color:var(--dsw-alias-state-danger-fill,#F87171)}
.dshn-overlapRow{flex-wrap:wrap}
.dshn-overlap{flex-wrap:wrap;justify-content:flex-end}
.dshn-overlapItem{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px;cursor:pointer}
.dshn-overlapItem:has(input:checked){border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.dshn-overlapItem input[type=radio]{margin:0;accent-color:var(--dsw-alias-brand-primary)}
`;
		/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
		const config = {
			enabled: true,
			approval: true,
			turn: true,
			sessionDone: true,
			error: true,
			sound: true,
			overlap: "auto"
		};
		/** host settings scope 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
		let notifyScope;
		/** 广播配置变更（控制器/设置卡片监听，驱动重渲染与动态注册）。 */
		function announce() {
			window.dispatchEvent(new CustomEvent("dsh-notify:config", { detail: { ...config } }));
		}
		/**
		* 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写
		* 本地快照并广播。
		* @param ctx - client root context。
		* @returns 订阅 disposer（随 fiber 清理）。
		*/
		function bindConfigScope(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: "notify" });
			notifyScope = scope;
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
					if (next.overlap === "auto" || next.overlap === "mine") config.overlap = next.overlap;
					announce();
				}
			};
			const unsub = scope.subscribe(applySnapshot);
			applySnapshot();
			return () => {
				unsub();
				if (notifyScope === scope) notifyScope = void 0;
			};
		}
		/**
		* 更新一个配置字段：改本地快照 → 广播 → 写 host settings。
		* @param field - 配置字段名。
		* @param mutator - 修改快照的闭包（同步执行后读取新值写 host）。
		*/
		function setConfig(field, mutator) {
			mutator();
			announce();
			if (notifyScope === void 0) return;
			const fail = () => {
				window.dispatchEvent(new CustomEvent("dsh-notify:config-error", { detail: { field } }));
			};
			try {
				notifyScope.set(field, config[field]).catch(fail);
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
		* dsh-notify — settings card (settings.plugin.item, key: 'notify').
		*
		* 「设置 → 插件 → 配置」下的折叠卡片：桌面通知开关分组 + 试听 + 权限入口。
		* 所有开关读写 config 快照（host settings 为权威源）；声音试听走 sound.ts。
		*/
		/** 一个开关行。label 包住整行：点击行内任意处（标题/描述/空白）都可切换，
		*  而不是只点 checkbox 那一小块；Tab 焦点落在 input 上，Enter/Space 切换。 */
		function ToggleRow({ title, desc, checked, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
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
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						role: "switch",
						"aria-label": title,
						"aria-checked": checked,
						checked,
						onChange
					})
				})]
			});
		}
		/** 宿主是否为 macOS（用于「去系统设置开启」入口的可见性判断：
		*  x-apple.systempreferences 深链只在 macOS 有效，Windows/Linux 展示了也无用）。 */
		const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
		/**
		* 通知设置卡片主体。
		* @param props - 注册时的 locale 绑定（闭包传入）。
		* @returns 折叠卡片。
		*/
		function NotifySettingsCard({ t }) {
			const [open, setOpen] = react.useState(false);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dshn-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dshn-header",
					"aria-expanded": open,
					onClick: () => setOpen(!open),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshn-headtext",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshn-name",
							children: t("masterTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshn-desc",
							children: t("masterDesc")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						className: "dshn-chevron" + (open ? " dshn-open" : ""),
						width: 16,
						height: 16,
						viewBox: "0 0 16 16",
						fill: "none",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M3.5 5.75 8 10.25l4.5-4.5",
							stroke: "currentColor",
							strokeWidth: 1.5,
							strokeLinecap: "round",
							strokeLinejoin: "round"
						})
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshn-body",
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
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										role: "switch",
										"aria-label": t("notifySound"),
										"aria-checked": config.sound,
										checked: config.sound,
										onChange: () => setConfig("sound", () => {
											config.sound = !config.sound;
										})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshn-button",
										onClick: () => playSound(true),
										children: t("notifyTest")
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshn-row dshn-overlapRow",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dshn-rowText",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshn-rowTitle",
										children: t("overlapTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dshn-rowDesc",
										children: t("overlapDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dshn-field dshn-overlap",
									role: "radiogroup",
									"aria-label": t("overlapTitle"),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "dshn-overlapItem",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "radio",
											name: "dshn-overlap",
											value: "auto",
											checked: config.overlap === "auto",
											onChange: () => setConfig("overlap", () => {
												config.overlap = "auto";
											})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("overlapAuto") })]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "dshn-overlapItem",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "radio",
											name: "dshn-overlap",
											value: "mine",
											checked: config.overlap === "mine",
											onChange: () => setConfig("overlap", () => {
												config.overlap = "mine";
											})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("overlapMine") })]
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
				}) : null]
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
		* @param ctx - client root context。
		*/
		function applySessionDeepLink(ctx) {
			ctx.effect(() => {
				const sessionId = sessionIdFromLocation(window.location.search, window.location.hash);
				if (sessionId === null) return () => {};
				const sessions = ctx.get("sessions");
				if (typeof sessions?.open !== "function" || typeof sessions?.list?.subscribe !== "function" || typeof sessions?.list?.getSnapshot !== "function") return () => {};
				/** 打开会话并清除 deep-link 痕迹。open 失败（会话已销毁等）也清：URL 残留会导致每次刷新重复空等。 */
				const openAndClear = () => {
					try {
						sessions.open(sessionId);
					} catch {}
					clearSessionParam();
				};
				if (sessions.list.getSnapshot().byId?.[sessionId] !== void 0) {
					openAndClear();
					return () => {};
				}
				let unsub;
				const timer = window.setTimeout(() => {
					if (unsub === void 0) return;
					unsub();
					clearSessionParam();
				}, LINK_TIMEOUT_MS);
				try {
					unsub = sessions.list.subscribe(() => {
						if (sessions.list.getSnapshot().byId?.[sessionId] === void 0) return;
						clearTimeout(timer);
						unsub?.();
						openAndClear();
					});
				} catch {
					clearTimeout(timer);
					return () => {};
				}
				return () => {
					clearTimeout(timer);
					if (unsub !== void 0) unsub();
				};
			}, "dsh-notify: session deep-link");
		}
		//#endregion
		//#region src/client/index.ts
		const NS = "notify";
		const inject = [
			"slots",
			"locale",
			"settingsScope"
		];
		function apply(ctx) {
			ctx.effect(() => bindConfigScope(ctx), "dsh-notify: settings scope sync");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-notify: dictionaries");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-notify";
				tag.dataset.pluginCss = "dsh-notify";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "dsh-notify: styles");
			ctx.effect(() => mountSoundWarmup(), "dsh-notify: sound warmup");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: NS,
				locale: NS
			}, () => react_jsx_runtime.jsx(NotifySettingsCard, { t })));
			applySessionDeepLink(ctx);
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