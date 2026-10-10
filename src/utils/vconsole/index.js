/**
 * 简易 vConsole —— 移动端网页调试面板
 *
 * 零依赖：样式运行时注入（一个 <style data-vconsole>），面板 DOM 用原生 API 拼，
 * 不走 Vue 模板、不依赖 scss / vue.config.js，任何文件 import 就能用。
 *
 * 四个面板：
 *   Log      拦截 console.log / info / warn / error / debug（多参数、对象、Error 都能看）
 *   Network  拦截 XMLHttpRequest + fetch，记录 method / 状态 / 耗时 / 头 / 响应体
 *   System   UA / 屏幕 / 视口 / DPR / 语言 / 网络 / 时区 / 当前地址
 *   Storage  localStorage / sessionStorage / cookie 查看与删除
 * 底部命令栏可直接执行 JS 表达式（↑↓ 翻历史），结果回写到 Log。
 *
 * ─────────────── 用法 ───────────────
 *   import VConsole from '@/utils/vconsole'
 *   VConsole.init()                        // 右下角出现悬浮球
 *   VConsole.init({ ball: false })         // 不要悬浮球，只用 API 打开
 *   VConsole.log('hi', { a: 1 })           // 主动写日志（Warn / error 同理）
 *   VConsole.show() / hide() / toggle() / clear() / destroy()
 *
 *   // 只在开发环境自动开启（推荐写在 main.js 里）
 *   if (process.env.NODE_ENV !== 'production') VConsole.init()
 *
 * ─────────────── 约定 ───────────────
 *  · 入口在模块作用域直接 install(Vue)（项目约定：入口即注册），import 之后
 *    组件里可用 this.$vconsole。
 *  · 生产环境不要开：它会替换 console / XHR / fetch，并且面板本身有体积。
 *  · destroy() 会把 console / XHR / fetch 原样还原、移除面板 DOM。
 */

import Vue from "vue";

/** 注入的 <style> 标签标识 */
export const VC_STYLE_TAG = "data-vconsole";
/** 面板 z-index（尽量压过业务浮层） */
const Z_BASE = 2147483600;

/* ------------------------------------------------------------------ *
 * 原生引用：拦截后要能调回原实现，同时防止自我递归
 * ------------------------------------------------------------------ */

const consoleRef = typeof console !== "undefined" ? console : null;

function noop() {}

function bindConsole(name) {
  const fn = consoleRef && consoleRef[name];
  return typeof fn === "function" ? fn.bind(consoleRef) : noop;
}

/** 原生 console 方法（拦截期间唯一出口） */
const nativeLog = {
  log: bindConsole("log"),
  info: bindConsole("info"),
  warn: bindConsole("warn"),
  error: bindConsole("error"),
  debug: bindConsole("debug"),
};

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"];

/* ------------------------------------------------------------------ *
 * 默认配置
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  ball: true, // 是否显示悬浮球
  position: { right: 12, bottom: 80 }, // 悬浮球 / 面板位置
  maxLogs: 800, // 日志上限（超出丢最早的）
  maxNetworks: 100, // 请求上限
  maxBody: 2000, // 文本 / 响应体截断长度
  captureConsole: true, // 拦截 console
  captureError: true, // 拦截 window.onerror / unhandledrejection
  captureNetwork: true, // 拦截 XHR / fetch
  keepConsole: false, // 是否同时输出到原生 console
  defaultTab: "log",
  theme: {}, // CSS 变量覆盖，见下方 THEME_VARS
};

const THEME_VARS = {
  bg: "--vc-bg",
  bg2: "--vc-bg-2",
  fg: "--vc-fg",
  dim: "--vc-dim",
  accent: "--vc-accent",
  warn: "--vc-warn",
  err: "--vc-err",
  ok: "--vc-ok",
};

/* ------------------------------------------------------------------ *
 * 状态
 * ------------------------------------------------------------------ */

const state = {
  inited: false,
  open: false,
  tab: "log",
  options: Object.assign({}, DEFAULTS),
  logs: [],
  networks: [],
  seq: 0, // 自增 id（日志 + 请求共用）
  badge: 0, // 未读 error / warn 数
  cmdHistory: [],
  cmdIndex: -1,
  el: {}, // DOM 引用
  saved: {}, // 被替换掉的原生方法
  bound: {}, // 事件处理函数（destroy 时要摘）
  building: false, // init 执行中（防止 ensureReady 递归）
  pendingInit: false, // 已挂过 DOMContentLoaded 等 body
};

/* ------------------------------------------------------------------ *
 * 容错取值器
 *   面板 DOM 与浏览器全局都可能不存在，比如：
 *     · 没 init 就调 API        → state.el 还是空对象
 *     · destroy() 之后          → el 被清空、root 已脱离文档
 *     · 脚本写在 <head> 同步执行 → document.body 还是 null
 *     · 跑在非浏览器环境(SSR/Node) → window / document 都没有
 *   下面这些取值器保证这些情况下「拿不到就安静退出」，永不抛 TypeError。
 * ------------------------------------------------------------------ */

/** 取面板元素；拿不到（未 init / 已 destroy / 已脱离文档）返回 null */
function elOf(name) {
  const el = state.el;
  const node = el && el[name];
  if (!node || node.nodeType !== 1) {
    return null;
  }
  // 被业务代码从 DOM 里摘走了 → 当成「没有面板」，别往野节点上写
  // （isConnected 老环境没有，undefined 时按可用处理）
  if (node.isConnected === false) {
    return null;
  }
  return node;
}

/** 取元素集合（navItems / tabs）；拿不到给空数组，调用方可放心 forEach */
function listOf(name) {
  const el = state.el;
  const arr = el && el[name];
  return Array.isArray(arr) ? arr : [];
}

/** 面板是否已真的建起来 */
function hasDom() {
  return !!elOf("root");
}

/** 没 init 就用到面板（show / toggle）时顺手初始化一次，别直接报错 */
function ensureReady() {
  if (state.inited || state.building) {
    return;
  }
  init();
}

/** decodeURIComponent 遇到坏字节会抛错，兜一层 */
function safeDecode(v) {
  try {
    return decodeURIComponent(v);
  } catch (e) {
    return v;
  }
}

/* ------------------------------------------------------------------ *
 * 格式化
 * ------------------------------------------------------------------ */

const pad = (n) => (n < 10 ? "0" + n : String(n));

function fmtTime(ts) {
  const d = new Date(ts);
  return (
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds()) +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}

function truncate(text, limit) {
  const max = limit || state.options.maxBody;
  const s = String(text);
  return s.length > max
    ? s.slice(0, max) + "\n… 已截断，共 " + s.length + " 字符"
    : s;
}

/** MDN 经典循环引用 replacer：用祖先栈判断真正的环 */
function circularReplacer(depth) {
  const ancestors = [];
  const maxDepth = typeof depth === "number" ? depth : 6;
  return function (key, value) {
    if (typeof value === "function")
      return "ƒ " + (value.name || "anonymous") + "()";
    if (typeof value === "bigint") return value.toString() + "n";
    if (value === undefined) return "undefined";
    if (typeof value !== "object" || value === null) return value;
    // 一直弹到「当前节点的父节点」
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this)
      ancestors.pop();
    if (ancestors.length > maxDepth) return "[Object]";
    if (ancestors.indexOf(value) !== -1) return "[Circular]";
    ancestors.push(value);
    return value;
  };
}

