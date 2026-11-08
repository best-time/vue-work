<template>
  <div class="pdp">
    <div class="pdp__hd">
      <span class="pdp__depth">第 {{ depth }} 层</span>
      <span>PassDialog · <b>order</b> 是页面 <code>openLayer({ props })</code> 传进来的接口对象</span>
    </div>

    <div class="pdp__sum">
      <div class="pdp__row">
        <span class="pdp__k">订单号</span>
        <span class="pdp__v">{{ order.orderNo }}</span>
      </div>
      <div class="pdp__row">
        <span class="pdp__k">客户</span>
        <span class="pdp__v">{{ order.customer }} · {{ order.city }}</span>
      </div>
      <div class="pdp__row">
        <span class="pdp__k">金额</span>
        <span class="pdp__v">¥ {{ order.amount.toLocaleString() }}</span>
      </div>
      <div class="pdp__row">
        <span class="pdp__k">折扣 / 优惠</span>
        <span class="pdp__v">{{ ctx.discount }} / ¥ {{ ctx.coupon }}</span>
      </div>
      <div class="pdp__row">
        <span class="pdp__k">页面 provide</span>
        <b class="pdp__v pdp__v--muted">{{ pageCtx }}</b>
      </div>
      <div class="pdp__row">
        <span class="pdp__k">应付</span>
        <span class="pdp__v pdp__v--pay">¥ {{ payable }}</span>
      </div>
    </div>

    <p class="pdp__hint">
      下面这块是本层 <code>provide('orderCtx', ctx)</code> 往下抛的：
    </p>

    <pass-mid />

    <div class="pdp__foot">
      <el-button size="small" @click="$emit('dismiss')">取 消</el-button>
      <span class="pdp__sp" />
      <el-button size="small" @click="openCoupon">再开一层（L2）选优惠券</el-button>
      <el-button size="small" type="primary" @click="submit">确 定</el-button>
    </div>
  </div>
</template>

<script>
import Vue from "vue";
import { openLayer } from "../stack";
import PassMid from "../parts/PassMid";
import PassCouponDialog from "./PassCouponDialog";

export default {
  name: "PassDialog",

  components: { PassMid },

  props: {
    /** 页面传进来的接口返回对象 */
    order: { type: Object, required: true },
    depth: { type: Number, default: 1 },
  },

  // 页面 provide 的标记：实测拿不到 —— 弹窗在 DialogHost 这个独立根实例下
  inject: {
    pageCtx: { from: "pageCtx", default: "(没拿到，宿主是独立根实例)" },
  },

  data() {
    // ctx 放 data 而不是 created：Vue 2 的初始化顺序是 data → provide → created，
    // 放 created 里的话 provide() 早就取过值了，永远是 undefined。
    // Vue.observable 让「深层改 → L1 的应付跟着变」成立。
    return {
      ctx: Vue.observable({
        order: this.order,
        discount: 0.95,
        coupon: 0,
      }),
    };
  },

  // 一行的 provide，就能让任意深度的子孙 inject 到同一个 ctx
  provide() {
    return { orderCtx: this.ctx };
  },

  computed: {
    payable() {
      return Math.round(this.order.amount * this.ctx.discount - this.ctx.coupon)
        .toLocaleString();
    },
  },

  methods: {
    async openCoupon() {
      const res = await openLayer({
        title: "选择优惠券（L2）",
        width: "520px",
        role: "PassCouponDialog",
        component: PassCouponDialog,
        // 弹窗是**另一个根实例**渲染的，provide 到不了这里，
        // 所以只能把同一个 ctx 当 props 再递一次（引用没变，两边看到的是同一份）
        props: { ctx: this.ctx },
      });
      if (!res) return;
      // 跨边界的结果用 resolve 收，再由自己落到 ctx；
      // 不要在 L2 里直接改 this.ctx.xxx（数据流会说不清，eslint 也会拦）
      this.ctx.coupon = res.coupon;
    },

    submit() {
      this.$emit("resolve", {
        orderNo: this.order.orderNo,
        discount: this.ctx.discount,
        coupon: this.ctx.coupon,
        payable: this.payable,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.pdp {
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

  &__sum {
    padding: 8px 12px;
    margin-bottom: 10px;
    background: #f7f9fc;
    border-radius: 6px;
  }

  &__row {
    display: flex;
    align-items: center;
    padding: 3px 0;
  }

  &__k {
    width: 88px;
    font-size: 12px;
    color: #909399;
  }

  &__v {
    color: #1f2d3d;

    &--pay {
      font-weight: 600;
      color: #ff3b3b;
    }

    &--muted {
      font-size: 12px;
      color: #909399;
    }
  }

  &__hint {
    margin: 0 0 6px;
    font-size: 12px;
    color: #909399;
  }

  &__foot {
    display: flex;
    align-items: center;
    margin-top: 14px;
  }

  &__sp {
    flex: 1;
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
