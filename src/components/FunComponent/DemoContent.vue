<template>
  <div class="demo-content">
    <p>{{ msg }}</p>

    <!-- 业务内操作：通过 $emit('confirm'/'cancel') 与容器联动 -->
    <el-button type="primary" @click="$emit('confirm', '业务提交的数据')">业务提交</el-button>
    <el-button @click="$emit('cancel')">关闭</el-button>

    <!-- 业务内部插槽：由调用方 $dialog 传入 -->
    <slot name="extra"></slot>
  </div>
</template>

<script>
/**
 * 示例业务组件
 * 约定：确定 -> $emit('confirm', data)；取消 -> $emit('cancel')
 * 容器会监听这两个事件并统一收口关闭弹窗。
 */
export default {
  name: 'DemoContent',
  props: {
    msg: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.demo-content {
  padding: 4px 0;
}
</style>
