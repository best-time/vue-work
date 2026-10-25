<template>
  <div class="dgo">
    <!-- ===================== 说明 ===================== -->
    <el-card shadow="never" class="dgo__intro">
      <div class="dgo__intro-hd">
        <h2 class="dgo__h2">页面里弹窗功能子组件很多，怎么组织代码</h2>
        <el-tag size="mini" type="success">按数量选方案，别一刀切</el-tag>
      </div>

      <p class="dgo__lead">
        分界线的依据是「弹窗个数」和「关完要不要留 DOM」，不是个人喜好。三个页签都可以真的点，
        下面的体检条会显示当前页签的节点数 —— 点几下弹窗、关掉、再看一眼数字就明白了。
      </p>

      <div class="dgo__flow">
        <div class="dgo__flow-node is-a">
          页面 index.vue
          <em>搜索 / 表格 / 调弹窗</em>
        </div>
        <div class="dgo__flow-arrow">open()</div>
        <div class="dgo__flow-node is-b">
          注册表 或 ref
          <em>标题·宽度·footer 谁渲染</em>
        </div>
        <div class="dgo__flow-arrow">挂载</div>
        <div class="dgo__flow-node is-c">
          业务弹窗 .vue
          <em>校验 / 请求 / loading</em>
        </div>
        <div class="dgo__flow-arrow">resolve</div>
        <div class="dgo__flow-node is-d">
          页面决定刷不刷新
          <em>结果只有 confirm / cancel</em>
        </div>
      </div>

      <el-alert type="info" :closable="false" show-icon class="dgo__intro-alert">
        <template slot="title">
          三种写法共用同一批业务组件（<code>dialogs/forms/*.vue</code>）——<b>换的是容器，不是里面的东西</b>。
          所以从 ② 迁到 ③ 只是「把 app-dialog 标签换成一行 openDialog」。
        </template>
      </el-alert>
    </el-card>

    <!-- ===================== DOM 体检条（常驻） ===================== -->
    <div class="dgo__stat">
      <div class="dgo__stat-hd">
        <i class="el-icon-cpu" />
        <span>DOM 体检</span>
        <el-tag size="mini" type="info">当前页签：{{ activeLabel }}</el-tag>
      </div>
      <div class="dgo__stat-body">
        <div class="dgo__stat-item">
          <span class="dgo__stat-k">页签内节点数</span>
          <span class="dgo__stat-v">{{ stat.paneNodes }}</span>
        </div>
        <div class="dgo__stat-item">
          <span class="dgo__stat-k">可见弹窗</span>
          <span class="dgo__stat-v">{{ stat.visibleDlgs }}</span>
        </div>
        <div class="dgo__stat-item">
          <span class="dgo__stat-k">隐藏但仍占 DOM 的弹窗容器</span>
          <span class="dgo__stat-v is-warn">{{ stat.hiddenWrappers }}</span>
        </div>
        <div class="dgo__stat-item">
          <span class="dgo__stat-k">body 下总节点数</span>
          <span class="dgo__stat-v">{{ stat.bodyNodes }}</span>
        </div>
        <el-button size="mini" icon="el-icon-refresh" @click="refreshStat">重新测量</el-button>
      </div>
      <p class="dgo__stat-note">
        ① 就地写法：打开过一次后，弹窗容器和内容<b>一直留在 DOM 里</b>（`rendered` 只增不减），
        只是 `display:none`。③ 函数式：关掉即 `$destroy + $remove`，页签内永远是 0 个。
      </p>
    </div>

    <!-- ===================== 三种方案 ===================== -->
    <el-tabs v-model="activeTab" type="border-card" class="dgo__tabs" @tab-click="onTabClick">
      <el-tab-pane label="① 1~2 个 · 就地 el-dialog" name="inline" lazy>
        <plan-inline ref="planInline" @changed="refreshStat" />
      </el-tab-pane>

      <el-tab-pane label="② 3~8 个 · app-dialog + ref.open()" name="declarative" lazy>
        <plan-declarative ref="planDecl" @changed="refreshStat" />
      </el-tab-pane>

      <el-tab-pane label="③ 8+ 个 · 注册表 + $_dialog" name="registry" lazy>
        <plan-registry ref="planReg" @changed="refreshStat" />
      </el-tab-pane>
    </el-tabs>

    <!-- ===================== 对照表 ===================== -->
    <el-card shadow="never" class="dgo__card">
      <div slot="header" class="dgo__hd">
        <span class="dgo__title">三种写法的差别（都是同一批业务组件）</span>
      </div>
      <el-table ref="cmpTable" :data="compare" size="mini" border>
        <el-table-column prop="plan" label="方案" width="110" />
        <el-table-column prop="count" label="适用数量" width="82" align="center" />
        <el-table-column prop="tpl" label="页面里的弹窗标签" width="120" align="center" />
        <el-table-column prop="state" label="页面持有的状态" width="130" />
        <el-table-column prop="open" label="怎么打开" min-width="190" />
        <el-table-column prop="dom" label="关完残留" min-width="150" />
        <el-table-column prop="bad" label="代价" min-width="170" />
      </el-table>
    </el-card>

    <!-- ===================== 约定 ===================== -->
    <el-row :gutter="14" class="dgo__row">
      <el-col :md="14" :sm="24">
        <el-card shadow="never" class="dgo__card dgo__card--full">
          <div slot="header" class="dgo__hd">
            <span class="dgo__title">弹窗一多，这六条比目录结构更重要</span>
          </div>
          <ol class="dgo__points">
            <li><b>页面不持有弹窗状态</b>：没有 <code>visible</code>、没有 <code>form</code>、没有 <code>currentRow</code>。</li>
            <li><b>结果只有一个出口</b>：<code>confirm</code> / <code>cancel</code>，不要 <code>$parent</code> 反调页面方法。</li>
            <li><b>只传 id，不传业务快照</b>：详情和提交都让弹窗自己拉接口，父组件不必替它缓存状态。</li>
            <li><b>关闭拦截写在弹窗里</b>（<code>beforeClose</code> / 校验返回值），页面不写 <code>@close</code> 判断。</li>
            <li><b>弹窗之间不互相打开</b>：串联逻辑写在页面的 <code>await</code> 链里。</li>
            <li><b>一个弹窗一个 api 函数</b>，别在弹窗里直接改列表数组，回调让页面自己 <code>load()</code>。</li>
          </ol>
        </el-card>
      </el-col>

      <el-col :md="10" :sm="24">
        <el-card shadow="never" class="dgo__card dgo__card--full">
          <div slot="header" class="dgo__hd">
            <span class="dgo__title">反模式</span>
            <el-tag size="mini" type="danger">见过很多次</el-tag>
          </div>
          <ul class="dgo__anti">
            <li>页面 800 行：15 个 <code>&lt;el-dialog&gt;</code> + 15 份表单 data + 15 个 <code>@confirm</code></li>
            <li>弹窗内容直接写在页面里 → 不能复用、不能单测、scoped 样式互相污染</li>
            <li>每个弹窗各写一遍 <code>:before-close</code> + loading + try/catch</li>
            <li><code>&lt;el-dialog v-model="x"&gt;</code> —— el-dialog 没有 <code>value</code> 属性，v-model 无效，必须 <code>:visible.sync</code></li>
            <li><code>&lt;el-dialog v-if="show"&gt;</code> 忘了给 <code>visible</code>（wrapper 渲染了但 <code>display:none</code>）</li>
            <li>弹窗里 <code>$emit('refresh')</code> 让页面把自己的列表数组整个替换掉</li>
          </ul>
          <p class="dgo__note">
            <b>什么时候不该拆？</b>一个只在本页用一次、没有校验的提示框 —— 拆出去反而多两个文件。
            拆分的判断标准是<b>会不会被第二次打开 / 第二次复用</b>。
          </p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import PlanInline from "./parts/PlanInline.vue";
import PlanDeclarative from "./parts/PlanDeclarative.vue";
import PlanRegistry from "./parts/PlanRegistry.vue";

const TAB_LABEL = {
  inline: "① 1~2 个 · 就地 el-dialog",
  declarative: "② 3~8 个 · app-dialog + ref.open()",
  registry: "③ 8+ 个 · 注册表 + $_dialog",
};

export default {
  name: "DialogOrgDemo",

  components: { PlanInline, PlanDeclarative, PlanRegistry },

  data() {
    return {
      activeTab: "inline",
      stat: { paneNodes: 0, visibleDlgs: 0, bodyNodes: 0, hiddenWrappers: 0 },
      compare: [
        {
          plan: "① 就地",
          count: "1~2",
          tpl: "N 个，直接写",
          state: "N 个布尔 + N 份表单",
          open: `<el-dialog :visible.sync="x">`,
          dom: "容器 + 内容常驻（display:none）",
          bad: "复制粘贴，第 3 个开始失控",
        },
        {
          plan: "② 声明式",
          count: "3~8",
          tpl: "N 个空 <app-dialog ref>",
          state: "0 个（ref.open 返回 Promise）",
          open: `await this.$refs.editDlg.open(row)`,
          dom: "N 个空 wrapper（未打开不挂内容）",
          bad: "模板里仍有 N 个标签，弹窗多时略吵",
        },
        {
          plan: "③ 注册表",
          count: "8+",
          tpl: "0 个",
          state: "0 个",
          open: `await openDialog(this, 'edit', { orderId })`,
          dom: "0（关掉即 $destroy + $remove）",
          bad: "跳出了模板，调试时要先看注册表",
        },
      ],
    };
  },

  computed: {
    activeLabel() {
      return TAB_LABEL[this.activeTab] || "";
    },
  },

  mounted() {
    this.refreshStat();
    window.addEventListener("resize", this.refreshStat);
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.refreshStat);
  },

  methods: {
    refreshStat() {
      const pane = document.getElementById("pane-" + this.activeTab);
      const all = Array.from(document.querySelectorAll(".el-dialog__wrapper"));
      this.stat = {
        paneNodes: pane ? pane.querySelectorAll("*").length : 0,
        visibleDlgs: all.filter((w) => getComputedStyle(w).display !== "none").length,
        bodyNodes: document.body.querySelectorAll("*").length,
        hiddenWrappers: all.filter((w) => getComputedStyle(w).display === "none").length,
      };
    },

    onTabClick() {
      // 懒挂载之后表格列宽会塌，下一次 tick 让可见的表重新算一遍
      this.$nextTick(() => {
        this.refreshStat();
        ["planInline", "planDecl", "planReg"].forEach((r) => {
          const vm = this.$refs[r];
          if (vm && typeof vm.doLayout === "function") vm.doLayout();
        });
        if (this.$refs.cmpTable) this.$refs.cmpTable.doLayout();
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100%;
  * {
    font-size: 16px !important;
  }

  &__intro {
    margin-bottom: 12px;
    border-radius: 6px;
  }

  &__intro-hd {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 6px;
  }

  &__h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #1f2d3d;
  }

  &__lead {
    margin: 0 0 14px;
    font-size: 12px;
    line-height: 20px;
    color: #606266;
  }

  &__flow {
    display: flex;
    align-items: stretch;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__flow-node {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;

    em {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      font-style: normal;
      font-weight: 400;
      opacity: 0.75;
    }

    &.is-a {
      color: #1d39c4;
      background: #f0f5ff;
      border: 1px solid #d6e4ff;
    }

    &.is-b {
      color: #0f6e56;
      background: #eefaf5;
      border: 1px solid #cdeee1;
    }

    &.is-c {
      color: #b8791a;
      background: #fffaf2;
      border: 1px solid #f5e3c4;
    }

    &.is-d {
      color: #7a5cff;
      background: #f7f5ff;
      border: 1px solid #e2dcff;
    }
  }

  &__flow-arrow {
    align-self: center;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #a8abb2;
    white-space: nowrap;
  }

  &__intro-alert {
    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__stat {
    padding: 10px 14px;
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
  }

  &__stat-hd {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #303133;

    i {
      color: #326fff;
    }
  }

  &__stat-body {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    align-items: center;
  }

  &__stat-item {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }

  &__stat-k {
    font-size: 11px;
    color: #909399;
  }

  &__stat-v {
    font-family: Menlo, Consolas, monospace;
    font-size: 15px;
    font-weight: 500;
    color: #303133;

    &.is-warn {
      color: #e6a23c;
    }
  }

  &__stat-note {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 17px;
    color: #a8abb2;

    b {
      color: #909399;
    }
  }

  &__tabs {
    margin-bottom: 12px;
    border-radius: 4px;
  }

  &__card {
    margin-bottom: 12px;
    border-radius: 6px;

    &--full {
      height: 100%;
    }
  }

  &__row {
    margin-bottom: 0;
  }

  &__hd {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__title {
    font-size: 13px;
    font-weight: 500;
    color: #303133;
  }

  &__points {
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
    line-height: 22px;
    color: #606266;

    li {
      margin-bottom: 4px;
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

  &__anti {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    line-height: 21px;
    color: #606266;

    li {
      margin-bottom: 4px;
    }

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      color: #d4544a;
      background: #fff5f5;
      border-radius: 3px;
    }
  }

  &__note {
    margin: 10px 0 0;
    padding-left: 10px;
    font-size: 11px;
    line-height: 18px;
    color: #909399;
    border-left: 3px solid #e4ecff;

    b {
      color: #606266;
    }
  }
}
</style>