/** 判断是不是 Vue 2 实例（`_isVue` 挂在原型上，生产构建同样有） */
function isVueInstance(v) {
  return !!(v && typeof v === "object" && (v._isVue === true || (typeof v._uid === "number" && v.$options)));
}

/** 实例显示名：$options.name → 注册标签 → Root / Anonymous */
function vmDisplayName(vm) {
  const opts = vm.$options || {};
  if (opts.name) return opts.name;
  if (opts._componentTag) return opts._componentTag;
  if (vm.$vnode && vm.$vnode.tag) return String(vm.$vnode.tag).replace(/^vue-component-\d+-/, "");
  return vm.$parent ? "Anonymous" : "Root";
}

/** 实例短标记：`[Vue 名字 · uid:N]` */
function vmTag(vm) {
  return "[Vue " + vmDisplayName(vm) + " · uid:" + vm._uid + "]";
}

/** 单个值的短表示：长字符串、大对象、数组都压成一行，别把面板撑爆 */
function shortValue(v, depth) {
  const d = typeof depth === "number" ? depth : 0;
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  const t = typeof v;
  if (t === "string") {
    return v.length > 30
      ? JSON.stringify(v.slice(0, 30) + "…+" + (v.length - 30))
      : JSON.stringify(v);
  }
  if (t === "number" || t === "boolean") return String(v);
  if (t === "function") return "ƒ " + (v.name || "anonymous") + "()";
  if (t === "symbol") return v.toString();
  if (t === "bigint") return v.toString() + "n";
  if (v instanceof Error) return (v.name || "Error") + ": " + v.message;
  if (Array.isArray(v)) {
    if (d >= 1) return "[…×" + v.length + "]";
    return (
      "[" +
      v.slice(0, 4).map((x) => shortValue(x, d + 1)).join(", ") +
      (v.length > 4 ? ", …+" + (v.length - 4) : "") +
      "]"
    );
  }
  if (isVueInstance(v)) return vmTag(v);
  if (v.nodeType === 1) return "<" + v.tagName.toLowerCase() + ">";
  if (t === "object") {
    const keys = Object.keys(v);
    if (d >= 1) return "{…" + keys.length + "}";
    if (keys.length <= 4) {
      return "{" + keys.map((k) => k + ": " + shortValue(v[k], d + 1)).join(", ") + "}";
    }
    return "{…" + keys.length + " 个键}";
  }
  return String(v);
}

/** 键值块：每个键占一行，超过 max 行只列剩余键名 */
function keyLines(obj, max) {
  const keys = obj ? Object.keys(obj) : [];
  if (!keys.length) return ["  （无）"];
  const limit = max || 15;
  const lines = keys.slice(0, limit).map((k) => "  " + k + ": " + shortValue(obj[k]));
  if (keys.length > limit) {
    lines.push("  …还有 " + (keys.length - limit) + " 个键：" + keys.slice(limit).join(", "));
  }
  return lines;
}

/**
 * Vue 实例摘要。
 * 不能直接 JSON.stringify 整个实例 —— 几百个 `_` 开头的内部字段 + 满屏循环引用。
 * 只列开发者真正关心的两块：$props（生效值，并标出父组件真正传了哪几个）、$data。
 */
function formatVueInstance(vm) {
  const opts = vm.$options || {};
  const props = vm.$props || {};
  const passed = opts.propsData || {};
  const data = vm.$data || {};

  const lines = [vmTag(vm)];
  lines.push(
    "$props (" +
      Object.keys(props).length +
      ")" +
      (Object.keys(passed).length ? "  ← 父传: " + Object.keys(passed).join(", ") : "  ← 全走 default")
  );
  lines.push.apply(lines, keyLines(props, 12));
  lines.push("$data (" + Object.keys(data).length + ")");
  lines.push.apply(lines, keyLines(data, 15));
  return truncate(lines.join("\n"));
}

/* ---------- JSON 安全化 / 实例数组 ---------- */

const JSON_MAX_DEPTH = 8;
const JSON_MAX_ITEMS = 100;
const MAX_VM_IN_ARRAY = 5;

/**
 * 数组里（限深度 / 限个数）是否混着 Vue 实例。
 * `$findVm()` / `$getAllVm()` 返回的就是实例数组，是 vConsole 命令栏里最常见的用法。
 */
function hasVueInstance(arr, depth) {
  const d = depth || 0;
  if (d > 3) return false;
  const n = Math.min(arr.length, 60);
  for (let i = 0; i < n; i++) {
    const item = arr[i];
    if (isVueInstance(item)) return true;
    if (item && typeof item === "object" && Array.isArray(item) && hasVueInstance(item, d + 1)) return true;
  }
  return false;
}

/** 实例数组：逐个给 $props / $data 摘要（多于 MAX_VM_IN_ARRAY 个只列前几个） */
function formatVmArray(arr) {
  const n = Math.min(arr.length, MAX_VM_IN_ARRAY);
  const parts = [];
  for (let i = 0; i < n; i++) {
    parts.push((arr.length > 1 ? "#" + i + "  " : "") + formatArg(arr[i]));
  }
  if (arr.length > n) parts.push("… 还有 " + (arr.length - n) + " 个（用 [i] 取单个）");
  return truncate("[" + arr.length + " 项]\n" + parts.join("\n"));
}

/**
 * JSON 前的安全化：**实例一律换成短标记**。
 *
 * 为什么不能直接 `JSON.stringify(值)`：规范里序列化每个对象前会先读它的 `toJSON`
 * （而且这一步在 replacer 之前执行，replacer 拦不住），Vue 2 的 dev 代理对实例上
 * 不存在的属性会报
 *   [Vue warn]: Property or method "toJSON" is not defined on the instance but referenced during render
 * —— 于是只要值里混进 Vue 实例（$findVm() 的结果、store / props 里存着组件实例…），
 * 日志一刷就是一屏 warn，顺带把整个组件树（含 _data / _watcher / $parent 环路）序列化出来。
 *
 * 这里在限定的深度内把实例换成 `[Vue 名字 · uid:N]`，并顺手处理循环引用 / DOM / Error /
 * Date / RegExp（这些是 JSON.stringify 的常客坑），再把「绝对干净」的结果交给 JSON.stringify。
 * 注意：本函数不调用用户对象的 `toJSON`，避免任何对象自己再抛错或返回实例。
 */
function sanitizeForJson(value, depth, seen) {
  if (value === null || typeof value !== "object") return value;
  if (isVueInstance(value)) return vmTag(value);
  if (typeof window !== "undefined" && value === window) return "[Window]";
  if (typeof document !== "undefined" && value === document) return "[Document]";
  const d = depth || 0;
  const stack = seen || [];
  if (d >= JSON_MAX_DEPTH) return "[Object]";
  if (stack.indexOf(value) !== -1) return "[Circular]";
  if (value instanceof Date) return isNaN(value.getTime()) ? "[Invalid Date]" : value.toISOString();
  if (value instanceof RegExp) return String(value);
  if (value instanceof Error) return String(value.stack || value.message);
  if (value.nodeType === 1) return "<" + String(value.tagName).toLowerCase() + ">";
  if (typeof value.nodeType === "number" && typeof value.nodeName === "string") {
    return "<" + String(value.nodeName).toLowerCase() + ">";
  }

  stack.push(value);
  let out;
  if (Array.isArray(value)) {
    out = value.slice(0, JSON_MAX_ITEMS).map((x) => sanitizeForJson(x, d + 1, stack));
    if (value.length > JSON_MAX_ITEMS) out.push("… 还有 " + (value.length - JSON_MAX_ITEMS) + " 项");
  } else {
    out = {};
    const keys = Object.keys(value);
    const n = Math.min(keys.length, JSON_MAX_ITEMS);
    for (let i = 0; i < n; i++) out[keys[i]] = sanitizeForJson(value[keys[i]], d + 1, stack);
    if (keys.length > n) out["…"] = "还有 " + (keys.length - n) + " 个键";
  }
  stack.pop();
  return out;
}

