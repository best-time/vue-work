/**
 * 样式对象工具：根据传参生成 Vue `:style` 需要的**对象格式**样式
 *
 * 解决手写内联样式的几个麻烦：数字要自己补单位、空值要自己过滤、
 * margin/padding 简写要自己拼字符串、kebab 键名要自己转驼峰。
 *
 * ─────────────── 用法 ───────────────
 *
 * ① 基础：数字补单位（默认 px），空值自动过滤
 *    toStyle({ width: 120, marginTop: 8, color: null, background: '' })
 *    // => { width: '120px', marginTop: '8px' }
 *
 * ② 简写数组：margin / padding / inset / borderRadius / borderWidth / gap ...
 *    toStyle({ margin: [12, 20], padding: [8, 12, 8, 12], borderRadius: 4 })
 *    // => { margin: '12px 20px', padding: '8px 12px 8px 12px', borderRadius: '4px' }
 *    （非简写属性的数组值保留数组，Vue 会当成「多条值」依次设置，用于渐进增强）
 *
 * ③ kebab 键名自动转驼峰，CSS 变量原样保留
 *    toStyle({ 'font-size': 14, '--brand': '#326fff' })
 *    // => { fontSize: '14px', '--brand': '#326fff' }
 *
 * ④ 多组样式合并（后者覆盖前者，方便写条件样式）
 *    toStyle(base, disabled && { opacity: 0.5 }, theme === 'danger' && { color: '#ff3b3b' })
 *
 * ⑤ 传函数：返回「props => 样式对象」，在 computed 里调用即自动响应
 *    const boxStyle = (props) => ({ width: props.size, padding: [6, 12] })
 *    const toBoxStyle = toStyle(boxStyle)
 *    computed: { boxStyle() { return toBoxStyle(this) } }
 *
 * ⑥ 自定义单位 / 追加无单位属性
 *    toStyle({ width: 2, zIndex: 10 }, { unit: 'rem' })
 *    // => { width: '2rem', zIndex: 10 }        // zIndex 属于无单位白名单，不补 rem
 *    toStyle({ flexBasis: 0 }, { unit: 'rem', unitless: ['flexBasis'] })
 *
 * 说明：`!important` 写在值里（'12px !important'）会原样保留；嵌套对象（'&:hover' 之类）
 *      内联样式无法表达，会被忽略并给出提示，请改用 css-in-js（src/utils/css-in-js）。
 */

/** 不需要补单位的属性白名单（覆盖 CSS 里"数字即合法值"的常见属性） */
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
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  "strokeOpacity",
  "strokeWidth",
]);

/** 数组值按「四边简写」拼成字符串的属性（其它属性的数组保留原样给 Vue 做多值兜底） */
const SHORTHAND = new Set([
  "margin",
  "padding",
  "inset",
  "borderRadius",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "gap",
  "rowGap",
  "columnGap",
  "backgroundPosition",
  "translate",
]);

const cssVarRE = /^--/;

/** kebab-case → camelCase（CSS 变量保持原样） */
function camelize(key) {
  if (cssVarRE.test(key)) return key;
  return key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** 给数字补单位（0 与无单位属性不补） */
function withUnit(key, value, unit, unitless) {
  if (typeof value !== "number" || !isFinite(value)) {
    return value;
  }
  if (value === 0 || unitless.has(key)) {
    return value;
  }
  return value + unit;
}

/**
 * 把单个属性值转换成最终写进 `el.style` 的值
 * @returns {*} 数字 / 字符串 / 数组
 */
export function toStyleValue(key, value, unit = "px", unitless = UNITLESS) {
  if (Array.isArray(value)) {
    // 简写属性：每项按同样规则补单位后拼成字符串
    if (SHORTHAND.has(key)) {
      return value.map((v) => withUnit(key, v, unit, unitless)).join(" ");
    }
    // 其它属性：保留数组（Vue 支持数组值，等价于按顺序设值做兜底），但内部数字补单位
    return value.map((v) => withUnit(key, v, unit, unitless));
  }
  return withUnit(key, value, unit, unitless);
}

/** 值是否要丢掉（null / undefined / '' / false / NaN，0 保留） */
function isEmptyValue(value) {
  if (value == null || value === false || value === "") {
    return true;
  }
  return typeof value === "number" && isNaN(value);
}

/** 是否为纯对象（数组 / null / 函数不算） */
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const warned = new Set();

/**
 * 生成对象格式的样式
 * @param {...(object|false|null|undefined|Function)} args 样式对象（可多个，后者覆盖前者）；传函数则返回「props => 样式对象」
 * @param {object} [options] 选项，仅对最后一个参数无效时可省略
 * @param {string} [options.unit='px'] 数字补的单位
 * @param {string[]} [options.unitless] 追加的无单位属性
 * @param {boolean} [options.camelize=true] 是否把 kebab 键名转驼峰
 * @returns {object|Function} 样式对象（或 props => 样式对象 的函数）
 */
export function toStyle(...args) {
  // 选项只在「样式对象之外还多传了一个选项对象」时生效，避免误吞样式
  let options = {};
  const last = args[args.length - 1];
  if (args.length > 1 && isPlainObject(last) && isOptions(last))
    options = args.pop();

  const unit = options.unit === undefined ? "px" : options.unit;
  const shouldCamelize = options.camelize !== false;
  const unitless =
    options.unitless && options.unitless.length
      ? new Set([...UNITLESS, ...options.unitless])
      : UNITLESS;

  // 函数形式：返回 props => 样式对象
  if (typeof args[0] === "function") {
    const fn = args[0];
    return (props) =>
      normalize([fn(props)], { unit, shouldCamelize, unitless });
  }

  return normalize(args, { unit, shouldCamelize, unitless });
}

/** 判断对象是不是「选项」（只含已知选项键） */
function isOptions(obj) {
  const KNOWN = ["unit", "unitless", "camelize"];
  const keys = Object.keys(obj);
  return (
    keys.length > 0 &&
    keys.every((k) => KNOWN.indexOf(k) >= 0) &&
    (typeof obj.unit === "string" ||
      Array.isArray(obj.unitless) ||
      typeof obj.camelize === "boolean")
  );
}

/** 合并多组样式 → 规范化后的样式对象 */
function normalize(styles, { unit, shouldCamelize, unitless }) {
  const out = {};
  styles.forEach((style) => {
    if (!isPlainObject(style)) return;
    for (const rawKey in style) {
      if (!Object.prototype.hasOwnProperty.call(style, rawKey)) continue;
      const key = shouldCamelize ? camelize(rawKey) : rawKey;
      const value = style[rawKey];

      if (value == null || value === "") {
        continue;
      }
      // 嵌套对象（&:hover / @media）内联样式表达不了，忽略并提示一次
      if (isPlainObject(value)) {
        if (!warned.has(rawKey)) {
          warned.add(rawKey);
          console.warn(
            `[toStyle] 嵌套样式 "${rawKey}" 无法用于内联 style，已忽略；需要伪类/媒体查询请用 src/utils/css-in-js`
          );
        }
        continue;
      }
      if (isEmptyValue(value)) {
        continue;
      }

      out[key] = toStyleValue(key, value, unit, unitless);
    }
  });
  return out;
}

/** 数字 / 字符串 → 带单位的样式值（小工具，便于零散拼样式） */
export function px(value, unit = "px") {
  return typeof value === "number" && value !== 0 && isFinite(value)
    ? `${value}${unit}`
    : value;
}

toStyle.px = px;
toStyle.toStyleValue = toStyleValue;
toStyle.UNITLESS = UNITLESS;
toStyle.SHORTHAND = SHORTHAND;

export default toStyle;
