<template>
  <el-card shadow="never" class="ov">
    <div slot="header" class="ov__hd">
      <span class="ov__title">② 总览子组件 · OverviewPanel</span>
      <code class="ov__sig">:query="query" · watch(query) → fetchOverview(query)</code>
      <el-tag v-if="loading" size="mini" type="warning">请求中</el-tag>
      <el-tag v-else-if="error" size="mini" type="danger">失败</el-tag>
      <el-tag v-else size="mini" type="success">{{ data ? "已更新 " + data.updatedAt : "等待参数" }}</el-tag>
      <span class="ov__calls">已请求 {{ calls }} 次 · 上次 {{ cost }}ms</span>
    </div>

    <div v-loading="loading" element-loading-text="fetchOverview(query) 请求中…" class="ov__body">
      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" class="ov__err">
        <el-button type="text" size="mini" @click="load">重试</el-button>
      </el-alert>

      <template v-if="data">
        <div class="ov__stats">
          <div class="ov__stat">
            <span class="ov__stat-label">订单数</span>
            <b class="ov__stat-value">{{ data.total }}</b>
            <span class="ov__stat-unit">条</span>
          </div>
          <div class="ov__stat">
            <span class="ov__stat-label">总金额</span>
            <b class="ov__stat-value is-amount">¥{{ money(data.amount) }}</b>
            <span class="ov__stat-unit">客单 ¥{{ money(data.avg) }}</span>
          </div>
          <div class="ov__stat">
            <span class="ov__stat-label">待发货</span>
            <b class="ov__stat-value">{{ data.pending }}</b>
            <span class="ov__stat-unit">条</span>
          </div>
          <div class="ov__stat">
            <span class="ov__stat-label">异常单</span>
            <b class="ov__stat-value is-risk">{{ data.risk }}</b>
            <span class="ov__stat-unit">条</span>
          </div>
        </div>

        <div class="ov__cities">
          <div class="ov__cities-hd">城市分布（TOP3）</div>
          <div v-if="!data.cities.length" class="ov__cities-empty">当前条件下没有数据</div>
          <div v-for="city in data.cities" :key="city.name" class="ov__city">
            <span class="ov__city-name">{{ city.name }}</span>
            <span class="ov__city-bar">
              <i :style="{ width: cityPercent(city.count) + '%' }" />
            </span>
            <span class="ov__city-count">{{ city.count }} 条</span>
          </div>
        </div>

        <div class="ov__params">
          <span class="ov__params-label">本次统计用的参数（= 父组件传下来的 query）：</span>
          <code class="ov__params-text">{{ paramsText }}</code>
        </div>
      </template>

      <div v-else-if="!error" class="ov__idle">等待父组件传入 query…</div>
    </div>
  </el-card>
</template>

<script>
/**
 * 总览子组件
 *
 * 只认一个 props：query（父组件手里那份搜索条件）。
 * watch(query, { immediate: true }) → 自己调 fetchOverview(query)，自己管 loading / error / 重试。
 * 它**不认识搜索组件**，也不需要知道条件是从哪来的 —— 谁改 query，它就重新统计。
 */
import { fetchOverview } from "../mockApi";

