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
			notifySoundDesc: "弹出通知时播放提示音，四类通知音效各不相同",
			notifyTest: "试听",
			notifyPermTitle: "通知权限",
			notifyPermDesc: "若收不到系统通知，请在系统设置中允许「终端」/宿主 App 的通知",
			notifyPermOpen: "去系统设置开启"
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
			notifySoundDesc: "Play a distinct sound for each notification type",
			notifyTest: "Preview",
			notifyPermTitle: "Notification permission",
			notifyPermDesc: "If notifications don't appear, allow notifications for the Terminal / host app in System Settings",
			notifyPermOpen: "Open System Settings"
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
`;
		//#endregion
		//#region src/client/config.ts
		/** 配置默认值（与 host schema 的 default 一致）。 */
		const DEFAULTS = {
			enabled: true,
			approval: true,
			turn: true,
			sessionDone: true,
			error: true,
			sound: true
		};
		/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
		const config = { ...DEFAULTS };
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
				if (value !== void 0 && typeof value === "object") {
					for (const key of Object.keys(DEFAULTS)) {
						const next = value[key];
						if (typeof next === "boolean") config[key] = next;
					}
					announce();
				}
			};
			const unsub = scope.subscribe(applySnapshot);
			applySnapshot();
			return unsub;
		}
		/**
		* 更新一个配置字段：改本地快照 → 广播 → 写 host settings。
		* @param field - 配置字段名。
		* @param mutator - 修改快照的闭包（同步执行后读取新值写 host）。
		*/
		function setConfig(field, mutator) {
			mutator();
			announce();
			if (notifyScope !== void 0) notifyScope.set(field, config[field]).catch(() => {
				window.dispatchEvent(new CustomEvent("dsh-notify:config-error", { detail: { field } }));
			});
		}
		//#endregion
		//#region src/client/sound.ts
		/**
		* dsh-notify — notification sounds (Web Audio synthesis).
		*
		* 四类通知各配一种音效（频率/时长/波形不同，便于区分）。AudioContext
		* 懒创建，首次用户交互时预热——否则后台页面无法出声。声音开关由
		* 配置快照（config.sound）控制。
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
						audioCtx.close();
					} catch {}
					audioCtx = null;
				}
				audioReady = false;
			};
		}
		function tone(freq, start, dur, type = "sine", gain = .16) {
			if (audioCtx === null) return;
			const t0 = audioCtx.currentTime + start;
			const osc = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			osc.type = type;
			osc.frequency.value = freq;
			g.gain.setValueAtTime(1e-4, t0);
			g.gain.exponentialRampToValueAtTime(gain, t0 + .02);
			g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
			osc.connect(g).connect(audioCtx.destination);
			osc.start(t0);
			osc.stop(t0 + dur + .05);
		}
		const SOUND_PATTERNS = {
			approval: () => {
				tone(988, 0, .16, "square", .1);
				tone(988, .2, .16, "square", .1);
				tone(740, .4, .24, "square", .1);
			},
			question: () => {
				tone(659, 0, .16);
				tone(880, .2, .3);
			},
			turn: () => {
				tone(523, 0, .16);
			},
			sessionDone: () => {
				tone(523, 0, .16);
				tone(659, .18, .16);
				tone(784, .36, .32);
			}
		};
		/** 播放一类通知音效（受 config.sound 开关控制）。 */
		function playSound(kind) {
			if (!config.sound) return;
			if (!ensureAudio()) return;
			SOUND_PATTERNS[kind]();
		}
		//#endregion
		//#region src/client/settings-card.tsx
		/**
		* dsh-notify — settings card (settings.plugin.item, key: 'notify').
		*
		* 「设置 → 插件 → 配置」下的折叠卡片：桌面通知开关分组 + 试听 + 权限入口。
		* 所有开关读写 config 快照（host settings 为权威源）；声音试听走 sound.ts。
		*/
		/** 一个开关行。 */
		function ToggleRow({ title, desc, checked, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshn-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshn-rowText",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshn-rowTitle",
						children: title
					}), desc ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dshn-rowDesc",
						children: desc
					}) : null]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					className: "dshn-field",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked,
						onChange
					})
				})]
			});
		}
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
				const onConfig = () => force();
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
						children: t("notifyTitle")
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
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dshn-rowDesc",
										children: t("notifySoundDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dshn-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: config.sound,
										onChange: () => setConfig("sound", () => {
											config.sound = !config.sound;
										})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshn-button",
										onClick: () => playSound("sessionDone"),
										children: t("notifyTest")
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							})
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
		* 处理 ?session= deep-link。
		* @param ctx - client root context。
		*/
		function applySessionDeepLink(ctx) {
			ctx.effect(() => {
				const sessionId = new URLSearchParams(window.location.search).get("session");
				if (sessionId === null || sessionId === "") return () => {};
				const sessions = ctx.sessions;
				const clearParam = () => {
					const url = new URL(window.location.href);
					url.searchParams.delete("session");
					window.history.replaceState({}, "", url);
				};
				if (sessions.list.getSnapshot().byId[sessionId] !== void 0) {
					sessions.open(sessionId);
					clearParam();
					return () => {};
				}
				const timer = window.setTimeout(() => {
					unsub();
					clearParam();
				}, LINK_TIMEOUT_MS);
				const unsub = sessions.list.subscribe(() => {
					if (sessions.list.getSnapshot().byId[sessionId] === void 0) return;
					clearTimeout(timer);
					unsub();
					sessions.open(sessionId);
					clearParam();
				});
				return () => {
					clearTimeout(timer);
					unsub();
				};
			}, "dsh-notify: session deep-link");
		}
		//#endregion
		//#region src/client/index.ts
		const NS = "notify";
		const inject = [
			"slots",
			"locale",
			"sessions",
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