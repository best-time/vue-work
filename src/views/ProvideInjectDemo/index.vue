<template>
  <div class="pid">
    <el-card shadow="never" class="pid__intro">
      <div class="pid__intro-hd">
        <h2 class="pid__h2">provide / inject：跨层传值，什么时候会失效</h2>
        <el-tag size="mini" type="success">四个页签都是活的</el-tag>
      </div>

      <p class="pid__lead">
        它<b>不是</b>「响应式的全局变量」，只是一次性的<b>依赖注入</b>：
        祖先把一个对象挂到自己的 <code>_provided</code> 上，后代在
        <code>initInjections</code> 里<b>读一遍</b>塞到自己身上。
        读的是「值」还是「引用」，决定了后面还能不能跟着变 —— 这是 90% 的坑的来源。
      </p>

      <div class="pid__flow">
        <div class="pid__step">
          <span class="pid__no">1</span>
          <b>祖先</b>
          <em>provide() 只调一次</em>
        </div>
        <i class="pid__arrow el-icon-right" />
        <div class="pid__step">
          <span class="pid__no">2</span>
          <b>中间层</b>
          <em>可以完全不知情</em>
        </div>
        <i class="pid__arrow el-icon-right" />
        <div class="pid__step">
          <span class="pid__no">3</span>
          <b>后代</b>
          <em>inject 读一次，就近取值</em>
        </div>
        <div class="pid__back">
          <i class="el-icon-warning-outline" />
          只沿 <code>$parent</code> 链找，不在树上的实例拿不到
        </div>
      </div>
    </el-card>

    <el-tabs v-model="tab" type="border-card" class="pid__tabs">
      <el-tab-pane label="① 跨层注入（中间层零参数）" name="base" lazy>
        <base-tab />
      </el-tab-pane>
      <el-tab-pane label="② 响应式：四种写法对照" name="reactive" lazy>
        <reactive-tab />
      </el-tab-pane>
      <el-tab-pane label="③ 覆盖 / 就近 / default 两个坑" name="override" lazy>
        <override-tab />
      </el-tab-pane>
      <el-tab-pane label="④ 不在组件树上就取不到" name="detached" lazy>
        <detached-tab />
      </el-tab-pane>
    </el-tabs>

    <el-card shadow="never" class="pid__card">
      <div slot="header" class="pid__hd">落地要守的五条</div>
      <ol class="pid__points">
        <li>
          <b>provide 一个「容器」，不要 provide「当前值」</b>：<code
            >provide() { return { ctx: this.ctx } }</code
          >
          里的 <code>ctx</code> 在 <code>data</code> 里、引用不变，之后改
          <code>ctx.xxx</code> 后代才会更新。写成
          <code>{ theme: this.theme }</code> 只是拍了一张初始快照。
        </li>
        <li>
          <b>key 必须带前缀</b>：inject 是全局命名空间（同一棵祖先链共享），
          <code>theme</code> / <code>user</code> 这种名字迟早撞车，统一
          <code>xxxCtx</code> / <code>xxxService</code>。
        </li>
        <li>
          <b>inject 一律写 default</b>：组件被复用到没有 provider
          的地方时，只有 <code>default</code> 能兜住；对象默认值必须写成工厂
          <code>() =&gt; ({...})</code>，否则所有实例共用同一个对象。
        </li>
        <li>
          <b>不要用 provide 传「事件」</b>：跨层回传数据还是 provide
          一个带方法的服务对象（<code>ctx.reload()</code>），别指望 inject
          能 emit 到祖先。
        </li>
        <li>
          <b>不在组件树上的实例取不到</b>：<code>new Vue()</code> /
          <code>new (Vue.extend(X))()</code> 这类独立根实例
          <code>$parent</code> 为空，要么传 <code>parent</code>，要么直接
          <code>provide</code> 一份，要么改用模块单例（见页签④）。
        </li>
      </ol>
    </el-card>
  </div>
