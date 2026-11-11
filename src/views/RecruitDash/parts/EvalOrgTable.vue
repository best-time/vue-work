<template>
  <div>
    <div class="hint" style="margin-bottom: 6px">
      各农商行评价明细（按已完成考核人数降序<template v-if="grade">，仅显示「{{ grade }}级」涉及的机构</template>）；
      <b>点击机构行可切换查看该行评价</b>。
    </div>
    <div class="tbl-scroll">
      <table class="tbl eval-tbl">
        <thead>
          <tr>
            <th class="th-sticky">机构</th>
            <th class="th-sticky">确认入职</th>
            <th v-for="g in GRADES" :key="g" class="th-sticky" :style="{ color: GRADE_COLOR[g] }">{{ g }}级</th>
            <th class="th-sticky">已完成考核</th>
            <th class="th-sticky">通过率</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.org"
            class="eval-tr"
            :title="'点击切换查看「' + row.org + '」评价明细'"
            @click="$emit('pick', row.org)"
          >
            <td style="text-align: left"><b>{{ row.org }}</b></td>
            <td>{{ row.es.onboard }}</td>
            <td
              v-for="g in GRADES"
              :key="g"
              :style="{ color: row.es.cnt[g] ? (g === 'D' ? 'var(--danger)' : GRADE_COLOR[g]) : 'var(--text-3)' }"
            >
              {{ row.es.cnt[g] || '—' }}
            </td>
            <td><b>{{ row.es.total }}</b></td>
            <td>{{ row.es.rate }}%</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="8"><div class="empty">该等级下暂无涉及机构</div></td>
          </tr>
        </tbody>
      </table>
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

/**
 * 招聘后评价 · 全省机构明细表
 * ------------------------------------------------------------
 * 只在「全省 + 未指定计划实施」时出现：一行一家法人行，点行下钻到该行。
 * 每行的 evalStats() 是纯函数 + 种子派生，60 行全量算也不卡。
 * 等级筛选只影响「显示哪些机构」，行内数字始终是完整口径。
 */
export default {
  name: 'RcdEvalOrgTable',

  props: {
    year: { type: String, required: true },
    grade: { type: String, default: '' },
  },

  data() {
    return { GRADES, GRADE_COLOR }
  },

  computed: {
    rows() {
      return LEGAL_BANKS.map((org) => ({ org, es: evalStats(org, this.year) }))
        .filter((x) => (this.grade ? x.es.cnt[this.grade] > 0 : true))
        .sort((a, b) => b.es.total - a.es.total)
    },
    dSum() {
      const rows = this.rows
      return {
        d: rows.reduce((a, x) => a + x.es.cnt.D, 0),
        orgs: rows.filter((x) => x.es.cnt.D > 0).map((x) => x.org),
      }
    },
  },
}
</script>
