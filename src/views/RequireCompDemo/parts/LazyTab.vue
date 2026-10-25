<template>
  <div class="lzt">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="require.context 的第 4 个参数写 'lazy' —— 一个文件一个 chunk，调用返回 Promise"
    >
      <template #default>
        <div class="lzt__hint">
          <code>const ctx = require.context('@/components', true, /^\.\/[^/]+\/index\.vue$/, 'lazy')</code>
          <br />
          模式对比：<code>'sync'</code>（默认，全进当前 chunk）/ <code>'lazy'</code>（每个文件独立 chunk）/
          <code>'lazy-once'</code>（所有匹配合成一个 chunk）。<b>目录扫描 + 懒加载</b>这件事，
          只有 <code>'lazy'</code> 能同时做到。
        </div>
      </template>
    </el-alert>

    <div class="lzt__grid">
      <div
        v-for="item in list"
        :key="item.key"
        class="lzt__item"
        :class="{ 'is-active': current === item.key }"
        @click="pick(item)"
      >
        <div class="lzt__item-hd">
          <b>{{ item.label }}</b>
          <el-tag v-if="downloaded[item.key]" size="mini" type="success"
            >已下载</el-tag
          >
          <i v-else class="el-icon-download lzt__dl" />
        </div>
        <div class="lzt__item-desc">{{ item.desc }}</div>
        <div v-if="downloaded[item.key]" class="lzt__item-cost">
          {{ downloaded[item.key].sizeText }} · {{ downloaded[item.key].ms }} ms
        </div>
      </div>
    </div>

    <el-row :gutter="12" class="lzt__row">
      <el-col :md="16" :sm="24">
        <el-card shadow="never" class="lzt__card">
          <div slot="header" class="lzt__hd">
            <span>渲染区 <em>&lt;component :is="comp" v-bind="props"&gt;</em></span>
            <el-button
              v-if="current"
              size="mini"
              @click="reset"
              >清空</el-button
            >
          </div>

          <div v-loading="loading" class="lzt__stage" element-loading-text="正在下载 chunk…">
            <component
              v-if="comp"
              :is="comp"
              v-bind="compProps"
              :key="renderKey"
            />
            <div v-else class="lzt__empty">
              点上面任意一张卡片 —— 组件代码<b>此刻才从网络下载</b>，
              没点过的永远不会到浏览器。
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :md="8" :sm="24">
        <el-card shadow="never" class="lzt__card">
          <div slot="header" class="lzt__hd">
            <span>这次真的发了请求</span>
          </div>
          <div class="lzt__net">
            <div v-for="(c, i) in chunks" :key="i" class="lzt__net-row">
              <code>{{ c.url }}</code>
              <span>{{ c.sizeText }}</span>
              <span class="lzt__muted">{{ c.ms }}ms</span>
            </div>
            <div v-if="!chunks.length" class="lzt__muted">
              还没有下载任何 chunk
            </div>
          </div>

          <el-divider content-position="left">ctx.keys()</el-divider>
          <div class="lzt__keys">
            <code v-for="k in keys" :key="k">{{ k }}</code>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="lzt__row">
      <div slot="header" class="lzt__hd">
        <span>为什么这一个能懒、上面 ①② 不能</span>
      </div>
      <pre class="lzt__code">// ① ② 的写法：构建期就已经把文件内容塞进当前 chunk
const mod = require('@/components/' + name + '/index.js')   // sync
const mod = ctx(key)                                        // 同上

// ③ 的写法：只把「怎么去下载」塞进 chunk，文件内容在别的 chunk 里
sfcCtx(key).then(mod =&gt; mod.default)   // lazy → Promise

// 等价的老写法（webpack 4 也支持 import()，新代码优先 import()）
require.ensure([], require =&gt; {
  resolve(require('@/components/' + name + '/index.js'))
}, 'some-chunk')</pre>
      <p class="lzt__pt">
        <b>注意 chunk 的粒度 = 正则的粒度。</b>
        <code>'lazy'</code> 是每个匹配文件一个 chunk，所以这里 4 个组件是 4 个独立文件；
        换成 <code>'lazy-once'</code> 就变成「点任意一个，四个全下来」。
        另外 <code>lazy</code> 模式下 <code>ctx.resolve(key)</code> 不能用，
        要靠 <code>ctx.keys()</code> 自己维护白名单。
      </p>
    </el-card>
  </div>
