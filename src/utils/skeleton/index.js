/**
 * 简易骨架屏（Skeleton Screen）
 *
 * 零依赖：一套微光动画样式（运行时注入，不依赖 scss / 全局样式）+ 一个指令
 * `v-skeleton` + 几个拼占位块的辅助函数。三种写法按场景挑：
 *
 * ─────────────── ① 指令：给「已有真实节点」套骨架态（最省事）───────────────
 *    <h3 v-skeleton="loading">真实标题</h3>
 *    <p  v-skeleton="loading">真实正文……</p>
 *    <img v-skeleton="{ loading, radius: 8 }" :src="cover" />   // 图片见「注意」
 *
 *  原理：元素加属性 [data-sk="on"] 后 → 文字变透明（仍占位，尺寸不变）、
 *  子元素 visibility: hidden、底色换成灰块 + 微光扫过。loading 一关就原样恢复，
 *  所以**结构尺寸不抖动**，不需要维护两份 DOM。
 *
 * ─────────────── ② 原子块：手摆骨架结构 ───────────────
 *    import { sk, skLine, skCircle, skRect } from '@/utils/skeleton'
 *    <div v-bind="skRect(120, 16)" />          // { class, style } → v-bind 直接用
 *    <div v-bind="skCircle(40)" />
 *    <div v-bind="skLine('60%')" />
 *
 * ─────────────── ③ 多行 / 预设：少写模板 ───────────────
 *    <div v-for="(it, i) in skLines(3)" :key="i" v-bind="it" />   // 末行自动 60% 宽
 *
 *    // render 函数里一把出整块骨架（预设 card / list / article）
 *    render (h) { return renderSkeleton(h, 'card', { lines: 2 }) }
 *    // 或包成函数式组件（见 src/views/SkeletonDemo/index.vue ⑦）
 *
 * ─────────────── 换肤 ───────────────
 *    setSkeletonTheme({ base: '#e6e8eb', highlight: '#fafbfc', duration: '1.2s' })
 *    clearSkeletonTheme()
 *    // 局部暗色：给任意祖先加 class="sk--dark" 即可（CSS 变量继承）
 *
 * ─────────────── 注意 ───────────────
 *  · 指令请绑在**容器元素**上（div / p / h3 / 卡片根节点）。绑到 <img> / <video>
 *    这类「自身就是内容」的元素上无效（它没有文字可以变透明）——图片请用
 *    占位块 + v-if/v-else，或把指令绑到图片的父容器上。
 *  · 骨架态会临时置 pointer-events: none，避免加载中还能点到里面的按钮。
 *  · 本文件的样式是运行时注入的（首次用到时注入一个 <style data-skeleton>），
 *    不依赖 vue.config.js 的 additionalData，所以在任意文件里都能直接用。
 *  · 入口已在模块作用域直接 install(Vue)（项目约定：入口即注册），main.js 里
 *    `import '@/utils/skeleton'` 之后全局可用 v-skeleton。
 */

import Vue from "vue";
import { toStyle } from "../style";

/** 占位块基类 */
export const SK = "sk";
/** 骨架态标记属性：值为 "on" 表示开启 */
export const SK_ATTR = "data-sk";
/** 注入的 <style> 标签标识 */
export const SK_STYLE_TAG = "data-skeleton";

/* ------------------------------------------------------------------ *
 * 主题（CSS 变量）
 * ------------------------------------------------------------------ */

const DEFAULT_THEME = {
  base: "#e8ebf0", // 底色
  highlight: "#f7f9fc", // 微光高光
  radius: "4px", // 默认圆角
  duration: "1.4s", // 一次微光时长
  fadeDuration: ".3s", // 真实内容淡入时长
};

/** 主题字段 → CSS 变量名（顺序即输出顺序） */
const THEME_ORDER = ["base", "highlight", "radius", "duration", "fadeDuration"];
const THEME_VARS = {
  base: "--sk-base",
  highlight: "--sk-highlight",
  radius: "--sk-radius",
  duration: "--sk-duration",
  fadeDuration: "--sk-fade-duration",
};

