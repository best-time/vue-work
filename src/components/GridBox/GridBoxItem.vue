<template>
  <component :is="tag" class="gb-item" :style="itemStyle">
    <slot />
  </component>
</template>

<script>
/**
 * GridBoxItem —— 栅格子项（非响应式）
 *
 * 所有能力都是「写死的 props」，没有断点对象：
 *   · span      跨列：2 / 'full' / '2 / 4'
 *   · row-span  跨行：2 / '2 / 4'
 *   · start     起始列（grid-column-start）
 *   · row-start 起始行（grid-row-start）
 *   · align / justify  单独对齐自己（align-self / justify-self）
 *   · min-width / max-width  单独覆盖宽度约束
 *
 * 默认给 min-width:0 —— grid 子项默认 min-width:auto 会被长内容（长英文、表格）撑破，
 * 显式归零让它老老实实按列宽收缩。
 */
import { isEmpty, spanValue, toNumber, toUnit } from "./utils";

export default {
  name: "GridBoxItem",
  props: {
    /** 渲染标签 */
    tag: { type: String, default: "div" },

    /** 跨列数：2 / 'full' / '2 / 4' */
    span: { type: [Number, String], default: undefined },

    /** 跨行数：2 / '2 / 4' */
    rowSpan: { type: [Number, String], default: undefined },

    /** 起始列（grid-column-start） */
    start: { type: [Number, String], default: undefined },

    /** 起始行（grid-row-start） */
    rowStart: { type: [Number, String], default: undefined },

    /** align-self：start / center / end / stretch，覆盖容器的 align */
    align: { type: String, default: undefined },

    /** justify-self：start / center / end / stretch，覆盖容器的 justify */
    justify: { type: String, default: undefined },

    /** 排序（CSS order），数值越小越靠前 */
    order: { type: [Number, String], default: undefined },

    /** 自己这格的最小宽度，不传 = 0（防止内容撑破列宽） */
    minWidth: { type: [Number, String], default: undefined },

    /** 自己这格的最大宽度，不传 = 不限 */
    maxWidth: { type: [Number, String], default: undefined },
  },
  computed: {
    itemStyle() {
      const style = {
        // 不传就用 0，别让长内容把列撑破
        minWidth: isEmpty(this.minWidth) ? 0 : toUnit(this.minWidth),
        boxSizing: "border-box",
      };

      const col = spanValue(this.span);
      if (col) style.gridColumn = col;

      const row = spanValue(this.rowSpan);
      if (row) {
        style.gridRow = row;
      }

      // start 比 span 里的隐式起点更具体，允许覆盖
      // （gridColumnStart / gridRowStart 在 Vue 的无单位白名单里，数字不会被补 px）
      if (!isEmpty(this.start)) {
        style.gridColumnStart = toNumber(this.start);
      }
      if (!isEmpty(this.rowStart)) {
        style.gridRowStart = toNumber(this.rowStart);
      }

      if (this.align) {
        style.alignSelf = this.align;
      }
      if (this.justify) {
        style.justifySelf = this.justify;
      }
      if (!isEmpty(this.order)) {
        style.order = toNumber(this.order);
      }
      if (!isEmpty(this.maxWidth)) {
        style.maxWidth = toUnit(this.maxWidth);
      }

      return style;
    },
  },
};
</script>