/** 把任意值转成可读文本 */
function formatArg(v) {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  const t = typeof v;
  if (t === "string") return truncate(v); // 长字符串也要截，否则一条日志能把面板撑爆
  if (t === "number" || t === "boolean") return String(v);
  if (t === "symbol") return v.toString();
  if (t === "bigint") return v.toString() + "n";
  if (t === "function") return "ƒ " + (v.name || "anonymous") + "()";
  if (v instanceof Error) {
    return (
      (v.name || "Error") + ": " + v.message + (v.stack ? "\n" + v.stack : "")
    );
  }
  if (typeof window !== "undefined" && v === window) return "[Window]";
  if (typeof document !== "undefined" && v === document) return "[Document]";
  if (v.nodeType === 1) {
    const cls =
      typeof v.className === "string" && v.className
        ? "." + v.className.split(/\s+/)[0]
        : "";
    return "<" + v.tagName.toLowerCase() + cls + ">";
  }
  if (isVueInstance(v)) return formatVueInstance(v); // 实例：只给 $props / $data 摘要，不发散内部字段
  // 实例数组（$findVm() / $getAllVm() / $vmFromEl 们的结果）：逐个给摘要。
  // 不能整体 JSON.stringify —— 见 sanitizeForJson 的注释。
  if (Array.isArray(v) && hasVueInstance(v)) return formatVmArray(v);
  try {
    return truncate(JSON.stringify(sanitizeForJson(v, 0, []), circularReplacer(), 2));
  } catch (e) {
    return String(v);
  }
}

function formatArgs(args) {
  const list = Array.prototype.slice.call(args);
  return list.map(formatArg).join(" ");
}

/* ------------------------------------------------------------------ *
 * 样式（运行时注入）
 * ------------------------------------------------------------------ */

const CSS = `
.vc-root,
.vc-root * { 
  box-sizing: border-box; 
  -webkit-tap-highlight-color: transparent; 
}
.vc-root {
  --vc-bg: #1b1d23;
  --vc-bg-2: #23262e;
  --vc-fg: #e6e8eb;
  --vc-dim: #8b94a3;
  --vc-accent: #326fff;
  --vc-warn: #f5c451;
  --vc-err: #ff6b6b;
  --vc-ok: #4ade80;
  --vc-right: 12px;
  --vc-left: auto;
  --vc-bottom: 80px;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
}

/* ---------- 悬浮球 ---------- */
.vc-ball {
  position: fixed;
  right: var(--vc-right);
  left: var(--vc-left);
  bottom: var(--vc-bottom);
  z-index: ${Z_BASE + 6};
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(24, 26, 32, 0.86);
  color: var(--vc-ok);
  font: 700 13px/1 inherit;
  letter-spacing: 0.5px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
}
.vc-root.is-open .vc-ball { opacity: 0.35; }
.vc-ball:active { transform: scale(0.94); }
.vc-ball__badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--vc-err);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}
.vc-root.is-noball .vc-ball { 
  display: none; 
}

/* ---------- 面板 ---------- */
.vc-panel {
  position: fixed;
  right: var(--vc-right);
  left: var(--vc-left);
  bottom: var(--vc-bottom);
  z-index: ${Z_BASE + 7};
  display: none;
  flex-direction: column;
  width: min(420px, calc(100vw - 24px));
  height: max(520px, calc(100vh - 160px));
  overflow: hidden;
  background: var(--vc-bg);
  color: var(--vc-fg);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}
.vc-root.is-open .vc-panel { display: flex; }

.vc-nav {
  display: flex;
  align-items: center;
  flex: none;
  gap: 2px;
  padding: 0 6px;
  background: var(--vc-bg-2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.vc-nav__item {
  padding: 9px 8px;
  border: 0;
  background: none;
  color: var(--vc-dim);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.vc-nav__item.is-on {
  color: var(--vc-fg);
  box-shadow: inset 0 -2px 0 var(--vc-accent);
}
.vc-nav__spacer { flex: 1; }
.vc-nav__tool {
  padding: 5px 8px;
  border: 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  color: var(--vc-dim);
  font: inherit;
  cursor: pointer;
}
.vc-nav__tool:hover { color: var(--vc-fg); }

.vc-body { position: relative; flex: 1; min-height: 0; }
.vc-tab { display: none; height: 100%; overflow: auto; -webkit-overflow-scrolling: touch; }
.vc-tab.is-on { display: block; }

.vc-empty {
  display: none;
  margin: 0;
  padding: 28px 16px;
  color: var(--vc-dim);
  text-align: center;
}

/* ---------- Log ---------- */
.vc-logs, .vc-nets { margin: 0; padding: 0; list-style: none; }
.vc-logs:empty + .vc-empty,
.vc-nets:empty + .vc-empty { display: block; }

.vc-log {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  word-break: break-all;
  white-space: pre-wrap;
}
.vc-log__time { flex: none; color: var(--vc-dim); font-size: 10px; padding-top: 1px; }
.vc-log__text { flex: 1; min-width: 0; max-height: 4.6em; overflow: hidden; }
.vc-log.is-expand .vc-log__text { max-height: none; }
.vc-log--info { color: #7fc4ff; }
.vc-log--debug { color: var(--vc-dim); }
.vc-log--warn { color: var(--vc-warn); background: rgba(245, 196, 81, 0.08); }
.vc-log--error { color: var(--vc-err); background: rgba(255, 107, 107, 0.1); }
.vc-log--input { color: #7dd3fc; box-shadow: inset 0 -1px 0 rgba(125, 211, 252, 0.35); }
.vc-log--output { color: var(--vc-ok); }

/* ---------- Network ---------- */
.vc-net {
  padding: 7px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}
.vc-net__row { display: flex; align-items: baseline; gap: 6px; }
.vc-net__method { flex: none; font-weight: 700; color: var(--vc-accent); }
.vc-net__url { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vc-net__meta { flex: none; color: var(--vc-dim); font-size: 10px; }
.vc-net--err .vc-net__method, .vc-net--err .vc-net__meta { color: var(--vc-err); }
.vc-net__detail { display: none; margin-top: 6px; }
.vc-net.is-expand .vc-net__detail { display: block; }
.vc-kv { display: flex; gap: 6px; }
.vc-kv__k { flex: none; width: 66px; color: var(--vc-dim); }
.vc-kv__v { flex: 1; min-width: 0; word-break: break-all; white-space: pre-wrap; }
.vc-block {
  margin: 6px 0 0;
  padding: 6px 8px;
  max-height: 180px;
  overflow: auto;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  white-space: pre-wrap;
  word-break: break-all;
}

/* ---------- System / Storage ---------- */
.vc-sys, .vc-storage { padding: 6px 0; }
.vc-sec { padding: 8px 10px 4px; color: var(--vc-dim); font-weight: 600; }
.vc-storage__row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 5px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.vc-storage__k { flex: none; width: 110px; color: var(--vc-accent); word-break: break-all; }
.vc-storage__v { flex: 1; min-width: 0; color: var(--vc-fg); word-break: break-all; }
.vc-storage__del {
  flex: none;
  padding: 2px 6px;
  border: 0;
  border-radius: 3px;
  background: rgba(255, 107, 107, 0.16);
  color: var(--vc-err);
  font: inherit;
  cursor: pointer;
}

/* ---------- 命令输入 ---------- */
.vc-cmd {
  display: flex;
  align-items: center;
  flex: none;
  gap: 6px;
  padding: 6px 10px;
  background: var(--vc-bg-2);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.vc-cmd__pre { 
  color: var(--vc-ok); 
  font-weight: 700; 
 }
.vc-cmd__input {
  flex: 1;
  min-width: 0;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--vc-fg);
  font: inherit;
  outline: none;
}
.vc-cmd__input::placeholder { 
  color: var(--vc-dim); 
}
`;

