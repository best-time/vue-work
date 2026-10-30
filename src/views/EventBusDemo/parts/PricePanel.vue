<template>
  <div class="eb-price">
    <div class="eb-price__hd">
      <b>PricePanel</b>
      <span class="eb-price__sub">改价只广播，不 $emit 给父组件</span>
    </div>

    <div class="eb-price__row">
      <span class="eb-price__k">改价</span>
      <el-input-number
        :value="value"
        :min="0"
        :max="999999"
        :step="500"
        size="mini"
        controls-position="right"
        @change="onChange"
      />
      <span class="eb-price__k">已选券</span>
      <span class="eb-price__coupon">{{ couponText }}</span>
    </div>

    <p class="eb-price__hint">
      它和 L1 摘要、页面日志是<b>三个互不相干的组件</b>（一个在弹窗里，一个在页面上），
      彼此没有 props、没有 $emit 关系 —— 全靠
      <code>bus.$emit('eb:price', …)</code> 一条广播。
    </p>
  </div>
</template>

<script>
import { bus, EVENTS } from "../bus";

export default {
  name: "PricePanel",

  props: {
    // 初值用 props 传：bus 不存状态，新挂载的组件收不到历史事件
    initial: { type: Number, default: 0 },
  },

  data() {
    return { value: this.initial, couponText: "未选" };
  },

  created() {
    // 先取名方法再 $on，保证 $off 时是同一个引用（内联箭头函数摘不掉）
    bus.$on(EVENTS.COUPON, this.onCoupon);
  },

  beforeDestroy() {
    bus.$off(EVENTS.COUPON, this.onCoupon);
  },

  methods: {
    onChange(v) {
      const n = Number(v) || 0;
      this.value = n;
      // 就地广播：谁关心谁自己 $on，不用一层层往上 $emit
      bus.$emit(EVENTS.PRICE, { amount: n, from: "PricePanel" });
    },

    // L2 弹窗选的券，这个面板也能收到（它俩没有父子关系，甚至不在同一棵树上）
    onCoupon({ label }) {
      this.couponText = label;
    },
  },
};
</script>

<style lang="scss" scoped>
.eb-price {
  padding: 10px;
  background: #f9fbff;
  border: 1px solid #e3edff;
  border-radius: 6px;

  &__hd {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;

    b {
      font-size: 13px;
      color: #1f2d3d;
    }
  }

  &__sub {
    font-size: 12px;
    color: #909399;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__k {
    font-size: 12px;
    color: #909399;

    &:not(:first-child) {
      margin-left: 8px;
    }
  }

  &__coupon {
    font-size: 12px;
    color: #ff3b3b;
  }

  &__hint {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.7;
    color: #909399;

    b {
      color: #1f2d3d;
    }
  }

  code {
    padding: 1px 4px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    color: #c7254e;
    background: #f7f4f5;
    border-radius: 2px;
  }
}
</style>
