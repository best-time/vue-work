<template>
  <div class="card tone-amber">
    <div class="card-h">
      <h3>招聘后评价</h3>
      <span class="hint">
        统计范围：{{ evalScopeLabel }} · {{ year }}年度 ｜ 统计期内确认入职且完成试用期考核人员（数据来源于人力系统考核模块，只读同步）
      </span>
    </div>
    <div class="card-b">
      <!-- 计划实施选择器：评价流程由所选计划实施确定 -->
      <div class="eval-scope">
        <span class="hint" style="margin: 0">计划实施</span>
        <select
          class="sel"
          v-model="implModel"
          style="min-width: 300px"
          title="招聘后评价跟随计划实施确定：选择具体实施后，入职与考核数据均取自该实施"
        >
          <option value="">全部计划实施（{{ scope === 'ALL' ? '全省合计' : '本行合计' }}）</option>
          <option v-for="im in evalImplOpts" :key="im.id" :value="im.id">
            {{ im.name }}（入职 {{ im.progress.onboard }} 人）
          </option>
        </select>
        <span class="hint">仅列出已产生确认入职的计划实施（未入职 / 草稿 / 审批中的实施暂无评价数据）</span>
      </div>

      <div v-if="evalImplObj" class="rule-bar">
        <b>评价链路（由该计划实施确定）：</b>计划实施「{{ evalImplObj.name }}」招聘流程（{{ evalImplObj.flow.join(' → ') }}）→
        确认入职 <b>{{ evalImplObj.progress.onboard }}</b> 人 → 该批人员试用期考核结果如下。
      </div>

      <!-- 指标区（只看考核口径：入职 → 已完成考核 → 通过率） -->
      <div class="eval-nums">
        <div>同期确认入职 <b class="ev-num eval-num" style="color: var(--primary)">{{ es.onboard }}</b> 人</div>
        <div>已完成考核 <b class="ev-num eval-num">{{ es.total }}</b> 人</div>
        <div>
          试用期考核通过率
          <b class="ev-num eval-num" style="color: var(--success)">{{ es.rate }}%</b>
        </div>
        <span class="hint" style="margin-left: auto">
          （已完成考核 ≤ 确认入职：新入职未满试用期不列入；A/B/C 为通过，D 为未通过）
        </span>
      </div>

      <!-- 等级筛选 chips -->
      <div class="eval-grade-row">
        <span class="hint" style="margin-right: 2px">考核等级</span>
        <button v-for="g in GRADES" :key="g" class="tag" :style="gradeChipStyle(g)" @click="toggleGrade(g)">
          {{ g }}级 {{ es.cnt[g] }}人
        </button>
        <button v-if="grade" class="lnk" title="取消选择" @click="setGrade('')">取消选择 ✕</button>
      </div>

      <!-- 全省 + 未选实施 = 各农商行评价明细；单机构或选中实施 = 部门等级分布 -->
      <EvalOrgTable
        v-if="isOrgView"
        :year="year"
        :grade="grade"
        @pick="$emit('drill-org', $event)"
        @open-people="openPeople"
      />
      <EvalDeptPanel
        v-else
        :rows="es.m"
        :grade="grade"
        :dept="dept"
        @update:grade="setGrade"
        @update:dept="$emit('update:dept', $event)"
        @open-people="openPeople"
      />

      <!-- 人员明细弹窗：C/D 级明细与全量名单共用一个 -->
      <EvalPeopleDialog ref="peopleDlg" />
    </div>
  </div>
</template>

<script>
import { GRADES, GRADE_COLOR, evalStats, evalStatsImpl } from '../mock'
import EvalOrgTable from './EvalOrgTable.vue'
import EvalDeptPanel from './EvalDeptPanel.vue'
import EvalPeopleDialog from './EvalPeopleDialog.vue'

/**
 * 招聘后评价卡
 * ------------------------------------------------------------
 * 两种视图由「是否全省 + 是否指定计划实施」决定，切换时保留 grade/dept 由父级管理：
 *   · 全省 && 未选实施 → 60 家法人行明细表（点行下钻改的是父级的 cur.scope）；
 *   · 其余             → 部门等级分布（点部门 / 点等级两级下钻）。
 * es 只在两处口径里选一个：选中实施就整批人取自该实施，否则按机构 + 年度。
 *
 * 两个视图底部的「查看 C/D 级明细 / 查看考核人员明细」都落到同一个弹窗，
 * 区别只是初始筛选（preset），弹窗内部还能再切等级。
 */
export default {
  name: 'RcdEvalSection',

  components: { EvalOrgTable, EvalDeptPanel, EvalPeopleDialog },

  props: {
    impls: { type: Array, default: () => [] },
    scope: { type: String, default: 'ALL' },
    year: { type: String, required: true },
    impl: { type: String, default: '' },
    grade: { type: String, default: '' },
    dept: { type: String, default: '' },
  },

  data() {
    return { GRADES }
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
    evalImplOpts() {
      return this.impls
        .filter((im) => im.progress.onboard > 0)
        .sort((a, b) => b.progress.onboard - a.progress.onboard)
        .slice(0, 15)
    },
    evalImplObj() {
      if (!this.impl) return null
      return this.impls.find((im) => im.id === this.impl) || null
    },
    evalScopeLabel() {
      if (this.evalImplObj) return `${this.evalImplObj.name}（${this.evalImplObj.org}）`
      return this.scope === 'ALL' ? '全省 60 家法人行合计' : this.scope
    },
    es() {
      return this.evalImplObj ? evalStatsImpl(this.evalImplObj) : evalStats(this.scope, this.year)
    },
    isOrgView() {
      return this.scope === 'ALL' && !this.evalImplObj
    },
  },

  methods: {
    gradeChipStyle(g) {
      const on = this.grade === g
      return {
        background: on ? GRADE_COLOR[g] : GRADE_COLOR[g] + '22',
        color: on ? '#fff' : GRADE_COLOR[g],
        borderColor: 'transparent',
      }
    },
    toggleGrade(g) {
      this.setGrade(this.grade === g ? '' : g)
    },
    setGrade(g) {
      this.$emit('update:grade', g)
      // 选等级时把部门下钻收掉，两个面板不同时展开（原型就是这个行为）
      if (g) this.$emit('update:dept', '')
    },
    /** @param {string[]} preset 预置的等级筛选：['C','D'] / ['D'] / []（全部） */
    openPeople(preset) {
      this.$refs.peopleDlg.open({
        scopeLabel: this.evalScopeLabel,
        year: this.year,
        es: this.es,
        // 全省视图：原型是 60 家法人行逐一聚合、名单带「机构」列
        province: this.isOrgView,
        preset,
      })
    },
  },
}
</script>