function injectStyle() {
  if (typeof document === "undefined") {
    return false;
  }
  if (document.querySelector("style[" + VC_STYLE_TAG + "]")) {
    return true;
  }
  // head 可能还没解析出来（脚本在 <head> 里同步跑），documentElement 也兜不到就直接放弃
  const host = document.head || document.documentElement;
  if (!host) {
    return false;
  }
  try {
    const el = document.createElement("style");
    el.setAttribute(VC_STYLE_TAG, "");
    el.textContent = CSS;
    host.appendChild(el);
    return true;
  } catch (e) {
    return false;
  }
}

function removeStyle() {
  if (typeof document === "undefined") return;
  const el = document.querySelector("style[" + VC_STYLE_TAG + "]");
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

/* ------------------------------------------------------------------ *
 * 面板 DOM
 * ------------------------------------------------------------------ */

const TEMPLATE = `
<button class="vc-ball" type="button" aria-label="打开调试面板">
  <span class="vc-ball__text">VC</span>
  <em class="vc-ball__badge"></em>
</button>
<div class="vc-panel" role="dialog" aria-label="vConsole">
  <div class="vc-nav">
    <button class="vc-nav__item is-on" type="button" data-tab="log">Log</button>
    <button class="vc-nav__item" type="button" data-tab="network">Network</button>
    <button class="vc-nav__item" type="button" data-tab="system">System</button>
    <button class="vc-nav__item" type="button" data-tab="storage">Storage</button>
    <span class="vc-nav__spacer"></span>
    <button class="vc-nav__tool" type="button" data-act="clear">清空</button>
    <button class="vc-nav__tool" type="button" data-act="close">✕</button>
  </div>
  <div class="vc-body">
    <section class="vc-tab is-on" data-tab="log">
      <ul class="vc-logs"></ul>
      <p class="vc-empty">暂无日志 —— 页面里的 console.log / warn / error 会自动出现在这里</p>
    </section>
    <section class="vc-tab" data-tab="network">
      <ul class="vc-nets"></ul>
      <p class="vc-empty">暂无请求 —— XHR / fetch 会被自动记录</p>
    </section>
    <section class="vc-tab" data-tab="system"><div class="vc-sys"></div></section>
    <section class="vc-tab" data-tab="storage"><div class="vc-storage"></div></section>
  </div>
  <div class="vc-cmd">
    <span class="vc-cmd__pre">›</span>
    <input class="vc-cmd__input" type="text" autocomplete="off" autocapitalize="off"
           spellcheck="false" placeholder="执行 JS 表达式，回车运行（↑↓ 翻历史）" />
  </div>
</div>
`;

function buildDom() {
  if (typeof document === "undefined" || !document.body) {
    return null;
  }
  const root = document.createElement("div");
  root.className = "vc-root";
  root.innerHTML = TEMPLATE;
  try {
    document.body.appendChild(root);
  } catch (e) {
    return null; // body 被冻结 / 已不可写（少见）→ 交给调用方降级
  }

  const el = state.el;
  el.root = root;
  // 这几个是 null 也无所谓，elOf() 会挡住
  el.ball = root.querySelector(".vc-ball");
  el.badge = root.querySelector(".vc-ball__badge");
  el.panel = root.querySelector(".vc-panel");
  el.logs = root.querySelector(".vc-logs");
  el.nets = root.querySelector(".vc-nets");
  el.sys = root.querySelector(".vc-sys");
  el.storage = root.querySelector(".vc-storage");
  el.cmdInput = root.querySelector(".vc-cmd__input");
  // 集合统一兜底成数组，后面到处 .forEach 就不用再判空
  el.navItems = Array.prototype.slice.call(
    root.querySelectorAll(".vc-nav__item")
  );
  el.tabs = Array.prototype.slice.call(root.querySelectorAll(".vc-tab"));

  setPosition(state.options.position);
  applyTheme(state.options.theme);

  if (!state.options.ball) {
    root.classList.add("is-noball");
  }
  return root;
}

/**
 * 调整悬浮球 / 面板位置
 *   setPosition({ right: 12, bottom: 80 })   右下
 *   setPosition({ left: 12, bottom: 80 })    左下（给了 left 就自动清掉 right）
 *   setPosition({ right: 12, bottom: '40%' }) 支持任意 CSS 长度
 * 面板还没建（未 init / 已 destroy）时只把配置存下来，下次 buildDom 自动生效。
 */
function setPosition(pos) {
  if (!pos || typeof pos !== "object") {
    return api;
  }
  const next = Object.assign({}, state.options.position, pos);
  // 显式给了某一侧，就把另一侧清掉，避免 left / right 同时生效
  if (Object.prototype.hasOwnProperty.call(pos, "left")) next.right = undefined;
  else if (Object.prototype.hasOwnProperty.call(pos, "right"))
    next.left = undefined;
  state.options.position = next;

  const root = elOf("root");
  if (!root) {
    return api;
  }
  const p = state.options.position;
  const len = (v) => (typeof v === "number" ? v + "px" : v);
  if (p.left != null) {
    root.style.setProperty("--vc-left", len(p.left));
    root.style.setProperty("--vc-right", "auto");
  } else {
    root.style.setProperty(
      "--vc-right",
      len(p.right != null ? p.right : DEFAULTS.position.right)
    );
    root.style.setProperty("--vc-left", "auto");
  }
  if (p.bottom != null) {
    root.style.setProperty("--vc-bottom", len(p.bottom));
  }
  return api;
}

function applyTheme(theme) {
  const root = elOf("root");
  if (!root || !theme || typeof theme !== "object") {
    return;
  }
  Object.keys(theme).forEach((k) => {
    const varName = THEME_VARS[k];
    if (!varName || theme[k] == null) {
      return;
    }
    try {
      root.style.setProperty(varName, theme[k]);
    } catch (e) {
      /* 非法 CSS 值忽略 */
    }
  });
}

function bindEvents() {
  const el = state.el;
  // 统一入口：节点拿不到就跳过，绝不抛
  const on = (node, type, fn, opts) => {
    if (node && typeof node.addEventListener === "function") {
      node.addEventListener(type, fn, opts);
    }
  };

  on(el.ball, "click", toggle);

  listOf("navItems").forEach((btn) => {
    on(btn, "click", () => switchTab(btn.getAttribute("data-tab")));
  });

  on(el.panel, "click", (e) => {
    const t = e.target;
    const act = t && t.getAttribute && t.getAttribute("data-act");
    if (act === "clear") {
      clearCurrent();
    }
    if (act === "close") {
      hide();
    }
  });

  on(el.cmdInput, "keydown", onCmdKeydown);

  // 阻止面板内的滚动穿到页面
  on(el.panel, "touchmove", (e) => {
    if (e.target === el.panel) e.preventDefault();
  });

  // 兜底：原生 error / 未处理的 Promise 拒绝
  if (typeof window === "undefined") return;
  state.bound.onError = (e) => {
    addLog("error", [
      e.message + " @ " + (e.filename || "") + ":" + e.lineno + ":" + e.colno,
    ]);
  };
  state.bound.onRejection = (e) => {
    addLog("error", ["Unhandled Rejection:", e.reason]);
  };
  if (state.options.captureError) {
    window.addEventListener("error", state.bound.onError, true);
    window.addEventListener("unhandledrejection", state.bound.onRejection);
  }
}

/* ------------------------------------------------------------------ *
 * 面板交互
 * ------------------------------------------------------------------ */

function show() {
  ensureReady(); // 没 init 就 show → 顺手初始化，而不是报 "Cannot read classList of undefined"
  const root = elOf("root");
  if (!root) {
    return api;
  } // 非浏览器 / body 还没出来 → 静默降级
  state.open = true;
  root.classList.add("is-open");
  clearBadge();
  if (state.tab === "log") {
    scrollLogsToBottom();
  }
  return api;
}

function hide() {
  const root = elOf("root");
  state.open = false;
  if (root) root.classList.remove("is-open");
  return api;
}

function toggle() {
  ensureReady();
  if (!hasDom()) {
    return api;
  }
  return state.open ? hide() : show();
}

function switchTab(tab) {
  if (!tab) {
    return api;
  }
  state.tab = tab;
  listOf("navItems").forEach((b) => {
    if (b && b.classList)
      b.classList.toggle("is-on", b.getAttribute("data-tab") === tab);
  });
  listOf("tabs").forEach((t) => {
    if (t && t.classList)
      t.classList.toggle("is-on", t.getAttribute("data-tab") === tab);
  });
  if (tab === "log") {
    clearBadge();
    scrollLogsToBottom();
  } else if (tab === "system") {
    renderSystem();
  } else if (tab === "storage") {
    renderStorage();
  }
  return api;
}

function clearCurrent() {
  if (state.tab === "network") {
    state.networks.length = 0;
    const nets = elOf("nets");
    if (nets) nets.innerHTML = "";
  } else if (state.tab === "log") {
    clear();
  }
  return api;
}

function onCmdKeydown(e) {
  const input = elOf("cmdInput");
  if (!input) return;
  if (e.key === "Enter") {
    const code = String(input.value || "").trim();
    if (!code) return;
    input.value = "";
    state.cmdHistory.push(code);
    state.cmdIndex = state.cmdHistory.length;
    addLog("input", ["> " + code]);
    try {
      const result = evaluate(code);
      addLog("output", ["← " + formatArg(result)]);
    } catch (err) {
      addLog("error", [err]);
    }
    return;
  }
  // ↑↓ 翻历史
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    const list = state.cmdHistory;
    if (!list.length) return;
    e.preventDefault();
    let i = state.cmdIndex + (e.key === "ArrowUp" ? -1 : 1);
    i = Math.max(0, Math.min(list.length, i));
    state.cmdIndex = i;
    input.value = i === list.length ? "" : list[i];
  }
}