/** 样式主体（:root 变量由 skeletonStyles 拼在前面） */
const CSS_BODY = `/* ---------- 占位块 ---------- */
.sk {
  display: block;
  position: relative;
  overflow: hidden;
  background-color: var(--sk-base);
  border-radius: var(--sk-radius);
}
/* 微光扫过：用 ::after 做一层高光渐变，translate 走 GPU，不触发重排 */
.sk--animated::after,
[data-sk="on"]::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: translate3d(-100%, 0, 0);
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    var(--sk-highlight) 50%,
    transparent 100%
  );
  animation: sk-shimmer var(--sk-duration) ease-in-out infinite;
  pointer-events: none;
}
@keyframes sk-shimmer {
  from { transform: translate3d(-100%, 0, 0); }
  to   { transform: translate3d(100%, 0, 0); }
}

/* ---------- 动效开关 ---------- */
/* animated: false 时挂 .sk--static：占位块与指令骨架态都要能关掉微光 */
.sk--static::after,
[data-sk="on"].sk--static::after {
  animation: none;
}

/* ---------- 局部暗色：套在任意祖先上，靠 CSS 变量继承生效 ---------- */
.sk--dark {
  --sk-base: #2b3039;
  --sk-highlight: #3b4350;
}

/* ---------- 指令骨架态 ---------- */
[data-sk="on"] {
  position: relative;
  overflow: hidden;
  color: transparent !important;        /* 文字透明但仍在文档流里 → 尺寸不变 */
  background-color: var(--sk-base) !important;
  background-image: none !important;    /* 盖掉原本的渐变/图片背景 */
  border-color: transparent !important;
  box-shadow: none !important;
  text-shadow: none !important;
  border-radius: var(--sk-radius);
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
  cursor: default;
}
/* 子元素整体隐藏（visibility 可被子级覆盖，所以父级保持 visible，只隐子树） */
[data-sk="on"]::before,
[data-sk="on"] > * {
  visibility: hidden !important;
}

/* ---------- 真实内容淡入：<transition name="sk-fade"> ---------- */
.sk-fade-enter-active,
.sk-fade-leave-active {
  transition: opacity var(--sk-fade-duration) ease;
}
.sk-fade-enter,
.sk-fade-leave-to {
  opacity: 0;
}

/* ---------- 无障碍：跟随系统「减少动态效果」 ---------- */
@media (prefers-reduced-motion: reduce) {
  .sk--animated::after,
  [data-sk="on"]::after {
    animation: none;
  }
}
`;

/**
 * 生成完整 CSS 文本（纯函数，SSR / 单测可直接取用）
 * @param {object} [theme] 覆盖默认主题字段
 * @returns {string}
 */
export function skeletonStyles(theme) {
  const t = Object.assign({}, DEFAULT_THEME, theme || {});
  const vars = THEME_ORDER.map((k) => `  ${THEME_VARS[k]}: ${t[k]};`).join(
    "\n"
  );
  return `:root {\n${vars}\n}\n\n${CSS_BODY}`;
}

/* ------------------------------------------------------------------ *
 * 样式注入（幂等）
 * ------------------------------------------------------------------ */

let injected = false;

/** 已注入的 <style> 元素（单测用） */
export function getSkeletonStyleElement() {
  if (typeof document === "undefined") {
    return null;
  }
  return document.querySelector(`style[${SK_STYLE_TAG}]`);
}

/**
 * 注入基础样式；重复调用只会注入一次
 * @param {object} [theme] 仅首次注入时可带主题
 * @returns {boolean} 是否本次真的注入了
 */
