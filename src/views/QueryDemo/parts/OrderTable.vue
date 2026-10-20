<template>
  <el-card shadow="never" class="ot">
    <div slot="header" class="ot__hd">
      <span class="ot__title">③ 表格子组件 · OrderTable</span>
      <code class="ot__sig">:query="query" · watch(query) → 回到第 1 页 → fetchOrderList(query, { page, pageSize })</code>
      <span class="ot__calls">已请求 {{ calls }} 次 · 上次 {{ cost }}ms</span>
    </div>

    <div class="ot__bar">
      <span class="ot__bar-label">本次请求参数：</span>
      <code class="ot__bar-code">{{ paramsText }}</code>
      <el-tag size="mini" type="info">分页由表格组件自己管</el-tag>
      <el-button
        type="text"
        size="mini"
        icon="el-icon-refresh"
        class="ot__reload"
        :loading="loading"
        @click="load"
      >
        只刷新列表
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      element-loading-text="fetchOrderList(query, page) 请求中…"
      :data="list"
      size="mini"
      border
      class="ot__table"
      empty-text="当前条件下没有订单"
    >
      <el-table-column prop="orderNo" label="订单号" width="120" />
      <el-table-column prop="customer" label="客户" width="110" />
      <el-table-column prop="city" label="城市" width="80" />
      <el-table-column label="金额" width="100" align="right">
        <template slot-scope="{ row }">¥{{ row.amount }}</template>
      </el-table-column>
      <el-table-column label="状态" width="96">
        <template slot-scope="{ row }">
          <el-tag :type="statusType(row.status)" size="mini">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="items" label="件数" width="70" align="right" />
      <el-table-column prop="createdAt" label="下单时间" min-width="150" />
      <el-table-column label="异常" width="70" align="center">
        <template slot-scope="{ row }">
          <i v-if="row.risk" class="el-icon-warning ot__risk" />
          <span v-else class="ot__normal">—</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="ot__pager"
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="[10, 20, 50]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <p class="ot__note">
      分页是表格组件自己的状态，<b>不是父组件的</b>：父组件只给「筛选条件」，翻页只影响它自己。
      条件一变必须先把 page 归 1 再请求 —— 否则会带着第 3 页去查新条件，得到一个空列表。
    </p>
  </el-card>
</template>

<script>
/**
 * 列表子组件
 *
 * 入参只有 query（筛选条件）；page / pageSize / total 都是它自己的状态。
 * watch(query) 时不只重新请求，还要**先把 page 重置为 1** —— 这是这类组件最容易漏的一步。
 *
 * 分页控件的两个守卫：el-pagination 在 current-page / page-size 这两个 prop 被外部改动时
 * 也会 emit change 事件，所以处理函数里要判断「值是不是真的变了」，否则条件变化会触发两次请求。
 */
import { fetchOrderList } from "../mockApi";

export default {
  name: "QueryOrderTable",

  props: {
    query: { type: Object, default: null }
  },

  data() {
    return {
      list: [],
      total: 0,
      page: 1,
      pageSize: 10,
      loading: false,
      error: "",
      calls: 0,
      cost: 0,
      lastParams: null,
      seq: 0
    };
  },

  computed: {
    paramsText() {
      if (!this.lastParams) return "（还没请求过）";
      try {
        return JSON.stringify(this.lastParams);
      } catch (e) {
        return "（无法序列化）";
      }
    }
  },

  watch: {
    query: {
      immediate: true,
      handler() {
        // 条件变了：先回第 1 页，再请求（顺序很重要）
        this.page = 1;
        this.load();
      }
    }
  },

  methods: {
    statusType(status) {
      const map = { 待付款: "warning", 待发货: "warning", 已发货: "primary", 已完成: "success", 已取消: "info" };
      return map[status] || "info";
    },

    onPageChange(page) {
      if (page === this.page) return; // 外部同步 page 时 pagination 也会 emit，挡掉
      this.page = page;
      this.load();
    },

    onSizeChange(size) {
      if (size === this.pageSize) return;
      this.pageSize = size;
      this.page = 1;
      this.load();
    },

    async load() {
      if (!this.query) {
        this.list = [];
        this.total = 0;
        return;
      }

      const seq = ++this.seq;
      this.calls += 1;
      this.loading = true;
      this.error = "";
      const pageInfo = { page: this.page, pageSize: this.pageSize };
      this.lastParams = Object.assign({ query: this.query }, pageInfo);
      this.$emit("log", { kind: "table", text: "列表 → fetchOrderList(第 " + pageInfo.page + " 页, 每页 " + pageInfo.pageSize + ")" });

      const t0 = performance.now();
      try {
        const res = await fetchOrderList(this.query, pageInfo);
        if (seq !== this.seq) {
          this.$emit("log", { kind: "muted", text: "列表 × 第 " + seq + " 次请求已过期 → 丢弃" });
          return;
        }
        this.list = res.list;
        this.total = res.total;
        this.cost = Math.round(performance.now() - t0);
        this.$emit("log", { kind: "ok", text: "列表 ← " + res.list.length + "/" + res.total + " 条" + (res.total ? "（第 " + res.page + " 页）" : "") + " · " + this.cost + "ms" });
      } catch (e) {
        if (seq !== this.seq) return;
        this.list = [];
        this.total = 0;
        this.error = e.message;
        this.$emit("log", { kind: "error", text: "列表 × " + e.message });
      } finally {
        if (seq === this.seq) this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.ot {
  margin-bottom: 14px;
  border-radius: 6px;

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
    color: #7a5cff;
    background: #f3f0ff;
    border-radius: 3px;
  }

  &__calls {
    margin-left: auto;
    font-size: 12px;
    color: #909399;
  }

  &__bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  &__bar-label {
    font-size: 12px;
    color: #909399;
  }

  &__bar-code {
    max-width: 620px;
    padding: 2px 6px;
    overflow: hidden;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #7a5cff;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: #f8f6ff;
    border-radius: 3px;
  }

  &__reload {
    margin-left: auto;
    padding: 0;
  }

  &__table {
    font-size: 12px;
  }

  &__risk {
    color: #fa8c16;
  }

  &__normal {
    color: #dcdfe6;
  }

  &__pager {
    margin-top: 10px;
    text-align: right;
  }

  &__note {
    margin: 10px 0 0;
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
