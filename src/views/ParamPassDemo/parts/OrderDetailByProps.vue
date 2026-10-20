<template>
  <el-card shadow="never" class="odpc">
    <div slot="header" class="odpc__hd">
      <span class="odpc__name">子组件 · props 接收</span>
      <code class="odpc__sig"
        >&lt;order-detail-by-props :order="current" :force-fail="forceFail"
        /&gt;</code
      >
      <el-tag v-if="order" size="mini" type="success"
        >已收到 orderNo = {{ order.orderNo }}</el-tag
      >
      <el-tag v-else size="mini" type="info">还没收到参数</el-tag>
      <span class="odpc__calls">子组件已请求 {{ calls }} 次</span>
    </div>

    <!-- ① 父传下来的参数 -->
    <div class="odpc__sec">
      <div class="odpc__label">
        ① 父组件传进来的 props.order（就是父组件接口返回的那一条）
      </div>
      <div v-if="order" class="odpc__grid">
        <div class="odpc__cell">
          <span>orderNo</span><b>{{ order.orderNo }}</b>
        </div>
        <div class="odpc__cell">
          <span>customerId</span><b>{{ order.customerId }}</b>
        </div>
        <div class="odpc__cell">
          <span>customer</span><b>{{ order.customer }}</b>
        </div>
        <div class="odpc__cell">
          <span>amount</span><b>¥{{ order.amount }}</b>
        </div>
        <div class="odpc__cell">
          <span>version</span><b>{{ order.version }}</b>
        </div>
      </div>
      <el-alert
        v-else
        type="info"
        :closable="false"
        show-icon
        title="props.order 是 null —— 父组件的列表接口还没回来，子组件先渲染空态"
      />
    </div>

    <!-- ② 从 props 里挑出请求参数 -->
    <div class="odpc__sec">
      <div class="odpc__label">
        ② 子组件拿这些参数**再发一次请求**（参数不是自己编的，全部来自 props）
      </div>
      <pre class="odpc__pre">{{ queryText }}</pre>
    </div>

    <!-- ③ 请求状态 -->
    <div class="odpc__sec">
      <div class="odpc__label">③ 子组件自己的 loading / error</div>
      <div v-if="loading" class="odpc__loading">
        <i class="el-icon-loading" />
        <span>fetchOrderShipment(...) 请求中…</span>
      </div>
      <el-alert
        v-else-if="error"
        type="error"
        :closable="false"
        show-icon
        :title="error"
      >
        <el-button type="text" size="mini" @click="load">重试</el-button>
      </el-alert>
      <div v-else-if="result" class="odpc__ok">
        <i class="el-icon-success" />
        <span
          >返回成功 · 耗时 {{ cost }}ms · 服务端时间
          {{ result.serverTime }}</span
        >
      </div>
      <div v-else class="odpc__idle">等待参数…</div>
    </div>

    <!-- ④ 请求结果 -->
    <div v-if="result" class="odpc__sec">
      <div class="odpc__label">④ 子组件用返回结果渲染（父组件完全没参与）</div>
      <div class="odpc__grid odpc__grid--result">
        <div class="odpc__cell">
          <span>承运商</span><b>{{ result.summary.carrier }}</b>
        </div>
        <div class="odpc__cell">
          <span>运单号</span><b>{{ result.summary.trackingNo }}</b>
        </div>
        <div class="odpc__cell">
          <span>包裹数</span><b>{{ result.summary.packages }}</b>
        </div>
        <div class="odpc__cell">
          <span>预计送达</span><b>{{ result.summary.eta }}</b>
        </div>
        <div class="odpc__cell">
          <span>客户（服务端按 customerId 查的）</span
          ><b>{{ result.customer.name }} · {{ result.customer.city }}</b>
        </div>
      </div>
      <el-table
        :data="result.shipments"
        size="mini"
        border
        class="odpc__table"
        empty-text="没有发货明细"
      >
        <el-table-column prop="sku" label="SKU" width="100" />
        <el-table-column prop="name" label="商品" min-width="150" />
        <el-table-column prop="qty" label="数量" width="70" align="right" />
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column prop="trackingNo" label="子运单号" min-width="180" />
      </el-table>
    </div>

    <p class="odpc__note">
      子组件只做两件事：<b>watch props.order</b> → 把 order 里的字段拼成请求参数
      → 自己发请求、自己管 loading/error。
      父组件不知道子组件调了什么接口（也不需要知道），这就是 props 方式的边界：
      <b>参数从上往下显式流动，请求在子组件内部闭环</b>。
    </p>
  </el-card>
</template>

<script>
/**
 * 子组件 A：props 方式
 *
 * 职责：接收父组件接口返回的订单对象（props.order），
 *      用它的 orderNo / customerId / version 作为参数，**自己再调一次接口**，
 *      然后渲染自己的结果、自己的 loading / error / 重试。
 *
 * 两个必须写对的点：
 *   1. watch(order, { immediate: true }) —— 父组件的接口可能晚于子组件挂载才返回；
 *      在 data()/created 里读一次 props 会读到 null，之后就不会再更新了。
 *   2. 请求竞态 —— 父组件连点几条订单时，先发的请求可能后回来；
 *      用自增 seq 记住「我这次是第几次」，回来时 seq 对不上就丢弃结果。
 */
