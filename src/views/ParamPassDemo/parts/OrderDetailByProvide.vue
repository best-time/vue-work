<template>
  <el-card shadow="never" class="odvc">
    <div slot="header" class="odvc__hd">
      <span class="odvc__name">子组件 · provide / inject</span>
      <code class="odvc__sig">inject: ["orderCtx"]</code>
      <el-tag v-if="order" size="mini" type="success"
        >已注入 orderNo = {{ order.orderNo }}</el-tag
      >
      <el-tag v-else size="mini" type="info">上下文里还没数据</el-tag>
      <span class="odvc__calls">子组件已请求 {{ calls }} 次</span>
    </div>

    <!-- ① 注入到的上下文 -->
    <div class="odvc__sec">
      <div class="odvc__label">
        ① 从祖先注入的 <code>orderCtx</code>（这个子组件的 props 是空的）
      </div>
      <div class="odvc__grid odvc__grid--ctx">
        <div class="odvc__cell">
          <span>ctx.order.orderNo</span
          ><b>{{ order ? order.orderNo : "null" }}</b>
        </div>
        <div class="odvc__cell">
          <span>ctx.order.customerId</span
          ><b>{{ order ? order.customerId : "null" }}</b>
        </div>
        <div class="odvc__cell">
          <span>ctx.fail</span><b>{{ ctx ? String(ctx.fail) : "-" }}</b>
        </div>
        <div class="odvc__cell">
          <span>ctx.log</span
          ><b>{{
            ctx && typeof ctx.log === "function" ? "函数（可调用）" : "没有"
          }}</b>
        </div>
      </div>
      <el-alert
        v-if="!order"
        type="info"
        :closable="false"
        show-icon
        title="ctx.order 是 null —— 祖先的列表接口还没回来，子组件先渲染空态"
      />
      <el-alert
        v-if="!ctx"
        type="warning"
        :closable="false"
        show-icon
        title="没有找到 orderCtx（说明这个组件没放在提供者里面）—— inject 的 default 兜底成了 null，不会报错"
      />
    </div>

    <!-- ② 请求参数 -->
    <div class="odvc__sec">
      <div class="odvc__label">② 注入来的参数，直接用于**再发一次请求**</div>
      <pre class="odvc__pre">{{ queryText }}</pre>
    </div>

    <!-- ③ 请求状态 -->
    <div class="odvc__sec">
      <div class="odvc__label">
        ③ 子组件自己的 loading / error（同样不惊动父组件）
      </div>
      <div v-if="loading" class="odvc__loading">
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
      <div v-else-if="result" class="odvc__ok">
        <i class="el-icon-success" />
        <span
          >返回成功 · 耗时 {{ cost }}ms · 服务端时间
          {{ result.serverTime }}</span
        >
      </div>
      <div v-else class="odvc__idle">等待上下文里的参数…</div>
    </div>

    <!-- ④ 结果 -->
    <div v-if="result" class="odvc__sec">
      <div class="odvc__label">④ 渲染结果</div>
      <div class="odvc__grid">
        <div class="odvc__cell">
          <span>承运商</span><b>{{ result.summary.carrier }}</b>
        </div>
        <div class="odvc__cell">
          <span>运单号</span><b>{{ result.summary.trackingNo }}</b>
        </div>
        <div class="odvc__cell">
          <span>包裹数</span><b>{{ result.summary.packages }}</b>
        </div>
        <div class="odvc__cell">
          <span>预计送达</span><b>{{ result.summary.eta }}</b>
        </div>
        <div class="odvc__cell">
          <span>客户（服务端按 customerId 查的）</span
          ><b>{{ result.customer.name }} · {{ result.customer.city }}</b>
        </div>
      </div>
      <el-table
        :data="result.shipments"
        size="mini"
        border
        class="odvc__table"
        empty-text="没有发货明细"
      >
        <el-table-column prop="sku" label="SKU" width="100" />
        <el-table-column prop="name" label="商品" min-width="150" />
        <el-table-column prop="qty" label="数量" width="70" align="right" />
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column prop="trackingNo" label="子运单号" min-width="180" />
      </el-table>
    </div>

    <p class="odvc__note">
      这个组件<b>一个 prop 都没有</b>：祖先页面的 <code>provide()</code> 把
      <code>orderCtx</code> 放了上去， 它
      <code>inject</code>
      进来直接用。<b>中间隔着多少层都不影响</b>，中间层也不用写透传。
      代价：依赖是隐式的 ——
      光看这个组件看不出参数从哪来，所以命名要给足前缀（<code>orderCtx</code>）、
      并且一定要写 <code>default</code> 兜底。
    </p>
  </el-card>
