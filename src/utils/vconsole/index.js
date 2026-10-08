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
  maxBody: 1500, // 文本 / 响应体截断长度
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
};

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
  return s.length > max ? s.slice(0, max) + "\n… 已截断，共 " + s.length + " 字符" : s;
}

/** MDN 经典循环引用 replacer：用祖先栈判断真正的环 */
function circularReplacer(depth) {
  const ancestors = [];
  const maxDepth = typeof depth === "number" ? depth : 6;
  return function (key, value) {
    if (typeof value === "function") return "ƒ " + (value.name || "anonymous") + "()";
    if (typeof value === "bigint") return value.toString() + "n";
    if (value === undefined) return "undefined";
    if (typeof value !== "object" || value === null) return value;
    // 一直弹到「当前节点的父节点」
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
    if (ancestors.length > maxDepth) return "[Object]";
    if (ancestors.indexOf(value) !== -1) return "[Circular]";
    ancestors.push(value);
    return value;
  };
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
    return (v.name || "Error") + ": " + v.message + (v.stack ? "\n" + v.stack : "");
  }
  if (typeof window !== "undefined" && v === window) return "[Window]";
  if (typeof document !== "undefined" && v === document) return "[Document]";
  if (v.nodeType === 1) {
    const cls = typeof v.className === "string" && v.className ? "." + v.className.split(/\s+/)[0] : "";
    return "<" + v.tagName.toLowerCase() + cls + ">";
  }
  if (v.$options) return "[Vue " + (v.$options.name || "Anonymous") + "]"; // Vue 实例不要深挖
  try {
    return truncate(JSON.stringify(v, circularReplacer(), 2));
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
.vc-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
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
.vc-root.is-noball .vc-ball { display: none; }

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
  height: min(520px, calc(100vh - 160px));
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
.vc-cmd__pre { color: var(--vc-ok); font-weight: 700; }
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
.vc-cmd__input::placeholder { color: var(--vc-dim); }
`;

function injectStyle() {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[" + VC_STYLE_TAG + "]")) return;
  const el = document.createElement("style");
  el.setAttribute(VC_STYLE_TAG, "");
  el.textContent = CSS;
  (document.head || document.documentElement).appendChild(el);
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
  const root = document.createElement("div");
  root.className = "vc-root";
  root.innerHTML = TEMPLATE;
  document.body.appendChild(root);

  const el = state.el;
  el.root = root;
  el.ball = root.querySelector(".vc-ball");
  el.badge = root.querySelector(".vc-ball__badge");
  el.panel = root.querySelector(".vc-panel");
  el.logs = root.querySelector(".vc-logs");
  el.nets = root.querySelector(".vc-nets");
  el.sys = root.querySelector(".vc-sys");
  el.storage = root.querySelector(".vc-storage");
  el.cmdInput = root.querySelector(".vc-cmd__input");
  el.navItems = Array.prototype.slice.call(root.querySelectorAll(".vc-nav__item"));
  el.tabs = Array.prototype.slice.call(root.querySelectorAll(".vc-tab"));

  setPosition(state.options.position);
  applyTheme(state.options.theme);

  if (!state.options.ball) root.classList.add("is-noball");
  return root;
}

/**
 * 调整悬浮球 / 面板位置
 *   setPosition({ right: 12, bottom: 80 })   右下
 *   setPosition({ left: 12, bottom: 80 })    左下（给了 left 就自动清掉 right）
 *   setPosition({ right: 12, bottom: '40%' }) 支持任意 CSS 长度
 */
function setPosition(pos) {
  if (!pos) return;
  const next = Object.assign({}, state.options.position, pos);
  // 显式给了某一侧，就把另一侧清掉，避免 left / right 同时生效
  if (Object.prototype.hasOwnProperty.call(pos, "left")) next.right = undefined;
  else if (Object.prototype.hasOwnProperty.call(pos, "right")) next.left = undefined;
  state.options.position = next;

  const root = state.el.root;
  if (!root) return;
  const p = state.options.position;
  const len = (v) => (typeof v === "number" ? v + "px" : v);
  if (p.left != null) {
    root.style.setProperty("--vc-left", len(p.left));
    root.style.setProperty("--vc-right", "auto");
  } else {
    root.style.setProperty("--vc-right", len(p.right != null ? p.right : DEFAULTS.position.right));
    root.style.setProperty("--vc-left", "auto");
  }
  if (p.bottom != null) root.style.setProperty("--vc-bottom", len(p.bottom));
}

function applyTheme(theme) {
  const root = state.el.root;
  if (!root || !theme) return;
  Object.keys(theme).forEach((k) => {
    const varName = THEME_VARS[k];
    if (varName && theme[k] != null) root.style.setProperty(varName, theme[k]);
  });
}

function bindEvents() {
  const el = state.el;

  el.ball.addEventListener("click", toggle);

  el.navItems.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });

  el.panel.addEventListener("click", (e) => {
    const act = e.target.getAttribute && e.target.getAttribute("data-act");
    if (act === "clear") clearCurrent();
    if (act === "close") hide();
  });

  el.cmdInput.addEventListener("keydown", onCmdKeydown);

  // 阻止面板内的滚动穿到页面
  el.panel.addEventListener("touchmove", (e) => {
    if (e.target === el.panel) e.preventDefault();
  });

  // 兜底：原生 error / 未处理的 Promise 拒绝
  state.bound.onError = (e) => {
    addLog("error", [e.message + " @ " + (e.filename || "") + ":" + e.lineno + ":" + e.colno]);
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
  state.open = true;
  state.el.root.classList.add("is-open");
  clearBadge();
  if (state.tab === "log") scrollLogsToBottom();
}

function hide() {
  state.open = false;
  state.el.root.classList.remove("is-open");
}

function toggle() {
  state.open ? hide() : show();
}

function switchTab(tab) {
  if (!tab) return;
  state.tab = tab;
  state.el.navItems.forEach((b) => b.classList.toggle("is-on", b.getAttribute("data-tab") === tab));
  state.el.tabs.forEach((t) => t.classList.toggle("is-on", t.getAttribute("data-tab") === tab));
  if (tab === "log") {
    clearBadge();
    scrollLogsToBottom();
  } else if (tab === "system") {
    renderSystem();
  } else if (tab === "storage") {
    renderStorage();
  }
}

function clearCurrent() {
  if (state.tab === "network") {
    state.networks.length = 0;
    state.el.nets.innerHTML = "";
  } else if (state.tab === "log") {
    clear();
  }
}

function onCmdKeydown(e) {
  const input = state.el.cmdInput;
  if (e.key === "Enter") {
    const code = input.value.trim();
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
  const el = state.el.logs;
  if (!el) return;
  el.parentNode.scrollTop = el.parentNode.scrollHeight;
}

function nearBottom(box) {
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
  const badge = state.el.badge;
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
 * @param {string} type log | info | warn | error | debug | input | output
 * @param {Array}  args 原始参数（会被 formatArg 展开）
 */
function addLog(type, args) {
  const item = {
    id: ++state.seq,
    type: type,
    time: Date.now(),
    args: args,
    text: formatArgs(args),
  };
  state.logs.push(item);

  // 超上限：丢最早的（数组 + DOM 同步丢，避免 DOM 越滚越大）
  const over = state.logs.length - state.options.maxLogs;
  if (over > 0) {
    state.logs.splice(0, over);
    for (let i = 0; i < over; i++) {
      const first = state.el.logs && state.el.logs.firstChild;
      if (first) state.el.logs.removeChild(first);
    }
  }

  if (state.el.logs) {
    const box = state.el.logs.parentNode;
    const stick = state.tab === "log" && state.open && nearBottom(box);
    state.el.logs.appendChild(renderLog(item));
    if (stick) scrollLogsToBottom();
  }

  if (type === "error" || type === "warn") {
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
  if (state.el.logs) state.el.logs.innerHTML = "";
  clearBadge();
}

/* ------------------------------------------------------------------ *
 * 拦截 console
 * ------------------------------------------------------------------ */

function patchConsole() {
  if (!consoleRef) return;
  state.saved.console = {};
  CONSOLE_METHODS.forEach((name) => {
    state.saved.console[name] = consoleRef[name];
    const patched = function () {
      addLog(name, Array.prototype.slice.call(arguments));
      if (state.options.keepConsole) nativeLog[name].apply(null, arguments);
    };
    // 打标记：外部可探测「当前 console 是否已被本模块接管」
    patched.__vcPatched = true;
    consoleRef[name] = patched;
  });
}

function restoreConsole() {
  if (!consoleRef || !state.saved.console) return;
  CONSOLE_METHODS.forEach((name) => {
    consoleRef[name] = state.saved.console[name];
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
    else if (typeof h === "object") Object.keys(h).forEach((k) => (out[k] = h[k]));
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
  const over = state.networks.length - state.options.maxNetworks;
  if (over > 0) {
    state.networks.splice(0, over);
    for (let i = 0; i < over; i++) {
      const first = state.el.nets && state.el.nets.firstChild;
      if (first) state.el.nets.removeChild(first);
    }
  }
  if (state.el.nets) state.el.nets.appendChild(renderNet(rec));
}

function patchNetwork() {
  const win = typeof window !== "undefined" ? window : null;
  if (!win) return;

  // ---- XHR ----
  if (win.XMLHttpRequest) {
    const proto = win.XMLHttpRequest.prototype;
    const origOpen = proto.open;
    const origSend = proto.send;
    const origSetHeader = proto.setRequestHeader;
    state.saved.xhr = { proto: proto, open: origOpen, send: origSend, setRequestHeader: origSetHeader };

    proto.open = function (method, url) {
      this.__vc = {
        kind: "xhr",
        id: ++state.seq,
        method: String(method || "GET").toUpperCase(),
        url: String(url),
        reqHeaders: {},
      };
      return origOpen.apply(this, arguments);
    };
    proto.setRequestHeader = function (k, v) {
      if (this.__vc) this.__vc.reqHeaders[k] = v;
      return origSetHeader.apply(this, arguments);
    };
    proto.send = function (body) {
      const rec = this.__vc;
      if (rec) {
        rec.reqBody = body;
        rec.start = Date.now();
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
          if (!rec.status) rec.error = rec.error || "请求失败（网络错误 / 已中断）";
          finishNetwork(rec);
        });
      }
      return origSend.apply(this, arguments);
    };
  }

  // ---- fetch ----
  if (typeof win.fetch === "function") {
    const origFetch = win.fetch;
    state.saved.fetch = origFetch;
    win.fetch = function (input, init) {
      const rec = {
        kind: "fetch",
        id: ++state.seq,
        method: String((init && init.method) || (input && input.method) || "GET").toUpperCase(),
        url: typeof input === "string" ? input : (input && input.url) || String(input),
        reqHeaders: normalizeHeaders((init && init.headers) || (input && input.headers)),
        reqBody: init && init.body,
        start: Date.now(),
      };
      return origFetch.apply(this, arguments).then(
        (res) => {
          rec.duration = Date.now() - rec.start;
          rec.status = res.status;
          rec.statusText = res.statusText;
          rec.resHeaders = headersToObj(res.headers);
          rec.resClone = res.clone ? res : null;
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
  }
}

function restoreNetwork() {
  const saved = state.saved;
  if (saved.xhr && saved.xhr.proto) {
    saved.xhr.proto.open = saved.xhr.open;
    saved.xhr.proto.send = saved.xhr.send;
    saved.xhr.proto.setRequestHeader = saved.xhr.setRequestHeader;
    saved.xhr = null;
  }
  if (saved.fetch && typeof window !== "undefined") {
    window.fetch = saved.fetch;
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
  addKV("Status", rec.status ? rec.status + " " + (rec.statusText || "") : rec.error || "-");
  addKV("耗时", (rec.duration != null ? rec.duration : "-") + " ms");
  addBlock("Request Headers", headersText(rec.reqHeaders));
  if (rec.reqBody) addBlock("Request Body", typeof rec.reqBody === "string" ? rec.reqBody : formatArg(rec.reqBody));
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
  li.className = "vc-net" + (rec.status >= 400 || rec.error ? " vc-net--err" : "");

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
    (rec.status || "ERR") + " · " + (rec.duration != null ? rec.duration + "ms" : "-");
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

function renderSystem() {
  const box = state.el.sys;
  if (!box) return;
  const nav = navigator;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
  const mem = (performance && performance.memory) || {};
  const rows = [
    ["UA", nav.userAgent],
    ["平台", nav.platform || "-"],
    ["语言", (nav.language || "-") + " · " + (nav.languages || []).join(", ")],
    ["屏幕", screen.width + "×" + screen.height + " @" + window.devicePixelRatio + "x"],
    ["视口", window.innerWidth + "×" + window.innerHeight],
    ["在线", nav.onLine === false ? "离线" : "在线"],
    ["网络", conn.effectiveType ? conn.effectiveType + " / " + (conn.downlink || "-") + "Mbps" : "-"],
    ["时区", Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : "-"],
    ["Cookie", nav.cookieEnabled ? "启用" : "禁用"],
    ["JS 堆", mem.usedJSHeapSize ? (mem.usedJSHeapSize / 1048576).toFixed(1) + " / " + (mem.jsHeapSizeLimit / 1048576).toFixed(0) + " MB" : "-"],
    ["地址", location.href],
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
    const s = window[name];
    s.getItem("__vc_probe__");
    return s;
  } catch (e) {
    return null;
  }
}

function renderStorage() {
  const box = state.el.storage;
  if (!box) return;
  box.innerHTML = "";

  const groups = [
    { name: "localStorage", store: safeStorage("localStorage") },
    { name: "sessionStorage", store: safeStorage("sessionStorage") },
  ];

  groups.forEach((g) => {
    const cap = document.createElement("div");
    cap.className = "vc-sec";
    cap.textContent = g.name + (g.store ? "（" + g.store.length + " 项）" : "（不可用）");
    box.appendChild(cap);

    if (g.store && g.store.length) {
      for (let i = 0; i < g.store.length; i++) {
        const key = g.store.key(i);
        box.appendChild(storageRow(key, g.store.getItem(key), () => g.store.removeItem(key)));
      }
    } else if (g.store) {
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
  const cookies = String(document.cookie || "")
    .split("; ")
    .filter(Boolean);
  cap.textContent = "cookie（" + cookies.length + " 项）";
  box.appendChild(cap);
  cookies.forEach((pair) => {
    const i = pair.indexOf("=");
    const k = i > 0 ? pair.slice(0, i) : pair;
    const v = i > 0 ? pair.slice(i + 1) : "";
    box.appendChild(
      storageRow(k, decodeURIComponent(v), () => {
        document.cookie = k + "=; path=/; max-age=0";
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
    onDelete();
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
 * @param {object} [options] 见 DEFAULTS + { theme }
 * @returns {object} API
 */
function init(options) {
  if (state.inited) return api;
  if (typeof document === "undefined" || !document.body) return api;

  state.options = Object.assign({}, DEFAULTS, options || {});
  if (options && options.position) {
    state.options.position = Object.assign({}, DEFAULTS.position, options.position);
  }

  injectStyle();
  buildDom();
  bindEvents();
  switchTab(state.options.defaultTab || "log");
  updateBadge();

  if (state.options.captureConsole) patchConsole();
  if (state.options.captureNetwork) patchNetwork();

  // init 之前就调用过 VConsole.log 的内容，补渲染一次
  state.logs.forEach((item) => state.el.logs.appendChild(renderLog(item)));

  state.inited = true;
  return api;
}

/** 销毁：还原 console / XHR / fetch，移除面板 DOM 与样式 */
function destroy() {
  if (!state.inited) return;
  restoreConsole();
  restoreNetwork();
  if (state.options.captureError && typeof window !== "undefined") {
    window.removeEventListener("error", state.bound.onError, true);
    window.removeEventListener("unhandledrejection", state.bound.onRejection);
  }
  if (state.el.root && state.el.root.parentNode) {
    state.el.root.parentNode.removeChild(state.el.root);
  }
  removeStyle();
  state.logs.length = 0;
  state.networks.length = 0;
  state.badge = 0;
  state.open = false;
  state.inited = false;
  state.el = {};
}

/** 显隐悬浮球 */
function setBallVisible(visible) {
  state.options.ball = visible !== false;
  if (state.el.root) state.el.root.classList.toggle("is-noball", !state.options.ball);
}

/** 暴露给 `this.$vconsole` 的 API 集合 */
const api = {
  init: init,
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

export { init, show, hide, toggle, clear, destroy, setBallVisible, setPosition, switchTab, addLog };
export default plugin;
