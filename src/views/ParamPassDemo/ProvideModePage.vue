<template>
  <div class="ppd">
    <!-- ===================== 说明 ===================== -->
    <el-card shadow="never" class="ppd__intro">
      <div class="ppd__intro-hd">
        <h2 class="ppd__h2">
          ② 祖先传后代（provide / inject）：参数同样来自接口
        </h2>
        <el-button
          size="small"
          type="success"
          plain
          icon="el-icon-back"
          @click="$router.push('/param-props')"
        >
          看 props 版
        </el-button>
      </div>
      <p class="ppd__desc">
        链路：
        <code>页面 fetchOrderList()</code>
        <i class="el-icon-right" />
        <code>provide() { orderCtx: this.ctx }</code>
        <i class="el-icon-right" />
        中间层 <code>OrderShell</code>（零参数）
        <i class="el-icon-right" />
        子组件 <code>inject: ["orderCtx"]</code>
        <i class="el-icon-right" />
        <code>fetchOrderShipment({ orderNo, customerId })</code>
      </p>
      <el-alert type="info" :closable="false" show-icon>
        <template slot="title">
          子组件故意放在中间层 <b>OrderShell</b> 里面，中间层没有 props、没有
          provide、也没有 $attrs 透传 —— 但孙子照样拿得到祖先的接口数据。
        </template>
      </el-alert>
    </el-card>

    <!-- ===================== 祖先 + 中间层 + 孙 ===================== -->
    <el-card shadow="never" class="ppd__card">
      <div slot="header" class="ppd__hd">
        <span class="ppd__title">祖先页面 · provide 上下文</span>
        <code class="ppd__sig"
          >provide() { return { orderCtx: this.ctx } }</code
        >
      </div>

      <div class="ppd__bar">
        <el-button
          type="primary"
          size="small"
          :loading="listLoading"
          icon="el-icon-refresh"
          @click="loadList"
        >
          拉取订单列表（模拟接口）
        </el-button>
        <el-button size="small" :disabled="!ctx.order" @click="editInPlace"
          >就地改 ctx.order.amount（不换对象）</el-button
        >
        <el-switch
          v-model="ctx.fail"
          active-text="模拟子组件接口失败（也走 ctx）"
        />
        <span class="ppd__state">
          列表 {{ list.length }} 条 · ctx.order =
          {{ ctx.order ? ctx.order.orderNo : "null" }} · 祖先请求
          {{ listCalls }} 次
        </span>
      </div>

      <el-table
        ref="table"
        :data="list"
        size="mini"
        border
        highlight-current-row
        class="ppd__table ppd__list"
        empty-text="还没拉到列表"
        @row-click="pick"
      >
        <el-table-column prop="orderNo" label="订单号" width="110" />
        <el-table-column prop="customer" label="客户" width="90" />
        <el-table-column prop="customerId" label="customerId" width="110" />
        <el-table-column prop="city" label="城市" width="80" />
        <el-table-column label="金额" width="100" align="right">
          <template slot-scope="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column prop="version" label="version" width="80" />
        <el-table-column prop="updatedAt" label="接口时间" min-width="100" />
      </el-table>

      <div class="ppd__raw">
        <div class="ppd__raw-hd" @click="rawOpen = !rawOpen">
          <i :class="rawOpen ? 'el-icon-arrow-down' : 'el-icon-arrow-right'" />
          ctx 里放的东西（接口返回的 order + fail + log）
        </div>
        <pre v-show="rawOpen" class="ppd__raw-body">{{ ctxText }}</pre>
      </div>

      <!-- 中间层：不接收、不传递任何参数 -->
      <order-shell>
        <order-detail-by-provide />
      </order-shell>
    </el-card>

    <!-- ===================== 日志 ===================== -->
    <el-card shadow="never" class="ppd__card">
      <div slot="header" class="ppd__hd">
        <span class="ppd__title">请求时序</span>
        <span class="ppd__sub"
          >注意「子 →」这几行是子组件自己通过 ctx.log() 写的，没有 emit</span
        >
      </div>
      <request-log
        title="祖先 → 中间层 → 孙（跨层注入）"
        :logs="logs"
        @clear="logs = []"
      />
    </el-card>

    <!-- ===================== 对比 ===================== -->
    <el-card shadow="never" class="ppd__card">
      <div slot="header" class="ppd__hd">
        <span class="ppd__title">props vs provide / inject</span>
        <span class="ppd__sub">同样一件事，两种传参路径的取舍</span>
      </div>
      <el-table :data="compare" size="mini" border class="ppd__table">
        <el-table-column prop="key" label="维度" width="130" />
        <el-table-column prop="props" label="props（本页 ①）" min-width="240" />
        <el-table-column
          prop="provide"
          label="provide / inject（本页 ②）"
          min-width="240"
        />
      </el-table>
      <ul class="ppd__points">
        <li>
          <b>项目里的常规选择</b>：父子一层、公共组件的对外 API 一律用
          props（类型/默认值/校验都有，还能被 devtools 看见）； provide
          留给「跨好几层、且是上下文性质」的东西（当前用户、主题、表单上下文、弹窗/表格的命令式上下文）。
        </li>
        <li>
          <b>provide 一定要 provide 一个对象</b>：<code
            >provide() { return { orderCtx: this.ctx } }</code
          >， 之后改 <code>this.ctx.order</code> 孙组件能响应；写成
          <code>provide: { order: this.order }</code
          >（直接给值）就永远拿不到后续数据。
        </li>
        <li>
          <b>inject 永远写 default</b>：否则组件被放到提供者外面时会 warn
          <code>injection "orderCtx" not found</code>； 写
          <code>default: null</code> 后自己判空即可（本页子组件就是这么兜的）。
        </li>
      </ul>
    </el-card>
  </div>