/** 先当表达式求值，失败再当语句执行 */
function evaluate(code) {
  try {
    return new Function("return (" + code + ")")();
  } catch (e) {
    return new Function(code)();
  }
}

/* ------------------------------------------------------------------ *
 * Log
 * ------------------------------------------------------------------ */

function scrollLogsToBottom() {
  const el = elOf("logs");
  const box = el && el.parentNode; // 列表可能已脱离文档 → parentNode 为 null
  if (!box) return;
  box.scrollTop = box.scrollHeight;
}

function nearBottom(box) {
  if (!box) return false;
  return box.scrollHeight - box.scrollTop - box.clientHeight < 24;
}

function renderLog(item) {
  const li = document.createElement("li");
  li.className = "vc-log vc-log--" + item.type;
  const time = document.createElement("span");
  time.className = "vc-log__time";
  time.textContent = fmtTime(item.time);
  const text = document.createElement("span");
  text.className = "vc-log__text";
  text.textContent = item.text;
  li.appendChild(time);
  li.appendChild(text);
  li.addEventListener("click", () => li.classList.toggle("is-expand"));
  return li;
}

function updateBadge() {
  const badge = elOf("badge");
  if (!badge) return;
  if (state.badge > 0) {
    badge.textContent = state.badge > 99 ? "99+" : String(state.badge);
    badge.style.display = "";
  } else {
    badge.textContent = "";
    badge.style.display = "none";
  }
}

function clearBadge() {
  state.badge = 0;
  updateBadge();
}

/**
 * 写一条日志
 * 面板没建 / 已 destroy 也没关系：记录照样进 state.logs，init 时会补渲染。
 * @param {string} type log | info | warn | error | debug | input | output
 * @param {Array}  args 原始参数（会被 formatArg 展开），传单个值也认
 */
function addLog(type, args) {
  const list = Array.isArray(args) ? args : args === undefined ? [] : [args];
  let text;
  try {
    text = formatArgs(list);
  } catch (e) {
    text = "[无法格式化的内容]";
  }
  const item = {
    id: ++state.seq,
    type: type || "log",
    time: Date.now(),
    args: list,
    text: text,
  };
  state.logs.push(item);

  const logs = elOf("logs");

  // 超上限：丢最早的（数组 + DOM 同步丢，避免 DOM 越滚越大）
  const max =
    Number(state.options.maxLogs) > 0
      ? Number(state.options.maxLogs)
      : DEFAULTS.maxLogs;
  const over = state.logs.length - max;
  if (over > 0) {
    state.logs.splice(0, over);
    if (logs) {
      for (let i = 0; i < over; i++) {
        const first = logs.firstChild;
        if (first) logs.removeChild(first);
      }
    }
  }

  if (logs) {
    const box = logs.parentNode;
    const stick = state.tab === "log" && state.open && nearBottom(box);
    logs.appendChild(renderLog(item));
    if (stick) scrollLogsToBottom();
  }

  if (item.type === "error" || item.type === "warn") {
    if (!(state.open && state.tab === "log")) {
      state.badge++;
      updateBadge();
    }
  }
  return item;
}

/** 清空日志 */
function clear() {
  state.logs.length = 0;
  const logs = elOf("logs");
  if (logs) logs.innerHTML = "";
  clearBadge();
  return api;
}

/* ------------------------------------------------------------------ *
 * 拦截 console
 * ------------------------------------------------------------------ */

function patchConsole() {
  if (!consoleRef) return;
  state.saved.console = {};
  CONSOLE_METHODS.forEach((name) => {
    const origin = consoleRef[name];
    if (typeof origin !== "function") return; // 该环境没这个方法（老 IE 无 debug）→ 不补
    state.saved.console[name] = origin;
    const patched = function () {
      try {
        addLog(name, Array.prototype.slice.call(arguments));
      } catch (e) {
        /* 记录失败不能反过来把业务的 console 打断 */
      }
      if (state.options.keepConsole) nativeLog[name].apply(null, arguments);
    };
    // 打标记：外部可探测「当前 console 是否已被本模块接管」
    patched.__vcPatched = true;
    try {
      consoleRef[name] = patched;
    } catch (e) {
      // console 被冻结 / 只读（部分沙箱、安全加固环境）→ 回滚，不接管
      delete state.saved.console[name];
    }
  });
  if (!Object.keys(state.saved.console).length) state.saved.console = null;
}

