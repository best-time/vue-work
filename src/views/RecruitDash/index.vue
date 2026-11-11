<template>
  <div class="rcd-page">
    <div class="dash-wrap">
      <!-- ================= 查询条件 ================= -->
      <QueryBar
        :form.sync="form"
        :banks="banks"
        :years="years"
        :periods="periods"
        :qtypes="qtypes"
        @query="onQuery"
        @reset="onReset"
        @export="onExport"
        @report="onReport"
      />

      <!-- ================= KPI ================= -->
      <KpiRow :kpis="kpis" @pick="onKpi" />

      <!-- ================= 三列卡片 ================= -->
      <div class="grid3 mt12">
        <FocusPlans :rows="focusList" :scope="cur.scope" @open-all="onViewAllImpl" @open="onViewImpl" />
        <TodoCard :items="todoAll" :scope-label="scopeLabel" @go="onTodoGo" />
        <RiskCard
          :risks="allRisks"
          :lv.sync="riskLv"
          @cfg="onRiskCfg"
          @view="onRiskView"
          @urge="onRiskUrge"
        />
      </div>

      <!-- ================= 招聘统计分析 ================= -->
      <StatSection
        class="mt12"
        :impls="scopeImpls"
        :impl.sync="dimpl"
        :dim.sync="dim"
        :onboard="kpiStat.onboard"
        :year="cur.year"
        :scope-label="scopeLabel"
        :qtype="cur.qtype"
        :period-label="periodLabel"
        @goto-candidate="onGotoCandidate"
      />

      <!-- ================= 招聘后评价 ================= -->
      <EvalSection
        class="mt12"
        :impls="scopeImpls"
        :scope="cur.scope"
        :year="cur.year"
        :impl.sync="evalImpl"
        :grade.sync="grade"
        :dept.sync="dept"
        @drill-org="pickOrg"
      />

      <div style="height: 8px"></div>
    </div>

    <!-- 风险预警的两个「层」：详情走右侧抽屉（原型 openDrawer），督办走居中弹窗（原型 openModal） -->
    <RiskDetailDrawer ref="riskDlg" @goto="onRiskGoto" />
    <RiskUrgeDialog ref="urgeDlg" @submit="onRiskUrged" />
  </div>
</template>

<script>
/**
 * 招聘驾驶舱（招聘模块原型图 · class="dash-wrap" 节点）
 * ------------------------------------------------------------
 * 原型是 pageDashboard() 里的一坨模板字符串 + onclick 事件委托（data-act="xxx"）。
 * 这里做的是「把同样的 DOM 结构交给 Vue 渲染」：
 *
 *   · 结构逐块对照原型 2711~2895 行，样式逐条对照 493~590 行（见 dash.scss）；
 *   · 原型靠 S.xxx 全局状态 + render() 整页重绘，这里换成 data / computed：
 *     改筛选条件 → 计算属性重算 → 只重渲染受影响的那几块；
 *   · 原型 data-act 的点击全部换成方法，行为不变（跳转仍用 toast 代替，
 *     因为本 demo 只注册了这一个路由）。
 *
 * 本文件只做「壳」：持有查询条件与下钻状态、装配各区块、把跳转统一成 toast。
 * 具体区块拆在同级 parts/ 下，一个模块一个文件：
 *
 *   QueryBar.vue      查询条件（form.sync）
 *   KpiRow.vue        4 张 KPI
 *   FocusPlans.vue    重点计划实施进度
 *   TodoCard.vue      待办事项 → TodoDialog.vue（查看全部）
 *   RiskCard.vue      风险预警（等级筛选 lv.sync）
 *                     → RiskDetailDrawer.vue（查看，右侧抽屉）+ RiskUrgeDialog.vue（督办，居中弹窗）
 *   StatSection.vue   招聘统计分析外壳 → FunnelChart.vue + DonutChart.vue
 *   EvalSection.vue   招聘后评价外壳 → EvalOrgTable.vue + EvalDeptPanel.vue
 *                                    → EvalPeopleDialog.vue（C/D 级明细）
 *
 * 三个弹窗（待办 / 考核人员 / 风险督办）都是 append-to-body 的，DOM 落在
 * .dash-wrap 外面、拿不到页面里的 .tag/.tbl 与 --primary 等变量，所以它们的样式
 * 单独一份 dialogs.scss（rcd-* 前缀，变量重声明）。风险详情是右侧抽屉，
 * 用 <el-drawer> + append-to-body，DOM 也在 .dash-wrap 之外，一并归到这份样式里。
 *
 * 下钻类状态（riskLv / dim / dimpl / evalImpl / grade / dept）刻意留在父级：
 * 换机构或换年度时要一把清空（resetDrill），状态散在子组件里就得靠每个子组件
 * 自己 watch 一遍，容易漏、也不好在「重置」按钮里一次性清干净。
 *
 * 与原型的唯一结构差异：查询条多了「机构」下拉。原型里机构来自左侧
 * 机构树（dash-wrap 之外的 .org-tree），本页要自包含，就把它挪进了查询条件；
 * 后评价表格点机构行下钻 -> 同样落在这个下拉上。
 */