export default {
  name: "QueryOverviewPanel",

  props: {
    /** 父组件持有的搜索条件（规范化之后的） */
    query: { type: Object, default: null }
  },

  data() {
    return {
      loading: false,
      error: "",
      data: null,
      lastParams: null,
      calls: 0,
      cost: 0,
      /** 请求序号：条件连改时只认最后一次的结果 */
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
      handler(val) {
        this.load(val);
      }
    }
  },

  methods: {
    money(n) {
      return Number(n || 0).toLocaleString("zh-CN");
    },

    cityPercent(count) {
      const max = (this.data && this.data.cities.length && this.data.cities[0].count) || 1;
      return Math.max(6, Math.round((count / max) * 100));
    },

    async load(val) {
      const query = val === undefined ? this.query : val;
      if (!query) {
        this.data = null;
        return;
      }

      const seq = ++this.seq;
      this.calls += 1;
      this.loading = true;
      this.error = "";
      this.lastParams = query;
      this.$emit("log", { kind: "ov", text: "总览 → fetchOverview(" + this.shortQuery(query) + ")" });

      const t0 = performance.now();
      try {
        const data = await fetchOverview(query);
        if (seq !== this.seq) {
          this.$emit("log", { kind: "muted", text: "总览 × 第 " + seq + " 次请求已过期（条件又变了）→ 丢弃" });
          return;
        }
        this.data = data;
        this.cost = Math.round(performance.now() - t0);
        this.$emit("log", { kind: "ok", text: "总览 ← " + data.total + " 条 / ¥" + data.amount + " · " + this.cost + "ms" });
      } catch (e) {
        if (seq !== this.seq) return;
        this.data = null;
        this.error = e.message;
        this.$emit("log", { kind: "error", text: "总览 × " + e.message });
      } finally {
        if (seq === this.seq) this.loading = false;
      }
    },

    shortQuery(query) {
      const parts = [];
      if (query.keyword) parts.push("keyword=" + query.keyword);
      if (query.status) parts.push("status=" + query.status);
      if (query.city) parts.push("city=" + query.city);
      if (query.startDate) parts.push("date=" + query.startDate + "~" + query.endDate);
      if (query.onlyRisk) parts.push("onlyRisk=true");
      return parts.length ? parts.join(", ") : "全部";
    }
  }
};
</script>

<style lang="scss" scoped>
.ov {
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
    color: #13a8a8;
    background: #eefafa;
    border-radius: 3px;
  }

  &__calls {
    margin-left: auto;
    font-size: 12px;
    color: #909399;
  }

  &__body {
    min-height: 92px;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  &__stat {
    padding: 10px 12px;
    background: #fafbfe;
    border: 1px solid #ebeef5;
    border-left: 3px solid #d9e6ff;
    border-radius: 4px;
  }

  &__stat-label {
    display: block;
    font-size: 12px;
    color: #909399;
  }

  &__stat-value {
    font-size: 22px;
    font-weight: 600;
    line-height: 30px;
    color: #303133;

    &.is-amount {
      color: #ff3b3b; // 国内习惯：金额用红
    }

    &.is-risk {
      color: #fa8c16;
    }
  }

  &__stat-unit {
    margin-left: 6px;
    font-size: 12px;
    color: #c0c4cc;
  }

  &__cities {
    padding: 8px 12px;
    background: #fcfcfd;
    border: 1px dashed #ebeef5;
    border-radius: 4px;
  }

  &__cities-hd {
    margin-bottom: 6px;
    font-size: 12px;
    color: #606266;
  }

  &__cities-empty {
    font-size: 12px;
    color: #c0c4cc;
  }

  &__city {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 12px;
    color: #606266;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__city-name {
    width: 40px;
    flex: none;
  }

  &__city-bar {
    flex: 1;
    height: 6px;
    overflow: hidden;
    background: #eef2f8;
    border-radius: 3px;

    i {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #7fb3ff, #326fff);
      border-radius: 3px;
      transition: width 0.3s;
    }
  }

  &__city-count {
    width: 42px;
    flex: none;
    text-align: right;
    color: #909399;
  }

  &__params {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  &__params-label {
    font-size: 12px;
    color: #909399;
  }

  &__params-text {
    padding: 2px 6px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #13a8a8;
    word-break: break-all;
    background: #f2fbfb;
    border-radius: 3px;
  }

  &__idle {
    padding: 16px;
    font-size: 12px;
    color: #c0c4cc;
    text-align: center;
    background: #fafafa;
    border: 1px dashed #e4e7ed;
    border-radius: 4px;
  }

  &__err {
    margin-bottom: 8px;
  }
}
</style>
