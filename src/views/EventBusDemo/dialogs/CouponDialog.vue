<template>
  <div class="ebc">
    <div class="ebc__hd">
      <span class="ebc__depth">第 {{ depth }} 层</span>
      <span
        >CouponDialog · 选完<b>立刻广播</b>，不等父层接，也不靠 props
        传参（它连 order 都没收到）</span
      >
    </div>

    <div class="ebc__list">
      <div
        v-for="c in coupons"
        :key="c.off"
        class="ebc__item"
        :class="{ 'is-on': picked === c.off }"
        @click="pick(c)"
      >
        <b>¥{{ c.off }}</b>
        <span>{{ c.label }}</span>
      </div>
    </div>

    <p class="ebc__hint">
      点一下就 <code>bus.$emit('eb:coupon', …)</code>：L1 的应收、PricePanel
      的「已选券」、页面日志同时变 —— 它们和这个弹窗<b>不在同一个根实例上</b>，
      provide/inject 那一套在这里是断的，bus 反而没有这个限制。
    </p>

    <event-log :names="[ev.COUPON]" title="L2 自己的日志（自己发的也能收到）" />

    <div class="ebc__foot">
      <el-button size="small" @click="$emit('dismiss')">取 消</el-button>
      <el-button
        size="small"
        type="primary"
        @click="$emit('resolve', { coupon: picked })"
      >
        用这张，关闭
      </el-button>
    </div>
  </div>
</template>

<script>
import { bus, EVENTS } from "../bus";
import EventLog from "../parts/EventLog";

const COUPONS = [
  { off: 0, label: "不使用优惠券" },
  { off: 500, label: "满 5 万减 500" },
  { off: 2000, label: "满 10 万减 2000" },
  { off: 5000, label: "满 20 万减 5000" },
];

export default {
  name: "CouponDialog",

  components: { EventLog },

  props: {
    depth: { type: Number, default: 2 },
  },

  data() {
    return { coupons: COUPONS, picked: 0 };
  },

  computed: {
    // 模板里要用事件名常量，就得从 computed 里拿
    ev() {
      return EVENTS;
    },
  },

  methods: {
    pick(c) {
      this.picked = c.off;
      // 只广播，不关心谁在听；L1 的应收会立刻变
      bus.$emit(EVENTS.COUPON, { off: c.off, label: c.label });
    },
  },
};
</script>

<style lang="scss" scoped>
.ebc {
  font-size: 13px;

  &__hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 12px;
    color: #5c6b8a;

    b {
      color: #326fff;
    }
  }

  &__depth {
    flex: none;
    padding: 1px 6px;
    font-size: 11px;
    color: #fff;
    background: #326fff;
    border-radius: 9px;
  }

  &__list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    cursor: pointer;
    background: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    transition: all 0.15s;

    b {
      font-size: 15px;
      color: #ff3b3b;
    }

    span {
      font-size: 12px;
      color: #909399;
    }

    &:hover {
      border-color: #a9c0ea;
    }

    &.is-on {
      background: #f0f5ff;
      border-color: #326fff;
    }
  }

  &__hint {
    margin: 10px 0;
    font-size: 12px;
    line-height: 1.7;
    color: #909399;

    b {
      color: #1f2d3d;
    }
  }

  &__foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
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
