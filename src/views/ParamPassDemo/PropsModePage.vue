<template>
  <div class="ppd">
    <!-- ===================== 说明 ===================== -->
    <el-card shadow="never" class="ppd__intro">
      <div class="ppd__intro-hd">
        <h2 class="ppd__h2">
          ① 父传子（props）：父组件的参数来自接口，子组件拿参数再发请求
        </h2>
        <el-button
          size="small"
          type="primary"
          plain
          icon="el-icon-right"
          @click="$router.push('/param-provide')"
        >
          看 provide 版
        </el-button>
      </div>

      <p class="ppd__desc">
        链路：
        <code>父 fetchOrderList()</code>
        <i class="el-icon-right" />
        拿到订单对象
        <i class="el-icon-right" />
        <code>:order="current"</code>
        <i class="el-icon-right" />
        子组件 <code>watch(order)</code> 到参数
        <i class="el-icon-right" />
        <code>fetchOrderShipment({ orderNo, customerId })</code>
        <i class="el-icon-right" />
        子组件自己渲染结果
      </p>
      <el-alert type="info" :closable="false" show-icon>
        <template slot="title">
          父组件只负责「列表接口 +
          选中哪一条」，详情接口由子组件自己调。点表格任意一行试试，子组件会换参数重新请求。
        </template>
      </el-alert>
    </el-card>

    <!-- ===================== 父 + 子 ===================== -->
    <el-card shadow="never" class="ppd__card">
      <div slot="header" class="ppd__hd">
        <span class="ppd__title">父组件 · 用 props 往下传</span>
        <code class="ppd__sig"
          >&lt;order-detail-by-props :order="current" :force-fail="forceFail"
          @log="pushLog" /&gt;</code
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
        <el-button size="small" :disabled="!current" @click="editInPlace"
          >就地改当前对象（不换引用）</el-button
        >
        <el-switch v-model="forceFail" active-text="模拟子组件接口失败" />
        <span class="ppd__state">
          列表 {{ list.length }} 条 · 当前
          {{ current ? current.orderNo : "未选中" }} · 父组件请求
          {{ listCalls }} 次
        </span>
      </div>

      <!-- 父组件的接口返回：点行 = 把这一行对象的引用交给子组件 -->
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
          父组件交给子组件的那份数据（接口返回 · 只读）
        </div>
        <pre v-show="rawOpen" class="ppd__raw-body">{{ currentText }}</pre>
      </div>
      <br>
      <br>
      <br>
    <h2>子组件</h2>
      <!-- 子组件：参数全部来自上面的接口返回 -->
      <order-detail-by-props
        class="ppd__child"
        :order="current"
        :force-fail="forceFail"
        @log="pushLog"
      />
    </el-card>
    <br>
    <br>
    <br>
    <h>日志组件</h>
    <!-- ===================== 日志 ===================== -->
    <el-card shadow="never" class="ppd__card">
      <div slot="header" class="ppd__hd">
        <span class="ppd__title">请求时序</span>
        <span class="ppd__sub"
          >父组件的列表接口、子组件的详情接口、竞态作废，都记在这里</span
        >
      </div>
      <request-log
        title="父 → 子 两次请求的先后关系"
        :logs="logs"
        @clear="logs = []"
      />
    </el-card>

    <!-- ===================== 要点 ===================== -->
    <el-card shadow="never" class="ppd__card">
      <div slot="header" class="ppd__hd">
        <span class="ppd__title">这一版必须注意的三点</span>
      </div>
      <ul class="ppd__points">
        <li>
          <b
            >子组件不能在 <code>data()</code> / <code>created</code> 里读一次
            props 就完事</b
          >
          —— 父组件的接口还没回来时 <code>props.order</code> 是
          <code>null</code>，必须
          <code>watch(order, { immediate: true })</code>。
        </li>
        <li>
          <b>父组件要「换引用」子组件才会重新请求</b> ——
          点「就地改当前对象」只改 <code>amount</code>，
          <code>watch(order)</code> 不会触发（同一对象的属性变化，非 deep watch
          看不见）。接口返回本来每次都是新对象，所以正常业务里天然满足。
        </li>
        <li>
          <b>子组件要做竞态保护</b> ——
          快速连点两行，第一条的响应可能后回来；用自增
          <code>seq</code> 只认最后一次， 否则页面会闪回上一个订单的数据。
        </li>
      </ul>
    </el-card>
  </div>
