<template>
  <div class="card tone-teal">
    <div class="card-h">
      <h3>招聘统计分析</h3>
      <span class="hint">
        口径：流程转化按<b>投递记录数</b>；结构与后评价按<b>人数</b>（自然人去重）｜ 当前筛选：<b>{{ scopeLabel }}</b> ·
        {{ year }}年度 · {{ qtype }} · {{ periodLabel }} ｜ 数据随上方查询条件实时联动（流程转化可按计划实施单独过滤）
      </span>
    </div>
    <div class="card-b">
      <div class="grid2">
        <FunnelChart :impls="impls" :impl="impl" @update:impl="$emit('update:impl', $event)" />
        <DonutChart
          :onboard="onboard"
          :year="year"
          :dim="dim"
          :scope-label="scopeLabel"
          :qtype="qtype"
          @update:dim="$emit('update:dim', $event)"
          @goto-candidate="$emit('goto-candidate')"
        />
      </div>
    </div>
  </div>
</template>

<script>
import FunnelChart from './FunnelChart.vue'
import DonutChart from './DonutChart.vue'

/**
 * 招聘统计分析卡（漏斗 + 环图）
 * ------------------------------------------------------------
 * 只做外壳与两栏布局，两个图各自算各自的；
 * impl / dim 用 .sync 透传，是因为换查询条件时父级要能把它们清空。
 */
export default {
  name: 'RcdStatSection',

  components: { FunnelChart, DonutChart },

  props: {
    impls: { type: Array, default: () => [] },
    impl: { type: String, default: '' },
    dim: { type: String, default: '学历' },
    onboard: { type: Number, default: 0 },
    year: { type: String, default: '2026' },
    scopeLabel: { type: String, default: '全省' },
    qtype: { type: String, default: '全部' },
    periodLabel: { type: String, default: '全年' },
  },
}
</script>
