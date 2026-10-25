<template>
  <div class="rcd-page">
    <!-- ===================== 说明 ===================== -->
    <el-card shadow="never">
      <div class="rcd-page__intro-hd">
        <h2 class="rcd-page__h2">require 动态加载项目内的公共组件</h2>
        <el-tag size="mini" type="success">四个页签都真的在跑</el-tag>
      </div>

      <p class="rcd-page__lead">
        公共组件放在 <code>src/components/Xxx/</code>，想在运行时<b>按名字</b>拿到它，
        webpack 只有一套机制：<b>上下文模块（context module）</b>。
        <code>require(变量)</code>、<code>require.context()</code>、<code>require.ensure()</code>
        全是它的不同写法。关键是先分清你要的到底是
        <b>「按名字取」</b>还是<b>「按需下载」</b>——多数人以为自己要后者，其实只是前者。
      </p>

      <div class="rcd-page__flow">
        <div class="rcd-page__node is-src">
          <code>src/components/</code>
          <em>index.js · index.vue</em>
        </div>
        <div class="rcd-page__arrow">webpack 构建期扫描</div>
        <div class="rcd-page__node is-map">
          <code>ctx: map&lt;路径, 模块&gt;</code>
          <em>keys() / resolve() / id</em>
        </div>
        <div class="rcd-page__arrow">运行时查表</div>
        <div class="rcd-page__col">
          <div class="rcd-page__node is-a">
            同步取到组件
            <em>sync · 不省体积</em>
          </div>
          <div class="rcd-page__node is-b">
            懒加载 chunk
            <em>lazy · 返回 Promise</em>
          </div>
        </div>
      </div>

      <el-table :data="compare" size="mini" border class="rcd-page__table">
        <el-table-column prop="way" label="写法" min-width="230">
          <template #default="{ row }">
            <code class="rcd-page__mono">{{ row.way }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="get" label="能做到什么" min-width="150" />
        <el-table-column prop="chunk" label="包体积" width="130" />
        <el-table-column prop="when" label="什么时候用" min-width="200" />
      </el-table>
    </el-card>

    <!-- ===================== 四个页签 ===================== -->
    <el-tabs v-model="activeTab" type="border-card" class="rcd-page__tabs">
      <el-tab-pane label="① require.context 扫目录" name="ctx" lazy>
        <context-sync-tab />
      </el-tab-pane>
      <el-tab-pane label="② require('前缀' + name)" name="var" lazy>
        <var-path-tab />
      </el-tab-pane>
      <el-tab-pane label="③ 'lazy' 模式按需下载" name="lazy" lazy>
        <lazy-tab />
      </el-tab-pane>
      <el-tab-pane label="④ 配置化渲染（白名单）" name="config" lazy>
        <config-tab />
      </el-tab-pane>
    </el-tabs>

    <!-- ===================== 坑 ===================== -->
    <el-card shadow="never" class="rcd-page__card">
      <div slot="header" class="rcd-page__hd">
        <span>五个一定会遇到的坑</span>
      </div>
      <ol class="rcd-page__points">
        <li>
          <b>把 <code>require</code> 当懒加载</b>：它同步返回，webpack 早在构建期就把
          匹配到的文件打进当前 chunk。想省体积只能 <code>'lazy'</code> /
          <code>require.ensure</code> / <code>import()</code>。
        </li>
        <li>
          <b>忘了 <code>__esModule</code> 就看 <code>.default</code></b>：
          组件是 ESM 导出，<code>require</code> 拿到的是
          <code>{ __esModule: true, default: {...} }</code>。
          直接丢给 <code>Vue.component</code> → 组件是空的，页面空白且<b>不报错</b>。
        </li>
        <li>
          <b>变量前缀决定匹配范围</b>：<code>'@/components/' + name + '/index.js'</code>
          只认一层目录下的 index.js；<code>Icon</code> 只有 index.vue，
          运行时直接 <code>Cannot find module</code>。两种形状并存时用 context + 正则处理。
        </li>
        <li>
          <b>目录约定不统一就会漏</b>：<code>FunComponent/</code> 下没有 index.js，
          正则扫不到。<b>扫描只对「约定统一」的目录有效</b>，例外必须显式补一张表。
        </li>
        <li>
          <b>别把接口字段拼进路径</b>：<code>require</code> / <code>import</code> 的表达式参数
          会让整个目录进上下文；拼上 <code>../</code> 还能越界。用
          <code>ctx.keys()</code> 做白名单，未命中就不渲染。
        </li>
      </ol>
    </el-card>
  </div>
</template>

<script>
import ContextSyncTab from './parts/ContextSyncTab.vue'
import VarPathTab from './parts/VarPathTab.vue'
import LazyTab from './parts/LazyTab.vue'
import ConfigTab from './parts/ConfigTab.vue'

const TABS = ['ctx', 'var', 'lazy', 'config']

export default {
  name: 'RequireCompDemoIndex',

  components: { ContextSyncTab, VarPathTab, LazyTab, ConfigTab },

  data() {
    return {
      activeTab: 'ctx',
      compare: [
        {
          way: "require.context('@/components', true, /regexp/)",
          get: '整个目录的 map，可 keys() 遍历自动注册',
          chunk: '全进当前 chunk',
          when: '插件化注册、按目录约定批量装组件'
        },
        {
          way: "require('@/components/' + name + '/index.js')",
          get: '单个模块，同步返回',
          chunk: '全进当前 chunk',
          when: '名字落在一层目录内、且数量固定'
        },
        {
          way: "require.context(..., 'lazy')",
          get: '每个文件一个 chunk，调用返回 Promise',
          chunk: '按文件拆开',
          when: '目录扫描 + 按需下载（推荐）'
        },
        {
          way: "require.ensure([], cb, 'chunkName')",
          get: '回调里再 require，可指定 chunk 名',
          chunk: '按 chunkName 合并',
          when: '老代码 / 需要给 chunk 起可读名字'
        }
      ]
    }
  },

  created() {
    const t = this.$route && this.$route.query && this.$route.query.tab
    if (TABS.indexOf(t) !== -1) this.activeTab = t
  },

  watch: {
    activeTab(v) {
      if (this.$route && this.$route.query.tab !== v) {
        this.$router.replace({ query: { ...this.$route.query, tab: v } })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.rcd-page {
  padding: 16px;
  background: #f5f6f8;
  min-height: 100vh;
  box-sizing: border-box;

  &__intro-hd {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  &__h2 {
    margin: 0;
    font-size: 18px;
    color: #303133;
  }
  &__lead {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.95;
    color: #606266;
    b {
      color: #303133;
    }
  }
  &__flow {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    background: #f7f8fa;
    border-radius: 8px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  &__node {
    flex: 0 0 auto;
    padding: 8px 14px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #e4e7ed;
    font-size: 12px;
    line-height: 1.7;
    text-align: center;
    color: #303133;
    code {
      display: block;
      font-size: 12px;
      color: #303133;
    }
    em {
      font-style: normal;
      font-size: 11px;
      color: #909399;
    }
    &.is-src {
      border-color: #c6d4ff;
      background: #eef3ff;
    }
    &.is-map {
      border-color: #b3c8ff;
      background: #e3ebff;
    }
    &.is-a {
      border-left: 3px solid #ff3b3b;
    }
    &.is-b {
      border-left: 3px solid #52c41a;
    }
  }
  &__col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  &__arrow {
    font-size: 11px;
    color: #909399;
    position: relative;
    padding: 0 6px;
    &::before {
      content: '→';
      margin-right: 4px;
      color: #326fff;
    }
  }
  &__table {
    margin-top: 2px;
  }
  &__mono {
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    color: #326fff;
  }
  &__tabs {
    margin-top: 14px;
  }
  &__card {
    margin-top: 14px;
  }
  &__hd {
    font-weight: 600;
    font-size: 14px;
  }
  &__points {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    line-height: 2;
    color: #606266;
    li {
      margin-bottom: 4px;
    }
    b {
      color: #303133;
    }
  }
}

::v-deep .el-tabs__content {
  padding: 14px;
  background: #fafbfc;
}
</style>