function restoreConsole() {
  if (!consoleRef || !state.saved.console) return;
  CONSOLE_METHODS.forEach((name) => {
    if (!state.saved.console[name]) return;
    try {
      consoleRef[name] = state.saved.console[name];
    } catch (e) {
      /* 同上：写不回去就算了，别在 destroy 里抛 */
    }
  });
  state.saved.console = null;
}

/* ------------------------------------------------------------------ *
 * 拦截网络
 * ------------------------------------------------------------------ */

function parseHeaderText(text) {
  const out = {};
  String(text || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const i = line.indexOf(":");
      if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  return out;
}

function headersToObj(headers) {
  const out = {};
  try {
    if (!headers || typeof headers.forEach !== "function") return out;
    headers.forEach((v, k) => {
      out[k] = v;
    });
  } catch (e) {
    /* 某些环境下 Headers 不可枚举，忽略 */
  }
  return out;
}

function normalizeHeaders(h) {
  const out = {};
  if (!h) return out;
  try {
    if (typeof h.forEach === "function") h.forEach((v, k) => (out[k] = v));
    else if (Array.isArray(h)) h.forEach((pair) => (out[pair[0]] = pair[1]));
    else if (typeof h === "object")
      Object.keys(h).forEach((k) => (out[k] = h[k]));
  } catch (e) {
    /* ignore */
  }
  return out;
}

function headersText(obj) {
  const keys = Object.keys(obj || {});
  return keys.length ? keys.map((k) => k + ": " + obj[k]).join("\n") : "(无)";
}

function finishNetwork(rec) {
  state.networks.push(rec);
  const nets = elOf("nets");
  const max =
    Number(state.options.maxNetworks) > 0
      ? Number(state.options.maxNetworks)
      : DEFAULTS.maxNetworks;
  const over = state.networks.length - max;
  if (over > 0) {
    state.networks.splice(0, over);
    if (nets) {
      for (let i = 0; i < over; i++) {
        const first = nets.firstChild;
        if (first) nets.removeChild(first);
      }
    }
  }
  if (!nets) return; // 面板没建 → 只留数据
  try {
    nets.appendChild(renderNet(rec));
  } catch (e) {
    /* 渲染失败不影响主流程 */
  }
}

function patchNetwork() {
  const win = typeof window !== "undefined" ? window : null;
  if (!win) return;

  // ---- XHR ----
  const proto = win.XMLHttpRequest && win.XMLHttpRequest.prototype;
  if (
    proto &&
    typeof proto.open === "function" &&
    typeof proto.send === "function"
  ) {
    const origOpen = proto.open;
    const origSend = proto.send;
    const origSetHeader = proto.setRequestHeader;
    state.saved.xhr = {
      proto: proto,
      open: origOpen,
      send: origSend,
      setRequestHeader: origSetHeader,
    };

    try {
      proto.open = function (method, url) {
        try {
          this.__vc = {
            kind: "xhr",
            id: ++state.seq,
            method: String(method || "GET").toUpperCase(),
            url: String(url),
            reqHeaders: {},
          };
        } catch (e) {
          /* 实例被 freeze / 不可扩展 → 这条不记录，但请求照发 */
        }
        return origOpen.apply(this, arguments);
      };
      proto.setRequestHeader = function (k, v) {
        try {
          if (this.__vc) this.__vc.reqHeaders[k] = v;
        } catch (e) {
          /* ignore */
        }
        return typeof origSetHeader === "function"
          ? origSetHeader.apply(this, arguments)
          : undefined;
      };
      proto.send = function (body) {
        const rec = this.__vc;
        if (rec) {
          rec.reqBody = body;
          rec.start = Date.now();
          try {
            this.addEventListener("loadend", () => {
              rec.duration = Date.now() - rec.start;
              rec.status = this.status === 1223 ? 204 : this.status;
              rec.statusText = this.statusText || "";
              try {
                rec.resHeaders = parseHeaderText(this.getAllResponseHeaders());
              } catch (e) {
                rec.resHeaders = {};
              }
              try {
                rec.resBody = String(this.responseText);
              } catch (e) {
                rec.resBody = "(二进制响应，已跳过)";
              }
              if (!rec.status)
                rec.error = rec.error || "请求失败（网络错误 / 已中断）";
              finishNetwork(rec);
            });
          } catch (e) {
            /* 某些 XHR polyfill 不支持 addEventListener → 放弃记录 */
          }
        }
        return origSend.apply(this, arguments);
      };
    } catch (e) {
      // 原型只读（安全加固环境）→ 整块还原，别让 init 挂掉
      restoreNetwork();
    }
  }

  // ---- fetch ----
  if (typeof win.fetch === "function") {
    const origFetch = win.fetch;
    state.saved.fetch = origFetch;

    const patchedFetch = function (input, init) {
      let rec;
      try {
        rec = {
          kind: "fetch",
          id: ++state.seq,
          method: String(
            (init && init.method) || (input && input.method) || "GET"
          ).toUpperCase(),
          url:
            typeof input === "string"
              ? input
              : (input && input.url) || String(input),
          reqHeaders: normalizeHeaders(
            (init && init.headers) || (input && input.headers)
          ),
          reqBody: init && init.body,
          start: Date.now(),
        };
      } catch (e) {
        // 连入参都读不出来（异常 Proxy 等）→ 原样转发，不记录
        return origFetch.apply(this, arguments);
      }

      const result = origFetch.apply(this, arguments);
      if (!result || typeof result.then !== "function") return result; // 被包装过的 fetch 没返回 Promise

      return result.then(
        (res) => {
          try {
            rec.duration = Date.now() - rec.start;
            rec.status = res && res.status;
            rec.statusText = res && res.statusText;
            rec.resHeaders = headersToObj(res && res.headers);
            // 必须 clone()，直接把 res 存下来会在展开详情时把原响应体读掉，
            // 调用方的 res.text() 就会报 "body stream already read"
            rec.resClone =
              res && typeof res.clone === "function" ? res.clone() : null;
          } catch (e) {
            /* 响应被读过 / clone 失败 → 详情里显示"(无)" */
          }
          finishNetwork(rec);
          return res;
        },
        (err) => {
          rec.duration = Date.now() - rec.start;
          rec.status = 0;
          rec.error = String((err && err.message) || err);
          finishNetwork(rec);
          throw err;
        }
      );
    };

    try {
      win.fetch = patchedFetch;
    } catch (e) {
      state.saved.fetch = null; // 写不进去 → 不接管
    }
  }
}

function restoreNetwork() {
  const saved = state.saved;
  if (saved.xhr && saved.xhr.proto) {
    const proto = saved.xhr.proto;
    ["open", "send", "setRequestHeader"].forEach((k) => {
      if (typeof saved.xhr[k] !== "function") return;
      try {
        proto[k] = saved.xhr[k];
      } catch (e) {
        /* ignore */
      }
    });
    saved.xhr = null;
  }
  if (saved.fetch && typeof window !== "undefined") {
    try {
      window.fetch = saved.fetch;
    } catch (e) {
      /* ignore */
    }
    saved.fetch = null;
  }
}

/** Network 条目的展开详情（点击时才渲染，响应体可能后到） */
function renderNetDetail(rec) {
  const box = document.createElement("div");
  box.className = "vc-net__detail";

  const addKV = (k, v) => {
    const row = document.createElement("div");
    row.className = "vc-kv";
    const kk = document.createElement("span");
    kk.className = "vc-kv__k";
    kk.textContent = k;
    const vv = document.createElement("span");
    vv.className = "vc-kv__v";
    vv.textContent = v;
    row.appendChild(kk);
    row.appendChild(vv);
    box.appendChild(row);
  };
  const addBlock = (title, text) => {
    const cap = document.createElement("div");
    cap.className = "vc-sec";
    cap.textContent = title;
    box.appendChild(cap);
    const pre = document.createElement("pre");
    pre.className = "vc-block";
    pre.textContent = truncate(text);
    box.appendChild(pre);
  };

  addKV("URL", rec.url);
  addKV("Method", rec.method);
  addKV(
    "Status",
    rec.status ? rec.status + " " + (rec.statusText || "") : rec.error || "-"
  );
  addKV("耗时", (rec.duration != null ? rec.duration : "-") + " ms");
  addBlock("Request Headers", headersText(rec.reqHeaders));
  if (rec.reqBody)
    addBlock(
      "Request Body",
      typeof rec.reqBody === "string" ? rec.reqBody : formatArg(rec.reqBody)
    );
  addBlock("Response Headers", headersText(rec.resHeaders));

  // fetch 的响应体是异步读的，展开时才去 clone 里取
  if (rec.resBody != null) {
    addBlock("Response Body", rec.resBody);
  } else if (rec.resClone) {
    const pre = document.createElement("pre");
    pre.className = "vc-block";
    pre.textContent = "读取中…";
    const cap = document.createElement("div");
    cap.className = "vc-sec";
    cap.textContent = "Response Body";
    box.appendChild(cap);
    box.appendChild(pre);
    rec.resClone
      .text()
      .then((t) => {
        pre.textContent = truncate(t);
      })
      .catch((e) => {
        pre.textContent = "(读取失败：" + (e && e.message) + ")";
      });
  } else {
    addBlock("Response Body", "(无)");
  }
  return box;
}

function renderNet(rec) {
  const li = document.createElement("li");
  li.className =
    "vc-net" + (rec.status >= 400 || rec.error ? " vc-net--err" : "");

  const row = document.createElement("div");
  row.className = "vc-net__row";
  const method = document.createElement("span");
  method.className = "vc-net__method";
  method.textContent = rec.method;
  const url = document.createElement("span");
  url.className = "vc-net__url";
  url.textContent = rec.url;
  const meta = document.createElement("span");
  meta.className = "vc-net__meta";
  meta.textContent =
    (rec.status || "ERR") +
    " · " +
    (rec.duration != null ? rec.duration + "ms" : "-");
  row.appendChild(method);
  row.appendChild(url);
  row.appendChild(meta);
  li.appendChild(row);

  let detail = null;
  li.addEventListener("click", () => {
    if (!detail) {
      detail = renderNetDetail(rec);
      li.appendChild(detail);
    }
    li.classList.toggle("is-expand");
  });
  return li;
}

/* ------------------------------------------------------------------ *
 * System
 * ------------------------------------------------------------------ */

/** 取时区名；Intl 缺失或异常都给 "-" */
function tzName() {
  try {
    return typeof Intl !== "undefined" && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "-";
  } catch (e) {
    return "-";
  }
}

function renderSystem() {
  const box = elOf("sys");
  if (!box) return;
  // 这些全局在非浏览器 / 受限环境里可能整体缺失，逐个 typeof 兜
  const nav = typeof navigator !== "undefined" && navigator ? navigator : {};
  const win = typeof window !== "undefined" ? window : null;
  const scr = typeof screen !== "undefined" && screen ? screen : null;
  const perf = typeof performance !== "undefined" ? performance : null;
  const conn =
    nav.connection || nav.mozConnection || nav.webkitConnection || {};
  const mem = (perf && perf.memory) || {};
  const dpr = win && win.devicePixelRatio ? win.devicePixelRatio : 1;
  const rows = [
    ["UA", nav.userAgent || "-"],
    ["平台", nav.platform || "-"],
    [
      "语言",
      (nav.language || "-") +
        " · " +
        (Array.isArray(nav.languages) ? nav.languages.join(", ") : "-"),
    ],
    ["屏幕", scr ? scr.width + "×" + scr.height + " @" + dpr + "x" : "-"],
    ["视口", win ? win.innerWidth + "×" + win.innerHeight : "-"],
    ["在线", nav.onLine === false ? "离线" : "在线"],
    [
      "网络",
      conn.effectiveType
        ? conn.effectiveType + " / " + (conn.downlink || "-") + "Mbps"
        : "-",
    ],
    ["时区", tzName()],
    ["Cookie", nav.cookieEnabled ? "启用" : "禁用"],
    [
      "JS 堆",
      mem.usedJSHeapSize
        ? (mem.usedJSHeapSize / 1048576).toFixed(1) +
          " / " +
          (mem.jsHeapSizeLimit / 1048576).toFixed(0) +
          " MB"
        : "-",
    ],
    ["地址", typeof location !== "undefined" ? location.href : "-"],
    ["时间", new Date().toString()],
  ];
  box.innerHTML = "";
  rows.forEach((pair) => {
    const row = document.createElement("div");
    row.className = "vc-kv";
    row.style.padding = "5px 10px";
    const k = document.createElement("span");
    k.className = "vc-kv__k";
    k.textContent = pair[0];
    const v = document.createElement("span");
    v.className = "vc-kv__v";
    v.textContent = pair[1];
    row.appendChild(k);
    row.appendChild(v);
    box.appendChild(row);
  });
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "vc-nav__tool";
  btn.style.margin = "8px 10px";
  btn.textContent = "刷新";
  btn.addEventListener("click", renderSystem);
  box.appendChild(btn);
}

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

function safeStorage(name) {
  try {
    if (typeof window === "undefined") return null;
    const s = window[name];
    if (!s) return null;
    s.getItem("__vc_probe__"); // 隐私模式 / 被禁用时会抛
    return s;
  } catch (e) {
    return null;
  }
}

/** 读 cookie：沙箱 iframe 里访问 document.cookie 会抛 SecurityError */
function readCookie() {
  try {
    return typeof document !== "undefined" && document.cookie
      ? String(document.cookie)
      : "";
  } catch (e) {
    return "";
  }
}

function renderStorage() {
  const box = elOf("storage");
  if (!box) return;
  box.innerHTML = "";

  const groups = [
    { name: "localStorage", store: safeStorage("localStorage") },
    { name: "sessionStorage", store: safeStorage("sessionStorage") },
  ];

  groups.forEach((g) => {
    const cap = document.createElement("div");
    cap.className = "vc-sec";
    // 连 length 都可能抛（存储被中途禁用）→ 整组按「不可用」处理
    let count = -1;
    try {
      count = g.store ? g.store.length : -1;
    } catch (e) {
      count = -1;
    }
    cap.textContent =
      g.name + (count >= 0 ? "（" + count + " 项）" : "（不可用）");
    box.appendChild(cap);

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        let key = null;
        let val = null;
        try {
          key = g.store.key(i);
          val = key == null ? null : g.store.getItem(key);
        } catch (e) {
          val = "（读取失败）";
        }
        if (key == null) continue;
        box.appendChild(
          storageRow(key, val, () => {
            g.store.removeItem(key);
          })
        );
      }
    } else if (count === 0) {
      const empty = document.createElement("p");
      empty.className = "vc-empty";
      empty.style.display = "block";
      empty.textContent = "（空）";
      box.appendChild(empty);
    }
  });

  // cookie
  const cap = document.createElement("div");
  cap.className = "vc-sec";
  const cookies = readCookie().split("; ").filter(Boolean);
  cap.textContent = "cookie（" + cookies.length + " 项）";
  box.appendChild(cap);
  cookies.forEach((pair) => {
    const i = pair.indexOf("=");
    const k = i > 0 ? pair.slice(0, i) : pair;
    const v = i > 0 ? pair.slice(i + 1) : "";
    box.appendChild(
      storageRow(k, safeDecode(v), () => {
        try {
          document.cookie = k + "=; path=/; max-age=0";
        } catch (e) {
          /* ignore */
        }
      })
    );
  });
}

