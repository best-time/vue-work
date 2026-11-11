<template>
  <div>
    <div class="sec-t">
      招聘流程转化（纵向漏斗）
      <span style="margin-left: auto; display: flex; align-items: center; gap: 6px; font-weight: 400">
        <span class="hint" style="margin: 0">计划实施</span>
        <select
          class="sel"
          v-model="implModel"
          style="min-width: 200px"
          title="仅招聘流程转化跟计划实施绑定：选中具体实施后，漏斗仅统计该实施的投递记录"
        >
          <option value="">全部计划实施</option>
          <option v-for="im in impls" :key="im.id" :value="im.id">{{ im.name }}（{{ im.status }}）</option>
        </select>
      </span>
    </div>
    <template v-if="funnel[0].v > 0">
      <div
        v-for="(f, i) in funnel"
        :key="f.n"
        class="fun-row"
        :style="{ '--fc': FR[i % 7][0], '--fc2': FR[i % 7][1], '--fc-s': FR[i % 7][2] }"
      >
        <span>{{ f.n }}</span>
        <div class="fun-bar">
          <span :style="{ '--w': barW(f.v) + '%', width: barW(f.v) + '%' }"></span>
        </div>
        <div class="fun-cv">
          <b>{{ f.v }}</b>
          <template v-if="i > 0"> ｜ {{ pct(f.v, funnel[i - 1].v) }}%</template>
        </div>
      </div>
      <div class="hint">
        总体转化率（投递→确认入职）：<b style="color: var(--primary)">{{ pct(funnel[6].v, funnel[0].v) }}%</b>
      </div>
    </template>
    <div v-else class="empty">当前筛选条件下暂无招聘流程数据</div>
  </div>
</template>

<script>
import { funnelOf, pct as pctOf } from '../mock'

/** 漏斗 7 级的递进色阶（冷 → 暖 → 达成绿） */
const FR = [
  ['#3b82f6', '#93c5fd', 'rgba(59,130,246,.55)'],
  ['#0ea5e9', '#7dd3fc', 'rgba(14,165,233,.55)'],
  ['#06b6d4', '#67e8f9', 'rgba(6,182,212,.55)'],
  ['#14b8a6', '#5eead4', 'rgba(20,184,166,.55)'],
  ['#8b5cf6', '#c4b5fd', 'rgba(139,92,246,.55)'],
  ['#f59e0b', '#fcd34d', 'rgba(245,158,11,.55)'],
  ['#22c55e', '#86efac', 'rgba(34,197,94,.55)'],
]

/**
 * 招聘流程转化漏斗
 * ------------------------------------------------------------
 * impls 是父级按「机构 / 年度 / 类型 / 统计时间」筛过的计划实施，
 * impl 是额外绑定的单条实施（空 = 全部）—— 只有漏斗吃这个过滤，
 * 因为投递记录本来就挂在具体实施上。
 */
export default {
  name: 'RcdFunnelChart',

  props: {
    impls: { type: Array, default: () => [] },
    impl: { type: String, default: '' },
  },

  data() {
    return { FR }
  },

  computed: {
    implModel: {
      get() {
        return this.impl
      },
      set(v) {
        this.$emit('update:impl', v)
      },
    },
    funnelImpls() {
      return this.impl ? this.impls.filter((im) => im.id === this.impl) : this.impls
    },
    funnel() {
      return funnelOf(this.funnelImpls)
    },
    funnelMax() {
      return Math.max(1, ...this.funnel.map((f) => f.v))
    },
  },

  methods: {
    pct(a, b) {
      return pctOf(a, b)
    },
    barW(v) {
      // 最小 6%，避免「有 1 个人」时进度条看不见
      return Math.max(6, Math.round((v / this.funnelMax) * 1000) / 10)
    },
  },
}
</script>
