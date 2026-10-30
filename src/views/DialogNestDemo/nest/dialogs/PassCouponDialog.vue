<template>
  <div class="pdc">
    <div class="pdc__hd">
      <span class="pdc__depth">第 {{ depth }} 层</span>
      <span>PassCouponDialog · <b>ctx</b> 是 L1 当 props 递进来的同一个对象</span>
    </div>

    <div class="pdc__list">
      <div
        v-for="c in coupons"
        :key="c.off"
        class="pdc__item"
        :class="{ 'is-on': coupon === c.off }"
        @click="coupon = c.off"
      >
        <b>¥{{ c.off }}</b>
        <span>{{ c.label }}</span>
      </div>
    </div>

    <p class="pdc__hint">
      选券只改<b>本层</b>的 <code>coupon</code>，点确定才 <code>resolve</code> 回 L1、由 L1 落到
      ctx —— 跨边界直接改别人的对象，数据流就说不清了（eslint 的
      <code>vue/no-mutating-props</code> 也拦这个）。
      而下面这个深层组件是 <code>inject</code> 到同一份 ctx 后<b>直接改</b>的，
      改完 L1 立刻跟着变：同一棵树内才用它。
    </p>

    <pass-deep />

    <div class="pdc__foot">
      <el-button size="small" @click="$emit('dismiss')">取 消</el-button>
      <el-button size="small" type="primary" @click="$emit('resolve', { coupon })">
        用这张，返回
      </el-button>
    </div>
  </div>
</template>

<script>
import PassDeep from "../parts/PassDeep";

const COUPONS = [
  { off: 0, label: "不使用优惠券" },
  { off: 500, label: "满 5 万减 500" },
  { off: 2000, label: "满 10 万减 2000" },
  { off: 5000, label: "满 20 万减 5000" },
];

export default {
  name: "PassCouponDialog",

  components: { PassDeep },

  props: {
    /** L1 的 ctx，引用同一个对象 */
    ctx: { type: Object, required: true },
    depth: { type: Number, default: 2 },
  },

  // 这一层也能往下 provide，本文件底部的 PassDeep 就是靠它 inject 到同一份 ctx
  provide() {
    return { orderCtx: this.ctx };
  },

  data() {
    return {
      coupons: COUPONS,
      // 只是「本层待确认的选择」，初始值取自共享 ctx
      coupon: this.ctx.coupon,
    };
  },
};
</script>

<style lang="scss" scoped>
.pdc {
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
    margin-top: 12px;
    text-align: right;
  }
}
</style>
