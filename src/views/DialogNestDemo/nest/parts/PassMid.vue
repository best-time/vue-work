<template>
  <div class="pdp-mid">
    <div class="pdp-mid__tag">
      中间层 PassMid · props 0 个 / provide 0 个 / inject 0 个 —— 为了传参它一行都不用改
    </div>
    <pass-deep />
  </div>
</template>

<script>
import PassDeep from "./PassDeep";

/**
 * 故意插一层「什么都不做」的组件：
 * 证明 provide 是跨层的，中间层不需要把参数接力传下去（props 方案就必须写一遍）。
 */
export default {
  name: "PassMid",
  components: { PassDeep },
};
</script>

<style lang="scss" scoped>
.pdp-mid {
  padding: 10px;
  background: #f9fbff;
  border: 1px solid #e3edff;
  border-radius: 6px;

  &__tag {
    margin-bottom: 8px;
    font-size: 12px;
    color: #5c6b8a;
  }
}
</style>
