<template>
  <div class="card tone-indigo">
    <div class="card-h">
      <h3>待办事项（共 {{ items.length }} 项）</h3>
      <button class="lnk" @click="openAll">查看全部 →</button>
    </div>
    <div class="card-b">
      <div v-for="t in top" :key="t.id" class="todo-i">
        <span class="tag" :class="'tag-' + todoTone(t.type)">{{ t.type }}</span>
        <div class="todo-main">
          <div class="todo-title">{{ t.title }}</div>
          <div class="hint">{{ t.org }} · {{ t.time }}</div>
        </div>
        <button class="btn" @click="$emit('go', t)">办理</button>
      </div>
      <div v-if="!top.length" class="hint" style="padding: 6px 0">当前范围暂无待办。</div>
      <div class="hint" style="margin-top: 8px">
        {{ rest ? '还有 ' + rest + ' 项待办未显示，点击「查看全部」查看。' : '' }}
      </div>
    </div>

    <!-- 全部待办：卡片放不下，点「查看全部」弹窗看 -->
    <TodoDialog ref="allDlg" :items="items" :scope-label="scopeLabel" @go="$emit('go', $event)" />
  </div>
</template>

<script>
import { TODO_TONE } from '../mock'
import TodoDialog from './TodoDialog.vue'

/**
 * 待办事项卡
 * ------------------------------------------------------------
 * items 是当前范围的全量待办（父级按机构过滤好），卡片自己切前 5 条，
 * 剩下的进弹窗 —— 弹窗要的就是同一份数据，没必要再向父级要一次。
 */
export default {
  name: 'RcdTodoCard',

  components: { TodoDialog },

  props: {
    items: { type: Array, default: () => [] },
    scopeLabel: { type: String, default: '全省' },
  },

  computed: {
    top() {
      return this.items.slice(0, 5)
    },
    rest() {
      return Math.max(0, this.items.length - this.top.length)
    },
  },

  methods: {
    todoTone(type) {
      return TODO_TONE[type] || 'blue'
    },
    openAll() {
      this.$refs.allDlg.open()
    },
  },
}
</script>
