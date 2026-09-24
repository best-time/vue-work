/**
 * GridBox 公共组件入口（非响应式栅格，纯 CSS Grid + 内联 style）
 *
 * 使用：main.js 里 `import '@/components/GridBox'` 即可，
 *       之后模板里直接用 <grid-box> / <grid-box-item>（也支持 PascalCase）。
 *
 * 由两个组件组成：
 *   <GridBox>     容器：列数 / 单元格最小最大宽度 / 间隔 / 容器宽度 / 对齐 / 数据模式
 *   <GridBoxItem> 子项：跨列、跨行、起始位置、自身对齐、自身宽度约束
 *
 * 没有断点、没有 @media、没有 resize 监听、没有动态样式表 —— 改 props 即改布局。
 * 需要视口自适应请用响应式版 <grid>（components/GridLayout）。
 */
import Vue from "vue";
import GridBox from "./GridBox.vue";
import GridBoxItem from "./GridBoxItem.vue";

const components = { GridBox, GridBoxItem };

const install = (vue) => {
  Object.keys(components).forEach((name) =>
    vue.component(name, components[name])
  );
};

/**
 * ⚠️ 这里必须直接执行一次注册（不能只靠 window.Vue 那个判断）：
 *   webpack / vite 打包时，Vue 是「被 import 的模块」，不会挂到 window 上，
 *   若只写 `if (window.Vue) install(window.Vue)`，install 永远不会执行 ——
 *   模板里的 <grid-box> / <grid-box-item> 会变成「未知自定义元素」，
 *   容器没有 display:grid，子项各占一行，表现为「看不到多列」。
 */
install(Vue);

// <script> 直接引入、Vue 挂在 window 上的场景再注册一次（install 幂等）
// if (typeof window !== "undefined" && window.Vue && window.Vue !== Vue)
//   install(window.Vue);

export { GridBox, GridBoxItem };
export * from "./utils";

export default { install, GridBox, GridBoxItem };