</template>

<script>
/**
 * 样例页 B：provide / inject 方式
 *
 * 和 A 版的唯一差别是「参数怎么到子组件」：
 *   A：父 →(:order) 子
 *   B：祖先 provide(orderCtx) →（中间层什么都不做）→ 孙 inject(orderCtx)
 *
 * 三个 Vue 2 必须知道的点：
 *   1. provide 在 initState 之后调用，只调一次 —— 所以不要 provide「当前值」，
 *      要 provide 一个**引用不变的容器对象**（this.ctx），后续改容器里的属性。
 *   2. 只有「容器在 data 里」才有响应式：data 里的 ctx 被 Vue 递归观察，改 ctx.order 会触发依赖收集。
 *   3. inject 写在子组件里，取的是「最近一层提供者」；中间层不参与，也不需要透传。
 */
import { fetchOrderList } from "./mockApi";
import OrderDetailByProvide from "./parts/OrderDetailByProvide.vue";
import OrderShell from "./parts/OrderShell.vue";
import RequestLog from "./parts/RequestLog.vue";

export default {
  name: "ParamProvideDemoPage",

  components: { OrderDetailByProvide, OrderShell, RequestLog },

  data() {
    return {
      list: [],
      listLoading: false,
      round: 0,
      listCalls: 0,
      rawOpen: true,
      logs: [],
      t0: 0,
      /**
       * 提供给后代的上下文容器：**引用永远不变**，只改里面的属性。
       * order = 祖先接口返回的那条订单；fail = 模拟失败开关；log = 给后代写日志用。
       */
      ctx: { order: null, fail: false, log: null },
      /** 页面底部的对比表数据 */
      compare: [
        {
          key: "参数可见性",
          props: "写在组件签名上（props 声明），一眼看出参数是什么、从哪来",
          provide: "隐式：组件里 inject 一个名字，外部看不出数据来源",
        },
        {
          key: "跨中间层",
          props: '每层都要写 :order="order" 透传（或用 $attrs 批量转发）',
          provide: "中间层零改动，隔多少层都能拿到",
        },
        {
          key: "类型与校验",
          props: "type / required / default / validator 全都有，开发期有告警",
          provide: "没有校验，只能自己兜底（inject default + 判空）",
        },
        {
          key: "响应式",
          props: "换引用触发；想监听对象内部字段变化要 deep: true",
          provide: "provide 一个 data 里的对象就行；直接 provide 当前值不响应",
        },
        {
          key: "命名空间",
          props: "组件私有，不会冲突",
          provide: "全局命名空间，必须加前缀（orderCtx / formCtx）",
        },
        {
          key: "适合场景",
          props: "父子一层、公共组件的对外 API",
          provide: "跨多层 + 上下文性质（主题、当前用户、表单/弹窗上下文）",
        },
      ],
    };
  },

  /**
   * 只调用一次。返回的是 this.ctx 的引用 —— 之后 this.ctx.order = xxx，
   * 子组件里 inject 到的是同一个对象，所以能读到新值并触发响应。
   */
  provide() {
    return { orderCtx: this.ctx };
  },

  computed: {
    ctxText() {
      const plain = {
        order: this.ctx.order,
        fail: this.ctx.fail,
        log: typeof this.ctx.log === "function" ? "[Function pushLog]" : null,
      };
      try {
        return JSON.stringify(plain, null, 2);
      } catch (e) {
        return "（无法序列化：" + e.message + "）";
      }
    },
  },

  created() {
    this.t0 = performance.now();
    // 方法也放进上下文：后代要记日志直接 ctx.log()，不用 emit 一层层往上冒
    this.ctx.log = this.pushLog;
  },

  mounted() {
    this.loadList();
  },

  methods: {
    pushLog(entry) {
      const t = ((performance.now() - this.t0) / 1000).toFixed(2) + "s";
      this.logs.push({ t, kind: entry.kind || "muted", text: entry.text });
      if (this.logs.length > 150) this.logs.shift();
    },

    async loadList() {
      this.listCalls += 1;
      this.listLoading = true;
      const round = this.round;
      this.round += 1;
      this.pushLog({
        kind: "parent",
        text: "祖先 → fetchOrderList({ round: " + round + " })",
      });

      const t0 = performance.now();
      try {
        const list = await fetchOrderList({ round });
        this.list = list;
        this.pushLog({
          kind: "ok",
          text:
            "祖先 ← " +
            list.length +
            " 条订单 · " +
            Math.round(performance.now() - t0) +
            "ms",
        });

        // 已选中过：把 ctx.order 换成这次接口返回的新对象，孙子组件才会重新请求
        if (this.ctx.order) {
          const next = list.find((o) => o.orderNo === this.ctx.order.orderNo);
          if (next) {
            this.ctx.order = next;
            this.$nextTick(() => {
              if (this.$refs.table) this.$refs.table.setCurrentRow(next);
            });
            this.pushLog({
              kind: "parent",
              text: "祖先 → ctx.order = " + next.orderNo + " 的新对象",
            });
          }
        }
      } catch (e) {
        this.pushLog({ kind: "error", text: "祖先 × " + e.message });
      } finally {
        this.listLoading = false;
      }
    },

    pick(row) {
      if (this.ctx.order === row) return;
      this.ctx.order = row;
      this.pushLog({
        kind: "parent",
        text:
          "祖先 → ctx.order = " +
          row.orderNo +
          "（后代 inject 的是同一个对象）",
      });
    },

    /** 反例：改的是对象内部字段，ctx.order 引用没变 */
    editInPlace() {
      if (!this.ctx.order) return;
      this.ctx.order.amount += 1;
      this.pushLog({
        kind: "muted",
        text:
          "祖先 × 就地改 ctx.order.amount = " +
          this.ctx.order.amount +
          "（引用没变）→ 子组件 watch(order) 不触发；但模板里直接读的字段仍会更新",
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.ppd {
  max-width: 1180px;
  margin: 0 auto;
  padding: 16px 16px 40px;
  font-size: 13px;
  color: #303133;

  &__intro,
  &__card {
    margin-bottom: 14px;
    border-radius: 6px;
  }

  &__intro-hd {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  &__h2 {
    flex: 1;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__desc {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 10px;
    font-size: 12px;
    line-height: 22px;
    color: #606266;

    i {
      color: #c0c4cc;
    }

    code {
      padding: 1px 5px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      color: #2e9e4f;
      background: #f0faf3;
      border-radius: 3px;
    }
  }

  &__hd {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__title {
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

  &__sub {
    font-size: 12px;
    color: #909399;
  }

  &__bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__state {
    font-size: 12px;
    color: #909399;
  }

  &__table {
    font-size: 12px;

    ::v-deep tbody tr {
      cursor: pointer;
    }
  }

  &__raw {
    margin: 10px 0 12px;
    background: #fbfcff;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }

  &__raw-hd {
    padding: 7px 10px;
    font-size: 12px;
    color: #606266;
    cursor: pointer;

    i {
      margin-right: 4px;
      color: #909399;
    }
  }

  &__raw-body {
    max-height: 170px;
    margin: 0;
    padding: 8px 10px;
    overflow: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 17px;
    color: #4a5568;
    border-top: 1px dashed #e4e7ed;
  }

  &__points {
    margin: 10px 0 0;
    padding-left: 18px;
    font-size: 12px;
    line-height: 22px;
    color: #606266;

    li {
      margin-bottom: 6px;
    }

    b {
      color: #303133;
    }

    code {
      padding: 1px 5px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      color: #2e9e4f;
      background: #f0faf3;
      border-radius: 3px;
    }
  }
}
</style>
