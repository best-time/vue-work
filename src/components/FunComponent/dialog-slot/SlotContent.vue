<template>
  <div class="slot-content">
    <!-- 插槽体检面板：业务组件内部如何读 $slots / $scopedSlots -->
    <div class="slot-content__panel">
      <span class="slot-content__panel-title">插槽体检：</span>
      <el-tag
        v-for="item in slotReport"
        :key="item.name"
        size="mini"
        :type="item.on ? 'success' : 'info'"
      >{{ item.label }}：{{ item.on ? '已传入' : 'fallback' }}</el-tag>
    </div>

    <!-- ① 默认插槽：调用方什么都不传时走 <slot> 内部的 fallback -->
    <div class="slot-content__block">
      <slot>
        <p class="slot-content__fallback">默认插槽 fallback：调用方没有传 default。</p>
      </slot>
    </div>

    <!-- ② 具名插槽 header：用 this.$slots.header 判断，不存在就整块不渲染 -->
    <div v-if="hasSlot('header')" class="slot-content__block slot-content__header">
      <slot name="header"></slot>
    </div>

    <!-- ③ 作用域插槽 row：把每行数据(:row/:index/:checked)回传给调用方 -->
    <ul class="slot-content__list">
      <li v-for="(item, index) in list" :key="item.id" class="slot-content__item">
        <slot name="row" :row="item" :index="index" :checked="isChecked(item)">
          <!-- fallback：调用方没接管时，业务组件自己渲染 -->
          <span class="slot-content__fallback">
            {{ index + 1 }}. {{ item.name }}（{{ item.email }}）— row 插槽 fallback
          </span>
        </slot>
      </li>
    </ul>

    <!-- ④ 具名插槽 extra：放一些附加说明/表单 -->
    <div v-if="hasSlot('extra')" class="slot-content__block slot-content__extra">
      <slot name="extra"></slot>
    </div>

    <!-- 业务自身的操作区：用 $emit 与容器联动（等价于点默认 footer 的确定/取消） -->
    <div v-if="!hideActions" class="slot-content__actions">
      <el-button size="mini" @click="toggleAll">全选 / 反选</el-button>
      <el-button size="mini" @click="$emit('cancel')">业务取消（$emit cancel）</el-button>
      <el-button size="mini" type="primary" @click="submit">业务提交（$emit confirm）</el-button>
    </div>
  </div>
</template>

<script>
/**
 * 插槽示例业务组件（配合 $dialog.js / FuncDialog.vue 使用）
 *
 * 组件内部声明了 4 种插槽，演示两个方向的能力：
 *   1. 向外提供插槽：default / header / row（作用域插槽）/ extra
 *   2. 向内读取插槽：this.$slots.xx 判断普通插槽是否存在，
 *      this.$scopedSlots.xx 判断作用域插槽是否被调用方接管
 *
 * 与容器的约定：
 *   确定 -> $emit('confirm', data)；取消 -> $emit('cancel')
 */
export default {
  name: 'SlotContent',
  props: {
    // 列表数据（由调用方通过 props 传入）
    list: {
      type: Array,
      default: () => [
        { id: 1, name: '张三', email: 'zhangsan@test.com' },
        { id: 2, name: '李四', email: 'lisi@test.com' },
        { id: 3, name: '王五', email: 'wangwu@test.com' }
      ]
    },
    // 隐藏组件自带的按钮区（演示「确定按钮交给自定义 footer」）
    hideActions: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      checkedIds: []
    }
  },
  computed: {
    /**
     * 插槽巡检结果 —— 这里就是 $slots / $scopedSlots 的典型用法
     * 注意：Vue 2.6 起 $scopedSlots 同时包含普通插槽，
     *      所以「是否传入」判断两种都写上，兼容后续改成作用域插槽的情况。
     */
    slotReport() {
      const check = name => !!(this.$slots[name] || this.$scopedSlots[name])
      return [
        { name: 'default', label: '默认插槽', on: check('default') },
        { name: 'header', label: 'header', on: check('header') },
        { name: 'row', label: 'row(作用域)', on: check('row') },
        { name: 'extra', label: 'extra', on: check('extra') }
      ]
    }
  },
  methods: {
    /** 判断某个插槽是否存在（$slots 普通插槽 / $scopedSlots 作用域插槽） */
    hasSlot(name) {
      return !!(this.$slots[name] || this.$scopedSlots[name])
    },
    isChecked(item) {
      return this.checkedIds.indexOf(item.id) > -1
    },
    toggleAll() {
      this.checkedIds = this.checkedIds.length === this.list.length ? [] : this.list.map(i => i.id)
    },
    /** 确认：把业务数据通过 confirm 事件交给容器 */
    submit() {
      this.$emit('confirm', {
        checkedIds: this.checkedIds,
        source: 'SlotContent 组件内部按钮'
      })
    }
  }
}
</script>

<style scoped>
.slot-content {
  padding: 2px 0;
  font-size: 13px;
  color: #303133;
}
.slot-content__panel {
  margin-bottom: 10px;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 4px;
  line-height: 26px;
}
.slot-content__panel-title {
  margin-right: 8px;
  color: #909399;
}
.slot-content__panel .el-tag {
  margin-right: 6px;
}
.slot-content__block {
  margin-bottom: 10px;
}
.slot-content__header {
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.slot-content__footer-tip,
.slot-content__extra {
  color: #606266;
}
.slot-content__list {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.slot-content__item {
  padding: 6px 0;
  border-bottom: 1px dashed #ebeef5;
}
.slot-content__fallback {
  margin: 0;
  color: #909399;
}
.slot-content__actions {
  margin-top: 12px;
  text-align: right;
}
</style>
