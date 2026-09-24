<template>
  <component :is="tag" class="gb-grid" :style="gridStyle">
    <!-- 数据模式：给 items 数组，配合默认插槽（作用域拿到 item / index）自动铺子项 -->
    <template v-if="isDataMode">
      <grid-box-item
        v-for="(item, index) in items"
        :key="itemKeyOf(item, index)"
        :span="attrOf(item, spanKey)"
        :row-span="attrOf(item, rowSpanKey)"
      >
        <slot :item="item" :index="index" />
      </grid-box-item>

      <div
        v-if="!items.length"
        class="gb-grid__empty"
        style="grid-column: 1 / -1"
      >
        <slot name="empty">{{ emptyText }}</slot>
      </div>
    </template>

    <!-- 自由模式：调用方自己写 <grid-box-item> -->
    <slot v-else />
  </component>
</template>

<script>
/**
 * GridBox —— 非响应式栅格容器（CSS Grid 实现）
 *
 * 特点：一切靠 props 描述，没有断点、没有 @media、没有 resize 监听。
 *   列数        cols="4"（或 cols="auto" 由宽度决定、或直接给模板字符串）
 *   间隔        gap / row-gap / col-gap
 *   单元格宽度  min-col-width / max-col-width   → 落在 minmax(min, max) 上
 *   容器宽度    width / min-width / max-width + center（水平居中）
 *   对齐        align / justify / align-content / justify-content / auto-rows / dense
 *
 * 全部算成内联 style，所以不需要额外样式表，也不会污染全局 CSS。
 * 需要「窗口变化自动换列」的场景请用响应式版 <grid>（components/GridLayout）。
 */
import GridBoxItem from "./GridBoxItem.vue";
import {
  DEFAULT_COLS,
  buildTemplateColumns,
  gapParts,
  isEmpty,
  toUnit,
} from "./utils";

export default {
  name: "GridBox",
  components: { GridBoxItem },
  props: {
    /** 渲染标签 */
    tag: { type: String, default: "div" },

    /**
     * 列数：
     *   数字 / 数字字符串 → repeat(n, minmax(min-col-width, max-col-width))
     *   'auto'            → repeat(auto-fit, minmax(...))  由列宽反推列数
     *   'auto-fill'       → 同上但保留空轨道
     *   其它字符串        → 直接当 grid-template-columns 用（如 '200px 1fr 1fr'）
     */
    cols: { type: [Number, String], default: undefined },

    /** 每列最小宽度 → minmax 的第一个参数（不传 = 0，即列可以无限压扁） */
    minColWidth: { type: [Number, String], default: undefined },

    /** 每列最大宽度 → minmax 的第二个参数（不传 = 1fr，即平分剩余宽度） */
    maxColWidth: { type: [Number, String], default: undefined },

    /** 间距：数字 / CSS 长度 / [行间距, 列间距] */
    gap: { type: [Number, String, Array], default: 16 },

    /** 单独指定行间距，优先级高于 gap */
    rowGap: { type: [Number, String], default: undefined },

    /** 单独指定列间距，优先级高于 gap */
    colGap: { type: [Number, String], default: undefined },

    /** 容器固定宽度 */
    width: { type: [Number, String], default: undefined },

    /** 容器最小宽度 */
    minWidth: { type: [Number, String], default: undefined },

    /** 容器最大宽度（常配合 center 做居中限宽） */
    maxWidth: { type: [Number, String], default: undefined },

    /** 容器水平居中（margin: 0 auto） */
    center: { type: Boolean, default: false },

    /** align-items：默认 stretch，让同行子项等高 */
    align: { type: String, default: "stretch" },

    /** justify-items */
    justify: { type: String, default: "stretch" },

    /** align-content：多行整体在容器里的纵向分布 */
    alignContent: { type: String, default: undefined },

    /** justify-content：多列整体在容器里的横向分布（max-col-width 固定列宽时常用 center） */
    justifyContent: { type: String, default: undefined },

    /** grid-auto-rows：隐式行高，如 20 / '120px' */
    autoRows: { type: [Number, String], default: undefined },

    /** grid-auto-flow: row dense —— 让后面的小格子补前面的空洞 */
    dense: { type: Boolean, default: false },

    /** 数据模式：给了数组就按 items 自动铺子项 */
    items: { type: Array, default: undefined },

    /** 数据模式下从 item 上取跨列数的字段名 */
    spanKey: { type: String, default: "span" },

    /** 数据模式下从 item 上取跨行数的字段名 */
    rowSpanKey: { type: String, default: "rowSpan" },

    /** 数据模式下的 key：字段名或 (item, index) => key */
    itemKey: { type: [String, Function], default: "id" },

    /** 数据模式且 items 为空时的占位文案 */
    emptyText: { type: String, default: "暂无数据" },
  },
  computed: {
    gridStyle() {
      const style = { display: "grid" };

      style.gridTemplateColumns = buildTemplateColumns(
        this.cols,
        this.minColWidth,
        this.maxColWidth,
        DEFAULT_COLS
      );

      // gap：row-gap / col-gap 优先于数组或单值
      const parts = gapParts(this.gap);
      const rowGap = this.rowGap !== undefined ? this.rowGap : parts[0];
      const colGap = this.colGap !== undefined ? this.colGap : parts[1];
      if (!isEmpty(rowGap)) style.rowGap = toUnit(rowGap);
      if (!isEmpty(colGap)) style.columnGap = toUnit(colGap);

      // 容器自身尺寸
      if (!isEmpty(this.width)) style.width = toUnit(this.width);
      if (!isEmpty(this.minWidth)) style.minWidth = toUnit(this.minWidth);
      if (!isEmpty(this.maxWidth)) style.maxWidth = toUnit(this.maxWidth);
      if (this.center) style.margin = "0 auto";

      if (this.align) style.alignItems = this.align;
      if (this.justify) style.justifyItems = this.justify;
      if (this.alignContent) style.alignContent = this.alignContent;
      if (this.justifyContent) style.justifyContent = this.justifyContent;
      if (!isEmpty(this.autoRows)) style.gridAutoRows = toUnit(this.autoRows);
      if (this.dense) style.gridAutoFlow = "row dense";

      return style;
    },

    isDataMode() {
      return Array.isArray(this.items);
    },
  },
  methods: {
    itemKeyOf(item, index) {
      const key = this.itemKey;
      if (typeof key === "function") return key(item, index);
      if (
        typeof key === "string" &&
        item &&
        item[key] !== undefined &&
        item[key] !== null
      ) {
        return item[key];
      }
      return index;
    },
    attrOf(item, key) {
      if (!item || !key) return undefined;
      return item[key];
    },
  },
};
</script>
