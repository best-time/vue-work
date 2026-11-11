<template>
  <div class="stat-row stat-row--4">
    <div
      v-for="(k, i) in kpis"
      :key="k.l"
      class="stat-c kpi"
      :style="{ '--ac': k.ac, '--ac2': k.ac2, '--ac-s': k.acs }"
      @click="$emit('pick', k)"
    >
      <div class="kp-h">
        <div class="sl">{{ k.l }}</div>
        <i class="kp-ic" v-html="KPI_ICONS[i]"></i>
      </div>
      <div class="sv">{{ k.v }}</div>
      <div class="ss">
        <span v-if="k.act" class="ss-act">{{ k.act }}</span>
        <template v-if="k.act"> · </template>{{ k.s }}
      </div>
    </div>
  </div>
</template>

<script>
import { KPI_ICONS } from '../mock'

/**
 * KPI 四联卡
 * ------------------------------------------------------------
 * kpis 由父级按「已生效」的查询条件算好后传入（l / v / s / act / ac / ac2 / acs），
 * 这里只做渲染；点卡片把整条数据回抛，文案按 k.l 分发在父级。
 */
export default {
  name: 'RcdKpiRow',

  props: {
    kpis: { type: Array, default: () => [] },
  },

  data() {
    // 模板拿不到 import 进来的常量，挂到 data 上
    return { KPI_ICONS }
  },
}
</script>
