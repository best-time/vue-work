<template>
  <div class="cbd">
    <header class="cbd__head">
      <div class="cbd__head-main">
        <h2 class="cbd__title">ConfirmButton · 带 loading 与二次确认的 el-button</h2>
        <p class="cbd__desc">
          把「点按钮 → 问一句 → 转圈 → 成功/失败提示」这条最常见的链路收进一个组件。
          它本身还是 <code>el-button</code>（<code>type / size / plain / icon / disabled</code> 全部透传），
          只是多了一个确认框和一套 loading 约定。封装在
          <code>src/components/ConfirmButton/</code>，全局标签 <code>&lt;confirm-button&gt;</code>。
        </p>
      </div>
      <div class="cbd__meta">
        <div><code>&lt;confirm-button :action="fn" success-text="已保存"&gt;保存&lt;/confirm-button&gt;</code></div>
        <div><code>action: () =&gt; Promise</code> · <code>@confirm</code> · <code>@cancel</code> · <code>@block</code></div>
      </div>
    </header>

    <div class="cbd__layout">
      <el-tabs v-model="tab" type="border-card" class="cbd__tabs">
        <el-tab-pane label="① 三种用法" name="basic" lazy>
          <basic-tab @log="onLog" />
        </el-tab-pane>
        <el-tab-pane label="② 危险操作" name="danger" lazy>
          <danger-tab @log="onLog" />
        </el-tab-pane>
        <el-tab-pane label="③ 富内容确认" name="rich" lazy>
          <rich-tab @log="onLog" />
        </el-tab-pane>
        <el-tab-pane label="④ 透传与坑" name="pitfall" lazy>
          <pitfall-tab @log="onLog" />
        </el-tab-pane>
      </el-tabs>

      <!-- 事件日志：常驻，跨页签共用一份，所以数据留在页面这层 -->
      <el-card shadow="never" class="cbd__logcard">
        <div slot="header" class="cbd__card-head">
          <b>事件日志</b>
          <el-button type="text" :disabled="!logs.length" @click="logs = []">清空</el-button>
        </div>
        <ul class="cbd__log">
          <li v-for="item in logs" :key="item.id" class="cbd__log-item">
            <span class="cbd__log-t" :class="'is-' + item.type">{{ item.type }}</span>
            <span class="cbd__log-x">{{ item.text }}</span>
            <span class="cbd__log-time">{{ item.time }}</span>
          </li>
          <li v-if="!logs.length" class="cbd__log-empty">
            点几个按钮试试 —— click / confirm / cancel / block / success / error 都会记在这里
          </li>
        </ul>
      </el-card>
    </div>
  </div>
</template>

<script>
/**
 * 演示页外壳：头部说明 + 四个页签 + 常驻事件日志。
 *
 * 每个页签的示例都拆在 parts/ 下（BasicTab / DangerTab / RichTab / PitfallTab），
 * 页签里只保留自己的状态与假接口；日志只有一个列表，所以子组件统一
 * $emit('log', { type, text })，由这里 onLog 落进 logs。
 * 页签用 lazy：切走的不渲染，避免一进来就建四个页签的 DOM（含里面的弹窗）。
 */
import BasicTab from './parts/BasicTab.vue'
import DangerTab from './parts/DangerTab.vue'
import RichTab from './parts/RichTab.vue'
import PitfallTab from './parts/PitfallTab.vue'

const MAX_LOGS = 14

export default {
  name: 'ConfirmButtonDemoPage',

  components: { BasicTab, DangerTab, RichTab, PitfallTab },

  data() {
    return {
      tab: 'basic',
      logs: [],
      logSeed: 0,
    }
  },

  methods: {
    /** @param {{type: string, text: string}} payload 来自各页签组件的 log() */
    onLog({ type, text }) {
      const d = new Date()
      const pad = (n) => (n < 10 ? '0' + n : '' + n)
      this.logs.unshift({
        id: ++this.logSeed,
        type,
        text,
        time: pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()),
      })
      this.logs = this.logs.slice(0, MAX_LOGS)
    },
  },
}
</script>

<style lang="scss" src="./demo.scss"></style>