</template>

<script>
/**
 * 样例页 A：props 方式
 *
 * 数据流（单向、显式）：
 *   父 fetchOrderList() → list + current
 *   → :order="current"（子组件的 props）
 *   → 子组件 watch(order) → fetchOrderShipment(current 里的字段)
 */
import { fetchOrderList } from "./mockApi";
import OrderDetailByProps from "./parts/OrderDetailByProps.vue";
import RequestLog from "./parts/RequestLog.vue";

export default {
  name: "ParamPropsDemoPage",

  components: { OrderDetailByProps, RequestLog },

  data() {
    return {
      list: [],
      listLoading: false,
      /** 父组件接口返回后选中的那一条：子组件的 props.order 就是它 */
      current: null,
      /** 每次拉列表 +1，让接口返回的数据变一点（换新对象，子组件才会重新请求） */
      round: 0,
      listCalls: 0,
      forceFail: false,
      rawOpen: true,
      logs: [],
      t0: 0,
    };
  },

  computed: {
    currentText() {
      if (!this.current)
        return "// 还没有选中任何订单：子组件的 props.order = null";
      try {
        return JSON.stringify(this.current, null, 2);
      } catch (e) {
        return "（无法序列化：" + e.message + "）";
      }
    },
  },

  created() {
    this.t0 = performance.now();
  },

  mounted() {
    // 自动拉一次，页面一打开就能看到「父接口 → 子请求」的完整链路
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
        text: "父 → fetchOrderList({ round: " + round + " })",
      });

      const t0 = performance.now();
      try {
        const list = await fetchOrderList({ round });
        this.list = list;
        this.pushLog({
          kind: "ok",
          text:
            "父 ← " +
            list.length +
            " 条订单 · " +
            Math.round(performance.now() - t0) +
            "ms",
        });

        // 已经选中过：把选中项换成这次接口返回的**新对象**，子组件才会收到新参数
        if (this.current) {
          const next = list.find((o) => o.orderNo === this.current.orderNo);
          if (next) {
            this.current = next;
            this.$nextTick(() => {
              if (this.$refs.table) this.$refs.table.setCurrentRow(next);
            });
            this.pushLog({
              kind: "parent",
              text: "父 → 把 " + next.orderNo + " 的新对象传给子组件（换引用）",
            });
          }
        }
      } catch (e) {
        this.pushLog({ kind: "error", text: "父 × " + e.message });
      } finally {
        this.listLoading = false;
      }
    },

    pick(row) {
      if (this.current === row) {
        return;
      }
      this.current = row;
      this.pushLog({
        kind: "parent",
        text: "父 → 选中 " + row.orderNo + "，:order 换成新对象",
      });
    },

    /** 反例：就地改字段，引用没变 → 子组件的 watch(order) 不会触发 */
    editInPlace() {
      if (!this.current) return;
      this.current.amount += 1;
      this.pushLog({
        kind: "muted",
        text:
          "父 × 就地改 current.amount = " +
          this.current.amount +
          "（同一个引用）→ 子组件 watch 不触发，不会重新请求",
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
  font-size: 28px;
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
    font-size: 22px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__desc {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 10px;
    font-size: 20px;
    line-height: 22px;
    color: #606266;

    i {
      color: #c0c4cc;
    }

    code {
      padding: 1px 5px;
      font-family: Menlo, Consolas, monospace;
      font-size: 16px;
      color: #326fff;
      background: #eef4ff;
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
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }

  &__sig {
    padding: 1px 6px;
    font-family: Menlo, Consolas, monospace;
    font-size: 16px;
    color: #326fff;
    background: #eef4ff;
    border-radius: 3px;
  }

  &__sub {
    font-size: 16px;
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
    font-size: 16px;
    color: #909399;
  }

  &__table {
    font-size: 16px;

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
    font-size: 16px;
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
    font-size: 16px;
    line-height: 17px;
    color: #4a5568;
    border-top: 1px dashed #e4e7ed;
  }

  &__child {
    display: block;
    background: #fcfcff;
  }

  &__points {
    margin: 0;
    padding-left: 18px;
    font-size: 16px;
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
      font-size: 16px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }
}
</style>
