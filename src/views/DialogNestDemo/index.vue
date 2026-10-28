<template>
  <div class="dnd-page">
    <el-card shadow="never">
      <div class="dnd-page__top">
        <h2 class="dnd-page__h2">el-dialog 嵌套 3~4 层，代码怎么管</h2>
        <el-tag size="mini" type="success">三页签都在真实运行</el-tag>
      </div>

      <p class="dnd-page__lead">
        层数一多，问题从来不是「弹窗怎么写」，而是
        <b>谁打开谁</b
        >、<b>关掉之后下面那层怎么办</b>、<b>结果怎么回到最初那一层</b>。
        一个文件里堆 n 个 <code>&lt;el-dialog&gt;</code> 加 n 个布尔值，16
        种组合没人记得住。 这里的做法是<b>一层一个文件 + 一个 Promise</b
        >：栈只做三件事 —— 按顺序渲染、把关闭翻译成结果、
        保证关中间层时上层一起消失。
      </p>

      <div class="dnd-page__flow">
        <div class="dnd-page__step">
          <span class="dnd-page__no">L1</span>
          <b>订单详情</b>
          <em>await 审核</em>
        </div>
        <i class="dnd-page__arrow el-icon-right" />
        <div class="dnd-page__step">
          <span class="dnd-page__no">L2</span>
          <b>审核</b>
          <em>await 选客户</em>
        </div>
        <i class="dnd-page__arrow el-icon-right" />
        <div class="dnd-page__step">
          <span class="dnd-page__no">L3</span>
          <b>选客户</b>
          <em>await 新建</em>
        </div>
        <i class="dnd-page__arrow el-icon-right" />
        <div class="dnd-page__step">
          <span class="dnd-page__no">L4</span>
          <b>新建客户</b>
          <em>resolve 结果</em>
        </div>
        <div class="dnd-page__back">
          <i class="el-icon-back" />
          结果逐层返回，中间层不用知道终点是谁
        </div>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" type="border-card" class="dnd-page__tabs">
      <el-tab-pane label="① 反例：4 层挤在一个文件" name="naive" lazy>
        <naive-tab />
      </el-tab-pane>
      <el-tab-pane label="② 栈式：一层一个文件 + Promise" name="stack" lazy>
        <stack-tab />
      </el-tab-pane>
      <el-tab-pane label="③ 边界：ESC / 遮罩 / 该不该嵌套" name="boundary" lazy>
        <boundary-tab />
      </el-tab-pane>
    </el-tabs>

    <el-card shadow="never" class="dnd-page__card">
      <div slot="header" class="dnd-page__hd">落地时要守的四条</div>
      <ol class="dnd-page__points">
        <li>
          <b>每层只认自己的 props，不认「第几层」</b
          >：层号由宿主注入（<code>depth</code>），
          业务组件拿来只做展示；判断逻辑里绝不能出现
          <code>if (depth === 2)</code>，否则这层就没法复用。
        </li>
        <li>
          <b>关闭只有两个出口</b>：<code>$emit('resolve', 结果)</code> 与
          <code>$emit('dismiss')</code>。 不要在业务组件里直接
          <code>this.$parent.xxx = false</code>，那样关闭顺序就飞了。
        </li>
        <li>
          <b>Promise 取消用 <code>resolve(undefined)</code>，不用 reject</b
          >：否则每个调用点都要 <code>try/catch</code>；取消是常态，不该当异常。
        </li>
        <li>
          <b><code>append-to-body</code> 是必须的</b>：不写的话第 2 层会被第 1
          层的 <code>overflow</code> / <code>transform</code> 裁掉，还会继承第 1
          层的 stacking context，z-index 再高也压不上去。
        </li>
      </ol>
    </el-card>
  </div>
</template>

<script>
import NaiveTab from "./parts/NaiveTab";
import StackTab from "./parts/StackTab";
import BoundaryTab from "./parts/BoundaryTab";
import { closeAll } from "./nest/stack";

const TABS = ["naive", "stack", "boundary"];

export default {
  name: "DialogNestDemoIndex",

  components: { NaiveTab, StackTab, BoundaryTab },

  data() {
    return { activeTab: "naive" };
  },

  created() {
    const t = this.$route && this.$route.query && this.$route.query.tab;
    if (TABS.indexOf(t) !== -1) this.activeTab = t;
  },

  watch: {
    activeTab(v) {
      if (this.$route && this.$route.query.tab !== v) {
        this.$router.replace({ query: { ...this.$route.query, tab: v } });
      }
    },
  },

  beforeDestroy() {
    // 保险：页面走了但栈里还有层（比如弹窗里点了路由跳转）
    closeAll();
  },
};
</script>

<style lang="scss" scoped>
.dnd-page {
  min-height: 100vh;
  padding: 16px;
  background: #f5f6f8;
  box-sizing: border-box;

  &__top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__lead {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.9;
    color: #5c6b8a;

    b {
      color: #326fff;
    }

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      font-size: 12px;
      color: #c7254e;
      background: #f7f4f5;
      border-radius: 2px;
    }
  }

  &__flow {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: #f9fbff;
    border: 1px solid #e3edff;
    border-radius: 6px;
  }

  &__step {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: #fff;
    border: 1px solid #dbe6ff;
    border-radius: 4px;

    b {
      font-size: 13px;
      color: #1f2d3d;
    }

    em {
      font-size: 11px;
      font-style: normal;
      color: #909399;
    }
  }

  &__no {
    width: 26px;
    height: 16px;
    font-size: 10px;
    line-height: 16px;
    color: #fff;
    text-align: center;
    background: #326fff;
    border-radius: 8px;
  }

  &__arrow {
    flex: none;
    color: #a9c0ea;
  }

  &__back {
    position: absolute;
    right: 14px;
    bottom: -9px;
    padding: 0 8px;
    font-size: 11px;
    color: #909399;
    background: #f5f6f8;
  }

  &__tabs {
    margin: 14px 0;
  }

  &__card {
    border-radius: 6px;
  }

  &__hd {
    font-size: 14px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__points {
    padding-left: 20px;
    margin: 0;
    font-size: 13px;
    line-height: 2;
    color: #5c6b8a;

    li {
      margin-bottom: 6px;
    }

    b {
      color: #1f2d3d;
    }

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      font-size: 12px;
      color: #c7254e;
      background: #f7f4f5;
      border-radius: 2px;
    }
  }
}
</style>
