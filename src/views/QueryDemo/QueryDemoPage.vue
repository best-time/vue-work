<template>
  <div class="qd">
    <!-- ===================== 说明 ===================== -->
    <el-card shadow="never" class="qd__intro">
      <div class="qd__intro-hd">
        <h2 class="qd__h2">搜索条件 → 总览 + 列表：一份参数，两个子组件各自调接口</h2>
        <el-tag size="mini" type="success">条件只在父组件存一份</el-tag>
      </div>

      <!-- 传参链路：看清楚「谁把什么交给谁」 -->
      <div class="qd__flow">
        <div class="qd__flow-col">
          <div class="qd__flow-node is-a">① 搜索条件子组件</div>
          <div class="qd__flow-sub">只收集条件，不调业务接口</div>
        </div>
        <div class="qd__flow-arrow"><code>$emit('search', form)</code></div>
        <div class="qd__flow-col">
          <div class="qd__flow-node is-b">② 父组件 query</div>
          <div class="qd__flow-sub">toQuery(form)：trim、拆日期、去空值</div>
        </div>
        <div class="qd__flow-arrow"><code>:query</code></div>
        <div class="qd__flow-col qd__flow-col--wide">
          <div class="qd__flow-node is-c">③ 总览子组件 <em>fetchOverview(query)</em></div>
          <div class="qd__flow-node is-c">④ 表格子组件 <em>fetchOrderList(query, page)</em></div>
        </div>
      </div>

      <el-alert type="info" :closable="false" show-icon class="qd__intro-alert">
        <template slot="title">
          改条件点「查询」：两个下游组件会**同时**发起各自的请求（总览 ~420ms、列表 ~520ms），
          各自管自己的 loading / 错误 / 重试；父组件只负责把条件规范化后往下发。
        </template>
      </el-alert>
    </el-card>

    <!-- ===================== ① 搜索 ===================== -->
    <search-panel @search="onSearch" />

    <!-- ===================== ② 总览 ===================== -->
    <overview-panel :query="query" @log="pushLog" />

    <!-- ===================== ③ 表格 ===================== -->
    <order-table :query="query" @log="pushLog" />

    <!-- ===================== 父组件手里有什么 ===================== -->
    <el-row :gutter="14" class="qd__row">
      <el-col :md="10" :sm="24">
        <el-card shadow="never" class="qd__card">
          <div slot="header" class="qd__hd">
            <span class="qd__title">父组件持有的 query（唯一真相源）</span>
            <el-tag size="mini" type="info">第 {{ queryVersion }} 次搜索</el-tag>
          </div>
          <pre class="qd__json">{{ queryText }}</pre>
          <p class="qd__mini">
            子组件拿到的是这个对象的引用。父组件 <code>this.query = toQuery(form)</code> 每次都是<b>新对象</b>，
            两个子组件的 <code>watch(query)</code> 才会触发。
          </p>
        </el-card>
      </el-col>

      <el-col :md="14" :sm="24">
        <el-card shadow="never" class="qd__card">
          <div slot="header" class="qd__hd">
            <span class="qd__title">请求时序</span>
            <span class="qd__sub">总览与列表是并行发起的，各自回来后各自渲染</span>
            <el-button type="text" size="mini" class="qd__clear" @click="logs = []">清空</el-button>
          </div>
          <div class="qd__log">
            <div v-if="!logs.length" class="qd__log-empty">还没有请求</div>
            <div v-for="(item, i) in logs" :key="i" class="qd__log-row" :class="'is-' + item.kind">
              <span class="qd__log-t">{{ item.t }}</span>
              <span class="qd__log-text">{{ item.text }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ===================== 要点 ===================== -->
    <el-card shadow="never" class="qd__card">
      <div slot="header" class="qd__hd">
        <span class="qd__title">这套写法要守住的四条</span>
      </div>
      <ol class="qd__points">
        <li>
          <b>搜索组件不调业务接口</b>：它只 <code>$emit('search', form)</code>。否则总览、列表、导出各要写一遍搜索表单，
          条件迟早不一致。
        </li>
        <li>
          <b>参数在父组件统一规范化</b>（<code>toQuery()</code>）：trim、把 <code>dateRange</code> 拆成
          <code>startDate/endDate</code>、空串去掉。下游两个组件拿到的一定是同一份形状。
        </li>
        <li>
          <b>父组件必须换新对象</b>：<code>this.query = { ...next }</code>。
          如果写成 <code>Object.assign(this.query, next)</code>（引用不变），下游的非 deep <code>watch(query)</code>
          一次都不会触发 —— 这是这类页面最常见的「点了查询没反应」。
        </li>
        <li>
          <b>列表的条件变化要先重置分页</b>：<code>this.page = 1</code> 再请求。
          否则用户在第 3 页改条件，会拿第 3 页去查新条件，得到一个空表格。
        </li>
      </ol>

      <div class="qd__compare">
        <div class="qd__compare-col is-ok">
          <div class="qd__compare-hd"><i class="el-icon-success" /> 正确</div>
          <pre>onSearch(form) {
  this.query = this.toQuery(form);   // 新对象 → watch 触发
}</pre>
        </div>
        <div class="qd__compare-col is-bad">
          <div class="qd__compare-hd"><i class="el-icon-error" /> 踩坑</div>
          <pre>onSearch(form) {
  Object.assign(this.query, form);   // 引用没变 → 子组件不请求
}</pre>
        </div>
      </div>

      <p class="qd__note">
        <b>「各自请求」还是「父统一请求」？</b>
        本例是各自请求：组件自治、可以各自重试/单独刷新，代价是 N 个请求、父组件拿不到「全部完成」的时机。
        如果总览和列表必须严格来自同一快照（比如导出对账），就该由父组件 <code>Promise.all([fetchOverview, fetchOrderList])</code>
        后把两份结果整包下发，子组件退化成纯展示。
      </p>
    </el-card>
  </div>
</template>

<script>
/**
 * 父页面：搜索条件 → 总览 + 列表
 *
 * 它的职责被刻意压到最小：
 *   1. 持有 query（唯一真相源），并负责规范化（toQuery）
 *   2. 收到搜索组件的 @search 后**换一个新对象**丢给下游
 *   3. 自己不请求任何业务接口 —— 请求分别发生在两个子组件里
 *
 * 这样搜索组件的表单和「生效中的条件」是两份东西：
 * 用户改了输入框但没点查询，下游不会跟着抖（和 v-model 直连 query 的最大区别）。
 */
import SearchPanel from "./parts/SearchPanel.vue";
import OverviewPanel from "./parts/OverviewPanel.vue";
import OrderTable from "./parts/OrderTable.vue";

export default {
  name: "QueryDemoPage",

  components: { SearchPanel, OverviewPanel, OrderTable },

  data() {
    return {
      /** 生效中的搜索条件（子组件的 props.query） */
      query: null,
      /** 搜索了几次，页面上展示 */
      queryVersion: 0,
      logs: [],
      t0: 0
    };
  },

  computed: {
    queryText() {
      try {
        return JSON.stringify(this.query, null, 2);
      } catch (e) {
        return "（无法序列化）";
      }
    }
  },

  created() {
    this.t0 = performance.now();
    // 初始条件：空表单 → 两个子组件挂载时就会用「全量」查一次
    this.query = this.toQuery({});
  },

  methods: {
    /** 唯一的参数出口：把手填的原始表单整理成后端要的形状 */
    toQuery(form) {
      const f = form || {};
      const range = Array.isArray(f.dateRange) ? f.dateRange : [];
      return {
        keyword: String(f.keyword || "").trim(),
        status: f.status || "",
        city: f.city || "",
        startDate: range[0] || "",
        endDate: range[1] || "",
        onlyRisk: !!f.onlyRisk
      };
    },

    /**
     * 搜索组件的唯一出口。
     * 注意 always 赋新对象：同样的条件再点一次查询，也要让下游重新请求。
     */
    onSearch(form) {
      const next = this.toQuery(form);
      const changed = JSON.stringify(next) !== JSON.stringify(this.query);
      this.query = next; // ← 换引用，下游 watch 才会触发
      this.queryVersion += 1;
      this.pushLog({
        kind: "parent",
        text: (changed ? "条件变了" : "条件没变（但仍是新对象，照样刷新）") + " → query = " + this.brief(next)
      });
    },

    brief(query) {
      const parts = [];
      if (query.keyword) parts.push("keyword=" + query.keyword);
      if (query.status) parts.push("status=" + query.status);
      if (query.city) parts.push("city=" + query.city);
      if (query.startDate) parts.push("date=" + query.startDate + "~" + query.endDate);
      if (query.onlyRisk) parts.push("onlyRisk=true");
      return parts.length ? parts.join(" ") : "全部（无条件）";
    },

    pushLog(entry) {
      const t = ((performance.now() - this.t0) / 1000).toFixed(2) + "s";
      this.logs.push({ t, kind: entry.kind || "muted", text: entry.text });
      if (this.logs.length > 160) this.logs.shift();
    }
  }
};
</script>

<style lang="scss" scoped>
.qd {
  max-width: 1220px;
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
    gap: 10px;
    margin-bottom: 12px;
  }

  &__h2 {
    flex: 1;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__flow {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #fafbfe;
    border: 1px solid #ebeef5;
    border-radius: 6px;

    &-col {
      flex: 1;
      min-width: 0;

      &--wide {
        flex: 1.5;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    }

    &-node {
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      border-radius: 4px;

      em {
        display: block;
        margin-top: 2px;
        font-family: Menlo, Consolas, monospace;
        font-size: 10px;
        font-style: normal;
        font-weight: 400;
        opacity: 0.75;
      }

      &.is-a {
        color: #326fff;
        background: #eef4ff;
        border: 1px solid #c9dbff;
      }

      &.is-b {
        color: #13a8a8;
        background: #eefafa;
        border: 1px solid #bce9e9;
      }

      &.is-c {
        color: #7a5cff;
        background: #f3f0ff;
        border: 1px solid #ddd4ff;
        text-align: left;
      }
    }

    &-sub {
      margin-top: 4px;
      font-size: 11px;
      color: #909399;
      text-align: center;
    }

    &-arrow {
      flex: none;
      align-self: center;
      color: #c0c4cc;

      code {
        padding: 2px 6px;
        font-family: Menlo, Consolas, monospace;
        font-size: 10px;
        color: #909399;
        background: #fff;
        border: 1px dashed #dcdfe6;
        border-radius: 3px;
        white-space: nowrap;
      }

      &::after {
        content: "→";
        margin-left: 2px;
        font-size: 14px;
      }
    }
  }

  &__intro-alert {
    margin-top: 12px;
  }

  &__row {
    margin-bottom: 0;
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

  &__sub {
    font-size: 12px;
    color: #909399;
  }

  &__clear {
    margin-left: auto;
    padding: 0;
  }

  &__json {
    max-height: 200px;
    margin: 0;
    padding: 8px 10px;
    overflow: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 17px;
    color: #1f7a7a;
    background: #f7fdfd;
    border: 1px dashed #d5eeee;
    border-radius: 4px;
  }

  &__mini {
    margin: 8px 0 0;
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

    b {
      color: #606266;
    }
  }

  &__log {
    max-height: 200px;
    padding: 4px 0;
    overflow: auto;
    background: #fcfcfd;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }

  &__log-empty {
    padding: 14px;
    font-size: 12px;
    color: #c0c4cc;
    text-align: center;
  }

  &__log-row {
    display: flex;
    gap: 8px;
    padding: 2px 10px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 18px;
    color: #606266;

    &.is-parent .qd__log-text {
      color: #326fff;
    }

    &.is-ov .qd__log-text {
      color: #13a8a8;
    }

    &.is-table .qd__log-text {
      color: #7a5cff;
    }

    &.is-ok .qd__log-text {
      color: #2e9e4f;
    }

    &.is-error .qd__log-text {
      color: #ff3b3b;
    }

    &.is-muted .qd__log-text {
      color: #a8abb2;
    }
  }

  &__log-t {
    flex: none;
    width: 52px;
    color: #c0c4cc;
  }

  &__log-text {
    word-break: break-all;
  }

  &__points {
    margin: 0;
    padding-left: 20px;
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
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__compare {
    display: flex;
    gap: 12px;
    margin: 12px 0;
  }

  &__compare-col {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    border-radius: 4px;

    &.is-ok {
      background: #f4fbf6;
      border: 1px solid #bfe3c9;
    }

    &.is-bad {
      background: #fff6f6;
      border: 1px solid #ffcdcd;
    }

    pre {
      margin: 0;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      line-height: 18px;
      color: #4a5568;
      white-space: pre-wrap;
    }
  }

  &__compare-hd {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 600;
    color: #606266;
  }

  &__note {
    margin: 10px 0 0;
    padding-left: 10px;
    font-size: 12px;
    line-height: 20px;
    color: #909399;
    border-left: 3px solid #d9e6ff;

    b {
      color: #606266;
    }

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }
}
</style>
