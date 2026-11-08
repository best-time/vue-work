<template>
  <div class="dnl" v-loading="loading" element-loading-text="拉取订单…">
    <div class="dnl__hd">
      <span class="dnl__depth">第 {{ depth }} 层</span>
      <span>OrderDetailDialog · 它自己不知道有 3 层弹窗会被它打开</span>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="error"
    />

    <template v-else-if="detail">
      <div class="dnl__sum">
        <div class="dnl__row">
          <span class="dnl__k">订单号</span>
          <span class="dnl__v is-mono">{{ detail.orderNo }}</span>
        </div>
        <div class="dnl__row">
          <span class="dnl__k">收货客户</span>
          <span class="dnl__v">{{ customer.name }}</span>
          <span class="dnl__v is-muted"
            >（{{ customer.id }} · {{ customer.city }}）</span
          >
        </div>
        <div class="dnl__row">
          <span class="dnl__k">金额</span>
          <span class="dnl__v is-amount"
            >¥ {{ detail.amount.toLocaleString() }}</span
          >
        </div>
        <div class="dnl__row">
          <span class="dnl__k">状态</span>
          <el-tag size="mini" :type="statusType">{{ detail.status }}</el-tag>
        </div>
      </div>

      <el-table :data="detail.items" size="mini" border>
        <el-table-column prop="sku" label="SKU" width="110" />
        <el-table-column prop="name" label="商品" min-width="180" />
        <el-table-column prop="qty" label="数量" width="70" align="right" />
        <el-table-column label="单价" width="100" align="right">
          <template slot-scope="{ row }"
            >¥ {{ row.price.toLocaleString() }}</template
          >
        </el-table-column>
      </el-table>

      <p class="dnl__hint" style="margin: 10px 0 0">
        下面两个按钮各自
        <code>await openLayer(...)</code> 一层，代码是线性的，没有回调嵌套。
      </p>

      <div class="dnl__foot">
        <el-button size="small" @click="closeSelf">关 闭</el-button>
        <span class="dnl__foot-right" />
        <el-button size="small" @click="changeCustomer">更换收货客户</el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="detail.status !== '待审核'"
          @click="openAudit"
        >
          {{ detail.status === "待审核" ? "审 核" : "已处理" }}
        </el-button>
      </div>
    </template>
  </div>
</template>

<script>
import { fetchOrderDetail } from "../../mockApi";
import { openLayer } from "../stack";
import AuditDialog from "./AuditDialog";
import PickCustomerDialog from "./PickCustomerDialog";

export default {
  name: "OrderDetailDialog",

  props: {
    orderId: { type: [Number, String], required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    depth: { type: Number, default: 1 },
  },

  data() {
    return {
      loading: false,
      error: "",
      detail: null,
      customer: { id: this.customerId, name: this.customerName, city: "" },
    };
  },

  computed: {
    statusType() {
      const s = this.detail ? this.detail.status : "";
      return s === "待审核" ? "warning" : s === "已取消" ? "info" : "success";
    },
  },

  created() {
    this.dirty = false;
    this.load();
  },

  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.detail = await fetchOrderDetail(this.orderId);
        this.customer = {
          id: this.detail.customerId,
          name: this.detail.customer,
          city: this.detail.city,
        };
      } catch (e) {
        this.error = e.message || "加载失败";
      } finally {
        this.loading = false;
      }
    },

    /** 第 2 层：审核 */
    async openAudit() {
      const res = await openLayer({
        title: "订单审核",
        width: "600px",
        role: "AuditDialog",
        component: AuditDialog,
        props: {
          order: this.detail,
          customer: { ...this.customer },
        },
      });
      if (!res) return; // 用户取消，什么都不做
      this.detail.status = res.status;
      this.dirty = true;
      if (res.customer) this.customer = res.customer;
      this.$message.success("审核完成：" + res.status);
    },

    /** 第 2 层（另一条分支）：换客户 */
     changeCustomer() {
       openLayer({
        title: "选择收货客户",
        width: "700px",
        role: "PickCustomerDialog",
        component: PickCustomerDialog,
        props: { customerId: this.customer.id },
      }).then((picked) => {
        console.log(picked);
        if (!picked) {
          return;
        }
        this.customer = picked;
        this.dirty = true;
      })
    },

    /** 关闭时把「有没有改动」一起交回去，打开它的页面就不用再单独查一次 */
    closeSelf() {
      this.$emit(
        "resolve",
        this.dirty ? { changed: true, status: this.detail.status } : null
      );
    },
  },
};
</script>