export function injectSkeletonStyle(theme) {
  if (typeof document === "undefined") {
    return false;
  }
  if (injected && !theme) {
    return false;
  }
  let el = getSkeletonStyleElement();
  if (!el) {
    el = document.createElement("style");
    el.setAttribute(SK_STYLE_TAG, "");
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = skeletonStyles(theme);
  injected = true;
  return true;
}

/**
 * 换肤：把主题写成 documentElement 上的内联 CSS 变量（优先级高于 <style> 里的 :root）
 * @param {object} theme 只覆盖传入的字段
 */
export function setSkeletonTheme(theme) {
  injectSkeletonStyle();
  if (typeof document === "undefined" || !theme) {
    return;
  }
  const root = document.documentElement;
  THEME_ORDER.forEach((k) => {
    if (theme[k] != null) {
      root.style.setProperty(THEME_VARS[k], theme[k]);
    }
  });
}

/** 清掉 setSkeletonTheme 写的内联变量，回到默认主题 */
export function clearSkeletonTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  THEME_ORDER.forEach((k) => root.style.removeProperty(THEME_VARS[k]));
}

/** 移除注入的样式（单测 / 换主题重注入用） */
export function removeSkeletonStyle() {
  const el = getSkeletonStyleElement();
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
  injected = false;
}

/** 当前注入的 CSS 文本（调试用，未注入时返回将要注入的文本） */
export function getSkeletonCss() {
  const el = getSkeletonStyleElement();
  return el ? el.textContent : skeletonStyles();
}

/* ------------------------------------------------------------------ *
 * 占位块原子
 * ------------------------------------------------------------------ */

/**
 * 生成一个占位块描述 → `{ class, style }`，可直接 `v-bind` 到元素上
 * @param {object} [options]
 * @param {number|string} [options.w|options.width]  宽（数字补 px；0 不补）
 * @param {number|string} [options.h|options.height] 高
 * @param {number|string} [options.radius]           圆角（circle 为真时用 50%）
 * @param {boolean} [options.circle]                 圆形
 * @param {boolean} [options.animated=true]          是否微光动画
 * @param {'dark'} [options.tone]                    局部暗色
 * @param {string} [options.class]                   追加类名
 * @param {object} [options.style]                   追加内联样式（同 toStyle 规则）
 * @returns {{ class: string, style: object }}
 */
export function sk(options) {
  injectSkeletonStyle();
  const o = options || {};
  const cls = [SK];
  if (o.animated === false) {
    cls.push(SK + "--static");
  } else {
    cls.push(SK + "--animated");
  }
  if (o.tone === "dark") {
    cls.push(SK + "--dark");
  }
  if (o.class) {
    cls.push(o.class);
  }

  const style = toStyle(
    {
      width: o.w !== undefined ? o.w : o.width,
      height: o.h !== undefined ? o.h : o.height,
      borderRadius: o.circle ? "50%" : o.radius,
    },
    o.style
  );
  return { class: cls.join(" "), style };
}

/** 一行「文字」占位 */
export function skLine(width, options) {
  return sk(
    Object.assign({ height: 14, radius: 4 }, options, {
      width: width === undefined ? "100%" : width,
    })
  );
}

/** 圆形占位（头像 / 图标） */
export function skCircle(size, options) {
  return sk(
    Object.assign({}, options, { radius: "50%", width: size, height: size })
  );
}

/** 矩形占位（图片 / 封面 / 图表区） */
export function skRect(width, height, options) {
  return sk(Object.assign({ radius: 4 }, options, { width, height }));
}

/** 按比例缩宽度：数字按倍数缩，px / % / rem / em 字符串按倍数缩，其它原样 */
function scaleWidth(width, ratio) {
  if (typeof width === "number") {
    return Math.round(width * ratio);
  }
  if (typeof width === "string") {
    const m = /^([\d.]+)(%|px|rem|em|vw)?$/.exec(width.trim());
    if (m) {
      const value = Number(m[1]) * ratio;
      const num = Number(value.toFixed(2));
      return num + (m[2] || "");
    }
  }
  return width;
}

/**
 * 段落占位：n 行，末行按 lastRatio 收窄（默认 60%，像真的段落）
 * @param {number} [count=3]
 * @param {object} [options] { height, gap, width, lastRatio, radius, ...sk 选项 }
 * @returns {Array<{class:string, style:object}>}
 */
