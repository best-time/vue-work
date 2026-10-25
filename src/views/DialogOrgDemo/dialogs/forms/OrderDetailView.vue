<template>
  <div class="dgo-detail" v-loading="loading" element-loading-text="拉取订单详情…">
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

    <template v-else>
      <el-descriptions :column="2" size="small" border>
        <el-descriptions-item label="订单号">
          <span class="dgo-detail__mono">{{ detail.orderNo }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="mini" :type="tagType">{{ detail.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="客户">{{ detail.customer }}</el-descriptions-item>
        <el-descriptions-item label="金额">
          <span class="dgo-detail__amount">¥ {{ (detail.amount || 0).toLocaleString() }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.phone }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="收货地址" :span="2">{{ detail.address }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || "—" }}</el-descriptions-item>
      </el-descriptions>

      <div class="dgo-detail__hd">商品明细</div>
      <el-table :data="detail.items || []" size="mini" border>
        <el-table-column prop="name" label="商品" min-width="160" />
        <el-table-column prop="qty" label="数量" width="80" align="center" />
        <el-table-column label="单价" width="120" align="right">
          <template slot-scope="{ row }">¥ {{ row.price }}</template>
        </el-table-column>
      </el-table>

      <div class="dgo-detail__hd">操作记录</div>
      <el-timeline class="dgo-detail__timeline">
        <el-timeline-item
          v-for="(it, i) in detail.timeline || []"
          :key="i"
          :timestamp="it.t"
          size="normal"
        >{{ it.text }}</el-timeline-item>
      </el-timeline>
    </template>
  </div>
</template>

<script>
import { fetchOrderDetail, statusTagType } from "../../mockApi";

/** 只读视图：没有表单、没有提交，容器给什么 footer 就用什么 */
export default {
  name: "OrderDetailView",

  props: {
    orderId: { type: [Number, String], default: null },
  },

  data() {
    return { loading: false, error: "", detail: {} };
  },

  computed: {
    tagType() {
      return statusTagType(this.detail.status);
    },
  },

  watch: {
    orderId: {
      immediate: true,
      handler(v) {
        if (v) this.load();
      },
    },
  },

  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.detail = await fetchOrderDetail(this.orderId);
      } catch (e) {
        this.error = e.message || "加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo-detail {
  min-height: 120px;

  &__mono {
    font-family: Menlo, Consolas, monospace;
    color: #326fff;
  }

  &__amount {
    color: #ff3b3b;
    font-weight: 500;
  }

  &__hd {
    margin: 16px 0 8px;
    font-size: 12px;
    font-weight: 500;
    color: #303133;
  }

  &__timeline {
    padding-left: 4px;
    margin-top: 4px;
  }
}
</style>
