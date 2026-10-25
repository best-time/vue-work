<template>
  <div class="dgo-decl">
    <el-alert type="success" :closable="false" show-icon class="dgo-decl__tip">
      <template slot="title">
        3~8 个弹窗：每个弹窗抽成独立 <code>.vue</code>，页面里只留一个
        <b>空的 <code>&lt;app-dialog ref&gt;</code> 标签</b>，用
        <code>await ref.open(payload)</code> 打开、直接拿结果。
        <b>页面没有任何 visible 布尔</b>，也不需要为「弹窗里显示哪一行」再存一份 data（payload 走作用域插槽）。
      </template>
    </el-alert>

    <el-table ref="table" :data="rows" size="mini" border class="dgo-decl__table">
      <el-table-column prop="orderNo" label="订单号" width="130">
        <template slot-scope="{ row }">
          <span class="dgo-decl__mono">{{ row.orderNo }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="customer" label="客户" width="110" />
      <el-table-column prop="amount" label="金额" width="110" align="right">
        <template slot-scope="{ row }">
          <span class="dgo-decl__amount">¥ {{ row.amount.toLocaleString() }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template slot-scope="{ row }">
          <el-tag size="mini" :type="tagType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template slot-scope="{ row }">
          <el-button type="text" size="mini" @click="openEdit(row)">编辑</el-button>
          <el-button type="text" size="mini" @click="openAudit(row)">审批</el-button>
          <el-button type="text" size="mini" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="dgo-decl__meta">
      <div class="dgo-decl__meta-col">
        <div class="dgo-decl__meta-hd">页面 data 里实际有什么</div>
        <div class="dgo-decl__chips">
          <code v-for="k in dataKeys" :key="k">{{ k }}</code>
        </div>
        <p class="dgo-decl__meta-note">
          没有 <code>editVisible / auditVisible / detailVisible</code>，也没有
          <code>currentRow</code> —— 行数据是 <code>open(row)</code> 时通过 payload 传下去的。
        </p>
      </div>
      <div class="dgo-decl__meta-col">
        <div class="dgo-decl__meta-hd">上一次结果</div>
        <pre class="dgo-decl__result">{{ lastResult || "还没打开过弹窗" }}</pre>
      </div>
    </div>

    <!-- ==================== 三个空弹窗标签（模板就这么点） ==================== -->
    <app-dialog
      ref="editDlg"
      title="编辑订单"
      width="680px"
      top="8vh"
      :close-on-click-modal="false"
      @confirm="onEditConfirm"
    >
      <template #default="{ payload }">
        <order-edit-form ref="editForm" :order-id="payload.orderId" />
      </template>
    </app-dialog>

    <app-dialog
      ref="auditDlg"
      title="订单审批"
      width="520px"
      :close-on-click-modal="false"
      @confirm="onAuditConfirm"
    >
      <template #default="{ payload }">
        <order-audit-form ref="auditForm" :order-id="payload.orderId" />
      </template>
    </app-dialog>

    <app-dialog
      ref="detailDlg"
      title="订单详情"
      width="640px"
      :show-cancel="false"
      confirm-text="关 闭"
    >
      <template #default="{ payload }">
        <order-detail-view :order-id="payload.orderId" />
      </template>
    </app-dialog>
  </div>
</template>

<script>
import { fetchOrders, statusTagType } from "../mockApi";
import OrderEditForm from "../dialogs/forms/OrderEditForm.vue";
import OrderAuditForm from "../dialogs/forms/OrderAuditForm.vue";
import OrderDetailView from "../dialogs/forms/OrderDetailView.vue";

export default {
  name: "PlanDeclarative",

  components: { OrderEditForm, OrderAuditForm, OrderDetailView },

  data() {
    return {
      rows: [],
      lastResult: "",
    };
  },

  computed: {
    dataKeys() {
      return Object.keys(this.$data);
    },
  },

  created() {
    this.load();
  },

  methods: {
    tagType: statusTagType,

    async load() {
      const res = await fetchOrders({ page: 1, pageSize: 4 });
      this.rows = res.list;
    },

    /** ① 编辑：@confirm 返回 false 就不关（校验没过 / 请求失败），返回 Promise 期间按钮自动 loading */
    async openEdit(row) {
      const res = await this.$refs.editDlg.open({ orderId: row.id });
      this.lastResult = "edit → " + JSON.stringify(res);
      this.$emit("changed");
      if (res.type === "confirm") this.load();
    },

    onEditConfirm() {
      const form = this.$refs.editForm;
      if (!form) return false;
      return form.submit(); // Promise<boolean>：true 关闭、false 留在弹窗里
    },

    async openAudit(row) {
      const res = await this.$refs.auditDlg.open({ orderId: row.id });
      this.lastResult = "audit → " + JSON.stringify(res);
      this.$emit("changed");
      if (res.type === "confirm") this.load();
    },

    onAuditConfirm() {
      const form = this.$refs.auditForm;
      if (!form) return false;
      return form.submit();
    },

    async openDetail(row) {
      const res = await this.$refs.detailDlg.open({ orderId: row.id });
      this.lastResult = "detail → " + JSON.stringify(res);
      this.$emit("changed");
    },

    /** 给外层「DOM 体检」用：本页签自己数一遍弹窗容器 */
    countWrappers() {
      return this.$el.querySelectorAll(".el-dialog__wrapper").length;
    },

    /** 懒挂载页签后表格列宽会塌，外层切页签时调一次 */
    doLayout() {
      if (this.$refs.table) this.$refs.table.doLayout();
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo-decl {
  &__tip {
    margin-bottom: 12px;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__table {
    margin-bottom: 12px;
  }

  &__mono {
    font-family: Menlo, Consolas, monospace;
    color: #326fff;
  }

  &__amount {
    color: #ff3b3b;
  }

  &__meta {
    display: flex;
    gap: 12px;
  }

  &__meta-col {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    background: #fafbfc;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }

  &__meta-hd {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #303133;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    code {
      padding: 1px 6px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      color: #2e9e4f;
      background: #f2fbf5;
      border: 1px solid #cdebd8;
      border-radius: 3px;
    }
  }

  &__meta-note {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 17px;
    color: #909399;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      color: #ff3b3b;
      background: #fff5f5;
      border-radius: 3px;
    }
  }

  &__result {
    margin: 0;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 18px;
    color: #1f7a7a;
    word-break: break-all;
    white-space: pre-wrap;
  }
}
</style>
