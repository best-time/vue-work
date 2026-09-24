/**
 * GridBox 工具方法（非响应式版）
 *
 * 和 GridLayout（响应式版）最大的区别：
 *   · 没有断点、没有 @media、没有动态生成的类名
 *   · 所有配置都算成「内联 style」直接挂在元素上 → 不需要 styles.js
 *   · 运行时零 resize 监听、零 DOM 操作，纯 props 驱动
 */

/** 默认列数（没传 cols 时） */
export const DEFAULT_COLS = 3;

/** 空值判断（null / undefined / 空字符串都当作「没传」） */
export function isEmpty(value) {
  return value === null || value === undefined || value === "";
}

/**
 * 数字 / 数字字符串 → px；带单位的字符串（50% / 20rem / auto）原样返回
 * 注意吃字符串形式的数字："16" → "16px"（模板里 gap="16" 传进来就是字符串）
 */
export function toUnit(value) {
  if (isEmpty(value)) return "";
  if (typeof value === "number") return value + "px";
  const str = String(value).trim();
  if (str !== "" && !isNaN(Number(str))) return str + "px";
  return str;
}

/** 数字字符串 → 数字，其余原样返回（"3" → 3，"auto" → "auto"） */
export function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const str = value.trim();
    if (str !== "" && !isNaN(Number(str))) return Number(str);
  }
  return value;
}

/** 是否是「数字型列数」（3 / '3'） */
export function isColsCount(value) {
  const n = toNumber(value);
  return typeof n === "number" && isFinite(n) && n > 0;
}

/** 列数归一化成整数（最少 1 列，非法值回落到 fallback） */
export function toColsCount(value, fallback) {
  const n = toNumber(value);
  if (typeof n !== "number" || !isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

/**
 * 算出 grid-template-columns
 *
 *   cols=3                    → repeat(3, minmax(0, 1fr))
 *   cols=3 min-col-width=240  → repeat(3, minmax(240px, 1fr))
 *   cols=3 max-col-width=320  → repeat(3, minmax(0, 320px))
 *   cols='auto'               → repeat(auto-fit, minmax(240px, 1fr))   ← 由宽度决定列数
 *   cols='200px 1fr 1fr'      → 原样透传
 *
 * @param {Number|String} cols   列数 / 'auto' / 'auto-fill' / 直接给的模板字符串
 * @param {*} minColWidth        每列最小宽度（minmax 第一个参数，默认 0）
 * @param {*} maxColWidth        每列最大宽度（minmax 第二个参数，默认 1fr）
 * @param {Number} fallbackCols  没传 cols 时的默认列数
 */
export function buildTemplateColumns(
  cols,
  minColWidth,
  maxColWidth,
  fallbackCols
) {
  const min = isEmpty(minColWidth) ? "0" : String(toUnit(minColWidth));
  const max = isEmpty(maxColWidth) ? "1fr" : String(toUnit(maxColWidth));
  const track = `minmax(${min}, ${max})`;

  if (isEmpty(cols)) return `repeat(${fallbackCols}, ${track})`;

  if (typeof cols === "string") {
    const key = cols.trim().toLowerCase();
    if (key === "auto") return `repeat(auto-fit, ${track})`;
    if (key === "auto-fill") return `repeat(auto-fill, ${track})`;
    // 不是纯数字 → 当成 grid-template-columns 原样用
    if (!isColsCount(cols)) return cols.trim();
  }

  return `repeat(${toColsCount(cols, fallbackCols)}, ${track})`;
}

/**
 * 跨列 / 跨行值 → CSS 值
 *   2 / '2'   → 'span 2'
 *   'full'    → '1 / -1'
 *   '2 / 4'   → 原样透传
 */
export function spanValue(value) {
  if (isEmpty(value)) return "";
  if (typeof value === "number") return `span ${value}`;
  const str = String(value).trim();
  if (str === "") return "";
  if (str.toLowerCase() === "full") return "1 / -1";
  if (!isNaN(Number(str))) return `span ${Number(str)}`;
  return str;
}

/** gap 归一化成 [行间距, 列间距] */
export function gapParts(gap) {
  if (Array.isArray(gap))
    return [gap[0], gap.length > 1 && gap[1] !== undefined ? gap[1] : gap[0]];
  return [gap, gap];
}
