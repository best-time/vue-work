<template>
  <div class="ebo">
    <div class="ebo__hd">
      <span class="ebo__depth">第 {{ depth }} 层</span>
      <span
        >OrderDialog · <code>props</code> 只接打开时的入口参数，之后的交互一律走总线</span
      >
    </div>

    <div class="ebo__sum">
      <div class="ebo__row">
        <span class="ebo__k">订单号</span>
        <span class="ebo__v">{{ order.orderNo }}</span>
      </div>
      <div class="ebo__row">
        <span class="ebo__k">客户</span>
        <span class="ebo__v">{{ order.customer }} · {{ order.city }}</span>
      </div>
      <div class="ebo__row">
        <span class="ebo__k">原价 / 改价</span>
        <span class="ebo__v">
          ¥ {{ order.amount.toLocaleString() }} → <b>¥ {{ amount.toLocaleString() }}</b>
        </span>
      </div>
      <div class="ebo__row">
        <span class="ebo__k">已选券</span>
        <span class="ebo__v">{{ couponLabel || "未选" }}</span>
      </div>
      <div class="ebo__row">
        <span class="ebo__k">应收</span>
        <span class="ebo__v ebo__v--pay">¥ {{ payable.toLocaleString() }}</span>
      </div>
      <div class="ebo__row">
        <span class="ebo__k">收到 eb:early</span>
        <span class="ebo__v ebo__early">{{ earlyCount }} 次</span>
      </div>
    </div>

    <price-panel :initial="order.amount" />

    <div class="ebo__logs">
      <event-log
        :names="[ev.PRICE, ev.COUPON, ev.EARLY]"
        title="L1 日志（create 时 $on，销毁时 $off）"
      />
    </div>

    <p class="ebo__hint">
      下面这个按钮打开 L2 时<b>没传任何业务参数</b>：券是 L2 广播出来的，
      L1 靠 <code>bus.$on('eb:coupon')</code> 收到，连 <code>resolve</code>
      的返回值都不需要用。
    </p>

    <div class="ebo__foot">
      <el-button size="small" @click="$emit('dismiss')">取 消</el-button>
      <span class="ebo__sp" />
      <el-button size="small" @click="openCoupon">再开一层（L2）选券</el-button>
      <el-button size="small" type="primary" @click="submit">确 定</el-button>
    </div>
  </div>
</template>

<script>
// 复用 DialogNestDemo 里那套「一层一个文件 + 一个 Promise」的栈；换项目时只改这个 import
import { openLayer } from "@/views/DialogNestDemo/nest/stack";
import { bus, EVENTS } from "../bus";
import PricePanel from "../parts/PricePanel";
import EventLog from "../parts/EventLog";
import CouponDialog from "./CouponDialog";

export default {
  name: "OrderDialog",

  components: { PricePanel, EventLog },

  props: {
    order: { type: Object, required: true },
    depth: { type: Number, default: 1 },
  },

  data() {
    return {
      amount: this.order.amount,
      coupon: 0,
      couponLabel: "",
      earlyCount: 0,
    };
  },

  computed: {
    payable() {
      return Math.max(0, this.amount - this.coupon);
    },
    ev() {
      return EVENTS;
    },
  },

  created() {
    // 全部用「具名方法」注册：$off 必须传同一个引用，内联箭头函数摘不掉
    bus.$on(EVENTS.PRICE, this.onPrice);
    bus.$on(EVENTS.COUPON, this.onCoupon);
    bus.$on(EVENTS.EARLY, this.onEarly);
  },

  mounted() {
    // 「我挂载好了」广播出去：打开方等这个事件再发数据，比猜 $nextTick 层数靠谱
    bus.$emit(EVENTS.READY, { orderNo: this.order.orderNo });
  },

  beforeDestroy() {
    // 弹窗每开一次就 new 一个实例，不摘监听 → bus 上越积越多，一改价全班都执行一遍
    bus.$off(EVENTS.PRICE, this.onPrice);
    bus.$off(EVENTS.COUPON, this.onCoupon);
    bus.$off(EVENTS.EARLY, this.onEarly);
  },

  methods: {
    onPrice({ amount }) {
      this.amount = amount;
    },

    onCoupon({ off, label }) {
      this.coupon = off;
      this.couponLabel = label;
    },

    onEarly() {
      this.earlyCount += 1;
    },

    async openCoupon() {
      await openLayer({
        title: "选择优惠券（L2）",
        width: "520px",
        role: "CouponDialog",
        component: CouponDialog,
        // 注意：什么业务参数都没传。L2 也不需要 order，
        // 它只负责「广播选了什么」，谁关心谁自己 $on。
        props: {},
      });
    },

    submit() {
      this.$emit("resolve", {
        orderNo: this.order.orderNo,
        amount: this.amount,
        coupon: this.coupon,
        payable: this.payable,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.ebo {
  font-size: 13px;

  &__hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 12px;
    color: #5c6b8a;
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
    width: 104px;
    font-size: 12px;
    color: #909399;
  }

  &__v {
    color: #1f2d3d;

    b {
      color: #326fff;
    }

    &--pay {
      font-size: 15px;
      font-weight: 600;
      color: #ff3b3b;
    }
  }

  &__early {
    font-family: Menlo, Consolas, monospace;
  }

  &__logs {
    margin-top: 10px;
  }

  &__hint {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.7;
    color: #909399;

    b {
      color: #1f2d3d;
    }
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
