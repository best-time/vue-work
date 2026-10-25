<template>
  <div class="vpt">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="require('@/components/' + name + '/index.js') —— 变量路径在 webpack 里就是上下文模块"
    >
      <template #default>
        <div class="vpt__hint">
          webpack 只认<b>字面量前缀</b>：它把 <code>@/components/</code> 当上下文目录、
          把 <code>/index.js</code> 当后缀约束，运行时拼出来的名字只能在这个范围内查表。
          <b>拼到范围外的名字 → 运行时抛 Cannot find module</b>，而且构建期就有明确边界。
        </div>
      </template>
    </el-alert>

    <el-row :gutter="12" class="vpt__row">
      <el-col :md="10" :sm="24">
        <el-card shadow="never" class="vpt__card">
          <div slot="header" class="vpt__hd">
            <span>单点取模块</span>
          </div>

          <el-form label-width="72px" size="mini">
            <el-form-item label="组件名">
              <el-select v-model="name" class="vpt__sel">
                <el-option
                  v-for="c in candidates"
                  :key="c.name"
                  :label="c.name + (c.ok ? '' : '（无 index.js）')"
                  :value="c.name"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="">
              <el-button type="primary" size="mini" @click="doRequire"
                >同步 require + 注册</el-button
              >
              <el-button size="mini" @click="doRequireOnly">只取模块</el-button>
            </el-form-item>
          </el-form>

          <div class="vpt__meta">
            <div class="vpt__kv">
              <span>用时</span><b>{{ cost }} ms</b>
              <em>模块已缓存时几乎为 0</em>
            </div>
            <div class="vpt__kv">
              <span>新请求</span><b>{{ newReqs }}</b>
              <em>同步 require 不会发请求</em>
            </div>
          </div>

          <el-alert
            v-if="error"
            type="error"
            :closable="false"
            show-icon
            :title="error"
            class="vpt__err"
          >
            <template #default>
              这就是「变量前缀决定匹配范围」的现场：<code>Icon</code> 目录下只有
              <code>index.vue</code>，没有 <code>index.js</code>，
              webpack 的 map 里根本没有这个 key，运行时直接抛错。
              想兼容两种形状，要么写成两条 require，要么用 ③ 的 context。
            </template>
          </el-alert>

          <el-alert
            v-else-if="shape"
            type="success"
            :closable="false"
            show-icon
            :title="'取到模块：' + name + '/index.js'"
          >
            <template #default>
              <pre class="vpt__code">{{ shape }}</pre>
            </template>
          </el-alert>
        </el-card>
      </el-col>

      <el-col :md="14" :sm="24">
        <el-card shadow="never" class="vpt__card">
          <div slot="header" class="vpt__hd">
            <span>从模块里捞出组件 → 局部注册 → 渲染</span>
            <el-tag size="mini" type="warning">不依赖全局注册</el-tag>
          </div>

          <div class="vpt__body">
            <div v-if="!localMap" class="vpt__empty">
              先在左边点「同步 require + 注册」，这里会用
              <code>components: { DemoXxx: mod.Xxx }</code> 局部注册后渲染出来。
            </div>

            <template v-else>
              <div class="vpt__lbl">
                localMap：
                <el-tag
                  v-for="(v, k) in localMap"
                  :key="k"
                  size="mini"
                  class="vpt__tag"
                  >{{ k }}</el-tag
                >
              </div>

              <!-- GridBox：父 + 子两个组件都要拿到；:is 直接传组件对象，连注册都不用 -->
              <div v-if="localMap.DemoGrid" class="vpt__demo">
                <component :is="localMap.DemoGrid" :cols="3" :gap="10">
                  <component :is="localMap.DemoGridItem" v-for="n in 6" :key="n">
                    <div class="vpt__box">{{ n }}</div>
                  </component>
                </component>
              </div>

              <!-- AppDialog：能打开就行 -->
              <div v-else-if="localMap.DemoDialog" class="vpt__demo">
                <el-button size="mini" type="primary" @click="dlg = true"
                  >打开动态取到的弹窗</el-button
                >
                <component
                  :is="localMap.DemoDialog"
                  :visible.sync="dlg"
                  title="这个弹窗的组件构造器来自 require"
                >
                  <p>组件是运行时从 require 的返回值里捞出来的，</p>
                  <p>没有 import 语句，也没有提前 Vue.component。</p>
                </component>
              </div>

              <!-- VxeTable：入口是个插件，导出的 CommonTable 可以直接用 -->
              <div v-else-if="localMap.DemoTable" class="vpt__demo">
                <component :is="localMap.DemoTable" />
              </div>

              <p v-else class="vpt__empty">
                VxeTable 的入口是插件对象（default = VXETable），
                它只通过 install 注册，没有可直接渲染的默认导出。
              </p>
            </template>
          </div>

          <el-divider content-position="left">这段代码长什么样</el-divider>
          <pre class="vpt__code vpt__code--block">// 同步取模块（webpack 构建期就把匹配到的文件打进来了）
const mod = require('@/components/' + name + '/index.js')

// ESM interop：babel 编译后是 { __esModule: true, default }，
// 直接把 mod 当组件用 → 得到空对象 → 页面空白且不报错
const def = mod.__esModule ? mod.default : mod

// 入口带 install 就整个装上；否则挑大驼峰导出局部/全局注册
if (typeof def.install === 'function') def.install(Vue)