export function skLines(count, options) {
  const n = count === undefined ? 3 : count;
  const o = Object.assign({}, options);
  const fullWidth = o.width === undefined ? "100%" : o.width;
  const lastRatio = o.lastRatio === undefined ? 0.6 : o.lastRatio;
  const gap = o.gap === undefined ? 12 : o.gap;
  const height = o.height === undefined ? 14 : o.height;
  const radius = o.radius === undefined ? 4 : o.radius;
  delete o.width;
  delete o.lastRatio;
  delete o.gap;
  delete o.height;
  delete o.radius;

  const out = [];
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const item = sk(
      Object.assign({}, o, {
        height,
        radius,
        width: isLast ? scaleWidth(fullWidth, lastRatio) : fullWidth,
      })
    );
    if (!isLast) {
      item.style = toStyle(item.style, { marginBottom: gap });
    }
    out.push(item);
  }
  // console.log(out)
  return out;
}

/* ------------------------------------------------------------------ *
 * 预设结构（render 函数）
 * ------------------------------------------------------------------ */

/** 把「节点描述」渲染成 VNode：{ tag, block, style, class, children } */
function buildNode(h, node) {
  if (!node) {
    return null;
  }
  const block = node.block || null;
  const data = {
    class: [node.class, block && block.class],
  };
  const style = toStyle(block && block.style, node.style);
  if (Object.keys(style).length) {
    data.style = style;
  }
  const children = (node.children || [])
    .map((c) => buildNode(h, c))
    .filter(Boolean);
  return children.length
    ? h(node.tag || "div", data, children)
    : h(node.tag || "div", data);
}

/** 预设骨架结构：返回节点描述树 */
const PRESETS = {
  /** 卡片：封面 + 标题 + n 行正文 */
  card(o) {
    const coverHeight = o.coverHeight === undefined ? 120 : o.coverHeight;
    const radius = o.radius === undefined ? 8 : o.radius;
    const titleWidth = o.titleWidth === undefined ? "55%" : o.titleWidth;
    const children = [
      { block: sk({ height: coverHeight, radius }) },
      {
        block: sk({ height: 18, width: titleWidth }),
        style: { marginTop: 16 },
      },
    ];
    skLines(o.lines === undefined ? 2 : o.lines, { gap: 10 }).forEach(
      (b, i) => {
        children.push({ block: b, style: i === 0 ? { marginTop: 12 } : null });
      }
    );
    return { children };
  },
  /** 列表：圆形头像 + 两行文字，重复 count 条 */
  list(o) {
    const count = o.count === undefined ? 3 : o.count;
    const avatarSize = o.avatarSize === undefined ? 40 : o.avatarSize;
    const children = [];
    for (let i = 0; i < count; i++) {
      children.push({
        style: {
          display: "flex",
          alignItems: "center",
          marginBottom: i === count - 1 ? 0 : 18,
        },
        children: [
          { block: skCircle(avatarSize), style: { marginRight: 12 } },
          {
            style: { flex: "1 1 auto", minWidth: 0 },
            children: skLines(2, { gap: 8, height: 12 }).map((b) => ({
              block: b,
            })),
          },
        ],
      });
    }
    return { children };
  },
  /** 文章：标题 + 副信息 + n 行正文 */
  article(o) {
    const lines = o.lines === undefined ? 5 : o.lines;
    const children = [
      { block: sk({ height: 24, width: "45%" }) },
      { block: sk({ height: 12, width: "22%" }), style: { marginTop: 12 } },
    ];
    skLines(lines, { gap: 12, height: 15 }).forEach((b, i) => {
      children.push({ block: b, style: i === 0 ? { marginTop: 20 } : null });
    });
    return { children };
  },
};

/**
 * 一把渲染出整块骨架（配合 render 函数 / 函数式组件）
 * @param {Function} h Vue 的 createElement
 * @param {'card'|'list'|'article'} [preset='card']
 * @param {object} [options] 各预设自己的参数
 * @returns {VNode}
 */
export function renderSkeleton(h, preset, options) {
  const build = PRESETS[preset] || PRESETS.card;
  return buildNode(h, build(options || {}));
}

