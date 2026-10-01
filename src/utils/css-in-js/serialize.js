/**
 * css-in-js · 序列化层
 *
 * 把 JS 对象 / 标签模板 转成 CSS 文本。参考 emotion 的规则，只保留最常用的部分：
 *   - 驼峰属性名 → 连字符（backgroundColor → background-color），`--css-var` 原样保留
 *   - 数字自动补 px（zIndex / opacity / lineHeight 等无单位属性除外，见 UNITLESS）
 *   - 嵌套：`&:hover` → 拼到当前选择器；`@media` 等 at-rule → 原样包裹
 *   - 值数组 → 多条同名声明（按数组顺序输出，后面的生效，前面可作兜底）
 */

/** 不需要补 px 的属性（与 React 的 unitless 白名单一致，按需增删） */
const UNITLESS = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageSlice",
  "columnCount",
  "flex",
  "flexGrow",
  "flexShrink",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  "strokeOpacity",
  "strokeWidth",
]);

/** 驼峰 → 连字符；CSS 变量（--x）原样返回 */
export function hyphenate(key) {
  if (key.charAt(0) === "-" && key.charAt(1) === "-") {
    return key;
  }
  return key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

/** 是否纯对象（Array / null / 函数都不算） */
export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** 单个值 → CSS 值（数字补 px） */
function toCssValue(key, value) {
  if (typeof value === "number" && value !== 0 && !UNITLESS.has(key)) {
    return value + "px";
  }
  return String(value);
}

/** 一组声明（对象里非嵌套的部分）→ "a:1;b:2" */
function serializeDecls(obj) {
  const decls = [];
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }
    const value = obj[key];
    if (value == null || value === "" || value === false) {
      continue;
    }
    if (isPlainObject(value)) {
      continue;
    }
    if (Array.isArray(value)) {
      // 展开成多条同名声明（按数组顺序输出：后面的生效，前面可作兜底）
      value.forEach((v) => {
        if (v == null || v === "") {
          return;
        }
        const _k = hyphenate(key)
        const _v = toCssValue(key, v)
        decls.push(_k + ":" + _v);
      });
    } else {
      const _k = hyphenate(key)
      const _v = toCssValue(key, value)
      decls.push(_k + ":" + _v);
    }
  }
  return decls;
}

/**
 * 对象 → CSS 规则数组（含嵌套）
 * @param {object} obj 样式对象
 * @param {string} selector 当前选择器（可含占位符，由调用方最后替换）
 * @param {string[]} [out] 输出数组（便于嵌套时闭合顺序）
 * @returns {string[]} 规则文本数组
 */
export function serializeObject(obj, selector, out) {
  const rules = out || [];
  const decls = serializeDecls(obj);
  if (decls.length) {
    rules.push(selector + "{" + decls.join(";") + "}");
  }

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }
    const value = obj[key];
    if (!isPlainObject(value)) {
      continue;
    }
    if (key.charAt(0) === "@") {
      // @media / @supports / @keyframes 等 at-rule：内部规则原样包裹
      const inner = [];
      serializeObject(value, selector, inner);
      rules.push(key + "{" + inner.join("") + "}");
    } else if (key.indexOf("&") >= 0) {
      // & 是当前选择器的占位符：&:hover / &.is-active / & + &
      serializeObject(value, key.split("&").join(selector), rules);
    } else {
      // 无 & 的嵌套 = 后代选择器（emotion 同样语义）
      serializeObject(value, selector + " " + key, rules);
    }
  }
  return rules;
}

/** 对象 → 内联声明串（模板里插对象时用，忽略嵌套） */
export function serializeInline(obj) {
  return serializeDecls(obj).join(";");
}

/**
 * 标签模板 → CSS 文本（插值：字符串/数字直接拼，对象转声明串，函数用 props 求值）
 * @param {string[]} strings 模板静态片段
 * @param {any[]} values 插值
 * @param {object} [props] 动态求值用的 props
 */
export function serializeTemplate(strings, values, props) {
  let text = "";
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i >= values.length) {
      continue;
    }
    let v = values[i];
    if (typeof v === "function") {
      v = v(props);
    }
    if (v == null || v === false) {
      continue;
    }
    text += isPlainObject(v) ? serializeInline(v) : String(v);
  }
  return text;
}

/** 模板里是否含函数插值（含则整体是动态样式，需要 props） */
export function hasFunctionValue(values) {
  return (values || []).some((v) => typeof v === "function");
}