</template>

<script>
/**
 * 子组件 B：provide / inject 方式
 *
 * 参数不再走 props，而是从祖先 provide 的 `orderCtx` 里读。
 * 请求逻辑和 A 版完全一样（都是「用参数再发一次请求」），差别只在**参数怎么拿到**。
 *
 * 注意两个 Vue 2 的细节：
 *   1. provide 本身不是响应式的：值一旦给出去不会再更新。
 *      但这里 provide 的是 data 里的一个**对象**，对象属性的读写仍在 Vue 的响应式系统里，
 *      所以 `ctx.order = xxx` 能触发子组件 computed / watch —— 也就是「provide 一个对象」这个惯用法。
 *      反例：`provide: { order: this.order }`（直接给值）后续换对象，子组件永远看不到。
 *   2. inject 一定要带 default：不在提供者内部使用时，Vue 会 warn "injection not found"。
 */
import { fetchOrderShipment } from "../mockApi";

export default {
  name: "OrderDetailByProvide",

  inject: {
    orderCtx: { from: "orderCtx", default: null },
  },

  data() {
    return {
      loading: false,
      error: "",
      result: null,
      lastParams: null,
      seq: 0,
      calls: 0,
      cost: 0,
    };
  },

  computed: {
    ctx() {
      return this.orderCtx;
    },
    /** 上下文里的订单对象（祖先接口返回后写进来的） */
    order() {
      return this.ctx ? this.ctx.order : null;
    },
    /** 祖先的失败开关，同样从上下文读 —— 不需要一层层 prop 透传 */
    forceFail() {
      return !!(this.ctx && this.ctx.fail);
    },
    queryParams() {
      const o = this.order;
      if (!o || !o.orderNo) {
        return null;
      }
      return {
        orderNo: o.orderNo,
        customerId: o.customerId,
        round: o.version || 0,
      };
    },
    queryText() {
      if (!this.lastParams)
        return "// 参数还没到：祖先的接口返回之前，子组件不发请求";
      return JSON.stringify(this.lastParams, null, 2);
    },
  },

  watch: {
    /** 和 A 版一样：immediate + 每次祖先换新对象就重新请求 */
    order: {
      immediate: true,
      handler() {
        this.load();
      },
    },
    forceFail() {
      if (this.order) this.load();
    },
  },

  methods: {
    /** 日志直接调祖先放进上下文的 log()，不用 emit 一层层往上冒 */
    log(kind, text) {
      if (this.ctx && typeof this.ctx.log === "function")
        this.ctx.log({ kind, text });
    },

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
      this.log(
        "child",
        "子 → fetchOrderShipment({ orderNo: " +
          params.orderNo +
          ", customerId: " +
          params.customerId +
          " })"
      );

      const t0 = performance.now();
      try {
        const res = await fetchOrderShipment(params, { fail: this.forceFail });
        if (seq !== this.seq) {
          this.log(
            "muted",
            "子 × 第 " + seq + " 次请求回来晚了，上下文参数已变 → 丢弃"
          );
          return;
        }
        this.result = res;
        this.cost = Math.round(performance.now() - t0);
        this.log(
          "ok",
          "子 ← " +
            res.summary.carrier +
            " " +
            res.summary.trackingNo +
            " · " +
            this.cost +
            "ms"
        );
      } catch (e) {
        if (seq !== this.seq) return;
        this.result = null;
        this.error = e.message;
        this.log("error", "子 × " + e.message);
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

.odvc {
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
    color: #2e9e4f;
    background: #f0faf3;
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

    code {
      padding: 1px 5px;
      color: #2e9e4f;
      background: #f0faf3;
      border-radius: 3px;
    }
  }

  &__grid {
    @include cell-grid;

    &--ctx {
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
    border-left: 3px solid #bfe3c9;

    b {
      color: #606266;
    }

    code {
      padding: 1px 5px;
      color: #2e9e4f;
      background: #f0faf3;
      border-radius: 3px;
    }
  }
}
</style>
