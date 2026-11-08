<template>
  <div class="pids">
    <span class="pids__dot" />
    {{ label }}
    <code class="pids__obj">tags: [{{ opts.tags.length }}]</code>
  </div>
</template>

<script>
/**
 * 反例：对象默认值直接写字面量。
 *
 * 这个默认值就写在组件的 inject 选项里，是**选项对象本身的属性**，
 * 所有实例共用同一个引用 —— 一个 push 了，另一个也跟着有。
 * 而且它没被 observe，改了也不会触发重渲染，bug 藏得特别深。
 */
export default {
  name: "DefaultShared",

  props: {
    label: { type: String, default: "" },
  },

  inject: {
    opts: { default: { tags: [] } },
  },

  created() {
    this.$emit("instance", this.opts);
  },
};
</script>

<style lang="scss" scoped>
.pids {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  font-size: 11px;
  color: #f56c6c;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;

  &__dot {
    width: 6px;
    height: 6px;
    background: #f56c6c;
    border-radius: 50%;
  }

  &__obj {
    font-family: Menlo, Consolas, monospace;
    font-size: 10px;
    color: #5c6b8a;
  }
}
</style>
