<template>
  <div class="eval-body">
    <div class="hint" style="margin-bottom: 6px">
      各农商行评价明细（按已完成考核人数降序<template v-if="grade">，仅显示「{{ grade }}级」涉及的机构</template>）；
      <b>点击机构行可切换查看该行评价</b>。
    </div>

    <!--
      原型是 <table class="tbl eval-tbl"> + 外层 div 限高滚动 + sticky 表头。
      换成 el-table：高度交给 fitTable mixin（量 .eval-fit 的真实高度喂给 :height），
      表头固定 + 表体滚动都由 el-table 自己做，不再写死 max-height；
      原型那套外观（表头渐变底、只留下边框、首列左对齐、等级配色）在 dash.scss 的
      .eval-etbl 里按 el-table 的 DOM 结构重写了一遍。
    -->
    <div ref="fitBox" class="eval-fit">
      <el-table
        ref="table"
        :data="rows"
        :height="fitHeight"
        class="eval-etbl"
        :row-class-name="rowClass"
        empty-text="该等级下暂无涉及机构"
        @row-click="onPick"
      >
        <el-table-column prop="org" label="机构" min-width="190" class-name="c-l" header-class-name="c-l">
          <template #default="{ row }">
            <b>{{ row.org }}</b>
          </template>
        </el-table-column>

        <el-table-column prop="onboard" label="确认入职" width="100" align="center" />

        <el-table-column v-for="g in GRADES" :key="g" :prop="g" :label="g + '级'" width="80" align="center">
          <template #header>
            <span :style="{ color: GRADE_COLOR[g] }">{{ g }}级</span>
          </template>
          <template #default="{ row }">
            <span :style="gradeStyle(row, g)">{{ row[g] || "—" }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="total" label="已完成考核" width="116" align="center">
          <template #default="{ row }">
            <b>{{ row.total }}</b>
          </template>
        </el-table-column>

        <el-table-column label="通过率" width="94" align="center">
          <template #default="{ row }">{{ row.rate }}%</template>
        </el-table-column>
      </el-table>
    </div>

    <div class="rule-bar" style="margin-top: 12px">
      全省 D级（未通过）共 <b>{{ dSum.d }}</b> 人，涉及 <b>{{ dSum.orgs.length }}</b> 家机构<template v-if="dSum.orgs.length">：{{ dSum.orgs.slice(0, 6).join('、') }}{{ dSum.orgs.length > 6 ? ' 等' : '' }}</template>。
      点击机构行可下钻查看该行的部门等级分布。
      <button class="lnk" @click="$emit('open-people', ['D'])">查看 D 级明细 →</button>
    </div>
    <div class="hint" style="margin-top: 8px">
      <button class="lnk" @click="$emit('open-people', [])">查看考核人员明细 →</button>
    </div>
  </div>
</template>

<script>
import { LEGAL_BANKS, GRADES, GRADE_COLOR, evalStats } from '../mock'
import fitTable from '@/mixins/fitTable'

/**
 * 招聘后评价 · 全省机构明细表（el-table）
 * ------------------------------------------------------------
 * 只在「全省 + 未指定计划实施」时出现：一行一家法人行，点行下钻到该行。
 * 每行的 evalStats() 是纯函数 + 种子派生，60 行全量算也不卡。
 * 等级筛选只影响「显示哪些机构」，行内数字始终是完整口径。
 *
 * el-table 只吃平铺字段，所以这里把 { org, es } 摊成 org / onboard / A~D / total / rate
 * 后再排序 —— 不在模板里写 row.es.cnt[g] 那一串，列配置也能一眼看清。
 *
 * 高度：.eval-fit 在 flex 链里吃「卡片剩余空间」，fitTable 量它的真实高度喂给 :height；
 * 页面/卡片不用再写 max-height，表格自己出滚动条、表头固定。
 */
export default {
  name: 'RcdEvalOrgTable',

  mixins: [fitTable],

  /** 与 .eval-fit 的 min-height:160 保持一致：卡片被压得很矮时也别变成一条缝 */
  fitTableMinHeight: 160,

  props: {
    year: { type: String, required: true },
    grade: { type: String, default: '' },
  },

  data() {
    return { GRADES, GRADE_COLOR }
  },

  computed: {
    rows() {
      return LEGAL_BANKS.map((org) => {
        const es = evalStats(org, this.year)
        return {
          org,
          onboard: es.onboard,
          A: es.cnt.A,
          B: es.cnt.B,
          C: es.cnt.C,
          D: es.cnt.D,
          total: es.total,
          rate: es.rate,
        }
      })
        .filter((x) => (this.grade ? x[this.grade] > 0 : true))
        .sort((a, b) => b.total - a.total)
    },
    dSum() {
      return {
        d: this.rows.reduce((a, x) => a + x.D, 0),
        orgs: this.rows.filter((x) => x.D > 0).map((x) => x.org),
      }
    },
  },

  methods: {
    /** 整行可点：cursor 交给 CSS，类名挂到 tr 上 */
    rowClass() {
      return 'eval-tr'
    },
    gradeStyle(row, g) {
      if (!row[g]) return { color: 'var(--text-3)' }
      return { color: g === 'D' ? 'var(--danger)' : GRADE_COLOR[g] }
    },
    onPick(row) {
      this.$emit('pick', row.org)
    },
  },
}
</script>
