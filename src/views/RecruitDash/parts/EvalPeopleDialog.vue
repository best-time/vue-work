<template>
  <app-dialog
    ref="dlg"
    custom-class="rcd-dlg rcd-dlg--people"
    :title="title"
    width="800px"
    top="8vh"
    :show-cancel="false"
    confirm-text="关闭"
  >
    <!-- 表体：原型 max-height:480px 的滚动容器，表头 sticky 吸在容器顶部 -->
    <div class="rcd-pScroll">
      <table class="rcd-tbl">
        <thead>
          <tr>
            <th>序号</th>
            <th v-if="showOrg">机构</th>
            <th>姓名</th>
            <th>所属部门</th>
            <th>入职时间</th>
            <th>考核等级</th>
            <th>考核结论</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in rows" :key="p.id">
            <td>{{ i + 1 }}</td>
            <td v-if="showOrg" class="rcd-tbl__l">{{ p.org }}</td>
            <td class="rcd-tbl__l"><b>{{ p.name }}</b></td>
            <td class="rcd-tbl__l">{{ p.dept }}</td>
            <td>{{ p.onboard }}</td>
            <td>
              <span class="rcd-tag rcd-tag--solid" :style="{ background: GRADE_COLOR[p.grade] }">
                {{ p.grade }}级
              </span>
            </td>
            <td class="rcd-tbl__l">{{ GRADE_NOTE[p.grade] }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="showOrg ? 7 : 6"><div class="rcd-empty">暂无该范围考核人员</div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 表下口径说明（原型表格下面那行 hint） -->
    <div class="rcd-note">
      考核等级说明：A/B/C 为通过（C 级偏弱需关注），D 为未通过；数据来源于人力系统考核模块（只读同步）<template
        v-if="showOrg"
        >，已按机构展开</template
      >。
    </div>
  </app-dialog>
</template>

<script>
import { GRADE_COLOR, GRADE_NOTE, LEGAL_BANKS, evalStats, evalPeople } from '../mock'

/**
 * 招聘后评价 · 考核人员明细弹窗
 * ------------------------------------------------------------
 * 形态照原型 openModal（evalView）：一个表格、没有筛选条，
 * 标题自带范围 / 年度 / 人数，表格下面一行口径说明，底部只有「关闭」。
 * 宽度比原型 .modal 的 760 稍宽（表格 7 列 + nowrap，760 会挤出一条横向滚动条）。
 *
 * 两个入口共用一个弹窗，区别只在 preset：
 *   · 「查看 D 级明细」     → ['D']
 *   · 「查看 C/D 级明细」   → ['C','D']
 *   · 「查看考核人员明细」 → []（全量）
 *
 * 人不是另造的一份假数据：evalPeople() 把 evalCore() 的「部门 × 等级」逐格展开，
 * 所以按等级筛出来的人数与卡片 chips、部门表里的数字严格一致。
 * 全省视图原型是「60 家法人行逐一聚合、名单带机构列」，这里同样逐行展开，
 * 因此人数与机构表下方那行「全省 D 级共 N 人」同口径。
 */
export default {
  name: 'RcdEvalPeopleDialog',

  data() {
    return {
      GRADE_COLOR,
      GRADE_NOTE,
      ctx: { scopeLabel: '', year: '2026', es: null, province: false, preset: [] },
    }
  },

  computed: {
    /** 全量候选池：全省按机构展开（带 org），单机构 / 单实施取该范围的那份 */
    pool() {
      const { year, es, province } = this.ctx
      if (!province) return evalPeople(es, year)
      const out = []
      LEGAL_BANKS.forEach((org) => {
        evalPeople(evalStats(org, year), year).forEach((p) => {
          out.push({ ...p, id: org + p.id, org })
        })
      })
      return out
    },
    /** preset 为空 = 全量；给一个等级 = 该等级；给两个 = C/D 这种并集 */
    rows() {
      const preset = this.ctx.preset || []
      if (!preset.length) return this.pool
      return this.pool.filter((p) => preset.indexOf(p.grade) > -1)
    },
    showOrg() {
      return !!this.ctx.province
    },
    /** 原型标题：`C/D级人员明细（全省 · 2026年度 · 共 N 人）` */
    title() {
      const preset = this.ctx.preset || []
      const head = !preset.length
        ? '试用期考核人员明细'
        : preset.length === 1
        ? `「${preset[0]}级」人员明细`
        : `${preset.join('/')}级人员明细`
      const c = this.ctx
      return `${head}（${c.scopeLabel} · ${c.year}年度 · 共 ${this.rows.length} 人）`
    },
  },

  methods: {
    /**
     * @param {{scopeLabel:string, year:string, es:object, province?:boolean, preset?:string[]}} payload
     */
    open(payload) {
      this.ctx = { preset: [], province: false, ...payload }
      return this.$refs.dlg.open()
    },
  },
}
</script>