import { fetchOrderShipment } from "../mockApi";

export default {
  name: "OrderDetailByProps",

  props: {
    /** 父组件接口返回的订单对象；父组件还没拉到数据时是 null */
    order: { type: Object, default: null },
    /** 父组件下发的「模拟失败」开关，方便看子组件的错误态 */
    forceFail: { type: Boolean, default: false },
  },

  data() {
    return {
      loading: false,
      error: "",
      result: null,
      lastParams: null,
      /** 请求序号：只认最后一次请求的结果 */
      seq: 0,
      /** 子组件自己发了几次请求，肉眼确认 watch 触发了 */
      calls: 0,
      cost: 0,
    };
  },

  computed: {
    /** 从 props 里挑参数 —— 不是把整个 order 丢给接口，只取请求需要的字段 */
    queryParams() {
      const o = this.order;
      if (!o || !o.orderNo) return null;
      return {
        orderNo: o.orderNo,
        customerId: o.customerId,
        round: o.version || 0,
      };
    },
    queryText() {
      if (!this.lastParams)
        return "// 参数还没到：父组件的接口返回之前，子组件不发请求";
      return JSON.stringify(this.lastParams, null, 2);
    },
  },

  watch: {
    /** 核心：immediate 覆盖「挂载时已有参数」，之后每次父组件换新对象都会重新请求 */
    order: {
      immediate: true,
      handler() {
        this.load();
      },
    },
    /** 开关变了也重新请求一次，保证「模拟失败 → 关掉开关 → 重试」好操作 */
    forceFail() {
      if (this.order) {
        this.load();
      }
    },
  },

  methods: {
    async load() {
      const params = this.queryParams;
      if (!params) {
        this.result = null;
        this.error = "";
        this.lastParams = null;
        return;
      }

      const seq = ++this.seq;
      this.calls += 1;
      this.lastParams = params;
      this.loading = true;
      this.error = "";
      this.$emit("log", {
        kind: "child",
        text:
          "子 → fetchOrderShipment({ orderNo: " +
          params.orderNo +
          ", customerId: " +
          params.customerId +
          " })",
      });

      const t0 = performance.now();
      try {
        const res = await fetchOrderShipment(params, { fail: this.forceFail });
        if (seq !== this.seq) {
          this.$emit("log", {
            kind: "muted",
            text:
              "子 × 第 " + seq + " 次请求回来晚了，参数已变 → 丢弃（竞态保护）",
          });
          return;
        }
        this.result = res;
        this.cost = Math.round(performance.now() - t0);
        this.$emit("log", {
          kind: "ok",
          text:
            "子 ← " +
            res.summary.carrier +
            " " +
            res.summary.trackingNo +
            " · " +
            this.cost +
            "ms",
        });
      } catch (e) {
        if (seq !== this.seq) return;
        this.result = null;
        this.error = e.message;
        this.$emit("log", { kind: "error", text: "子 × " + e.message });
      } finally {
        if (seq === this.seq) this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@mixin cell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 6px;
}

.odpc {
  font-size: 13px;
  color: #303133;

  &__hd {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  &__sig {
    padding: 1px 6px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #7a5cff;
    background: #f3f0ff;
    border-radius: 3px;
  }

  &__calls {
    margin-left: auto;
    font-size: 12px;
    color: #909399;
  }

  &__sec {
    margin-bottom: 12px;

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  &__label {
    margin-bottom: 6px;
    font-size: 12px;
    color: #606266;

    b {
      color: #303133;
    }
  }

  &__grid {
    @include cell-grid;

    &--result {
      margin-bottom: 8px;
    }
  }

  &__cell {
    padding: 6px 9px;
    background: #fafbfe;
    border: 1px solid #ebeef5;
    border-radius: 4px;

    span {
      display: block;
      font-size: 11px;
      color: #909399;
    }

    b {
      font-size: 13px;
      color: #303133;
      word-break: break-all;
    }
  }

  &__pre {
    max-height: 110px;
    margin: 0;
    padding: 8px 10px;
    overflow: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 17px;
    color: #4a5568;
    background: #fbfcff;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
  }

  &__loading,
  &__ok,
  &__idle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    font-size: 12px;
    border-radius: 4px;
  }

  &__loading {
    color: #326fff;
    background: #f2f7ff;
    border: 1px dashed #b8cfff;
  }

  &__ok {
    color: #2e9e4f;
    background: #f4fbf6;
    border: 1px dashed #bfe3c9;
  }

  &__idle {
    color: #909399;
    background: #fafafa;
    border: 1px dashed #e4e7ed;
  }

  &__table {
    font-size: 12px;
  }

  &__note {
    margin: 12px 0 0;
    padding-left: 10px;
    font-size: 12px;
    line-height: 19px;
    color: #909399;
    border-left: 3px solid #e3dcff;

    b {
      color: #606266;
    }
  }
}
</style>
