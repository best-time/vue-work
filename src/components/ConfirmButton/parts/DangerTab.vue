<template>
  <div class="cbd__grid">
    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>列表里的逐行删除</b>
        <code>danger + warning 图标</code>
      </div>
      <div class="cbd__pad">
        <div v-for="row in rows" :key="row.id" class="cbd__row">
          <span class="cbd__row-name">{{ row.name }}</span>
          <confirm-button
            size="mini"
            type="danger"
            plain
            confirm-title="删除招聘计划"
            :confirm-content="
              '删除「' + row.name + '」后，其下的实施记录与候选人关联会一并失效，且不可恢复。'
            "
            confirm-text="删除"
            confirm-type="danger"
            confirm-icon="warning"
            :action="() => removeRow(row)"
            success-text="已删除"
            @cancel="log('cancel', '② 取消删除「' + row.name + '」')"
            @success="log('success', '② 已删除「' + row.name + '」')"
          >
            删除
          </confirm-button>
        </div>
        <div v-if="!rows.length" class="cbd__empty">
          三条都删完了 ——
          <el-button type="text" @click="resetRows">恢复列表</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>before-confirm 守卫</b>
        <code>返回 false 就不弹框</code>
      </div>
      <div class="cbd__pad">
        <div class="cbd__actions">
          <confirm-button
            type="warning"
            :before-confirm="guard"
            confirm-title="归档当前机构"
            confirm-content="归档后该机构不再出现在统计口径里，可随时取消归档。"
            confirm-icon="question"
            :action="archive"
            success-text="已归档"
            @block="onBlock"
            @confirm="log('confirm', '② 守卫通过，弹框确认')"
          >
            归档当前机构
          </confirm-button>
          <el-switch v-model="locked" active-text="模拟「已锁定」" inactive-text="可归档" />
        </div>
        <p class="cbd__help">
          守卫是<b>异步</b>的（模拟 400ms 查询）：
          <code>before-confirm</code> 返回 <code>false</code>（或 Promise&lt;false&gt;）时不弹框，
          只 <code>$emit('block')</code>。守卫执行期间再点按钮会被忽略，
          避免连点弹出两个框。
        </p>
        <div class="cbd__hint">
          典型用途：先查一遍「这笔单据是否已被别人处理」，已处理就直接提示、不进确认流程。
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card cbd__card--wide">
      <div slot="header" class="cbd__card-head">
        <b>弹窗长什么样由 props 决定</b>
        <span class="cbd__muted">标题 / 正文 / 图标 / 按钮文案 / 宽度</span>
      </div>
      <div class="cbd__pad">
        <table class="cbd__tbl">
          <thead>
            <tr>
              <th>属性</th>
              <th>对应位置</th>
              <th>默认</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>confirm-title</code></td><td>头部标题</td><td>操作确认</td></tr>
            <tr><td><code>confirm-content</code> 或 <code>#content</code></td><td>正文（插槽优先）</td><td>空</td></tr>
            <tr><td><code>confirm-icon</code></td><td>正文左侧图标</td><td><code>none</code></td></tr>
            <tr><td><code>confirm-text</code> / <code>cancel-text</code></td><td>底部按钮文案</td><td>确定 / 取消</td></tr>
            <tr><td><code>confirm-type</code></td><td>确定按钮颜色</td><td><code>primary</code></td></tr>
            <tr><td><code>confirm-width</code></td><td>弹窗宽度</td><td><code>460px</code></td></tr>
          </tbody>
        </table>
      </div>
    </el-card>
  </div>
</template>

<script>
import logMixin from './logMixin'
import { wait } from './wait'

const DEFAULT_ROWS = () => [
  { id: 1, name: '2026 春季校园招聘计划' },
  { id: 2, name: '社会招聘 · 柜员岗（第三批）' },
  { id: 3, name: '实习生转正名单' },
]

export default {
  name: 'ConfirmButtonDangerTab',
  mixins: [logMixin],

  data() {
    return {
      locked: false,
      rows: DEFAULT_ROWS(),
    }
  },

  methods: {
    async removeRow(row) {
      await wait(900)
      this.rows = this.rows.filter((r) => r.id !== row.id)
      return row.name
    },

    resetRows() {
      this.rows = DEFAULT_ROWS()
      this.log('click', '② 列表已恢复')
    },

    /** 异步守卫：锁定状态下返回 false → 不弹框 */
    guard() {
      this.log('click', '② 守卫开始查询（400ms）…')
      return wait(400, !this.locked)
    },

    onBlock() {
      this.log('block', '② 被守卫拦下，没有弹确认框')
      this.$message({ message: '该机构已锁定，无法归档', type: 'warning', duration: 2200, showClose: true })
    },

    async archive() {
      await wait(800)
      return 'archived'
    },
  },
}
</script>
