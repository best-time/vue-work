/**
 * css-in-js · 注入层
 *
 * 全站共用**一个** `<style data-css-in-js>` 标签：
 *   - 每条规则按 id 去重（同一段 CSS 只插一次，class 名由内容哈希得到 → 天然可缓存）
 *   - 用 appendChild(Text) 追加而不是重写 textContent，避免每次插入都重新解析整张表
 *   - 规则插入顺序 = 首次使用顺序，后面的规则优先级更高（和 emotion 一致）
 *   - 非浏览器环境（SSR / node 单测）自动降级为「只算 class 名，不插样式」
 */

const ATTR = "data-css-in-js";

let styleEl = null;
const inserted = new Map(); // id -> css 文本

const canUseDom = () => typeof document !== "undefined" && !!document.head;

/** 惰性创建/复用样式标签 */
function ensureStyleEl() {
  if (!canUseDom()) {
    return null;
  }
  if (styleEl && styleEl.parentNode) {
    return styleEl;
  }
  styleEl = document.querySelector("style[" + ATTR + "]");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.setAttribute(ATTR, "true");
    styleEl.setAttribute("type", "text/css");
    document.head.appendChild(styleEl);
  }
  return styleEl;
}

/**
 * 插入一条规则（按 id 去重）
 * @returns {boolean} true = 本次真的插入了
 */
export function insertRule(id, cssText) {
  if (inserted.has(id)) {
    return false;
  }
  inserted.set(id, cssText);
  const el = ensureStyleEl();
  if (el) {
    el.appendChild(document.createTextNode(cssText + "\n"));
  }
  return true;
}

/** 是否已插入过 */
export function hasRule(id) {
  return inserted.has(id);
}

/** 已插入的规则条数 */
export function ruleCount() {
  return inserted.size;
}

/** 当前注入的全部 CSS（调试 / 单测用） */
export function getStyleText() {
  return Array.from(inserted.values()).join("\n");
}

/** 拿样式标签（调试用，未创建时返回 null） */
export function getStyleElement() {
  return ensureStyleEl();
}

/** 清空注入（HMR / 单测用） */
export function reset() {
  inserted.clear();
  if (styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl);
  }
  styleEl = null;
}
