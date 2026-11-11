<template>
  <div class="card">
    <div class="toolbar toolbar--flat">
      <div class="tb-l dash-q">
        <span class="hint">机构</span>
        <select class="sel" v-model="scopeModel">
          <option value="ALL">全省（60 家法人行）</option>
          <option v-for="o in banks" :key="o" :value="o">{{ o }}</option>
        </select>
        <span class="hint">年度</span>
        <select class="sel" v-model="yearModel">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <span class="hint">统计时间</span>
        <select class="sel" v-model="periodModel">
          <option v-for="p in periods" :key="p" :value="p">{{ p }}</option>
        </select>
        <span class="hint">招聘类型</span>
        <select class="sel" v-model="qtypeModel">
          <option v-for="t in qtypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <button class="btn btn-pri" @click="$emit('query')">查询</button>
        <button class="btn" @click="$emit('reset')">重置</button>
      </div>
      <div class="tb-r">
        <button class="btn" title="按当前筛选条件（机构 / 年度 / 类型）实时汇总导出" @click="$emit('export')">导出</button>
        <button class="btn btn-pri" @click="$emit('report')">生成报表</button>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 查询条件卡
 * ------------------------------------------------------------
 * 只负责「查询条上的值」，不持有状态：
 *   · form 是父级的「未提交」条件，改动一律 `update:form` 回抛（v-model 语义）；
 *   · 点查询 / 重置只发事件，由父级决定什么时候把它同步成「已生效」条件 ——
 *     这是原型的行为：改了下拉不点查询，下面所有数字都不动。
 */
export default {
  name: 'RcdQueryBar',

  props: {
    form: { type: Object, required: true },
    banks: { type: Array, default: () => [] },
    years: { type: Array, default: () => [] },
    periods: { type: Array, default: () => [] },
    qtypes: { type: Array, default: () => [] },
  },

  computed: {
    // 四个下拉都走 computed setter：既能 v-model，又不会去改 props 对象
    scopeModel: {
      get() {
        return this.form.scope
      },
      set(v) {
        this.$emit('update:form', { ...this.form, scope: v })
      },
    },
    yearModel: {
      get() {
        return this.form.year
      },
      set(v) {
        this.$emit('update:form', { ...this.form, year: v })
      },
    },
    periodModel: {
      get() {
        return this.form.period
      },
      set(v) {
        this.$emit('update:form', { ...this.form, period: v })
      },
    },
    qtypeModel: {
      get() {
        return this.form.qtype
      },
      set(v) {
        this.$emit('update:form', { ...this.form, qtype: v })
      },
    },
  },
}
</script>
