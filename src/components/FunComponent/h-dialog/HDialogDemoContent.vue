<template>
  <div class="h-dialog-content">
    <!-- 插槽体检：业务组件内部判断调用方传了哪些插槽 -->
    <div class="h-dialog-content__panel">
      <span class="h-dialog-content__panel-title">插槽体检：</span>
      <el-tag
        v-for="item in slotReport"
        :key="item.name"
        size="mini"
        :type="item.on ? 'success' : 'info'"
      >{{ item.label }}：{{ item.on ? '已传入' : 'fallback' }}</el-tag>
    </div>

    <!-- ① 默认插槽：<slot> 自带 fallback -->
    <div class="h-dialog-content__block">
      <slot>
        <p class="h-dialog-content__fallback">默认插槽 fallback：调用方没有传 default。</p>
      </slot>
    </div>

    <!-- ② 具名插槽 header：整个块随插槽存在与否显隐 -->
    <div v-if="hasSlot('header')" class="h-dialog-content__block h-dialog-content__header">
      <slot name="header"></slot>
    </div>

    <!-- ③ 作用域插槽 row：把 :row/:index/:checked 回传给调用方渲染 -->
    <ul class="h-dialog-content__list">
      <li v-for="(item, index) in list" :key="item.id" class="h-dialog-content__item">
        <slot name="row" :row="item" :index="index" :checked="isChecked(item)">
          <span class="h-dialog-content__fallback">
            {{ index + 1 }}. {{ item.name }}（{{ item.email }}）— row 插槽 fallback
          </span>
        </slot>
      </li>
    </ul>

    <!-- ④ 具名插槽 extra -->
    <div v-if="hasSlot('extra')" class="h-dialog-content__block h-dialog-content__extra">
      <slot name="extra"></slot>
    </div>

    <!-- 业务自带操作区：$emit 与容器联动（自定义 footer 场景下由调用方关闭） -->
    <div v-if="!hideActions" class="h-dialog-content__actions">
      <el-button size="mini" @click="toggleAll">全选 / 反选</el-button>
      <el-button size="mini" @click="$emit('cancel')">业务取消（$emit cancel）</el-button>
      <el-button size="mini" type="primary" @click="submit">业务提交（$emit confirm）</el-button>
    </div>
  </div>
</template>

<script>
/**
 * h-dialog 示例业务组件
 * 与容器约定：确定 -> $emit('confirm', data)；取消 -> $emit('cancel')
 *
 * 注意：render 函数版容器把插槽统一走 scopedSlots 传递（Vue2.6 推荐），
 *       所以判断插槽是否存在推荐写法是 $slots[name] || $scopedSlots[name] 双判断。
 */
export default {
  name: 'HDialogDemoContent',
  props: {
    list: {
      type: Array,
      default: () => [
        { id: 1, name: '张三', email: 'zhangsan@test.com' },
        { id: 2, name: '李四', email: 'lisi@test.com' },
        { id: 3, name: '王五', email: 'wangwu@test.com' }
      ]
    },
    hideActions: { type: Boolean, default: false }
  },
  data() {
    return { checkedIds: [] }
  },
  computed: {
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
    hasSlot(name) {
      return !!(this.$slots[name] || this.$scopedSlots[name])
    },
    isChecked(item) {
      return this.checkedIds.indexOf(item.id) > -1
    },
    toggleAll() {
      this.checkedIds = this.checkedIds.length === this.list.length ? [] : this.list.map(i => i.id)
    },
    submit() {
      this.$emit('confirm', { checkedIds: this.checkedIds, source: 'HDialogDemoContent 内部按钮' })
    }
  }
}
</script>

<style scoped>
.h-dialog-content { padding: 2px 0; font-size: 13px; color: #303133; }
.h-dialog-content__panel { margin-bottom: 10px; padding: 8px 10px; background: #f5f7fa; border-radius: 4px; line-height: 26px; }
.h-dialog-content__panel-title { margin-right: 8px; color: #909399; }
.h-dialog-content__panel .el-tag { margin-right: 6px; }
.h-dialog-content__block { margin-bottom: 10px; }
.h-dialog-content__header { padding-bottom: 8px; border-bottom: 1px solid #ebeef5; }
.h-dialog-content__extra { color: #606266; }
.h-dialog-content__list { margin: 0 0 10px; padding: 0; list-style: none; }
.h-dialog-content__item { padding: 6px 0; border-bottom: 1px dashed #ebeef5; }
.h-dialog-content__fallback { margin: 0; color: #909399; }
.h-dialog-content__actions { margin-top: 12px; text-align: right; }
</style>
