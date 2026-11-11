<template>
  <app-dialog
    ref="dlg"
    custom-class="rcd-dlg rcd-dlg--todo"
    :title="title"
    width="900px"
    top="8vh"
    :show-cancel="false"
    confirm-text="关 闭"
  >
    <div class="rcd-dlg__hd">
      <span>当前范围：<b>{{ scopeLabel }}</b> ｜ 全部 <b>{{ items.length }}</b> 项，按创建时间倒序</span>
      <span class="rcd-dlg__hd-r">点「办理」进入对应业务页（本 demo 用提示代替跳转）</span>
    </div>

    <div class="rcd-chiprow">
      <button class="rcd-chip" :class="{ 'is-on': !type }" @click="type = ''">全部 {{ items.length }}</button>
      <button
        v-for="t in types"
        :key="t.name"
        class="rcd-chip"
        :class="{ 'is-on': type === t.name }"
        @click="type = t.name"
      >
        {{ t.name }} {{ t.count }}
      </button>
    </div>

    <div class="rcd-dlg__scroll">
      <table class="rcd-tbl">
        <thead>
          <tr>
            <th class="c-type">类型</th>
            <th>待办事项</th>
            <th class="c-org">所属机构</th>
            <th class="c-time">创建时间</th>
            <th class="c-act">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td><span class="rcd-tag" :class="'rcd-tag--' + todoTone(t.type)">{{ t.type }}</span></td>
            <td class="rcd-tbl__main">{{ t.title }}</td>
            <td>{{ t.org }}</td>
            <td class="rcd-tbl__muted">{{ t.time }}</td>
            <td><button class="rcd-btn rcd-btn--sm" @click="$emit('go', t)">办理</button></td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="5"><div class="rcd-empty">当前筛选下没有待办</div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </app-dialog>
</template>

<script>
import { TODO_TONE } from '../mock'

/**
 * 待办事项 · 全部列表弹窗
 * ------------------------------------------------------------
 * 卡片上只放前 5 条，点「查看全部」才需要完整列表，所以 items 传的是全量，
 * 卡片自己切前 5 —— 弹窗不再向父级要第二份数据。
 *
 * 弹窗是 append-to-body 的，落在 .dash-wrap 外面，用不了页面里那套 .tag/.tbl 样式，
 * 所以这里用 rcd-* 前缀的另一套（见 dialogs.scss），颜色变量在弹窗根元素上重新声明。
 */
export default {
  name: 'RcdTodoDialog',

  props: {
    items: { type: Array, default: () => [] },
    scopeLabel: { type: String, default: '全省' },
  },

  data() {
    return { type: '' }
  },

  computed: {
    title() {
      return `待办事项（共 ${this.items.length} 项）`
    },
    types() {
      const map = new Map()
      this.items.forEach((t) => map.set(t.type, (map.get(t.type) || 0) + 1))
      return Array.from(map, ([name, count]) => ({ name, count }))
    },
    rows() {
      const list = this.type ? this.items.filter((t) => t.type === this.type) : this.items
      // 「按创建时间倒序」：mock 里 time 已经是可排序的 yyyy-MM-dd HH:mm
      return list.slice().sort((a, b) => (a.time < b.time ? 1 : -1))
    },
  },

  methods: {
    todoTone(type) {
      return TODO_TONE[type] || 'blue'
    },
    open() {
      // 每次打开都回到「全部」，不要把上次的筛选带进来
      this.type = ''
      return this.$refs.dlg.open()
    },
  },
}
</script>
