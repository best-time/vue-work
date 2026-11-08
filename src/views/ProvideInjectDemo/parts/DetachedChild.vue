<template>
  <div class="pidc" :class="ok ? 'is-ok' : 'is-bad'">
    <span class="pidc__dot" />
    <span class="pidc__label">{{ label }}</span>
    <span class="pidc__ctx">ctx: {{ owner }}</span>
    <span class="pidc__parent">$parent: {{ hasParent ? "有" : "空" }}</span>
  </div>
</template>

<script>
/**
 * 被手动挂载的被注入方。
 *
 * 故意用数组写法 + 不写 default —— 就是为了让「取不到」这件事在 dev 下
 * 变成一条看得见的 warn：
 *   [Vue warn] injection "ctx" not found
 * 写在组件树里时能正常拿到（祖先 DetachedTab 提供），自己 new 出来后就不行了。
 */
export default {
  name: "DetachedChild",

  props: {
    label: { type: String, default: "" },
  },

  inject: ["ctx"],

  computed: {
    ok() {
      return !!this.ctx;
    },
    owner() {
      // 取不到时 ctx 就是 undefined，模板里必须自己兜，否则直接渲染报错
      return this.ctx ? this.ctx.owner : "undefined";
    },
    hasParent() {
      return !!this.$parent;
    },
  },
};
</script>

<style lang="scss" scoped>
.pidc {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 8px 8px 0;
  padding: 5px 10px;
  font-size: 11px;
  border-radius: 4px;

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  &__label {
    color: #303133;
  }

  &__ctx,
  &__parent {
    font-family: Menlo, Consolas, monospace;
    font-size: 10px;
    color: #909399;
  }

  &.is-ok {
    background: #f0faf3;
    border: 1px solid #d5f0de;

    .pidc__dot {
      background: #2e9e4f;
    }
  }

  &.is-bad {
    background: #fef0f0;
    border: 1px solid #fde2e2;

    .pidc__dot {
      background: #f56c6c;
    }

    .pidc__ctx {
      color: #f56c6c;
    }
  }
}
</style>
