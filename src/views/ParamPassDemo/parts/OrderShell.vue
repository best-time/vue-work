<template>
  <div class="oshell">
    <div class="oshell__hd">
      <span class="oshell__name">中间层 · OrderShell</span>
      <el-tag size="mini" type="info">props = {{ propsCount }} 个</el-tag>
      <el-tag size="mini" type="info">provide = 无</el-tag>
      <el-tag size="mini" type="info">inject = 无</el-tag>
      <span class="oshell__hint">只负责布局，完全不参与传参</span>
    </div>
    <div class="oshell__body">
      <slot />
    </div>
  </div>
</template>

<script>
/**
 * 中间层组件（provide 样例用）
 *
 * 它的唯一作用：证明 provide / inject 可以**跨层级**，
 * 中间层既不接收 props、也不 provide，还不用 v-bind="$attrs" 透传 —— 孙子照样拿得到祖先的上下文。
 * 页面里的三个标签直接读自身状态（props 个数 = 0），不是写死的文案。
 */
export default {
  name: "OrderShell",

  computed: {
    propsCount() {
      return Object.keys(this.$props || {}).length;
    },
  },
};
</script>

<style lang="scss" scoped>
.oshell {
  padding: 10px 12px 12px;
  background: #fbfcff;
  border: 1px dashed #c9d6f5;
  border-radius: 6px;

  &__hd {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: #326fff;
  }

  &__hint {
    font-size: 12px;
    color: #909399;
  }

  &__body {
    padding-left: 10px;
    border-left: 3px solid #d9e6ff;
  }
}
</style>