import { BANKS, YEARS, PERIODS, QTYPES, TODOS, planStat, implsOf, planRisk, risksOf } from './mock'
import QueryBar from './parts/QueryBar.vue'
import KpiRow from './parts/KpiRow.vue'
import FocusPlans from './parts/FocusPlans.vue'
import TodoCard from './parts/TodoCard.vue'
import RiskCard from './parts/RiskCard.vue'
import RiskDetailDrawer from './parts/RiskDetailDrawer.vue'
import RiskUrgeDialog from './parts/RiskUrgeDialog.vue'
import StatSection from './parts/StatSection.vue'
import EvalSection from './parts/EvalSection.vue'

const DEFAULT_QUERY = { scope: 'ALL', year: '2026', period: '全年', qtype: '全部' }

export default {
  name: 'RecruitDash',

  components: {
    QueryBar, KpiRow, FocusPlans, TodoCard, RiskCard,
    RiskDetailDrawer, RiskUrgeDialog, StatSection, EvalSection,
  },

  data() {
    return {
      // 下拉选项直接挂到 data，模板里就能用（模板拿不到 import 进来的东西）
      banks: BANKS,
      years: YEARS,
      periods: PERIODS,
      qtypes: QTYPES,

      form: { ...DEFAULT_QUERY }, // 查询条上的值（未提交）
      cur: { ...DEFAULT_QUERY }, // 已生效的查询条件（点「查询」才同步）

      riskLv: '', // 风险预警按等级筛选
      dim: '学历', // 入职结构环图维度
      dimpl: '', // 漏斗绑定的计划实施
      evalImpl: '', // 后评价绑定的计划实施
      grade: '', // 后评价选中的考核等级
      dept: '', // 后评价选中的部门

      // 风险处置结果（本 demo 没有后端，存内存）：
      //   id → 状态覆盖。原型里督办只做一件事 —— 把风险从「待处理」推到
      //   「处理中」并留痕，抽屉的处理记录据此多出第二段；解除由系统扫描完成，
      //   mock 里本来就有「已解除」的那条（R5），所以不另设手动解除。
      // 不进 resetDrill：换机构/换年度只是换统计范围，处置已经发生了。
      riskStatus: {},
    }
  },

  computed: {
    /* ---------------- 查询范围文案 ---------------- */
    scopeLabel() {
      return this.cur.scope === 'ALL' ? '全省' : this.cur.scope
    },
    periodLabel() {
      return this.cur.period === '自定义起止' ? '自定义区间' : this.cur.period
    },

    /* ---------------- KPI ---------------- */
    kpiStat() {
      return planStat(this.cur.scope, this.cur.year, this.cur.qtype)
    },
    kpis() {
      const s = this.kpiStat
      return [
        {
          l: '年度计划人数',
          v: s.hc,
          s: `${this.cur.year}年度 · ${this.scopeLabel} · ${this.cur.qtype === '全部' ? '校招+社招' : this.cur.qtype}（已审批生效总计划）`,
          act: '查看招聘总计划 →',
          ac: 'var(--c-blue)',
          ac2: '#93c5fd',
          acs: 'var(--c-blue-s)',
        },
        {
          l: '确认入职人数',
          v: s.onboard,
          s: '按自然人统计 · 已登记最终入职结果',
          ac: 'var(--c-green)',
          ac2: '#86efac',
          acs: 'var(--c-green-s)',
        },
        {
          l: '剩余招聘缺口',
          v: s.gap,
          s: '年度计划人数 - 确认入职人数',
          ac: 'var(--c-amber)',
          ac2: '#fcd34d',
          acs: 'var(--c-amber-s)',
        },
        {
          l: '招聘完成率',
          v: s.rate + '%',
          s: '确认入职 ÷ 年度计划（保留1位小数）',
          ac: 'var(--c-indigo)',
          ac2: '#c4b5fd',
          acs: 'var(--c-indigo-s)',
        },
      ]
    },

    /* ---------------- 计划实施（机构 + 年度 + 类型 + 统计时间） ---------------- */
    scopeImpls() {
      const { scope, qtype, period } = this.cur
      const y = Number(this.cur.year)
      const [qs, qe] =
        period === '一季度'
          ? [`${y}-01-01`, `${y}-03-31`]
          : period === '二季度'
            ? [`${y}-04-01`, `${y}-06-30`]
            : ['', '']
      return implsOf(this.cur.year).filter((im) => {
        if (scope !== 'ALL' && im.org !== scope) return false
        if (qtype !== '全部' && im.type !== qtype) return false
        // 统计时间按区间重叠判：跨年度的实施只要与季度有交集就算在内
        if (qs && !(im.start <= qe && qs <= im.end)) return false
        return true
      })
    },

    /** 重点计划：先按规模筛（编制 ≥ 25 才算「重点」），再按风险优先级排序取前 5 */
    focusList() {
      const scored = this.scopeImpls.map((im) => planRisk(im, this.cur.year))
      const big = scored.filter((r) => r.im.headcount >= 25)
      const pool = big.length >= 5 ? big : scored
      return pool.sort((a, b) => b.score - a.score).slice(0, 5)
    },

    /* ---------------- 待办 / 风险 ---------------- */
    todoAll() {
      const { scope } = this.cur
      return TODOS.filter((t) => scope === 'ALL' || t.org === scope)
    },
    allRisks() {
      // 状态覆盖要在这里套：卡片上的「督办」按钮显隐、抽屉里的处理记录都看 status
      return risksOf(this.cur.scope).map((r) => ({
        ...r,
        status: this.riskStatus[r.id] || r.status,
      }))
    },
  },

  watch: {
    // 机构 / 年度一变，下钻状态全部失效（原型在 render 里做同样的清理）
    'cur.scope'() {
      this.resetDrill()
    },
    'cur.year'() {
      this.resetDrill()
    },
    // 选中的实施被筛掉后要回退到「全部」，否则下拉显示空白但数据还在按旧 id 算
    scopeImpls(list) {
      if (this.dimpl && !list.some((im) => im.id === this.dimpl)) this.dimpl = ''
      if (this.evalImpl && !list.some((im) => im.id === this.evalImpl)) this.evalImpl = ''
    },
  },

  methods: {
    tip(msg) {
      this.$message({ message: msg, type: 'success', duration: 1800, showClose: true })
    },

    /* ---------------- 查询条件 ---------------- */
    onQuery() {
      this.cur = { ...this.form }
      this.tip(`已按「${this.scopeLabel} · ${this.cur.year}年度 · ${this.cur.qtype} · ${this.periodLabel}」重新统计`)
    },
    onReset() {
      this.form = { ...DEFAULT_QUERY }
      this.cur = { ...DEFAULT_QUERY }
      this.resetDrill()
      this.tip('筛选条件已重置为「全省 · 2026年度 · 全年 · 全部」')
    },
    resetDrill() {
      this.dimpl = ''
      this.evalImpl = ''
      this.grade = ''
      this.dept = ''
      this.riskLv = ''
    },
    pickOrg(org) {
      this.form.scope = org
      this.cur.scope = org
      this.resetDrill()
      this.tip(`已下钻到「${org}」，统计范围切换为该行`)
    },

    /* ---------------- KPI / 各卡片的点击 ---------------- */
    onKpi(k) {
      if (k.l === '年度计划人数') return this.tip('跳转「招聘总计划」：按当前年度与机构展示已审批生效的总计划')
      if (k.l === '确认入职人数') return this.tip('跳转「候选人管理」：已登记最终入职结果的人员明细')
      if (k.l === '剩余招聘缺口') return this.tip('缺口 = 年度计划 - 确认入职，可在「计划实施」里按缺口排序跟进')
      return this.tip('完成率随筛选条件实时计算，口径见卡片下方说明')
    },
    onViewAllImpl() {
      this.tip(`跳转「计划实施」：共 ${this.scopeImpls.length} 条实施（当前筛选范围）`)
    },
    onViewImpl(im) {
      this.tip(`进入计划实施「${im.name}」：${im.start} ~ ${im.end}，${im.status}`)
    },
    onTodoGo(t) {
      this.tip(`办理「${t.type}」：${t.title}`)
    },
    onRiskCfg() {
      this.tip('打开「风险预警时间参数」配置：启动超期 / 停留超期 / 反馈超期 等阈值')
    },
    /** 查看：原型 riskView → openDrawer('风险详情 · xxx')，右侧抽屉 */
    onRiskView(r) {
      this.$refs.riskDlg.open(r)
    },
    /** 督办：原型 riskUrge → openModal('发起督办')，居中弹窗 */
    onRiskUrge(r) {
      this.$refs.urgeDlg.open(r)
    },
    /**
     * 下发督办成功：原型 riskUrgeSave 做两件事 —— 状态推到「处理中」、写一条操作留痕，
     * toast 文案也照抄（本 demo 没有操作日志页，留痕就体现在抽屉的处理记录里）。
     */
    onRiskUrged({ risk }) {
      this.$set(this.riskStatus, risk.id, '处理中')
      this.tip('督办已下发（责任人待办已生成，风险状态更新为「处理中」，已留痕）')
    },
    /** 抽屉「关联业务」：原型 riskGoto → 关抽屉 + 跳计划实施（这里用 toast 代替跳转） */
    onRiskGoto(r) {
      this.$refs.riskDlg.close()
      this.tip(`跳转「计划实施」：已按风险「${r.name}」自动筛选相关计划`)
    },
    onExport() {
      this.tip(`按当前条件导出：${this.scopeLabel} · ${this.cur.year}年度 · ${this.cur.qtype}`)
    },
    onReport() {
      this.tip('跳转「报表中心」，按当前筛选条件生成驾驶舱报表')
    },
    onGotoCandidate() {
      this.tip('跳转「候选人管理」：按当前范围查看人员明细')
    },
  },
}
</script>

<style lang="scss" src="./dash.scss"></style>
<style lang="scss" src="./dialogs.scss"></style>
