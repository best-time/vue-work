<template>
  <div>
    <div class="sec-t">
      入职人员结构（确认入职人员）
      <span style="margin-left: auto; font-weight: 400">
        <button
          v-for="k in dimKeys"
          :key="k"
          class="lnk"
          :style="k === dim ? 'font-weight:700;text-decoration:underline' : ''"
          @click="$emit('update:dim', k)"
        >
          {{ k }}
        </button>
      </span>
    </div>
    <div class="hint" style="margin-bottom: 6px">
      口径与上方「确认入职人数」一致（{{ scopeLabel }} · {{ year }} · {{ qtypeLabel }}），
      结构合计 = 确认入职人数。
    </div>
    <div v-if="donutTotal > 0" class="donut-wrap">
      <div class="donut" :style="{ background: donutGrad }">
        <div class="donut-c">
          <div>
            <b>{{ donutTotal }}</b>
            <span>确认入职</span>
          </div>
        </div>
      </div>
      <ul class="lgd">
        <li v-for="d in donutRows" :key="d.n">
          <span class="dot" :style="{ background: d.c }"></span>{{ d.n }}
          <span class="lg-n">{{ d.v }}人 · {{ pct(d.v, donutTotal) }}%</span>
        </li>
      </ul>
    </div>
    <div v-else class="empty">当前筛选条件下暂无入职人员结构数据</div>
    <div class="hint" style="margin-top: 8px">
      分析结论：录用人员以硕士与本科为主；「笔试」环节人员流失较多。
      <button class="lnk" @click="$emit('goto-candidate')">查看人员明细 →</button>
    </div>
  </div>
</template>

<script>
import { dimsOf, conicOf, pct as pctOf } from '../mock'

/**
 * 入职人员结构环图
 * ------------------------------------------------------------
 * 总数直接用父级的「确认入职人数」prop（不是自己从实施里累加），
 * 这样才能保证「结构合计 = 上方 KPI 的确认入职人数」恒成立 ——
 * 原型这两处是各算各的，对不上。
 */
export default {
  name: 'RcdDonutChart',

  props: {
    onboard: { type: Number, default: 0 },
    year: { type: String, default: '2026' },
    dim: { type: String, default: '学历' },
    scopeLabel: { type: String, default: '全省' },
    qtype: { type: String, default: '全部' },
  },

  computed: {
    qtypeLabel() {
      return this.qtype === '全部' ? '校招+社招' : this.qtype
    },
    dims() {
      return dimsOf(this.onboard, this.year)
    },
    dimKeys() {
      return Object.keys(this.dims)
    },
    donutRows() {
      return this.dims[this.dim] || []
    },
    donutTotal() {
      return this.donutRows.reduce((a, b) => a + b.v, 0)
    },
    donutGrad() {
      return conicOf(this.donutRows)
    },
  },

  methods: {
    pct(a, b) {
      return pctOf(a, b)
    },
  },
}
</script>
