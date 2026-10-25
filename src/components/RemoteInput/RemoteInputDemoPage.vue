<template>
  <div class="rip">
    <header class="rip__head">
      <div class="rip__head-main">
        <h2 class="rip__title">RemoteInput · 可输入 / 远程搜索 / 选中回填</h2>
        <p class="rip__desc">
          一个输入框同时干三件事：<b>可以自由输入</b>、<b>边输边远程搜索</b>、<b>点选结果回填到输入框</b>。
          关键是<b>文本和业务值分两条路走</b> ——
          <code>v-model</code> 只给文本（用户看到什么就是什么），
          选中项整条记录走 <code>@select</code>（id、城市、联系人都在里面）。
        </p>
      </div>
      <div class="rip__meta">
        <div>
          <code>&lt;remote-input v-model="x" :fetch-method="fn" /&gt;</code>
        </div>
        <div>源码 <code>src/components/RemoteInput/</code></div>
      </div>
    </header>

    <el-tabs v-model="tab" type="border-card">
      <!-- ================= ① ================= -->
      <el-tab-pane label="① 输入 · 搜索 · 回填" name="basic" lazy>
        <div class="rip__grid">
          <el-card shadow="never" class="rip__card">
            <div slot="header" class="rip__card-head">
              <b>表单字段：客户名称</b>
              <code>v-model + @select</code>
            </div>
            <div class="rip__pad">
              <div class="rip__field">
                <label class="rip__label">客户名称</label>
                <remote-input
                  ref="basic"
                  v-model="form.name"
                  :fetch-method="basicFetch"
                  label-key="name"
                  value-key="id"
                  :meta-key="metaOf"
                  placeholder="输入公司名 / 城市 / 联系人，如「杭州」"
                  @select="onBasicSelect"
                  @invalidate="onBasicInvalidate"
                  @clear="onBasicClear"
                  @enter="onBasicEnter"
                  @result="onBasicResult"
                />
                <p class="rip__help">
                  试试 <code>杭州</code> / <code>腾讯</code> / <code>阿里</code>；
                  也可以直接敲一个库里没有的名字 —— 不选就是自由输入，不会被拦。
                </p>
              </div>

              <div class="rip__actions">
                <el-button size="small" type="primary" @click="submit">
                  提交
                </el-button>
                <el-button size="small" @click="fillByCode">
                  程序回填（按 id）
                </el-button>
                <el-button size="small" @click="resetForm">重置</el-button>
              </div>

              <div class="rip__submitted">
                <span class="rip__submitted-cap">提交对象</span>
                <code>{{ submitted }}</code>
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="rip__card">
            <div slot="header" class="rip__card-head">
              <b>当前状态</b>
              <span class="rip__muted">文本 / id 分别是什么</span>
            </div>
            <div class="rip__pad">
              <div class="rip__kv">
                <span>v-model 文本</span>
                <code>{{ form.name || '(空)' }}</code>
              </div>
              <div class="rip__kv">
                <span>@select 的 id</span>
                <code :class="{ 'is-warn': !form.id }">{{
                  form.id || '(未选中)'
                }}</code>
              </div>
              <div class="rip__kv">
                <span>整条记录</span>
                <code>{{
                  picked ? picked.city + ' · ' + picked.contact : '(未选中)'
                }}</code>
              </div>

              <div class="rip__log">
                <div class="rip__log-head">
                  <span>事件日志</span>
                  <el-button type="text" size="mini" @click="basicLogs = []"
                    >清空</el-button
                  >
                </div>
                <div v-if="!basicLogs.length" class="rip__log-empty">
                  还没有事件，先在左边输入或点选一条
                </div>
                <div
                  v-for="l in basicLogs"
                  :key="l.id"
                  class="rip__log-row"
                  :class="'is-' + l.kind"
                >
                  <span class="rip__log-t">{{ l.t }}</span>
                  <span>{{ l.text }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <p class="rip__note">
          <b>为什么 v-model 存文本、不存 id：</b>
          用户在这个框里可以只打名字不选（比如新客户首次录入），如果 v-model 绑 id，
          这种「合法但没有 id」的输入就没地方放。所以文本绑 <code>v-model</code>，
          选中的 id 由 <code>@select</code> 自己存一个字段 —— 提交时两个都带上，
          后端按 id 有则用、无则按名称匹配。<br />
          <b>配套的一条：</b>选过一条之后又改文字，组件会发
          <code>@invalidate</code>，这里把 id 清空 —— 否则会出现
          「文本是 A、id 还是 B」的脏数据（试完选中再把文字改掉，看事件日志）。
        </p>
      </el-tab-pane>

      <!-- ================= ② ================= -->
      <el-tab-pane label="② 竞态与边界" name="edge" lazy>
        <div class="rip__grid">
          <el-card shadow="never" class="rip__card">
            <div slot="header" class="rip__card-head">
              <b>慢接口 + 快速输入</b>
              <code>:debounce="300"</code>
            </div>
            <div class="rip__pad">
              <div class="rip__row">
                <el-switch
                  v-model="raceMode"
                  active-text="关键词 ≤2 字故意慢 1400ms"
                ></el-switch>
              </div>

              <div class="rip__field">
                <label class="rip__label">客户名称</label>
                <remote-input
                  ref="edge"
                  v-model="edge.name"
                  :fetch-method="edgeFetch"
                  label-key="name"
                  value-key="id"
                  :meta-key="metaOf"
                  placeholder="连续快速改输入，看右侧日志"
                  @search="onEdgeSearch"
                  @result="onEdgeResult"
                  @select="onEdgeSelect"
                />
              </div>

              <div class="rip__row">
                <el-button size="small" type="primary" @click="raceDemo">
                  一键复现竞态
                </el-button>
                <el-switch v-model="failMode" active-text="让接口失败"></el-switch>
                <el-button size="small" @click="edgeLogs = []">清日志</el-button>
              </div>

              <p class="rip__help">
                点「一键复现」会连续发两个请求：<code>阿里</code>（慢 1400ms）和
                <code>阿里巴巴</code>（快 120ms）。后发的先回，先发的后回 ——
                先发那次的结果必须被丢掉，否则输入框里已经是「阿里巴巴」，
                下拉列表却会被「阿里」的结果覆盖。
              </p>
            </div>
          </el-card>

          <el-card shadow="never" class="rip__card">
            <div slot="header" class="rip__card-head">
              <b>请求日志</b>
              <span class="rip__muted">谁被丢弃、为什么</span>
            </div>
            <div class="rip__pad">
              <div v-if="!edgeLogs.length" class="rip__log-empty">
                还没有请求记录
              </div>
              <div
                v-for="l in edgeLogs"
                :key="l.id"
                class="rip__log-row"
                :class="'is-' + l.kind"
              >
                <span class="rip__log-t">{{ l.t }}</span>
                <span>{{ l.text }}</span>
              </div>
            </div>
          </el-card>
        </div>

        <div class="rip__cases">
          <div v-for="c in CASES" :key="c.title" class="rip__case">
            <b>{{ c.title }}</b>
            <p>{{ c.text }}</p>
          </div>
        </div>
      </el-tab-pane>

      <!-- ================= ③ ================= -->
      <el-tab-pane label="③ 与原生方案对照" name="native" lazy>
        <div class="rip__grid">
          <el-card shadow="never" class="rip__card">
            <div slot="header" class="rip__card-head">
              <b>el-autocomplete</b>
              <code>:fetch-suggestions</code>
            </div>
            <div class="rip__pad">
              <el-autocomplete
                v-model="autoName"
                :fetch-suggestions="fetchSuggestions"
                placeholder="输入「杭州」试试"
                style="width: 100%"
                @select="onAutoSelect"
              ></el-autocomplete>
              <div class="rip__kv">
                <span>选中 id</span>
                <code>{{ autoId || '(未选中)' }}</code>
              </div>
              <p class="rip__help">
                它也能输入、能回填，是最省事的方案。代价：结果项必须带
                <code>value</code> 字段、模板固定，<b>没有</b>「加载中 / 空结果 /
                请求失败」三种状态的入口 —— 只能自己往插槽里塞。
              </p>
            </div>
          </el-card>

          <el-card shadow="never" class="rip__card">
            <div slot="header" class="rip__card-head">
              <b>el-select remote</b>
              <code>filterable + remote</code>
            </div>
            <div class="rip__pad">
              <el-select
                v-model="selectId"
                filterable
                remote
                clearable
                :remote-method="remoteSearch"
                :loading="selectLoading"
                placeholder="输入「杭州」试试"
                style="width: 100%"
              >
                <el-option
                  v-for="o in selectOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                ></el-option>
              </el-select>
              <div class="rip__kv">
                <span>v-model</span>
                <code>{{ selectId || '(空)' }}</code>
              </div>
              <p class="rip__help">
                v-model 直接是 id，显示靠 option 的 label，<b>不能</b>输入列表外的值
                （要 <code>allow-create</code> 才行，但那样新建项的值是用户输的字符串，
                不是 id）。适合「只能从固定集合里选」的字段。
              </p>
            </div>
          </el-card>
        </div>

        <table class="rip__table">
          <thead>
            <tr>
              <th>方案</th>
              <th>自由输入</th>
              <th>选中回填</th>
              <th>状态控制</th>
              <th>适合</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in COMPARE" :key="r.name" :class="{ 'is-own': r.own }">
              <td>
                <code>{{ r.name }}</code>
              </td>
              <td>{{ r.free }}</td>
              <td>{{ r.fill }}</td>
              <td>{{ r.state }}</td>
              <td>{{ r.fit }}</td>
            </tr>
          </tbody>
        </table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import {
  CUSTOMERS,
  searchCustomers,
  fetchSuggestions as fetchAutoSuggestions,
  searchOptions
} from './mockApi'

let logId = 0

const CASES = [
  {
    title: '清空后旧结果不许回来',
    text: '每次 input 都 ++seq，清空时也 ++：慢请求回来发现序号对不上，直接丢弃，面板不会被顶开。'
  },
  {
    title: '选中后不许再搜一次',
    text: '回填是程序赋值，el-input 的 @input 不会触发，所以不会拿「已选中的名字」再搜一遍；pick 里还会再 ++seq 作废在途请求。'
  },
  {
    title: '输入不足 minLength',
    text: '面板显示「至少输入 N 个字符」而不是发请求 —— 少于这个长度搜出来的结果没有意义，还浪费接口。'
  },
  {
    title: '请求失败可重试',
    text: '错误信息留在面板里，点「重试」用当前关键词再打一次，不用重新输入。'
  },
  {
    title: '中文输入法',
    text: 'el-input 内部已处理 composition 事件，拼音过程不会触发 input；但如果你自己写原生 input，必须监听 compositionstart/end。'
  }
]

const COMPARE = [
  {
    name: 'remote-input',
    own: true,
    free: '✓ 原样保留',
    fill: 'v-model 文本 + @select 整条',
    state: 'loading / 空态 / 错误 / 重试 / 竞态，全都有',
    fit: '搜不到也必须能填的业务字段（新客户、自定义标签）'
  },
  {
    name: 'el-autocomplete',
    own: false,
    free: '✓',
    fill: 'v-model 文本 + @select 整条',
    state: '只有下拉，状态要自己塞插槽',
    fit: '只要一个提示列表，样式用默认的就够'
  },
  {
    name: 'el-select remote',
    own: false,
    free: '✗（allow-create 例外，值是输入的字符串）',
    fill: 'v-model 是 id，label 自动显示',
    state: '有 loading，无空态/错误态',
    fit: '只能从固定集合里选、后端要 id'
  }
]

export default {
  name: 'RemoteInputDemoPage',

  data() {
    return {
      tab: 'basic',
      CASES,
      COMPARE,

      /* ① */
      form: { name: '', id: null },
      picked: null,
      submitted: '（还没提交）',
      basicLogs: [],

      /* ② */
      edge: { name: '' },
      raceMode: true,
      failMode: false,
      edgeLogs: [],

      /* ③ */
      autoName: '',
      autoId: null,
      selectId: '',
      selectOptions: [],
      selectLoading: false
    }
  },

  methods: {
    metaOf(item) {
      return item.city + ' · ' + item.contact + ' · ' + item.id
    },

    stamp() {
      return new Date().toLocaleTimeString('zh-CN', { hour12: false })
    },

    log(list, kind, text) {
      list.unshift({ id: ++logId, t: this.stamp(), kind, text })
      if (list.length > 40) list.pop()
    },

    /* ---------------- ① ---------------- */

    basicFetch(keyword) {
      return searchCustomers(keyword)
    },

    onBasicSelect(item) {
      this.form.id = item.id
      this.picked = item
      this.log(this.basicLogs, 'ok', '选中「' + item.name + '」→ id ' + item.id)
    },

    onBasicClear() {
      this.form.id = null
      this.picked = null
      this.log(this.basicLogs, 'info', '清空（id 一起置空）')
    },

    /** 选过一条之后又改文字 → 选中作废，id 必须跟着清掉 */
    onBasicInvalidate(e) {
      this.form.id = null
      this.picked = null
      this.log(
        this.basicLogs,
        'warn',
        '文字被改成「' + this.form.name + '」，原选中「' + e.previous + '」作废 → id 置空'
      )
    },

    onBasicEnter(text) {
      this.log(this.basicLogs, 'warn', 'Enter 但没有高亮项：把「' + text + '」当自由输入')
    },

    onBasicResult(e) {
      this.log(
        this.basicLogs,
        e.error ? 'err' : 'info',
        '搜索「' + e.keyword + '」' + (e.error ? '失败：' + e.error : ' → ' + e.count + ' 条 · ' + e.cost + 'ms')
      )
    },

    submit() {
      const payload = {
        name: this.form.name,
        id: this.form.id
      }
      this.submitted = JSON.stringify(payload)
      this.log(
        this.basicLogs,
        payload.name ? 'ok' : 'warn',
        '提交 ' + this.submitted + (payload.name && !payload.id ? '（没有 id，后端要按名称兜底）' : '')
      )
    },

    fillByCode() {
      const target = CUSTOMERS[7] // 深圳市腾讯计算机系统有限公司
      this.form.name = target.name
      this.form.id = target.id
      this.picked = target
      this.log(
        this.basicLogs,
        'info',
        '外部赋值：v-model 改成「' + target.name + '」，注意下拉不会自己弹出来'
      )
    },

    resetForm() {
      this.form.name = ''
      this.form.id = null
      this.picked = null
      this.submitted = '（还没提交）'
      this.basicLogs = []
    },

    /* ---------------- ② ---------------- */

    edgeFetch(keyword) {
      return searchCustomers(keyword, {
        raceMode: this.raceMode,
        fail: this.failMode
      })
    },

    onEdgeSearch(e) {
      this.log(this.edgeLogs, 'info', '发起 #' + e.seq + ' 「' + e.keyword + '」')
    },

    onEdgeResult(e) {
      if (e.dropped) {
        this.log(
          this.edgeLogs,
          'warn',
          '丢弃 #' + e.seq + ' 「' + e.keyword + '」 ' + e.cost + 'ms —— 有更新的请求了，结果不许写回'
        )
        return
      }
      if (e.error) {
        this.log(this.edgeLogs, 'err', '#' + e.seq + ' 「' + e.keyword + '」 失败：' + e.error)
        return
      }
      this.log(
        this.edgeLogs,
        'ok',
        '采用 #' + e.seq + ' 「' + e.keyword + '」 → ' + e.count + ' 条 · ' + e.cost + 'ms'
      )
    },

    onEdgeSelect(item) {
      this.log(this.edgeLogs, 'ok', '选中「' + item.name + '」')
    },

    raceDemo() {
      const el = this.$refs.edge
      if (!el) return
      this.edgeLogs = []
      this.raceMode = true
      el.search('阿里')
      setTimeout(() => el.search('阿里巴巴'), 40)
    },

    /* ---------------- ③ ---------------- */

    fetchSuggestions(queryString, cb) {
      fetchAutoSuggestions(queryString, cb)
    },

    onAutoSelect(item) {
      this.autoId = item.id
    },

    remoteSearch(keyword) {
      if (!keyword) {
        this.selectOptions = []
        return
      }
      this.selectLoading = true
      searchOptions(keyword)
        .then((list) => {
          this.selectOptions = list
        })
        .finally(() => {
          this.selectLoading = false
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.rip {
  padding: 20px 24px 40px;
  background: $bg-color-1;
  min-height: 100vh;
  font-size: $font-m;
  color: $color-3;

  &__head {
    display: flex;
    gap: 24px;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 16px;
    padding: 16px 18px;
    background: $white;
    border-radius: 12px;
    border: 1px solid #e8eef7;
  }
  &__head-main {
    flex: 1 1 420px;
    min-width: 0;
  }
  &__title {
    margin: 0 0 8px;
    font-size: $font-xl;
    font-weight: 600;
    color: $color-0;
  }
  &__desc {
    margin: 0;
    font-size: 13px;
    line-height: 1.75;
    color: $color-6;

    b {
      color: $color-0;
    }
  }
  &__meta {
    flex: 0 0 auto;
    font-size: 12px;
    color: $color-9;
    text-align: right;
    line-height: 2;
    white-space: nowrap;
  }

  code {
    background: #eef3ff;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
    color: #1f4fd8;
  }

  &__grid {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: stretch;

    > .rip__card {
      flex: 1 1 340px;
      min-width: 320px;
    }
  }

  &__card {
    border-radius: 10px;

    ::v-deep .el-card__header {
      padding: 12px 16px;
      background: #fafcff;
    }
    ::v-deep .el-card__body {
      padding: 16px;
    }
  }
  &__card-head {
    display: flex;
    gap: 10px;
    align-items: baseline;
    justify-content: space-between;
    font-size: 13px;
    color: $color-0;
  }
  &__muted {
    font-size: 12px;
    color: $color-9;
  }

  /* 给下拉面板留空间：el-card 是 overflow: hidden，面板会被裁 */
  &__pad {
    min-height: 340px;
  }

  &__field {
    margin-bottom: 14px;
  }
  &__label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: $color-6;
  }
  &__help {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.7;
    color: $color-9;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    font-size: 12px;
    color: $color-6;
  }

  &__actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  &__submitted {
    padding: 10px 12px;
    background: #f7fafd;
    border: 1px dashed #d6e2f5;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.8;
    color: $color-6;
    word-break: break-all;

    code {
      background: transparent;
      padding: 0;
      color: $color-3;
    }
  }
  &__submitted-cap {
    margin-right: 8px;
    color: $color-9;
  }

  &__kv {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    align-items: baseline;
    padding: 7px 0;
    border-bottom: 1px dashed #eef2f7;
    font-size: 12px;
    color: $color-9;

    code {
      background: transparent;
      padding: 0;
      color: $color-3;
      text-align: right;
      word-break: break-all;

      &.is-warn {
        color: #d48a00;
      }
    }
  }

  &__log {
    margin-top: 14px;
  }
  &__log-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: $color-9;
    margin-bottom: 4px;
  }
  &__log-empty {
    padding: 12px 0;
    font-size: 12px;
    color: #b4b8c0;
  }
  &__log-row {
    display: flex;
    gap: 8px;
    padding: 4px 0;
    font-size: 12px;
    line-height: 1.6;
    color: $color-6;
    border-bottom: 1px dotted #f0f3f8;

    &.is-ok {
      color: #1f8f4e;
    }
    &.is-warn {
      color: #d48a00;
    }
    &.is-err {
      color: $red-color;
    }
  }
  &__log-t {
    flex: 0 0 auto;
    color: #b4b8c0;
    font-variant-numeric: tabular-nums;
  }

  &__note {
    margin: 16px 0 0;
    padding: 12px 14px;
    background: #f2f7ff;
    border-left: 3px solid $color-primary;
    border-radius: 0 8px 8px 0;
    font-size: 12px;
    line-height: 1.8;
    color: $color-6;

    b {
      color: $color-0;
    }
  }

  &__cases {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  &__case {
    flex: 1 1 220px;
    min-width: 200px;
    padding: 12px 14px;
    background: $white;
    border: 1px solid #e8eef7;
    border-radius: 8px;

    b {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      color: $color-0;
    }
    p {
      margin: 0;
      font-size: 12px;
      line-height: 1.75;
      color: $color-6;
    }
  }

  &__table {
    width: 100%;
    margin-top: 16px;
    border-collapse: collapse;
    background: $white;
    font-size: 12px;
    color: $color-6;

    th,
    td {
      border: 1px solid #e8eef7;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      line-height: 1.7;
    }
    th {
      background: #f7fafd;
      color: $color-0;
      font-weight: 600;
    }
    tr.is-own td {
      background: #f6f9ff;
    }
    code {
      font-size: 12px;
    }
  }
}
</style>
