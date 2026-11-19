<template>
  <div v-loading="loading" class="vsx" element-loading-text="正在生成并挂载…">
    <h2 class="vsx__hd">性能版滚动 · 500 条不分页</h2>
    <p class="vsx__tip">
      同一份数据、同一个视口（420px），四种渲染方式并排跑。<br />
      虚拟滚动不是「把数据变少」，是<strong>只把看得见的那几行放进 DOM</strong>：滚动时不断换内容、
      复用同一批节点，所以 500 条和 5 万条的 DOM 数一样。 关键是三个数：
      <b>DOM 元素数</b>（内存与样式计算）、<b>挂载耗时</b>（打开页面的第一下）、
      <b>滚动帧间隔</b>（卡不卡）。<br />
      说实话：500 条时全量渲染也不太卡，切到
      <code>2 000</code> / <code>10 000</code> 再点压测，差距才明显。
    </p>

    <!-- ================= 控制台 ================= -->
    <el-card shadow="never" class="vsx__card">
      <div slot="header">控制台 · 换数据量会重新生成数据并重挂四块，指标同时清空</div>

      <div class="vsx-ctrl">
        <label class="vsx-ctrl__f">
          <span>数据量</span>
          <el-radio-group v-model="size" size="mini" @change="reload">
            <el-radio-button :label="500">500</el-radio-button>
            <el-radio-button :label="2000">2 000</el-radio-button>
            <el-radio-button :label="10000">10 000</el-radio-button>
          </el-radio-group>
        </label>

        <label class="vsx-ctrl__f">
          <span>Object.freeze</span>
          <el-switch v-model="freeze" @change="reload"></el-switch>
        </label>

        <label class="vsx-ctrl__f">
          <span>压测时隔离全量块</span>
          <el-switch v-model="isolate"></el-switch>
        </label>

        <el-button size="mini" type="primary" :loading="!!busy" @click="benchAll">
          四块依次压测
        </el-button>
        <el-button size="mini" @click="reload">重新生成</el-button>
        <el-button size="mini" @click="resetMetrics">清空指标</el-button>
      </div>

      <p class="vsx__tip vsx__tip--inline">
        把 {{ size }} 条数据变成响应式花了
        <b class="vsx__num">{{ reactiveMs == null ? '—' : reactiveMs + ' ms' }}</b>
        （Vue 2 会递归给每个字段装 getter/setter，{{ size }} 条 × 8 字段）。
        <template v-if="freeze">
          当前已 <code>Object.freeze</code>：Vue 检测到对象不可扩展会整段跳过，纯只读列表值得这么干。
        </template>
        <template v-else>
          当前<strong>没冻结</strong>：这就是为什么大列表初始化会先卡一下 —— 卡的不是渲染，是劫持。
        </template>
      </p>
    </el-card>

    <!-- ================= 指标 ================= -->
    <el-card shadow="never" class="vsx__card">
      <div slot="header">
        指标 · 点「压测」会以每帧 80px 连滚 100 帧（约 1.7s、8000px，速度≈快速拖滚动条），边滚边采样帧间隔
      </div>
      <el-table :data="metricRows" size="mini" border class="vsx-table" :formatter="fmtCell">
        <el-table-column prop="name" label="方案" min-width="200" align="left"></el-table-column>
        <el-table-column prop="rows" label="渲染行数" width="100" align="right"></el-table-column>
        <el-table-column prop="dom" label="DOM 元素" width="100" align="right"></el-table-column>
        <el-table-column prop="mount" label="挂载 ms" width="100" align="right"></el-table-column>
        <el-table-column prop="avg" label="平均帧 ms" width="110" align="right"></el-table-column>
        <el-table-column prop="max" label="最长帧 ms" width="110" align="right"></el-table-column>
        <el-table-column prop="fps" label="约 FPS" width="90" align="right"></el-table-column>
      </el-table>
      <p class="vsx__tip vsx__tip--inline">
        平均帧 16.7ms = 60fps 满帧；超过 33ms 就是肉眼可见的顿。
        「挂载 ms」是 DOM 插进去 + 强制读一次布局的耗时，不含接口。
        数字偏小是因为本机是 M 系列 + 无节流，真机（尤其低端安卓）会放大 3~5 倍。
      </p>
      <p class="vsx__tip vsx__tip--inline vsx__tip--warn">
        上面这个开关很关键，别关掉再下结论：本机实测 10 000 条时，①④ 各留 1 万行在页面上
        （8 万个元素），虚拟列表的帧间隔会从 <b>16.7ms 涨到 30ms 以上</b>，
        而它自己只渲染 21 行 —— 慢的是<strong>整页合成</strong>，不是它。
        所以压测默认先把 ①④ 临时卸载，测完再挂回来；关掉这个开关就能亲眼看到「邻居拖累」。
      </p>
    </el-card>

    <!-- ================= 四块对照 ================= -->
    <div class="vsx-grid">
      <!-- ① 全量 -->
      <el-card shadow="never" class="vsx__card">
        <div slot="header" class="vsx-card__hd">
          <span>① 全量渲染 · {{ size }} 条全进 DOM</span>
          <span class="vsx-card__ops">
            <el-button type="text" size="mini" @click="bench('full')">压测</el-button>
            <el-button type="text" size="mini" @click="mountOne('full')">重挂载</el-button>
          </span>
        </div>
        <div ref="box-full" class="vsx-box vsx-box--scroll">
          <ul v-if="shown.full" class="vsx-list">
            <li v-for="(it, i) in rows" :key="it.id" class="vrow vsx-row">
              <span class="vsx-row__no">{{ i + 1 }}</span>
              <span class="vsx-row__name">{{ it.name }}</span>
              <span class="vsx-row__dept">{{ it.dept }}</span>
              <span class="vsx-row__title">{{ it.title }}</span>
              <span class="vsx-row__tags">
                <em v-for="t in it.tags" :key="t" class="vsx-row__tag">{{ t }}</em>
              </span>
              <span class="vsx-row__time">{{ it.time }}</span>
            </li>
          </ul>
        </div>
        <p class="vsx-card__note">
          原始写法。<code>v-for</code> 一个不少，DOM 行数 = 数据条数，内存和样式计算都跟着涨。
        </p>
      </el-card>

      <!-- ② 虚拟 · 固定行高 -->
      <el-card shadow="never" class="vsx__card">
        <div slot="header" class="vsx-card__hd">
          <span>② 虚拟滚动 · 固定行高</span>
          <span class="vsx-card__ops">
            <el-button type="text" size="mini" @click="bench('fixed')">压测</el-button>
            <el-button type="text" size="mini" @click="mountOne('fixed')">重挂载</el-button>
          </span>
        </div>
        <div ref="box-fixed" class="vsx-box vsx-box--hidden">
          <virtual-scroll
            v-if="shown.fixed"
            :items="rows"
            :item-height="48"
            height="100%"
            :buffer="6"
            @range-change="onRange('fixed', $event)"
          >
            <template #default="{ item, index }">
              <div class="vrow vsx-row">
                <span class="vsx-row__no">{{ index + 1 }}</span>
                <span class="vsx-row__name">{{ item.name }}</span>
                <span class="vsx-row__dept">{{ item.dept }}</span>
                <span class="vsx-row__title">{{ item.title }}</span>
                <span class="vsx-row__tags">
                  <em v-for="t in item.tags" :key="t" class="vsx-row__tag">{{ t }}</em>
                </span>
                <span class="vsx-row__time">{{ item.time }}</span>
              </div>
            </template>
          </virtual-scroll>
        </div>
        <p class="vsx-card__note">
          当前渲染
          <b class="vsx__num">{{ ranges.fixed.rendered || 0 }}</b> 条（第
          {{ (ranges.fixed.start || 0) + 1 }}–{{ ranges.fixed.end || 0 }} 条），共 {{ size }} 条。
          <code>start = floor(scrollTop / 48) - buffer</code>，一个除法搞定。
        </p>
      </el-card>

      <!-- ③ 虚拟 · 动态行高 -->
      <el-card shadow="never" class="vsx__card">
        <div slot="header" class="vsx-card__hd">
          <span>③ 虚拟滚动 · 动态行高</span>
          <span class="vsx-card__ops">
            <el-button type="text" size="mini" @click="bench('dynamic')">压测</el-button>
            <el-button type="text" size="mini" @click="mountOne('dynamic')">重挂载</el-button>
          </span>
        </div>
        <div ref="box-dynamic" class="vsx-box vsx-box--hidden">
          <virtual-scroll-dynamic
            v-if="shown.dynamic"
            :items="rows"
            height="100%"
            height-key="estHeight"
            :estimated-height="88"
            :buffer="4"
            @range-change="onRange('dynamic', $event)"
          >
            <template #default="{ item, index }">
              <div class="vrow vsx-drow">
                <span class="vsx-drow__no">{{ index + 1 }}</span>
                <div class="vsx-drow__main">
                  <div class="vsx-drow__t">
                    {{ item.name }} · {{ item.title }}
                    <em class="vsx-drow__dept">{{ item.dept }}</em>
                  </div>
                  <div class="vsx-drow__c">{{ item.content }}</div>
                  <div class="vsx-drow__m">
                    <em v-for="t in item.tags" :key="t" class="vsx-row__tag">{{ t }}</em>
                    <span class="vsx-drow__time">{{ item.time }}</span>
                  </div>
                </div>
              </div>
            </template>
          </virtual-scroll-dynamic>
        </div>
        <p class="vsx-card__note">
          内容长短不一，位置算不出来只能记账。当前渲染
          <b class="vsx__num">{{ ranges.dynamic.rendered || 0 }}</b> 条，其中已实测
          <b class="vsx__num">{{ ranges.dynamic.measured || 0 }}</b> 条 ——
          没滚到的地方用 <code>estHeight</code> 估，滚过一次就记下来。
        </p>
      </el-card>

      <!-- ④ content-visibility -->
      <el-card shadow="never" class="vsx__card">
        <div slot="header" class="vsx-card__hd">
          <span>④ 全量 + <code>content-visibility: auto</code></span>
          <span class="vsx-card__ops">
            <el-button type="text" size="mini" @click="bench('cv')">压测</el-button>
            <el-button type="text" size="mini" @click="mountOne('cv')">重挂载</el-button>
          </span>
        </div>
        <div ref="box-cv" class="vsx-box vsx-box--scroll">
          <ul v-if="shown.cv" class="vsx-list">
            <li
              v-for="(it, i) in rows"
              :key="it.id"
              class="vrow vsx-row vsx-row--cv"
            >
              <span class="vsx-row__no">{{ i + 1 }}</span>
              <span class="vsx-row__name">{{ it.name }}</span>
              <span class="vsx-row__dept">{{ it.dept }}</span>
              <span class="vsx-row__title">{{ it.title }}</span>
              <span class="vsx-row__tags">
                <em v-for="t in it.tags" :key="t" class="vsx-row__tag">{{ t }}</em>
              </span>
              <span class="vsx-row__time">{{ it.time }}</span>
            </li>
          </ul>
        </div>
        <p class="vsx-card__note">
          两行 CSS，DOM 还是 {{ size }} 个（<b>内存没省</b>），省的是离屏行的布局和绘制。
          <template v-if="cvSupported">当前浏览器支持。</template>
          <template v-else>⚠️ 当前浏览器不支持，这块等同于 ①。</template>
          懒、但到底了还是得全量渲染 —— 数据继续涨就撑不住了。
        </p>
      </el-card>
    </div>

    <p class="vsx__tip vsx__tip--foot">
      选型口诀：<b>行高固定 == 用 ②</b>；<b>内容长短不一 == 用 ③</b>（并尽量让接口带回预估高度）；
      <b>列表是静态展示、还要浏览器 Ctrl+F 能搜到 == ④</b>；
      数据量可控（几百条）且要最简单 == ①。虚拟滚动的代价是
      <code>Ctrl+F</code> 搜不到未渲染的内容、<code>find-in-page</code> 失效、屏幕阅读器读不全，
      以及「滚动位置要靠算」带来的一堆边界问题。
    </p>
  </div>