// 也可以完全不注册，直接交给 components 选项
export default { components: { DemoGrid: mod.GridBox, DemoGridItem: mod.GridBoxItem } }</pre>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="vpt__row">
      <div slot="header" class="vpt__hd">
        <span>两个必须知道的边界</span>
      </div>
      <el-row :gutter="16">
        <el-col :md="12" :sm="24">
          <p class="vpt__pt">
            <b>① 同步 = 已在包里。</b>
            <code>require</code> 不是懒加载，匹配到的文件在构建期就进了当前 chunk。
            上面「新请求 0」不是缓存好，而是<b>压根没发请求</b>——代码早就在手上了。
          </p>
        </el-col>
        <el-col :md="12" :sm="24">
          <p class="vpt__pt">
            <b>② 名字必须落在前缀范围内。</b>
            前缀 <code>@/components/</code> + 后缀 <code>/index.js</code> 构成了匹配边界；
            写 <code>'../' + name</code> 会跳出上下文，
            webpack 会给出
            <code>Critical dependency: the request of a dependency is an expression</code>
            这种很难查的告警。
          </p>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import Vue from 'vue'
import { chunkSince, toKebab } from '../registry'
import logMixin from './logMixin'

export default {
  name: 'VarPathTab',

  mixins: [logMixin],

  data() {
    return {
      name: 'GridBox',
      candidates: [
        { name: 'GridBox', ok: true },
        { name: 'AppDialog', ok: true },
        { name: 'VxeTable', ok: true },
        { name: 'Icon', ok: false },
        { name: 'NotExist', ok: false }
      ],
      shape: '',
      error: '',
      cost: 0,
      newReqs: 0,
      localMap: null,
      demoKey: 0,
      dlg: false
    }
  },

  methods: {
    /** 真正的那一句：变量路径的 require */
    pickModule() {
      // eslint-disable-next-line
      return require('@/components/' + this.name + '/index.js')
    },

    doRequireOnly() {
      this.run(false)
    },

    doRequire() {
      this.run(true)
    },

    run(register) {
      this.error = ''
      this.shape = ''
      this.localMap = null
      const t0 = performance.now()

      let mod
      try {
        mod = this.pickModule()
      } catch (e) {
        this.cost = Math.round(performance.now() - t0)
        this.error = 'Cannot find module：' + this.name + '/index.js'
        this.log('error', this.error + '（' + e.message + '）')
        return
      }

      this.cost = Math.round(performance.now() - t0)
      this.newReqs = chunkSince(t0).length

      const isEsm = mod.__esModule === true
      const def = isEsm ? mod.default : mod
      const keys = Object.keys(mod)
      const named = keys.filter((k) => k !== 'default' && /^[A-Z]/.test(k))
      const hasInstall = !!(def && typeof def.install === 'function')

      this.shape = [
        'isEsm        : ' + isEsm,
        'keys         : [' + keys.join(', ') + ']',
        'default 类型  : ' + (def && def.name ? '组件 name=' + def.name : typeof def),
        '有 install?   : ' + hasInstall
      ].join('\n')

      // ---- 捞组件：局部注册，不碰全局 ----
      const map = {}
      if (this.name === 'GridBox') {
        map.DemoGrid = mod.GridBox
        map.DemoGridItem = mod.GridBoxItem
      } else if (this.name === 'AppDialog') {
        map.DemoDialog = mod.AppDialog
      } else if (this.name === 'VxeTable') {
        if (mod.CommonTable) map.DemoTable = mod.CommonTable
      }
      Object.keys(map).forEach((k) => {
        if (!map[k]) delete map[k]
      })
      this.localMap = Object.keys(map).length ? map : null
      this.demoKey += 1

      if (register && hasInstall) {
        const countBefore = Object.keys(Vue.options.components || {}).length
        try {
          def.install(Vue)
          const countAfter = Object.keys(Vue.options.components || {}).length
          this.log(
            'ok',
            'install(Vue) 跑完 · 全局组件 ' + countBefore + ' → ' + countAfter
          )
        } catch (e) {
          this.log('error', 'install 失败：' + e.message)
        }
      }

      this.log(
        'ok',
        'require(' + this.name + '/index.js) → ' + this.cost + 'ms · 新增网络请求 ' +
          this.newReqs + ' 次 · 局部注册 ' +
          (this.localMap ? Object.keys(this.localMap).join('/') : '无')
      )
      if (named.length) {
        this.log('info', '模块里的命名导出：' + named.map(toKebab).join(', '))
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.vpt {
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
  &__sel {
    width: 100%;
  }
  &__meta {
    display: flex;
    gap: 24px;
    padding: 4px 0 10px;
  }
  &__kv {
    display: flex;
    flex-direction: column;
    gap: 2px;
    span {
      font-size: 12px;
      color: #909399;
    }
    b {
      font-size: 20px;
      line-height: 1;
      color: #326fff;
    }
    em {
      font-style: normal;
      font-size: 11px;
      color: #c0c4cc;
    }
  }
  &__err {
    margin-top: 4px;
  }
  &__body {
    min-height: 168px;
  }
  &__empty {
    color: #c0c4cc;
    font-size: 13px;
    line-height: 1.9;
  }
  &__lbl {
    font-size: 12px;
    color: #909399;
    margin-bottom: 10px;
  }
  &__tag {
    margin: 0 4px 4px 0;
  }
  &__demo {
    padding: 12px;
    background: #f7f8fa;
    border-radius: 8px;
  }
  &__box {
    height: 44px;
    line-height: 44px;
    text-align: center;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    font-size: 13px;
    color: #606266;
  }
  &__code {
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.8;
    color: #303133;
    font-family: Menlo, Consolas, monospace;
    white-space: pre-wrap;
    word-break: break-all;
  }
  &__code--block {
    padding: 10px 12px;
    background: #f7f8fa;
    border-radius: 6px;
    margin: 0;
    white-space: pre;
    overflow-x: auto;
  }
  &__pt {
    font-size: 13px;
    line-height: 1.9;
    color: #606266;
    margin: 0;
    b {
      color: #303133;
    }
  }
}
</style>
