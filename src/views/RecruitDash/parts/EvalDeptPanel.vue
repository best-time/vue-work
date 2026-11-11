<template>
  <div>
    <table class="tbl eval-tbl">
      <thead>
        <tr>
          <th>部门</th>
          <th v-for="g in GRADES" :key="g" :style="{ color: GRADE_COLOR[g] }">{{ g }}级</th>
          <th>合计</th>
          <th>通过率</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.dept"
          class="eval-tr"
          :title="'点击查看「' + row.dept + '」等级构成'"
          :style="dept === row.dept ? 'background: var(--primary-bg)' : ''"
          @click="pickDept(row.dept)"
        >
          <td style="text-align: left"><b>{{ row.dept }}</b></td>
          <td v-for="g in GRADES" :key="g" :style="{ color: row[g] ? GRADE_COLOR[g] : 'var(--text-3)' }">
            {{ row[g] || '—' }}
          </td>
          <td><b>{{ evalSumOf(row) }}</b></td>
          <td>{{ rowPass(row) }}%</td>
        </tr>
      </tbody>
    </table>

    <!-- 选中等级 → 部门分布 -->
    <div v-if="grade" class="eval-detail">
      <div class="sec-t">
        「{{ grade }}级」人员主要分布部门
        <button class="lnk" @click="$emit('update:grade', '')">收起 ✕</button>
      </div>
      <div class="hint" style="margin: 4px 0 8px">点击部门可查看其等级构成。</div>
      <div
        v-for="d in gradeRank"
        :key="d.dept"
        class="eval-rank-i"
        :title="'查看「' + d.dept + '」等级构成'"
        style="cursor: pointer"
        @click="pickDept(d.dept)"
      >
        <span style="width: 96px; flex-shrink: 0">{{ d.dept }}</span>
        <div class="eval-bar">
          <span :style="{ width: Math.round((d.cnt / gradeMax) * 100) + '%', background: GRADE_COLOR[grade] }"></span>
        </div>
        <span style="width: 44px; text-align: right; flex-shrink: 0">{{ d.cnt }}人</span>
      </div>
      <div v-if="!gradeRank.length" class="hint">该等级下暂无人员。</div>
    </div>

    <!-- 选中部门 → 等级构成 -->
    <div v-if="deptRow" class="eval-detail">
      <div class="sec-t">
        「{{ deptRow.dept }}」部门考核等级构成
        <button class="lnk" @click="$emit('update:dept', '')">收起 ✕</button>
      </div>
      <div class="eval-bar-inline">
        <span
          v-for="g in GRADES"
          :key="g"
          :style="{
            background: GRADE_COLOR[g],
            width: evalSumOf(deptRow) ? Math.round((deptRow[g] / evalSumOf(deptRow)) * 100) + '%' : '0%'
          }"
        >
          {{ deptRow[g] ? g + ' ' + deptRow[g] : '' }}
        </span>
      </div>
      <div class="hint">
        A {{ deptRow.A }} · B {{ deptRow.B }} · C {{ deptRow.C }} · D {{ deptRow.D }} ｜ 合计
        {{ evalSumOf(deptRow) }} 人 ｜ 通过率 {{ rowPass(deptRow) }}%
        <span style="margin-left: 8px">
          <button v-for="g in GRADES" :key="g" class="lnk" @click="$emit('update:grade', g)">查看{{ g }}级</button>
        </span>
      </div>
    </div>

    <!-- C/D 重点关注 -->
    <div class="rule-bar" style="margin-top: 12px">
      C/D级共 <b>{{ cd.cd }}</b> 人，需重点关注部门：{{ cd.list || '—' }}。
      <button class="lnk" @click="$emit('open-people', ['C', 'D'])">查看 C/D 级明细 →</button>
    </div>
    <div class="hint" style="margin-top: 8px">
      <button class="lnk" @click="$emit('open-people', [])">查看考核人员明细 →</button>
    </div>
  </div>
</template>

<script>
import { GRADES, GRADE_COLOR, evalSumOf } from '../mock'

/**
 * 招聘后评价 · 单机构（或单计划实施）部门视图
 * ------------------------------------------------------------
 * 三段下钻都在这一屏里：
 *   部门表 → 点行看「该部门等级构成」；点等级 chip 看「该等级的人员分布部门」；
 *   两个下钻面板互不冲突（选等级会清部门，由父级 onGrade 保证）。
 */
export default {
  name: 'RcdEvalDeptPanel',

  props: {
    rows: { type: Array, default: () => [] },
    grade: { type: String, default: '' },
    dept: { type: String, default: '' },
  },

  data() {
    return { GRADES, GRADE_COLOR }
  },

  computed: {
    gradeRank() {
      if (!this.grade) return []
      return this.rows
        .map((r) => ({ dept: r.dept, cnt: r[this.grade] }))
        .filter((x) => x.cnt > 0)
        .sort((a, b) => b.cnt - a.cnt)
    },
    gradeMax() {
      return Math.max(1, ...this.gradeRank.map((x) => x.cnt))
    },
    deptRow() {
      if (!this.dept) return null
      return this.rows.find((r) => r.dept === this.dept) || null
    },
    cd() {
      const cd = this.rows.reduce((a, r) => a + r.C + r.D, 0)
      const list = this.rows
        .map((r) => ({ dept: r.dept, n: r.C + r.D }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .map((x) => `${x.dept}（${x.n}人）`)
        .join('、')
      return { cd, list }
    },
  },

  methods: {
    evalSumOf,
    rowPass(row) {
      const t = evalSumOf(row)
      return t ? Math.round(((t - row.D) / t) * 100) : 0
    },
    pickDept(dept) {
      // 再点一次同一个部门就是收起
      this.$emit('update:dept', this.dept === dept ? '' : dept)
    },
  },
}
</script>