function storageRow(key, value, onDelete) {
  const row = document.createElement("div");
  row.className = "vc-storage__row";
  const k = document.createElement("span");
  k.className = "vc-storage__k";
  k.textContent = key;
  const v = document.createElement("span");
  v.className = "vc-storage__v";
  v.textContent = truncate(value, 300);
  const del = document.createElement("button");
  del.type = "button";
  del.className = "vc-storage__del";
  del.textContent = "删除";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    try {
      onDelete();
    } catch (err) {
      addLog("error", ["删除失败：", err]);
    }
    renderStorage();
  });
  row.appendChild(k);
  row.appendChild(v);
  row.appendChild(del);
  return row;
}

/* ------------------------------------------------------------------ *
 * 生命周期
 * ------------------------------------------------------------------ */

/**
 * 初始化（幂等）
 * 容错：
 *   · 非浏览器环境（SSR / Node / 单测）→ 直接返回 API，不抛
 *   · document.body 还没解析出来（脚本写在 <head> 里同步执行）
 *     → 挂一次 DOMContentLoaded，等 DOM 就绪再自动补建，不丢调用
 *   · 中途任何一步出错 → 回滚 inited 标记并打日志，绝不让 import 方崩掉
 * @param {object} [options] 见 DEFAULTS + { theme }
 * @returns {object} API
 */
