<template>
  <div class="snt">
    <el-row :gutter="14">
      <el-col :span="13">
        <el-card shadow="never" class="snt__card">
          <div slot="header" class="snt__head">
            <code>入口就在页面里，不预置任何弹窗</code>
            <span class="snt__tip">第 0 层：订单列表</span>
          </div>

          <el-table :data="orders" size="mini" border>
            <el-table-column prop="orderNo" label="订单号" width="150">
              <template slot-scope="{ row }">
                <span class="snt__mono">{{ row.orderNo }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="customer" label="客户" min-width="120" />
            <el-table-column label="金额" width="94" align="right">
              <template slot-scope="{ row }">
                <span class="snt__amount"
                  >¥ {{ row.amount.toLocaleString() }}</span
                >
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="76">
              <template slot-scope="{ row }">
                <el-tag size="mini" :type="tagType(row.status)">{{
                  row.status
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="96" align="center">
              <template slot-scope="{ row }">
                <el-button type="text" size="mini" @click="openDetail(row)"
                  >打开详情</el-button
                >
              </template>
            </el-table-column>
          </el-table>

          <div class="snt__acts">
            <el-button size="mini" @click="openFour"
              >一次开 4 层（压测）</el-button
            >
            <el-button
              size="mini"
              :disabled="!layers.length"
              @click="closeTop()"
              >关最上层</el-button
            >
            <el-button
              size="mini"
              :disabled="!layers.length"
              @click="closeAll()"
              >全部关闭</el-button
            >
          </div>
          <p class="snt__hint">
            「打开详情」之后依次点：<b>审核</b> → <b>更换</b> →
            <b>新建客户</b>，就是完整的一条
            <b>4 层</b>链路。每层都是独立文件，互相只通过 Promise 传结果。
          </p>
        </el-card>
      </el-col>

      <el-col :span="11">
        <el-card shadow="never" class="snt__card">
          <div slot="header" class="snt__head">
            <code>state.layers</code>
            <span class="snt__tip">栈实时状态（DOM 每 400ms 采样）</span>
          </div>

          <div class="snt__stats">
            <div class="snt__stat">
              <span>栈深度</span>
              <b>{{ layers.length }}</b>
            </div>
            <div class="snt__stat">
              <span>.v-modal 遮罩</span>
              <b>{{ metrics.modal }}</b>
            </div>
            <div class="snt__stat">
              <span>可见弹窗 DOM</span>
              <b>{{ metrics.wrappers }}</b>
            </div>
            <div class="snt__stat">
              <span>最高 z-index</span>
              <b class="is-small">{{ metrics.maxZ || "—" }}</b>
            </div>
          </div>

          <div class="snt__stack">
            <div v-for="l in stackView" :key="l.id" class="snt__layer">
              <span class="snt__depth">L{{ l.depth }}</span>
              <div class="snt__layer-main">
                <div class="snt__layer-title">{{ l.title || "(无标题)" }}</div>
                <div class="snt__layer-meta">
                  <code>{{ l.role || "—" }}</code>
                  <span>z-index {{ l.z || "…" }}</span>
                  <span v-if="l.closing" class="snt__closing">关闭中</span>
                </div>
              </div>
            </div>
            <div v-if="!stackView.length" class="snt__empty">
              栈是空的。点左边「打开详情」开始。
            </div>
          </div>

          <p class="snt__hint">
            ESC
            由宿主统一处理，只关<b>最上面</b>那层；把中间某层关掉时，它上面的层会被一起作废
            —— 否则会出现「父弹窗没了、子弹窗还浮着」。
          </p>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="snt__card snt__code-card">
      <div slot="header" class="snt__head">
        <code>L1 → L2 → L3 → L4 的全部代码（去掉模板）</code>
        <span class="snt__tip">每层只是 await 一个 Promise</span>
      </div>
      <div class="snt__code">{{ codeSample }}</div>
    </el-card>

    <el-card shadow="never" class="snt__card">
      <div slot="header" class="snt__head">
        <code>await 拿到的结果</code>
        <span class="snt__tip">谁打开谁决定下一步，组件之间不通信</span>
      </div>
      <div class="snt__logs">
        <div
          v-for="(l, i) in logs"
          :key="i"
          class="snt__log"
          :class="'is-' + l.kind"
        >
          <span class="snt__log-t">{{ l.t }}</span>
          <span>{{ l.text }}</span>
        </div>
        <div v-if="!logs.length" class="snt__empty">还没有记录。</div>
      </div>
    </el-card>
  </div>
</template>

<script>
import {
  state,
  openLayer,
  closeTop as popTop,
  closeAll as clearStack,
} from "../nest/stack";
import { fetchOrders } from "../mockApi";
import OrderDetailDialog from "../nest/dialogs/OrderDetailDialog";
import AuditDialog from "../nest/dialogs/AuditDialog";
import PickCustomerDialog from "../nest/dialogs/PickCustomerDialog";
import CreateCustomerDialog from "../nest/dialogs/CreateCustomerDialog";

export default {
  name: "StackTab",

  data() {
    return {
      layers: state.layers,
      orders: [],
      logs: [],
      metrics: { modal: 0, wrappers: 0, maxZ: 0, zs: [] },
      codeSample: [
        "// L1 订单详情",
        "async openAudit() {",
        "  const res = await openLayer({",
        "    component: AuditDialog, title: '订单审核',",
        "    props: { order: this.detail, customer: this.customer }",
        "  })",
        "  if (!res) return                 // 取消 = undefined",
        "  this.detail.status = res.status  // 确定 = 结果对象",
        "}",
        "",
        "// L2 审核弹窗里",
        "async changeCustomer() {",
        "  const picked = await openLayer({",
        "    component: PickCustomerDialog, title: '选择收货客户'",
        "  })",
        "  if (picked) this.picked = picked",
        "}",
        "",
        "// L3 选客户弹窗里（第 4 层）",
        "async createOne() {",
        "  const created = await openLayer({ component: CreateCustomerDialog, title: '新建客户' })",
        "  if (!created) return",
        "  await this.load()                // 重新拉列表",
        "  this.selected = this.list.find(c => c.id === created.id)",
        "}",
      ].join("\n"),
    };
  },

  computed: {
    stackView() {
      // 栈顶在视觉上排最上面；z-index 由 400ms 采样写入 metrics.zs
      return this.layers
        .map((l, i) => ({ ...l, depth: i + 1, z: this.metrics.zs[i] || 0 }))
        .reverse();
    },
  },

  created() {
    this.loadOrders();
    this.timer = setInterval(this.sample, 400);
  },

  beforeDestroy() {
    clearInterval(this.timer);
    // 页面离开时把栈清掉，别把弹窗留给下一个页面
    // 注意：这里要用 import 进来的别名（clearStack），原来的 closeAll 是组件方法，
    // 在 beforeDestroy 里直接调用会 ReferenceError（eslint no-undef 报过）
    clearStack();
    state.escCount = 0;
  },

  methods: {
    tagType(status) {
      return status === "待审核"
        ? "warning"
        : status === "已取消"
        ? "info"
        : "success";
    },

    async loadOrders() {
      this.orders = await fetchOrders();
    },

    sample() {
      const wrappers = Array.prototype.filter.call(
        document.querySelectorAll(".el-dialog__wrapper"),
        (el) => el.style.display !== "none"
      );
      const zs = wrappers.map((el) => Number(el.style.zIndex) || 0);
      this.metrics = {
        modal: document.querySelectorAll(".v-modal").length,
        wrappers: wrappers.length,
        maxZ: zs.reduce((max, z) => Math.max(max, z), 0),
        zs,
      };
    },

    async openDetail(row) {
      const res = await openLayer({
        title: "订单详情 · " + row.orderNo,
        width: "760px",
        role: "OrderDetailDialog",
        component: OrderDetailDialog,
        props: {
          orderId: row.id,
          customerId: row.customerId,
          customerName: row.customer,
        },
      });
      if (!res) {
        this.log("info", row.orderNo + " 关闭，没有改动");
        return;
      }
      this.log("ok", row.orderNo + " 回传：" + JSON.stringify(res));
      this.loadOrders();
    },

    openFour() {
      const row = this.orders[0];
      if (!row) return;
      openLayer({
        title: "订单详情 · " + row.orderNo,
        width: "760px",
        role: "OrderDetailDialog",
        component: OrderDetailDialog,
        props: {
          orderId: row.id,
          customerId: row.customerId,
          customerName: row.customer,
        },
      });
      openLayer({
        title: "订单审核（压测层）",
        width: "600px",
        role: "AuditDialog",
        component: AuditDialog,
        props: {
          order: { id: row.id, orderNo: row.orderNo, amount: row.amount },
          customer: { id: row.customerId, name: row.customer, city: row.city },
        },
      });
      openLayer({
        title: "选择收货客户（压测层）",
        width: "700px",
        role: "PickCustomerDialog",
        component: PickCustomerDialog,
        props: { customerId: row.customerId },
      });
      openLayer({
        title: "新建客户（压测层）",
        width: "460px",
        role: "CreateCustomerDialog",
        component: CreateCustomerDialog,
        props: {},
      });
      this.log("info", "一次性压了 4 层：按 ESC 只会关最上面那层");
    },

    closeTop() {
      const top = popTop();
      if (top) this.log("info", "关掉 " + (top.title || "顶层"));
    },

    closeAll() {
      clearStack();
    },

    log(kind, text) {
      const t = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      this.logs.unshift({ t, kind, text });
      if (this.logs.length > 30) {
        this.logs.pop();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.snt {
  &__card {
    margin-bottom: 14px;
    border-radius: 6px;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    code {
      font-size: 13px;
      color: #326fff;
    }
  }

  &__tip {
    font-size: 12px;
    color: #909399;
  }

  &__mono {
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    color: #326fff;
  }

  &__amount {
    font-size: 12px;
    color: #ff3b3b;
  }

  &__acts {
    display: flex;
    gap: 8px;
    margin-top: 12px;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__hint {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.8;
    color: #909399;

    b {
      color: #5c6b8a;
    }
  }

  &__stats {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }

  &__stat {
    flex: 1;
    padding: 8px 10px;
    text-align: center;
    background: #f7f9fc;
    border: 1px solid #ebeef5;
    border-radius: 4px;

    span {
      display: block;
      font-size: 11px;
      color: #909399;
    }

    b {
      display: block;
      font-size: 18px;
      line-height: 26px;
      color: #326fff;

      &.is-small {
        font-size: 14px;
        line-height: 26px;
      }
    }
  }

  &__stack {
    min-height: 132px;
  }

  &__layer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    margin-bottom: 6px;
    background: #fff;
    border: 1px solid #e4ebf5;
    border-left: 3px solid #326fff;
    border-radius: 4px;
  }

  &__depth {
    flex: none;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    font-size: 11px;
    color: #fff;
    background: #326fff;
    border-radius: 9px;
  }

  &__layer-main {
    min-width: 0;
  }

  &__layer-title {
    overflow: hidden;
    font-size: 12px;
    color: #303133;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__layer-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #909399;

    code {
      color: #5c6b8a;
    }
  }

  &__closing {
    color: #e6a23c;
  }

  &__empty {
    padding: 16px 0;
    font-size: 12px;
    color: #c0c4cc;
    text-align: center;
  }

  &__code-card {
    margin-bottom: 14px;
  }

  &__code {
    max-height: 260px;
    overflow: auto;
    padding: 10px 12px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.75;
    color: #2c3e50;
    white-space: pre;
    background: #f6f8fa;
    border: 1px solid #eaeef2;
    border-radius: 4px;
  }

  &__logs {
    max-height: 190px;
    overflow: auto;
  }

  &__log {
    display: flex;
    gap: 8px;
    padding: 4px 0;
    font-size: 12px;
    line-height: 1.7;
    color: #5c6b8a;
    border-bottom: 1px dashed #f0f2f5;

    &.is-ok {
      color: #2f9e44;
    }

    &.is-error {
      color: #f56c6c;
    }
  }

  &__log-t {
    flex: none;
    color: #c0c4cc;
  }
}
</style>
