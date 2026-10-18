/**
 * 浏览器半区的测试台：把 `lib/client.js`（window.__ModuleLoader__ 闭包工厂产物）
 * 在纯 Node 里加载起来，配一套最小可观察的假环境，让通知控制器的行为可以被
 * 直接断言——而不是只测纯函数、把真正的投递逻辑留在测试之外。
 *
 * 假环境只替换「浏览器提供的东西」（Notification、document、window、navigator、
 * react 运行时），Cordis 侧只提供控制器真正调用的那几个方法；任何未提供的
 * 依赖都会立刻抛错（宁可测试台崩，也不要静默通过）。
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..')

/** 一条被记录的假通知。 */
class FakeNotification {
  static permission = 'granted'
  static instances = []
  static requestPermission = async () => FakeNotification.permission

  constructor(title, options = {}) {
    this.title = title
    this.options = options
    this.closed = false
    this.onclick = null
    this.onclose = null
    this.onerror = null
    FakeNotification.instances.push(this)
  }

  close() {
    this.closed = true
    this.onclose?.()
  }

  /** 模拟用户点击（测试用）。 */
  click() { this.onclick?.() }
}

/** 极简 JSX 运行时（控制器在 apply 时只创建 card 元素，不渲染）。 */
const fakeJsxRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
  Fragment: Symbol('Fragment'),
}

/** bundle 只 require 一次：工厂函数每次调用产出一个全新的模块实例。 */
let bundleFactory

/**
 * 装好浏览器全局并加载 client bundle（每调用一次得到一个全新的模块实例）。
 * @param {{permission?: string, userAgent?: string, platform?: string}} [options] - 假通知权限与平台串。
 * @returns {{exports: object, notifications: typeof FakeNotification, globals: object}}
 */
export function loadClientBundle(options = {}) {
  const saved = new Map()
  const install = (key, value) => {
    if (!saved.has(key)) saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }

  FakeNotification.permission = options.permission ?? 'granted'
  FakeNotification.instances = []
  FakeNotification.requestPermission = async () => FakeNotification.permission

  const listeners = new Map()
  const windowStub = {
    __ModuleLoader__: { load: ({ factory }) => { bundleFactory = factory } },
    addEventListener: (type, fn) => { listeners.set(type, fn) },
    removeEventListener: (type) => { listeners.delete(type) },
    dispatchEvent: () => true,
    focus: () => { windowStub.focused = true },
    focused: false,
    // deep-link 模块在 apply 时读 location/history：给一个无 session 痕迹的空地址。
    location: { href: 'http://localhost/', search: '', hash: '' },
    history: { replaceState: () => {} },
  }
  const head = []
  const documentStub = {
    visibilityState: 'visible',
    hasFocus: () => true,
    head: { appendChild: (node) => { head.push(node) } },
    createElement: () => ({ dataset: {}, textContent: '', remove: () => {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  }

  install('window', windowStub)
  install('document', documentStub)
  install('navigator', {
    userAgent: options.userAgent ?? 'test-agent',
    platform: options.platform ?? 'MacIntel',
  })
  install('Notification', FakeNotification)
  if (typeof globalThis.CustomEvent === 'undefined') {
    install('CustomEvent', class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail } })
  }

  if (bundleFactory === undefined) {
    const path = join(root, 'lib', 'client.js')
    delete require.cache[require.resolve(path)]
    require(path)
    if (typeof bundleFactory !== 'function') throw new Error('client bundle did not register a factory')
  }

  const stubRequire = (specifier) => {
    if (specifier === 'react') return { useEffect: () => {}, useState: (v) => [typeof v === 'function' ? v() : v, () => {}], useReducer: (r) => [r(0), () => {}] }
    if (specifier === 'react/jsx-runtime') return fakeJsxRuntime
    if (specifier === '@deepseek-ai/dsh-client-ui-primitives') {
      return { Switch: () => null, IconChevronDownOutlineRegular: () => null }
    }
    throw new Error(`unexpected external module: ${specifier}`)
  }

  return {
    exports: bundleFactory(stubRequire),
    notifications: FakeNotification,
    globals: { window: windowStub, document: documentStub },
    restore: () => {
      for (const [key, descriptor] of saved) {
        if (descriptor === undefined) delete globalThis[key]
        else Object.defineProperty(globalThis, key, descriptor)
      }
    },
  }
}

/**
 * 造一个只实现控制器真正调用面的假 client context。
 * @param {{config?: object}} [options] - 初始 host 配置快照。
 * @returns {{ctx: object, uiSession: object, sessions: object, remote: object, pushed: object}}
 */
export function makeClientContext(options = {}) {
  const state = {
    config: {
      enabled: true, approval: true, question: true, turn: true, sessionDone: true,
      error: true, subagent: false, sound: true, summary: true,
      quietHours: false, quietStart: '22:00', quietEnd: '08:00',
      ...(options.config ?? {}),
    },
  }
  const sessions = {
    rows: [],
    ids: [],
    opened: [],
    listListeners: new Set(),
    list: {
      getSnapshot: () => ({
        ids: [...sessions.ids],
        byId: Object.fromEntries(sessions.rows.map((row) => [row.id, row])),
      }),
      subscribe: (listener) => { sessions.listListeners.add(listener); return () => sessions.listListeners.delete(listener) },
    },
    open: (id) => { sessions.opened.push(id) },
  }
  const statusListeners = new Set()
  let snapshot = new Map()
  const uiSession = {
    sessionStatus: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => { statusListeners.add(listener); return () => statusListeners.delete(listener) },
    },
  }
  const errorListeners = new Set()
  const remote = {
    $on: (event, listener) => {
      if (event !== 'api-session/error') throw new Error(`unexpected remote event: ${event}`)
      errorListeners.add(listener)
      return () => errorListeners.delete(listener)
    },
  }
  const effects = []
  const configListeners = new Set()
  const form = {
    getSnapshot: () => ({ value: { ...state.config } }),
    subscribe: (listener) => { configListeners.add(listener); return () => configListeners.delete(listener) },
    set: async (field, value) => { state.config[field] = value; for (const l of configListeners) l(); return true },
  }
  const ctx = {
    effect: (fn) => { effects.push(fn()); return () => {} },
    get: (name) => ({ sessions, uiSession, remote })[name],
    slots: { inject: (_name, cb) => cb(), register: () => () => {} },
    locale: {
      register: () => () => {},
      bind: () => (key) => key,
      getLocale: () => ({ active: 'zh' }),
    },
    configForms: { get: () => form },
  }

  return {
    ctx,
    sessions,
    remote,
    state,
    effects,
    /** 设置会话列表（触发 list 订阅者）。 */
    setSessions(rows) {
      sessions.rows = rows
      sessions.ids = rows.map((row) => row.id)
      for (const listener of sessions.listListeners) listener()
    },
    /** 推送一份会话状态快照（触发 status 订阅者）。 */
    pushStatus(entries) {
      snapshot = new Map(Object.entries(entries))
      for (const listener of statusListeners) listener()
    },
    /** 推送一条会话错误。 */
    pushError(sessionId, message) {
      for (const listener of errorListeners) listener(sessionId, message)
    },
    /** 改写 host 配置并广播（模拟设置卡拨动开关）。 */
    setConfig(patch) {
      Object.assign(state.config, patch)
      for (const listener of configListeners) listener()
    },
  }
}

export { FakeNotification }
