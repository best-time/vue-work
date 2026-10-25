<template>
  <div class="rcd">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="require.context 是「一次声明、整目录可用」，webpack 构建期就把 map 打好了"
    >
      <template #default>
        <div class="rcd__hint">
          <code>require.context('@/components', true, /^\.\/[^/]+\/index\.js$/)</code>
          返回的不是组件，而是一个<b>上下文函数</b>：带 <code>keys() / resolve() / id</code>，
          调用 <code>ctx(key)</code> 才拿到模块。三个参数分别是「目录 / 是否进子目录 / 路径正则」，
          第四个参数还能是 <code>'lazy'</code>（见 ③）。
        </div>
      </template>
    </el-alert>

    <el-row :gutter="12" class="rcd__row">
      <el-col :md="9" :sm="24">
        <el-card shadow="never" class="rcd__card">
          <div slot="header" class="rcd__hd">
            <span>扫描结果 <em>ctx.keys()</em></span>
            <el-tag size="mini">{{ entries.length }} 个入口</el-tag>
          </div>

          <div class="rcd__kv">
            <span>ctx.id</span><code>{{ ctxId }}</code>
          </div>
          <div class="rcd__kv">
            <span>keys()</span>
            <code class="rcd__kv-mono">{{ entryCtx.keys().join('\n') }}</code>
          </div>

          <el-table :data="entries" size="mini" border class="rcd__table">
            <el-table-column prop="dir" label="目录" width="100" />
            <el-table-column label="导出" min-width="130">
              <template #default="{ row }">
                <el-tag
                  v-for="n in row.exported"
                  :key="n"
                  size="mini"
                  class="rcd__tag"
                  >{{ n }}</el-tag
                >
                <span v-if="!row.exported.length" class="rcd__muted">—</span>
              </template>
            </el-table-column>
            <el-table-column label="install" width="72" align="center">
              <template #default="{ row }">
                <i
                  :class="
                    row.hasInstall
                      ? 'el-icon-success rcd__ok'
                      : 'el-icon-warning rcd__warn'
                  "
                />
              </template>
            </el-table-column>
            <el-table-column label="default 是" width="110">
              <template #default="{ row }">
                <span class="rcd__muted">{{ row.isSfc ? '组件' : '插件对象' }}</span>
              </template>
            </el-table-column>
          </el-table>

          <el-alert
            class="rcd__warn-box"
            type="warning"
            :closable="false"
            show-icon
            title="FunComponent/ 扫不到"
          >
            <template #default>
              它下面是 <code>$dialog.js</code> + 子目录，没有 <code>index.js</code>，
              正则匹配不上。<b>目录约定不统一，自动扫描就会有漏网之鱼</b> ——
              这种情况只能显式补一条，别指望正则兜住一切。
            </template>
          </el-alert>
        </el-card>
      </el-col>

      <el-col :md="15" :sm="24">
        <el-card shadow="never" class="rcd__card">
          <div slot="header" class="rcd__hd">
            <span>自动注册 <em>遍历 keys → install / Vue.component</em></span>
            <div>
              <el-button size="mini" type="primary" @click="registerAll"
                >扫描并注册全部</el-button
              >
              <el-button size="mini" @click="resetCount">重置计数</el-button>
            </div>
          </div>

          <div class="rcd__stats">
            <div class="rcd__stat">
              <span>注册前</span>
              <b>{{ before }}</b>
            </div>
            <i class="el-icon-right rcd__arrow" />
            <div class="rcd__stat is-hl">
              <span>注册后</span>
              <b>{{ after }}</b>
            </div>
            <div class="rcd__stat">
              <span>install 声明</span>
              <b class="rcd__ok">{{ added.length }}</b>
            </div>
            <div class="rcd__stat">
              <span>确实新增</span>
              <b :class="realNew.length ? 'rcd__ok' : 'rcd__muted'">{{ realNew.length }}</b>
            </div>
          </div>

          <div class="rcd__names">
            <el-tag
              v-for="n in added"
              :key="n"
              size="mini"
              type="success"
              class="rcd__tag"
              >{{ n }}</el-tag
            >
            <span v-if="!added.length" class="rcd__muted"
              >点上面的按钮，这里会列出 install 注册进来的标签名</span
            >
          </div>

          <el-alert
            v-if="ranOnce && !realNew.length"
            class="rcd__note"
            type="info"
            :closable="false"
            show-icon
            title="计数没变是正常的"
          >
            <template #default>
              这三个入口在 <code>main.js</code> 里已经 <code>import</code> 过，
              组件早就全局注册了；再跑一次 <code>install</code> 只是覆盖同一个名字，
              <b>Vue.component 本身幂等</b>。所以这里验证的是「机制跑通」，
              不是「组件变多」。
            </template>
          </el-alert>

          <el-divider content-position="left">关键代码</el-divider>
          <pre class="rcd__code">const ctx = require.context('@/components', true, /^\.\/[^/]+\/index\.js$/)

