/**
 * css-in-js · 简易实现（参考 emotion）
 *
 * 零依赖，把样式写在 JS 里，运行时注入到页面 <style> 标签，返回可直接绑给
 * `:class` 的类名。适用场景：样式需要跟随 props / 主题 / 计算值变化，或想避免
 * 全局 class 命名冲突（类名由内容哈希生成，天然隔离）。
 *
 * ─────────────── 三种写法 ───────────────
 *
 * ① 对象写法（推荐，驼峰 + 嵌套 & / @media）
 *    const card = css({
 *      padding: 20,                    // 数字自动补 px
 *      background: '#fff',
 *      '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,.12)' },
 *      '@media (max-width: 768px)': { padding: 12 }
 *    })
 *    <div :class="card">
 *
 * ② 标签模板写法
 *    const title = css`font-size: 16px; color: #333; margin: 0 0 12px;`
 *    const gap = 8
 *    const row = css`display: flex; gap: ${gap}px;`         // 插入变量
 *
 * ③ 动态写法（样式跟随 props，函数式在调用时求值）
 *    const btn = css(props => ({                              // 整个是函数
 *      background: props.primary ? '#326fff' : '#f5f7fa',
 *      color: props.primary ? '#fff' : '#333'
 *    }))
 *    const text = css`color: ${p => p.color}; font-size: ${p => p.size}px;`  // 插值是函数
 *    <button :class="btn({ primary: true })">
 *    // 动态样式返回的是「函数 → 类名」，同一组 props 只会注入一次
 *
 * ─────────────── 其它 API ───────────────
 *
 * cx(...args)         合并类名（字符串 / 数组 / { cls: bool }），用于条件类名
 * keyframes({...})    生成 @keyframes 与动画名，animationName 直接用它
 * injectGlobal({...}) 注入全局样式（重置、字体、CSS 变量等）
 * css.reset()         清空已注入样式（单测 / 换肤等场景）
 */

import {
  serializeObject,
  serializeTemplate,
  serializeInline,
  hasFunctionValue,
  isPlainObject,
} from "./serialize";
import {
  insertRule,
  hasRule,
  ruleCount,
  getStyleText,
  getStyleElement,
  reset,
} from "./sheet";

/** 类名前缀 */
const PREFIX = "cij";
/** 选择器占位符：先用它序列化，算出类名后再替换（避免"类名依赖 CSS、CSS 又依赖类名"） */
const SEL = "@@self@@";

/** djb2 字符串哈希 → 36 进制短串 */
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

/** 是不是标签模板的 strings 数组 */
function isTemplate(strings) {
  return Array.isArray(strings) && Array.isArray(strings.raw);
}

/**
 * 把入参解析成「蓝图」（此时选择器还是占位符）
 * 支持：css({...}) / css`...` / css('color:red') / 多个对象合并
 */
function toBlueprint(args, props) {
  // 函数式：css(props => ({...}))，函数也可返回模板字符串
  if (typeof args[0] === "function") {
    const result = args[0](props);
    if (isTemplate(result))
      return SEL + "{" + serializeTemplate(result, [], props) + "}";
    if (isPlainObject(result)) return serializeObject(result, SEL).join("");
    return SEL + "{" + String(result == null ? "" : result) + "}";
  }
  // 标签模板
  if (isTemplate(args[0])) {
    const [strings, ...values] = args;
    const _s = serializeTemplate(strings, values, props);
    return SEL + "{" + _s + "}";
  }
  // 对象 / 字符串混合：css({...}, {…})、css('color:red')
  const rules = [];
  args.forEach((arg) => {
    if (arg == null || arg === false) {
      return;
    }
    if (isPlainObject(arg)) {
      serializeObject(arg, SEL, rules);
    } else {
      rules.push(SEL + "{" + String(arg) + "}");
    }
  });
  return rules.join("");
}

/** 蓝图 → 类名（按内容去重注入） */
function makeClass(blueprint) {
  const cls = PREFIX + "-" + hash(blueprint);
  const _clsText = blueprint.split(SEL).join("." + cls);
  insertRule(cls, _clsText);
  return cls;
}

/**
 * 主 API：生成类名（静态）或「props → 类名」的函数（动态）
 * @returns {string|Function}
 */
export function css(...args) {
  const dynamic =
    typeof args[0] === "function" ||
    (isTemplate(args[0]) && hasFunctionValue(args.slice(1)));

  if (dynamic) {
    return (props) => makeClass(toBlueprint(args, props || {}));
  }
  const _print = toBlueprint(args, {});
  return makeClass(_print);
}

/** css 的别名，仅表达「这是动态样式」的语义，便于阅读 */
export const cssDynamic = css;

/**
 * 合并类名：cx('a', cond && 'b', ['c'], { d: true })
 * @returns {string}
 */
export function cx(...args) {
  const out = [];
  const walk = (value) => {
    if (!value) {
      return;
    }
    if (typeof value === "string" || typeof value === "number") {
      out.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      for (const key in value) {
        if (value[key]) {
          out.push(key);
        }
      }
    }
  }
  args.forEach(walk);
  return out.join(" ");
}

/**
 * 声明 @keyframes，返回动画名（可直接写进 animationName / animation 简写）
 *   const spin = keyframes({ from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } })
 *   const spin2 = keyframes`0% { opacity: 0 } 100% { opacity: 1 }`
 */
export function keyframes(stringsOrObj, ...values) {
  let body = "";
  if (isTemplate(stringsOrObj)) {
    body = serializeTemplate(stringsOrObj, values);
  } else if (isPlainObject(stringsOrObj)) {
    for (const key in stringsOrObj) {
      if (!Object.prototype.hasOwnProperty.call(stringsOrObj, key)) {
        continue;
      }
      const _s = serializeInline(stringsOrObj[key])
      body += key + "{" + _s + "}";
    }
  }
  const name = PREFIX + "-kf-" + hash(body);
  insertRule("@keyframes:" + name, "@keyframes " + name + "{" + body + "}");
  return name;
}

/**
 * 注入全局样式：键是选择器，值是样式对象；也支持标签模板
 *   injectGlobal({ body: { margin: 0 }, ':root': { '--brand': '#326fff' } })
 *   injectGlobal`*, *::before { box-sizing: border-box }`
 */
export function injectGlobal(stringsOrObj, ...values) {
  let text = "";
  if (isTemplate(stringsOrObj)) {
    text = serializeTemplate(stringsOrObj, values);
  } else if (isPlainObject(stringsOrObj)) {
    const rules = [];
    for (const selector in stringsOrObj) {
      if (!Object.prototype.hasOwnProperty.call(stringsOrObj, selector)) {
        continue;
      }
      serializeObject(stringsOrObj[selector], selector, rules);
    }
    text = rules.join("");
  }
  // 内容哈希做 id → 重复调用只注入一次
  insertRule("global:" + hash(text), text);
  return text;
}

/** 调试用：当前注入的全部 CSS 文本 */
export function getCssText() {
  return getStyleText();
}

// 挂在 css 上，保持单一入口的调用手感（css.reset() / css.sheet() ...）
css.cx = cx;
css.keyframes = keyframes;
css.injectGlobal = injectGlobal;
css.getCssText = getCssText;
css.ruleCount = ruleCount;
css.hasRule = hasRule;
css.getStyleElement = getStyleElement;
css.reset = reset;
css.prefix = PREFIX;

export {
  ruleCount,
  hasRule,
  getStyleElement,
  reset,
  serializeObject,
  serializeTemplate,
};

export default css;