</template>

<script>
/**
 * provide / inject 专题 demo
 *
 * 和 /param-provide 的分工：
 *   /param-provide  → 「接口数据怎么跨层送到孙组件」的业务视角（和 props 版对照）
 *   本页（/provide-inject-demo）→ 「机制本身」：什么时候响应、什么时候被覆盖、
 *                                什么时候根本取不到（这一条直接对应 openLayer 的弹窗坑）
 */
import BaseTab from "./parts/BaseTab.vue";
import ReactiveTab from "./parts/ReactiveTab.vue";
import OverrideTab from "./parts/OverrideTab.vue";
import DetachedTab from "./parts/DetachedTab.vue";

export default {
  name: "ProvideInjectDemoPage",

  components: { BaseTab, ReactiveTab, OverrideTab, DetachedTab },

  data() {
    return { tab: "base" };
  },

  watch: {
    // 页签写进 URL，刷新/分享还能停在同一个页签
    tab: {
      immediate: true,
      handler(v) {
        const q = { ...this.$route.query };
        if (q.tab === v) return;
        q.tab = v;
        this.$router.replace({ path: this.$route.path, query: q }).catch(() => {});
      },
    },
  },

  mounted() {
    const t = this.$route.query.tab;
    if (t && t !== this.tab) this.tab = t;
  },
};
</script>

<style lang="scss" scoped>
.pid {
  max-width: 1180px;
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
    gap: 12px;
    margin-bottom: 8px;
  }

  &__h2 {
    flex: 1;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__lead {
    margin: 0 0 12px;
    font-size: 16px;
    line-height: 22px;
    color: #606266;

    code {
      padding: 1px 5px;
      font-family: Menlo, Consolas, monospace;
      font-size: 14px;
      color: #2e9e4f;
      background: #f0faf3;
      border-radius: 3px;
    }
  }

  &__flow {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px;
    background: #f7f9fc;
    border: 1px solid #ebeef5;
    border-radius: 6px;
  }

  &__step {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 4px;

    b {
      font-size: 16px;
      color: #1f2d3d;
    }

    em {
      font-size: 14px;
      font-style: normal;
      color: #909399;
    }
  }

  &__no {
    width: 16px;
    height: 16px;
    font-size: 10px;
    line-height: 16px;
    color: #fff;
    text-align: center;
    background: #326fff;
    border-radius: 50%;
  }

  &__arrow {
    color: #c0c4cc;
  }

  &__back {
    margin-left: auto;
    font-size: 14px;
    color: #e6a23c;

    code {
      padding: 0 4px;
      font-family: Menlo, Consolas, monospace;
      color: #b88230;
      background: #fdf6ec;
      border-radius: 3px;
    }
  }

  &__tabs {
    margin-bottom: 14px;

    ::v-deep .el-tabs__content {
      padding: 0;
    }
  }

  &__hd {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }

  &__points {
    margin: 0;
    padding-left: 0;
    font-size: 16px;
    line-height: 22px;
    color: #606266;
    list-style: none;
    /* 全局 reset.css 把 list-style 清掉了（ol 也没序号），这里自己补 1~5 的编号 */
    counter-reset: pid-point;

    li {
      position: relative;
      margin-bottom: 6px;
      padding-left: 22px;
      counter-increment: pid-point;

      &::before {
        position: absolute;
        top: 1px;
        left: 0;
        width: 16px;
        height: 16px;
        font-size: 10px;
        line-height: 16px;
        color: #326fff;
        text-align: center;
        content: counter(pid-point);
        background: #eef3ff;
        border-radius: 50%;
      }
    }

    b {
      color: #303133;
    }

    code {
      padding: 1px 5px;
      font-family: Menlo, Consolas, monospace;
      font-size: 14px;
      color: #2e9e4f;
      background: #f0faf3;
      border-radius: 3px;
    }
  }
}
</style>