</template>

<script>
import { makeRows } from './mockData'

const KEYS = ['full', 'fixed', 'dynamic', 'cv']
// 挂载顺序和展示顺序故意不同：先把两块虚拟列表挂上（页面上只有几十行，环境干净），
// 再挂 ①④ 的全量列表。反过来的话，① 的 1 万行会让 ② 的「挂载 ms」凭空多出 30 多 ms
// —— 那次布局是邻居的开销，不该算在虚拟滚动头上。
const MOUNT_ORDER = ['fixed', 'dynamic', 'cv', 'full']
const NAMES = {
  full: '① 全量渲染',
  fixed: '② 虚拟滚动 · 固定行高',
  dynamic: '③ 虚拟滚动 · 动态行高',
  cv: '④ 全量 + content-visibility'
}

function blankMetric() {
  return { mount: null, avg: null, max: null, fps: null, rows: 0, dom: 0 }
}

function blankMetrics() {
  return { full: blankMetric(), fixed: blankMetric(), dynamic: blankMetric(), cv: blankMetric() }
}

export default {
  name: 'VirtualScrollDemoPage',

  data() {
    return {
      size: 500,
      freeze: true,
      rows: [],
      reactiveMs: null,
      loading: false,
      // 正在压测的方案 key
      busy: '',
      // 压测时临时卸载 ①④（1 万行 × 2 的邻居会把整页合成拖慢）
      isolate: true,
      cvSupported: true,
      // 四块是否挂载中（不要叫 mounted，和生命周期钩子同名，读代码的人会疯）
      shown: { full: false, fixed: false, dynamic: false, cv: false },
      metrics: blankMetrics(),
      ranges: {
        fixed: { start: 0, end: 0, rendered: 0, total: 0, measured: 0 },
        dynamic: { start: 0, end: 0, rendered: 0, total: 0, measured: 0 }
      }
    }
  },

  computed: {
    metricRows() {
      return KEYS.map((key) => {
        const m = this.metrics[key]
        return {
          key: key,
          name: NAMES[key],
          rows: m.rows,
          dom: m.dom,
          mount: m.mount,
          avg: m.avg,
          max: m.max,
          fps: m.fps
        }
      })
    }
  },

  created() {
    this._alive = true
  },

  mounted() {
    this.cvSupported =
      typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        ? CSS.supports('content-visibility', 'auto')
        : false
    this.reload()
  },

  beforeDestroy() {
    this._alive = false
  },

  methods: {
    // ---- 数据 ----

    /**
     * 重新生成数据 → 四块卸载 → 逐个挂载并计时
     * 之所以整轮重来，是因为「挂载耗时」只有在从零插入时才有意义。
     */
    async reload() {
      this.loading = true
      this.busy = ''
      this.shown = { full: false, fixed: false, dynamic: false, cv: false }
      await this.$nextTick()

      const raw = makeRows(this.size)
      // Vue 2 的 observe() 遇到不可扩展对象会直接 return，等于跳过整个递归劫持
      const t0 = performance.now()
      this.rows = this.freeze ? Object.freeze(raw) : raw
      this.reactiveMs = +(performance.now() - t0).toFixed(1)

      this.metrics = blankMetrics()
      this.ranges = {
        fixed: { start: 0, end: 0, rendered: 0, total: 0, measured: 0 },
        dynamic: { start: 0, end: 0, rendered: 0, total: 0, measured: 0 }
      }
      await this.$nextTick()

      for (let i = 0; i < MOUNT_ORDER.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await this.mountOne(MOUNT_ORDER[i])
      }

      this.loading = false
    },

    /** 挂一块并测「插入 DOM + 首次布局」的耗时 */
    async mountOne(key) {
      if (!this._alive) return
      const t0 = performance.now()
      this.shown = Object.assign({}, this.shown, { [key]: true })
      await this.$nextTick()
      const box = this.$refs['box-' + key]
      if (box) {
        // 读一次布局属性，把浏览器的 lazy layout 逼出来，否则测到的只是建 vnode 的时间
        void box.offsetHeight
      }
      const cost = performance.now() - t0
      if (!this._alive) return
      this.metrics[key].mount = +cost.toFixed(1)
      this.collect(key)
    },

    // ---- 指标 ----

    /** 数这一块里真实存在的行数和元素数 */
    collect(key) {
      const box = this.$refs['box-' + key]
      if (!box) return
      const m = this.metrics[key]
      m.rows = box.querySelectorAll('.vrow').length
      m.dom = box.querySelectorAll('*').length
    },

    resetMetrics() {
      const fresh = blankMetrics()
      this.metrics = fresh
      this.$nextTick(() => {
        KEYS.forEach((key) => {
          if (this.shown[key]) this.collect(key)
        })
      })
    },

    fmtCell(row, column, value) {
      if (value === null || value === undefined || value === '') return '—'
      return value
    },

    onRange(key, e) {
      this.ranges[key] = e
    },

    // ---- 压测 ----

    /** 找这一块的滚动容器：虚拟滚动的滚动条在组件内部，全量/④ 就是外层盒子 */
    scrollerOf(key) {
      const box = this.$refs['box-' + key]
      if (!box) return null
      return (
        box.querySelector('.vsc__scroller') ||
        box.querySelector('.vsd__scroller') ||
        box
      )
    },

    nextFrame() {
      return new Promise((resolve) => requestAnimationFrame(() => resolve()))
    },

    /**
     * 压测：固定速度滚动，逐帧记录「这一帧到上一帧隔了多久」。
     *
     * 为什么不按「固定时长滚到底」来：
     *   1 万条时列表总高 48 万 px，900ms 滚完意味着每帧跳 9000px ≈ 185 行，
     *   一帧把整屏内容全换掉 —— 那不是用户在滚，是按键翻页 ×20，
     *   测出来的是「跳跃渲染」的成本，不是滚动的成本。
     *   所以改成每帧固定 80px（约 2 行，接近快速拖滚动条），连滚 100 帧。
     *   各数据量、各方案滚过的距离完全一样，横向才可比。
     */
    async bench(key) {
      if (this.busy && this.busy !== key) return
      const sc = this.scrollerOf(key)
      if (!sc) return

      this.busy = key

      // ①④ 各有 1 万行（8 万个元素）时，整页合成会被拖慢，虚拟列表也跟着掉帧。
      // 那是「邻居」的成本，不该记到虚拟滚动头上 —— 压测时先摘掉，测完挂回来。
      const paused = []
      if (this.isolate) {
        ['full', 'cv'].forEach((k) => {
          if (k !== key && this.shown[k]) {
            paused.push(k)
            this.shown = Object.assign({}, this.shown, { [k]: false })
          }
        })
        if (paused.length) await this.$nextTick()
      }

      const backTop = sc.scrollTop
      const m = this.metrics[key]

      try {
        sc.scrollTop = 0
        await this.$nextTick()
        // 首屏先渲染完再开始计时，否则第一帧把挂载成本算进去了
        await this.nextFrame()
        await this.nextFrame()

        const STEP = 80
        const MAX_FRAMES = 100
        const maxScroll = Math.max(0, sc.scrollHeight - sc.clientHeight)
        const target = Math.min(maxScroll, STEP * MAX_FRAMES)
        const gaps = []
        let frame = 0

        await new Promise((resolve) => {
          let last = performance.now()
          const tick = (ts) => {
            if (!this._alive) return resolve()
            gaps.push(ts - last)
            last = ts
            frame++
            sc.scrollTop = Math.min(target, frame * STEP)
            if (frame < MAX_FRAMES && frame * STEP < target) requestAnimationFrame(tick)
            else resolve()
          }
          requestAnimationFrame(tick)
        })

        if (!this._alive) return

        // 第一帧包含前面两帧的间隔噪声，丢掉
        const usable = gaps.slice(1)
        const sum = usable.reduce((a, b) => a + b, 0)
        const avg = usable.length ? sum / usable.length : 0
        const maxGap = usable.length ? Math.max.apply(null, usable) : 0

        m.avg = +avg.toFixed(1)
        m.max = +maxGap.toFixed(1)
        m.fps = avg > 0 ? Math.round(1000 / avg) : 0
        this.collect(key)

        sc.scrollTop = backTop
      } finally {
        if (paused.length && this._alive) {
          const back = {}
          paused.forEach((k) => {
            back[k] = true
          })
          this.shown = Object.assign({}, this.shown, back)
        }
        this.busy = ''
      }
    },

    async benchAll() {
      if (this.busy) return
      for (let i = 0; i < KEYS.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await this.bench(KEYS[i])
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.vsx {
  padding: 4px 0 40px;

  &__hd {
    margin: 0 0 10px;
    font-size: 20px;
    font-weight: 600;
    color: #1f2329;
  }

  &__tip {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.9;
    color: #646a73;

    &--inline {
      margin: 12px 0 0;
    }

    &--warn {
      padding: 10px 12px;
      color: #8a6410;
      background: #fff9e8;
      border-left: 3px solid #faad14;
      border-radius: 4px;
    }

    &--foot {
      margin: 16px 0 0;
      padding: 12px 14px;
      background: #f7f8fa;
      border-left: 3px solid #326fff;
      border-radius: 4px;
    }

    code {
      padding: 1px 5px;
      font-size: 12px;
      color: #326fff;
      background: rgba(50, 111, 255, 0.08);
      border-radius: 3px;
    }
  }

  &__num {
    color: #326fff;
    font-weight: 600;
  }

  &__card {
    margin-bottom: 16px;
    border-radius: 6px;

    ::v-deep .el-card__header {
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #1f2329;
    }
  }

  &__table {
    // 7 列都是固定宽，不掐一下「方案」列会撑到 800px，表格看着很散
    max-width: 1080px;
    font-size: 12px;
  }
}

/* 控制台一行排开，窄屏换行 */
.vsx-ctrl {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;

  &__f {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #646a73;

    > span {
      white-space: nowrap;
    }
  }
}

/* 四块对照：宽屏两列，窄屏一列 */
.vsx-grid {
  display: grid;
  /* 620 起：1440 宽下正好两列。460 会挤成三列，行内标题会被压成「接…」 */
  grid-template-columns: repeat(auto-fit, minmax(620px, 1fr));
  gap: 16px;

  .vsx__card {
    margin-bottom: 0;
  }
}

.vsx-card {
  &__hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    > span:first-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    code {
      font-size: 12px;
      color: #326fff;
    }
  }

  &__ops {
    flex: none;
    display: flex;
    gap: 4px;

    ::v-deep .el-button {
      padding: 0 4px;
      font-size: 12px;
    }
  }

  &__note {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.8;
    color: #8f959e;

    code {
      padding: 1px 4px;
      color: #326fff;
      background: rgba(50, 111, 255, 0.08);
      border-radius: 3px;
    }
  }
}

/* 视口盒子：虚拟滚动的滚动条在组件内部，所以这里不能自己也滚 */
.vsx-box {
  height: 420px;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  background: #fff;

  &--scroll {
    overflow-y: auto;
    overflow-x: hidden;
  }

  &--hidden {
    overflow: hidden;
  }
}

.vsx-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 单行方案：48px，正好等于 item-height */
.vsx-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 12px;
  box-sizing: border-box;
  border-bottom: 1px solid #f2f3f5;
  font-size: 12px;
  color: #1f2329;

  &__no {
    flex: none;
    width: 38px;
    color: #bbb;
    font-variant-numeric: tabular-nums;
  }

  &__name {
    flex: none;
    width: 66px;
    font-weight: 600;
  }

  &__dept {
    flex: none;
    width: 72px;
    color: #646a73;
  }

  &__title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__tags {
    flex: none;
    display: flex;
    gap: 4px;
  }

  &__tag {
    padding: 0 5px;
    font-style: normal;
    font-size: 11px;
    line-height: 17px;
    color: #326fff;
    background: rgba(50, 111, 255, 0.08);
    border-radius: 3px;
  }

  &__time {
    flex: none;
    width: 104px;
    white-space: nowrap;
    text-align: right;
    color: #bbb;
    font-variant-numeric: tabular-nums;
  }

  /* ④ 的两行 CSS：离屏行跳过渲染，但节点还在 */
  &--cv {
    content-visibility: auto;
    contain-intrinsic-size: auto 48px;
  }
}

/* 动态行高方案的行：内容自然撑开，别设 height */
.vsx-drow {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #f2f3f5;
  font-size: 12px;
  color: #1f2329;

  &__no {
    flex: none;
    width: 42px;
    color: #bbb;
    font-variant-numeric: tabular-nums;
  }

  &__main {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__t {
    font-weight: 600;
    line-height: 20px;
  }

  &__dept {
    margin-left: 6px;
    font-style: normal;
    font-weight: 400;
    color: #8f959e;
  }

  &__c {
    margin-top: 2px;
    font-size: 12px;
    line-height: 20px;
    color: #646a73;
    word-break: break-all;
  }

  &__m {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    line-height: 18px;
  }

  &__time {
    margin-left: auto;
    white-space: nowrap;
    color: #bbb;
    font-variant-numeric: tabular-nums;
  }
}
</style>