/** 可用预设名 */
export const SK_PRESETS = Object.keys(PRESETS);

/* ------------------------------------------------------------------ *
 * 指令 v-skeleton
 * ------------------------------------------------------------------ */

/** 解析指令值：falsy → 关闭；true → 默认开启；对象 → { loading, width, height, radius, animated, tone, class } */
function readOptions(value) {
  if (value === false || value === null || value === undefined) {
    return null;
  }
  if (value === true) {
    return {};
  }
  if (typeof value === "object") {
    return value.loading === false ? null : value;
  }
  return {};
}

function turnOn(el, options) {
  injectSkeletonStyle();
  // 只在第一次开启时记录原始内联样式，关闭时原样还回去
  if (!el.__skSaved) {
    el.__skSaved = {
      borderRadius: el.style.borderRadius,
      width: el.style.width,
      height: el.style.height,
    };
  }
  // 先清掉上一次加的类（参数可能变了：animated / tone / class）
  (el.__skClass || []).forEach((c) => el.classList.remove(c));

  const cls = [];
  if (options.animated === false) {
    cls.push(SK + "--static");
  } else {
    cls.push(SK + "--animated");
  }
  if (options.tone === "dark") {
    cls.push(SK + "--dark");
  }
  // class 可能是一串用空格分隔的类名，逐个加（classList.add 不支持带空格）
  if (options.class) {
    cls.push.apply(cls, String(options.class).split(/\s+/));
  }
  el.__skClass = cls;
  cls.forEach((c) => c && el.classList.add(c));

  const inline = toStyle({
    borderRadius: options.radius,
    width: options.width,
    height: options.height,
  });

  Object.keys(inline).forEach((k) => {
    el.style[k] = inline[k];
  });

  el.setAttribute(SK_ATTR, "on");
}

function turnOff(el) {
  if (el.hasAttribute(SK_ATTR)) {
    el.removeAttribute(SK_ATTR);
  }
  (el.__skClass || []).forEach((c) => el.classList.remove(c));
  el.__skClass = null;
  if (el.__skSaved) {
    el.style.borderRadius = el.__skSaved.borderRadius;
    el.style.width = el.__skSaved.width;
    el.style.height = el.__skSaved.height;
    el.__skSaved = null;
  }
}

function apply(el, value) {
  const options = readOptions(value);
  if (!options) {
    turnOff(el);
    return;
  }
  turnOn(el, options);
}

/**
 * 指令定义（也支持局部注册：directives: { skeleton: vSkeleton }）
 *   <div v-skeleton="loading">
 *   <div v-skeleton="{ loading: loading, radius: 8, tone: 'dark', animated: false }">
 */
export const vSkeleton = {
  bind(el, binding) {
    apply(el, binding.value);
  },
  update(el, binding) {
    apply(el, binding.value);
  },
  unbind(el) {
    turnOff(el);
    delete el.__skSaved;
    delete el.__skClass;
  },
};

/* ------------------------------------------------------------------ *
 * 插件安装
 * ------------------------------------------------------------------ */

/** 暴露给 `this.$skeleton` 的 API 集合 */
export const skeletonApi = {
  sk,
  skLine,
  skCircle,
  skRect,
  skLines,
  renderSkeleton,
  setSkeletonTheme,
  clearSkeletonTheme,
  injectSkeletonStyle,
  skeletonStyles,
  getSkeletonCss,
  SK,
  SK_PRESETS,
};

/**
 * 注册指令 + 挂 `$skeleton`
 * @param {Function} VueCtor Vue 构造器（Vue.use 会自动传入）
 * @param {object}   [options] { theme } 首次注入时附带主题
 */
export function install(VueCtor, options) {
  VueCtor.directive("skeleton", vSkeleton);
  VueCtor.prototype.$skeleton = skeletonApi;
  if (options && options.theme) {
    setSkeletonTheme(options.theme);
  }
}

const plugin = { install };

// 项目约定：入口在模块作用域直接注册，不依赖 window.Vue（webpack 下 window 上没有 Vue）
install(Vue);

export default plugin;
