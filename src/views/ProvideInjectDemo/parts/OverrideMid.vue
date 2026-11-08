<template>
  <div class="piom">
    <div class="piom__tag">
      <i class="el-icon-set-up" />
      中间层 OverrideMid：<code>provide() { return { themeLabel: "中间层 provider" } }</code>
      —— 只覆盖 themeLabel，cfg 没管
    </div>
    <slot />
  </div>
</template>

<script>
/**
 * 中间层提供者：故意只覆盖一个 key。
 *
 * 它不 provide cfg，所以孙组件找 cfg 时会继续往上找到页面 ——
 * 这就是「逐 key、就近」的含义：不是把祖先的 provide 整体替换掉。
 */
export default {
  name: "OverrideMid",

  provide() {
    return { themeLabel: "中间层 provider" };
  },
};
</script>

<style lang="scss" scoped>
.piom {
  padding: 10px 12px;
  background: #f7f9fc;
  border: 1px dashed #c6d4f2;
  border-radius: 6px;

  &__tag {
    margin-bottom: 8px;
    font-size: 11px;
    line-height: 18px;
    color: #5c6b8a;

    i {
      margin-right: 4px;
      color: #326fff;
    }

    code {
      font-family: Menlo, Consolas, monospace;
      color: #2e9e4f;
    }
  }
}
</style>