ctx.keys().forEach(key =&gt; {
  const mod = ctx(key)                 // ← 同步拿到模块，webpack 早就打好了
  const def = mod.__esModule ? mod.default : mod
  if (typeof def.install === 'function') def.install(Vue)   // 入口自己知道注册几个
  else Object.keys(mod).filter(k =&gt; /^[A-Z]/.test(k))
         .forEach(n =&gt; Vue.component(n, mod[n]))
})</pre>

          <el-divider content-position="left">日志</el-divider>
          <div class="rcd__logs">
            <div v-for="(l, i) in logs" :key="i" class="rcd__log">
              <span class="rcd__log-t">{{ l.t }}</span>
              <span :class="'rcd__log-k is-' + l.kind">{{ l.kind }}</span>
              <span class="rcd__log-x">{{ l.text }}</span>
            </div>
            <div v-if="!logs.length" class="rcd__muted">还没有操作记录</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      class="rcd__row"
      type="error"
      :closable="false"
      show-icon
      title="注册 ≠ 按需加载"
    >
      <template #default>
        <code>require.context</code> 默认是 <b>sync</b> 模式：匹配到的所有 index.js
        在构建期就已经进了当前 chunk。<b>主包体积一点没省</b>，运行时只是省掉了「手写 import」。
        想省体积必须用 ③ 的 <code>'lazy'</code>。
      </template>
    </el-alert>
  </div>
</template>

<script>
import Vue from 'vue'
import {
  entryCtx,
  describeEntry,
  installEntry,
  toKebab
} from '../registry'
import logMixin from './logMixin'

export default {
  name: 'ContextSyncTab',

  mixins: [logMixin],

  data() {
    return {
      entryCtx,
      ctxId: entryCtx.id,
      entries: [],
      before: 0,
      after: 0,
      added: [],
      realNew: [],
      ranOnce: false
    }
  },

  created() {
    // 逐个入口取模块 —— 每个 ctx(key) 都是一次同步查表
    const list = []
    entryCtx.keys().forEach((key) => {
      try {
        list.push(describeEntry(key))
      } catch (e) {
        this.log('error', key + ' 解析失败：' + e.message)
      }
    })
    this.entries = list
    this.resetCount()
    this.log('ok', '扫描到 ' + list.length + ' 个 index.js 入口')
  },

  methods: {
    countMap() {
      return Object.keys((Vue.options && Vue.options.components) || {}).length
    },

    resetCount() {
      this.before = this.countMap()
      this.after = 0
      this.added = []
      this.realNew = []
      this.ranOnce = false
      this.log('info', '当前全局注册组件数：' + this.before)
    },

    registerAll() {
      const registered = []
      const namesBefore = Object.keys(Vue.options.components || {})
      const start = performance.now()
      this.entries.forEach((info) => {
        try {
          const names = installEntry(info)
          registered.push(...names)
          this.log(
            'ok',
            info.dir + ' → ' +
              (info.hasInstall ? 'install(Vue)' : '按导出名注册') +
              ' → ' + (names.join(', ') || '(无组件名)')
          )
        } catch (e) {
          this.log('error', info.dir + ' 注册失败：' + e.message)
        }
      })
      this.added = Array.from(new Set(registered.map(toKebab)))
      this.after = this.countMap()
      this.realNew = Object.keys(Vue.options.components || {}).filter(
        (n) => namesBefore.indexOf(n) === -1
      )
      this.ranOnce = true
      this.log(
        'ok',
        '全部完成 · ' + Math.round(performance.now() - start) + 'ms · 全局组件 ' +
          this.before + ' → ' + this.after + '（确实新增 ' + this.realNew.length + ' 个）'
      )
    }
  }
}
</script>

<style lang="scss" scoped>
.rcd {
  &__hint {
    line-height: 1.9;
    font-size: 13px;
  }
  &__row {
    margin-top: 12px;
  }
  &__card {
    height: 100%;
  }
  &__hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    em {
      font-style: normal;
      font-weight: 400;
      font-size: 12px;
      color: #909399;
      margin-left: 6px;
    }
  }
  &__kv {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 8px;
    > span {
      flex: 0 0 56px;
      color: #909399;
    }
    code {
      color: #303133;
      word-break: break-all;
    }
  }
  &__kv-mono {
    white-space: pre-line;
    font-family: Menlo, Consolas, monospace;
  }
  &__table {
    margin-bottom: 10px;
  }
  &__tag {
    margin: 0 4px 4px 0;
  }
  &__muted {
    color: #c0c4cc;
    font-size: 12px;
  }
  &__ok {
    color: #52c41a;
  }
  &__warn {
    color: #e6a23c;
  }
  &__warn-box {
    margin-top: 4px;
  }
  &__stats {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 4px 0 14px;
  }
  &__stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    span {
      font-size: 12px;
      color: #909399;
    }
    b {
      font-size: 22px;
      line-height: 1;
      color: #303133;
    }
    &.is-hl b {
      color: #326fff;
    }
  }
  &__arrow {
    color: #c0c4cc;
    margin-top: 12px;
  }
  &__names {
    min-height: 30px;
  }
  &__note {
    margin: 8px 0 10px;
  }
  &__code {
    margin: 0;
    padding: 10px 12px;
    background: #f7f8fa;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.75;
    color: #303133;
    overflow-x: auto;
    font-family: Menlo, Consolas, monospace;
  }
  &__logs {
    max-height: 180px;
    overflow-y: auto;
    font-size: 12px;
  }
  &__log {
    display: flex;
    gap: 8px;
    padding: 2px 0;
    line-height: 1.6;
  }
  &__log-t {
    color: #c0c4cc;
    flex: 0 0 62px;
  }
  &__log-k {
    flex: 0 0 42px;
    text-align: center;
    border-radius: 3px;
    font-size: 11px;
    height: 18px;
    line-height: 18px;
    background: #f0f2f5;
    color: #909399;
    &.is-ok {
      background: #e7f8ec;
      color: #52c41a;
    }
    &.is-error {
      background: #fdecec;
      color: #ff3b3b;
    }
    &.is-info {
      background: #eef3ff;
      color: #326fff;
    }
  }
  &__log-x {
    flex: 1;
    color: #606266;
    word-break: break-all;
  }
}
</style>
