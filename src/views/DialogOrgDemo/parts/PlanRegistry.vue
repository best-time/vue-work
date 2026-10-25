<template>
  <div class="dgo-reg">
    <el-alert type="success" :closable="false" show-icon class="dgo-reg__tip">
      <template slot="title">
        8 个以上：<b>模板里一个弹窗标签都不写</b>，全部走
        <code>openDialog(this, 'edit', { orderId })</code>。
        弹窗由 <code>$_dialog</code> 挂到 body，关掉即 <code>$destroy + $remove</code>
        —— 同一页面开 50 次也不会留下节点。
      </template>
    </el-alert>

    <!-- 搜索 -->
    <div class="dgo-reg__bar">
      <el-input
        v-model="query.keyword"
        size="small"
        class="dgo-reg__kw"
        placeholder="订单号 / 客户 / 商品"
        clearable
        @keyup.enter.native="search"
      />
      <el-select v-model="query.status" size="small" class="dgo-reg__sel" placeholder="全部状态" clearable>
        <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
      <el-button size="small" type="primary" @click="search">查 询</el-button>
      <el-button size="small" @click="reset">重 置</el-button>
      <span class="dgo-reg__spacer" />
      <el-button size="small" icon="el-icon-upload2" @click="openImport">批量导入</el-button>
    </div>

    <el-table ref="table" v-loading="loading" :data="rows" size="mini" border class="dgo-reg__table">
      <el-table-column prop="orderNo" label="订单号" width="130">
        <template slot-scope="{ row }">
          <span class="dgo-reg__mono">{{ row.orderNo }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="customer" label="客户" width="100" />
      <el-table-column prop="product" label="商品" min-width="140" />
      <el-table-column prop="amount" label="金额" width="105" align="right">
        <template slot-scope="{ row }">
          <span class="dgo-reg__amount">¥ {{ row.amount.toLocaleString() }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="92">
        <template slot-scope="{ row }">
          <el-tag size="mini" :type="tagType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="140" />
      <el-table-column label="操作" width="170" align="center">
        <template slot-scope="{ row }">
          <el-button type="text" size="mini" @click="open('edit', row)">编辑</el-button>
          <el-button type="text" size="mini" @click="open('audit', row)">审批</el-button>
          <el-button type="text" size="mini" @click="open('detail', row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="dgo-reg__page"
      small
      background
      layout="total, sizes, prev, pager, next"
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="[5, 8, 12]"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <div class="dgo-reg__meta">
      <div class="dgo-reg__meta-col">
        <div class="dgo-reg__meta-hd">本页签内的弹窗标签数</div>
        <div class="dgo-reg__big">{{ wrapperCount }}</div>
        <p class="dgo-reg__meta-note">
          <code>this.$el.querySelectorAll('.el-dialog__wrapper').length</code><br />
          弹窗都挂在 <code>body</code> 下、关掉即销毁，所以永远是 0。
        </p>
      </div>
      <div class="dgo-reg__meta-col">
        <div class="dgo-reg__meta-hd">上一次 openDialog 的结果</div>
        <pre class="dgo-reg__result">{{ lastResult || "还没打开过弹窗" }}</pre>
      </div>
    </div>

    <pre class="dgo-reg__code">{{ snippet }}</pre>
  </div>
</template>

<script>
import { fetchOrders, statusTagType, STATUS_OPTIONS } from "../mockApi";
import { openDialog, DIALOGS } from "../dialogs";

export default {
  name: "PlanRegistry",

  data() {
    return {
      statusOptions: STATUS_OPTIONS,
      rows: [],
      total: 0,
      page: 1,
      pageSize: 5,
      loading: false,
      query: { keyword: "", status: "" },
      lastResult: "",
      wrapperCount: 0,
      snippet: `// 打开（页面里就这一行）
const res = await openDialog(this, 'edit', { orderId: row.id })
if (res.type === 'confirm') this.load()

// dialogs/index.js —— 加弹窗只改这里
export const DIALOGS = {
  edit:  { comp: OrderEditForm,  title: '编辑订单', width: '680px', self: true },
  audit: { comp: OrderAuditForm, title: '订单审批', width: '520px', self: true },
}`,
    };
  },

  created() {
    this.load();
  },

  mounted() {
    this.measure();
  },

  methods: {
    tagType: statusTagType,

    async load() {
      this.loading = true;
      try {
        const res = await fetchOrders({
          keyword: this.query.keyword,
          status: this.query.status,
          page: this.page,
          pageSize: this.pageSize,
        });
        this.rows = res.list;
        this.total = res.total;
      } finally {
        this.loading = false;
      }
      this.$emit("changed");
    },

    search() {
      this.page = 1; // 改条件先回第一页，否则会拿第 3 页去查新条件
      this.load();
    },

    reset() {
      this.query = { keyword: "", status: "" };
      this.search();
    },

    onPageChange(p) {
      if (p === this.page) return;
      this.page = p;
      this.load();
    },

    onSizeChange(s) {
      if (s === this.pageSize) return;
      this.pageSize = s;
      this.page = 1;
      this.load();
    },

    /**
     * 唯一的打开入口。页面不知道标题、不知道宽度、不知道 footer 由谁渲染，
     * 这些统统在 dialogs/index.js 里。
     */
    async open(key, row) {
      const props = row ? { orderId: row.id } : {};
      const res = await openDialog(this, key, props);
      this.lastResult = key + " → " + JSON.stringify(res);
      this.measure();
      if (res.type === "confirm" && key !== "detail") this.load();
    },

    openImport() {
      this.open("import");
    },

    measure() {
      this.wrapperCount = this.$el ? this.$el.querySelectorAll(".el-dialog__wrapper").length : 0;
    },

    /** 给外层「DOM 体检」用 */
    countWrappers() {
      this.measure();
      return this.wrapperCount;
    },

    /** 懒挂载页签后表格列宽会塌，外层切页签时调一次 */
    doLayout() {
      if (this.$refs.table) this.$refs.table.doLayout();
    },

    /** 注册表内容（外层展示用） */
    dialogKeys() {
      return Object.keys(DIALOGS);
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo-reg {
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

  &__bar {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
  }

  &__kw {
    width: 200px;
  }

  &__sel {
    width: 130px;
  }

  &__spacer {
    flex: 1;
  }

  &__table {
    width: 100%;
  }

  &__mono {
    font-family: Menlo, Consolas, monospace;
    color: #326fff;
  }

  &__amount {
    color: #ff3b3b;
  }

  &__page {
    margin-top: 12px;
    text-align: right;
  }

  &__meta {
    display: flex;
    gap: 12px;
    margin-top: 12px;
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
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #303133;
  }

  &__big {
    font-family: Menlo, Consolas, monospace;
    font-size: 22px;
    font-weight: 500;
    line-height: 30px;
    color: #2e9e4f;
  }

  &__meta-note {
    margin: 4px 0 0;
    font-size: 11px;
    line-height: 17px;
    color: #909399;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      color: #326fff;
      background: #eef4ff;
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

  &__code {
    padding: 10px 12px;
    margin: 12px 0 0;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 18px;
    color: #4a5568;
    background: #fafbfc;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    white-space: pre-wrap;
  }
}
</style>
