<template>
  <div class="pdp-deep">
    <span class="pdp-deep__tag">深层 PassDeep</span>
    <span class="pdp-deep__k">inject 折扣</span>
    <el-input-number
      v-model="orderCtx.discount"
      :min="0.5"
      :max="1"
      :step="0.05"
      :precision="2"
      size="mini"
      controls-position="right"
    />
    <span class="pdp-deep__pay">应付 ¥{{ payable }}</span>
  </div>
</template>

<script>
/**
 * 最深处那一层：和 L1 隔着一个中间层，中间层什么都不用做。
 * 唯一要求 —— 祖先里有人 provide('orderCtx', ctx)，这个祖先就是 L1（PassDialog）。
 */
export default {
  name: "PassDeep",

  inject: {
    // default 只是防呆：万一被放到没有 provide 的地方，也别直接崩
    orderCtx: { from: "orderCtx", default: null },
  },

  computed: {
    payable() {
      const c = this.orderCtx;
      if (!c || !c.order) return "-";
      return Math.round(c.order.amount * c.discount - c.coupon).toLocaleString();
    },
  },
};
</script>

<style lang="scss" scoped>
.pdp-deep {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12px;
  background: #fff;
  border: 1px dashed #c9d8f5;
  border-radius: 4px;

  &__tag {
    padding: 1px 6px;
    font-size: 11px;
    color: #326fff;
    background: #eef3ff;
    border-radius: 9px;
  }

  &__k {
    color: #909399;
  }

  &__pay {
    margin-left: auto;
    font-weight: 600;
    color: #ff3b3b;
  }
}
</style>
