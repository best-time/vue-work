<template>
  <div class="cft">
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="真正落地的场景：后台下发一份 JSON，前端按名字渲染 —— 但名字必须走白名单"
    >
      <template #default>
        <div class="cft__hint">
          <b>绝对不要把用户/接口给的字符串直接拼进 require 或 import 路径。</b>
          <code>require.context</code> 的 <code>keys()</code> 天然就是一份白名单：
          拿不到 key 就不渲染，既防越界（<code>../../</code>），也不会让 webpack
          把整个 src 扫成上下文。
        </div>
      </template>
    </el-alert>

    <el-row :gutter="12" class="cft__row">
      <el-col :md="10" :sm="24">
        <el-card shadow="never" class="cft__card">
          <div slot="header" class="cft__hd">
            <span>接口返回的配置</span>
            <el-button size="mini" type="primary" @click="render"
              >渲染</el-button
            >
          </div>
          <el-input
            v-model="json"
            type="textarea"
            :rows="15"
            class="cft__ta"
            spellcheck="false"
          />
          <div v-if="parseError" class="cft__parse-err">
            <i class="el-icon-warning-outline" /> {{ parseError }}
          </div>
          <p class="cft__tip">
            <code>type</code> 对应 <code>src/components/&lt;type&gt;/index.vue</code>；
            最后一块是故意写错的 <code>UnknownWidget</code>，看它怎么被挡下来。
          </p>
        </el-card>
      </el-col>

      <el-col :md="14" :sm="24">
        <el-card shadow="never" class="cft__card">
          <div slot="header" class="cft__hd">
            <span>渲染结果</span>
            <el-tag size="mini">{{ blocks.length }} 块</el-tag>
          </div>

          <div v-if="!blocks.length" class="cft__empty">
            点左边「渲染」把配置变成界面
          </div>

          <div
            v-for="(b, i) in blocks"
            :key="i"
            class="cft__block"
            :class="{ 'is-bad': b.error }"
          >
            <div class="cft__block-hd">
              <code>{{ b.type }}</code>
              <el-tag v-if="b.error" size="mini" type="danger">未渲染</el-tag>
              <el-tag v-else size="mini" type="success">已渲染</el-tag>
            </div>
            <div v-if="b.error" class="cft__block-err">{{ b.error }}</div>
            <component v-else :is="b.comp" v-bind="b.props" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="cft__row">
      <div slot="header" class="cft__hd">
        <span>解析 + 渲染（30 行不到）</span>
      </div>
      <pre class="cft__code">import { sfcCtx, loadSfc } from './registry'

const WHITELIST = sfcCtx.keys()             // [ './Icon/index.vue', './card/index.vue', ... ]

async function resolveBlock(block) {
  const key = './' + block.type + '/index.vue'
  if (WHITELIST.indexOf(key) === -1) {      // ← 白名单外，直接拒绝
    return { ...block, error: '组件不在白名单：' + block.type }
  }
  const comp = await loadSfc(key)           // lazy ctx → 用到才下载
  return { ...block, comp, props: block.props || {} }
}

// 模板里
// &lt;component :is="b.comp" v-bind="b.props" v-for="b in blocks" /&gt;</pre>
      <p class="cft__pt">
        配上 ③ 的 <code>'lazy'</code> 上下文，这个页面一开始<b>不下载任何业务组件</b>；
        接口返回什么才下什么。对「一个壳子给 N 个客户配不同首页」这种需求，
        这就是最小实现 —— 不需要微前端，也不需要运行时编译。
      </p>
    </el-card>
  </div>
</template>

<script>
import { sfcCtx, loadSfc } from '../registry'
import logMixin from './logMixin'

const SAMPLE = [
  { type: 'title-header', props: { title: '客户 A 的首页（配置下发）' } },
  {
    type: 'card',
    props: {
      cards: [
        { title: '今日 GMV', value: '128.43', unit: '万' },
        { title: '订单数', value: '3,271', unit: '单', type: '#ff3b3b' },
        { title: '退款率', value: '1.2', unit: '%', type: '#52c41a' }
      ]
    }
  },
  { type: 'Icon', props: {} },
  {
    type: 'EChart',
    props: {
      height: '200px',
      option: {
        grid: { left: 44, right: 16, top: 20, bottom: 26 },
        xAxis: { type: 'category', data: ['5月', '6月', '7月', '8月'] },
        yAxis: { type: 'value' },
        series: [
          { type: 'bar', barWidth: 18, itemStyle: { color: '#326fff' }, data: [82, 121, 98, 156] }
        ]
      }
    }
  },
  { type: 'UnknownWidget', props: {} }
]

export default {
  name: 'ConfigTab',

  mixins: [logMixin],

  data() {
    return {
      json: JSON.stringify(SAMPLE, null, 2),
      blocks: [],
      parseError: ''
    }
  },

  created() {
    this.log('info', '白名单（sfcCtx.keys）：' + sfcCtx.keys().join(' , '))
  },

  methods: {
    render() {
      this.parseError = ''
      let cfg
      try {
        cfg = JSON.parse(this.json)
      } catch (e) {
        this.parseError = 'JSON 解析失败：' + e.message
        return
      }
      if (!Array.isArray(cfg)) {
        this.parseError = '配置必须是数组'
        return
      }

      const white = sfcCtx.keys()
      const t0 = performance.now()

      Promise.all(
        cfg.map((block) => {
          const key = './' + block.type + '/index.vue'
          if (white.indexOf(key) === -1) {
            this.log('error', '拒绝渲染 ' + block.type + '：不在白名单')
            return { ...block, error: '组件不在白名单，已跳过（' + key + '）' }
          }
          return loadSfc(key).then(
            (comp) => ({ ...block, comp, props: block.props || {} }),
            (e) => ({ ...block, error: e.message })
          )
        })
      ).then((blocks) => {
        this.blocks = blocks
        this.log(
          'ok',
          '渲染完成 · ' + Math.round(performance.now() - t0) + 'ms · ' +
            blocks.filter((b) => !b.error).length + '/' + blocks.length + ' 块成功'
        )
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.cft {
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
    font-size: 14px;
  }
  &__ta {
    ::v-deep textarea {
      font-family: Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.7;
    }
  }
  &__parse-err {
    margin-top: 8px;
    color: #ff3b3b;
    font-size: 12px;
  }
  &__tip {
    margin: 8px 0 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.8;
  }
  &__empty {
    padding: 100px 0;
    text-align: center;
    color: #c0c4cc;
    font-size: 13px;
  }
  &__block {
    padding: 12px;
    margin-bottom: 10px;
    border-left: 3px solid #326fff;
    background: #f7f8fa;
    border-radius: 6px;
    &.is-bad {
      border-left-color: #ff3b3b;
      background: #fdf3f3;
    }
  }
  &__block-hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    code {
      font-size: 12px;
      color: #326fff;
    }
  }
  &__block-err {
    font-size: 12px;
    color: #ff3b3b;
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