function init(options) {
  if (typeof document === "undefined") {
    return api;
  }
  if (state.inited || state.building) {
    return api;
  }

  // body 还没有 → 等 DOMContentLoaded（只挂一次）
  if (!document.body) {
    if (document.readyState === "loading" && !state.pendingInit) {
      state.pendingInit = true;
      const onReady = () => {
        document.removeEventListener("DOMContentLoaded", onReady);
        state.pendingInit = false;
        init(options);
      };
      document.addEventListener("DOMContentLoaded", onReady);
    }
    return api;
  }

  state.building = true;
  try {
    state.options = Object.assign({}, DEFAULTS, options || {});

    if (options && options.position && typeof options.position === "object") {
      state.options.position = Object.assign(
        {},
        DEFAULTS.position,
        options.position
      );
    }

    injectStyle(); // 失败也不致命：面板只是没样式

    if (!buildDom()) {
      state.building = false;
      return api; // body 不可写 → 退化成一个「只记录不显示」的面板
    }
    bindEvents();
    switchTab(state.options.defaultTab || "log");
    updateBadge();

    if (state.options.captureConsole) {
      patchConsole();
    }
    if (state.options.captureNetwork) {
      patchNetwork();
    }

    // init 之前就调用过 VConsole.log 的内容，补渲染一次
    const logs = elOf("logs");
    if (logs) {
      state.logs.forEach((item) => {
        try {
          logs.appendChild(renderLog(item));
        } catch (e) {
          /* 单条渲染失败不该影响其它 */
        }
      });
      scrollLogsToBottom();
    }

    state.inited = true;
  } catch (err) {
    state.building = false;
    state.inited = false;
    try {
      nativeLog.error("[vconsole] 初始化失败：", err);
    } catch (e) {
      /* ignore */
    }
    return api;
  }
  state.building = false;
  return api;
}

/** 销毁：还原 console / XHR / fetch，移除面板 DOM 与样式（未 init 时直接返回） */
function destroy() {
  if (!state.inited) return api;
  restoreConsole();
  restoreNetwork();
  if (state.options.captureError && typeof window !== "undefined") {
    if (state.bound.onError)
      window.removeEventListener("error", state.bound.onError, true);
    if (state.bound.onRejection)
      window.removeEventListener("unhandledrejection", state.bound.onRejection);
  }
  const root = elOf("root");
  if (root && root.parentNode) root.parentNode.removeChild(root);
  removeStyle();
  state.logs.length = 0;
  state.networks.length = 0;
  state.badge = 0;
  state.open = false;
  state.inited = false;
  state.building = false;
  state.saved = {};
  state.bound = {};
  state.el = {};
  return api;
}

/** 显隐悬浮球（未 init 时只记配置，下次 init 生效） */
function setBallVisible(visible) {
  state.options.ball = visible !== false;
  const root = elOf("root");
  if (root) root.classList.toggle("is-noball", !state.options.ball);
  return api;
}

/** 面板是否已建起来（含位置 / 主题等运行时信息，调试用） */
function isInited() {
  return state.inited && hasDom();
}

/** 暴露给 `this.$vconsole` 的 API 集合 */
const api = {
  init: init,
  isInited: isInited,
  show: show,
  hide: hide,
  toggle: toggle,
  clear: clear,
  destroy: destroy,
  setBallVisible: setBallVisible,
  setPosition: setPosition,
  switchTab: switchTab,
  addLog: addLog,
  log: function () {
    return addLog("log", Array.prototype.slice.call(arguments));
  },
  info: function () {
    return addLog("info", Array.prototype.slice.call(arguments));
  },
  warn: function () {
    return addLog("warn", Array.prototype.slice.call(arguments));
  },
  error: function () {
    return addLog("error", Array.prototype.slice.call(arguments));
  },
  debug: function () {
    return addLog("debug", Array.prototype.slice.call(arguments));
  },
  /** 只读状态快照（调试 / 断言用） */
  getState: function () {
    return state;
  },
  formatArg: formatArg,
};

/**
 * 注册到 Vue 原型
 * @param {Function} VueCtor Vue 构造器（Vue.use 会自动传入）
 */
export function install(VueCtor) {
  if (VueCtor && VueCtor.prototype) {
    VueCtor.prototype.$vconsole = api;
  }
}

/**
 * 默认导出 = 完整 API（同时带 install，所以 `Vue.use(VConsole)` 也能用）。
 * 用法：import VConsole from '@/utils/vconsole' → VConsole.init()
 */
api.install = install;

const plugin = api;

// 项目约定：入口在模块作用域直接注册，不依赖 window.Vue（webpack 下 window 上没有 Vue）
install(Vue);

export {
  init,
  isInited,
  show,
  hide,
  toggle,
  clear,
  destroy,
  setBallVisible,
  setPosition,
  switchTab,
  addLog,
};
export default plugin;
