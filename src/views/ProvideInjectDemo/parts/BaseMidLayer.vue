<template>
  <div class="pim">
    <div class="pim__tag">
      <i class="el-icon-connection" />
      中间层 BaseMidLayer：无 props / 无 inject / 无 provide / 不透传
    </div>
    <div class="pim__body">
      <slot />
    </div>
  </div>
</template>

<script>
/**
 * 故意「什么都不做」的中间层 —— 用来证明注入不需要逐层转发。
 *
 * 它甚至不知道下面那个组件存在，也不知道上面注入了什么。
 * 注意：这不是 $attrs 透传，$attrs 只负责「父 → 子一层」，
 * 跨三层还是得靠 provide/inject（或 props 一层层写）。
 */
export default {
  name: "BaseMidLayer",
};
</script>

<style lang="scss" scoped>
.pim {
  padding: 12px;
  background: #f7f9fc;
  border: 1px dashed #c6d4f2;
  border-radius: 6px;

  &__tag {
    margin-bottom: 10px;
    font-size: 11px;
    color: #5c6b8a;

    i {
      margin-right: 4px;
      color: #326fff;
    }
  }

  &__body {
    padding: 10px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }
}
</style>