</template>

<script>
import {
  sfcCtx,
  SFC_META,
  loadSfc,
  pollChunks
} from '../registry'
import logMixin from './logMixin'

export default {
  name: 'LazyTab',

  mixins: [logMixin],

  data() {
    return {
      keys: sfcCtx.keys(),
      list: [],
      current: '',
      comp: null,
      compProps: {},
      renderKey: 0,
      loading: false,
      chunks: [],
      downloaded: {}
    }
  },

  created() {
    this.list = this.keys.map((key) => ({
      key,
      label: (SFC_META[key] && SFC_META[key].label) || key,
      desc: (SFC_META[key] && SFC_META[key].desc) || '目录里的 index.vue'
    }))
    this.log('info', 'sfcCtx() 是 lazy 模式，keys 有 ' + this.keys.length + ' 个，此刻一个都没下载')
  },

  methods: {
    pick(item) {
      this.current = item.key
      this.loading = true
      this.comp = null
      const t0 = performance.now()

      loadSfc(item.key)
        .then((comp) => {
          const cost = Math.round(performance.now() - t0)
          this.compProps = (SFC_META[item.key] && SFC_META[item.key].props) || {}
          this.comp = comp
          this.renderKey += 1
          this.log('ok', item.label + ' 组件到手 · ' + cost + 'ms（此刻才 require 到模块）')
          // chunk 的 resource timing 可能晚一两帧才落地，轮询补上
          return pollChunks(t0).then((newChunks) => {
            if (newChunks.length) {
              this.chunks = newChunks
              this.downloaded = { ...this.downloaded, [item.key]: newChunks[0] }
              this.log(
                'ok',
                '新 chunk：' +
                  newChunks.map((c) => c.url + '(' + c.sizeText + ')').join(', ')
              )
            } else {
              this.log('info', item.label + ' 没产生新请求（chunk 已在本地缓存）')
            }
          })
        })
        .catch((e) => {
          this.log('error', '加载失败：' + e.message)
        })
        .then(() => {
          this.loading = false
        })
    },

    reset() {
      this.comp = null
      this.current = ''
      this.chunks = []
    }
  }
}
</script>

<style lang="scss" scoped>
.lzt {
  &__hint {
    line-height: 1.95;
    font-size: 13px;
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 12px;
  }
  &__item {
    padding: 12px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.18s;
    background: #fff;
    &:hover {
      border-color: #b3c8ff;
      box-shadow: 0 2px 10px rgba(50, 111, 255, 0.12);
    }
    &.is-active {
      border-color: #326fff;
      box-shadow: 0 0 0 2px rgba(50, 111, 255, 0.12);
    }
  }
  &__item-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 6px;
    b {
      font-size: 14px;
      color: #303133;
    }
  }
  &__dl {
    color: #c0c4cc;
  }
  &__item-desc {
    font-size: 12px;
    color: #909399;
    line-height: 1.6;
  }
  &__item-cost {
    margin-top: 6px;
    font-size: 11px;
    color: #52c41a;
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
    font-size: 14px;
    em {
      font-style: normal;
      font-weight: 400;
      font-size: 12px;
      color: #909399;
      margin-left: 6px;
      font-family: Menlo, Consolas, monospace;
    }
  }
  &__stage {
    min-height: 260px;
  }
  &__empty {
    padding: 90px 0;
    text-align: center;
    color: #c0c4cc;
    font-size: 13px;
    b {
      color: #909399;
    }
  }
  &__net {
    max-height: 160px;
    overflow-y: auto;
    font-size: 12px;
  }
  &__net-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    code {
      flex: 1;
      color: #326fff;
      word-break: break-all;
    }
    span {
      color: #606266;
      flex: 0 0 auto;
    }
  }
  &__muted {
    color: #c0c4cc;
    font-size: 12px;
  }
  &__keys {
    display: flex;
    flex-direction: column;
    gap: 4px;
    code {
      font-size: 12px;
      color: #606266;
    }
  }
  &__code {
    margin: 0 0 10px;
    padding: 10px 12px;
    background: #f7f8fa;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.8;
    color: #303133;
    overflow-x: auto;
    font-family: Menlo, Consolas, monospace;
  }
  &__pt {
    margin: 0;
    font-size: 13px;
    line-height: 1.9;
    color: #606266;
    b {
      color: #303133;
    }
  }
}
</style>
