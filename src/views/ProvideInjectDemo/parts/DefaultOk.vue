<template>
  <div class="pido">
    <span class="pido__dot" />
    {{ label }}
    <code class="pido__obj">tags: [{{ opts.tags.length }}]</code>
  </div>
</template>

<script>
/**
 * 正确的写法：对象默认值用工厂函数。
 * 每个实例调用一次工厂，拿到的是各自的对象。
 */
export default {
  name: "DefaultOk",

  props: {
    label: { type: String, default: "" },
  },

  inject: {
    opts: { default: () => ({ tags: [] }) },
  },

  created() {
    // 把「我拿到的那个对象」交给页面去两两比对是不是同一个引用
    this.$emit("instance", this.opts);
  },
};
</script>

<style lang="scss" scoped>
.pido {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  font-size: 11px;
  color: #2e9e4f;
  background: #f0faf3;
  border: 1px solid #d5f0de;
  border-radius: 4px;

  &__dot {
    width: 6px;
    height: 6px;
    background: #2e9e4f;
    border-radius: 50%;
  }

  &__obj {
    font-family: Menlo, Consolas, monospace;
    font-size: 10px;
    color: #5c6b8a;
  }
}
</style>
