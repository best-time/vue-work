<template>
  <div class="vsc" :style="wrapStyle">
    <div ref="scroller" class="vsc__scroller" @scroll.passive="onScroll">
      <!--
        占位层负责撑出「完整列表」的滚动高度，让滚动条长度和真实列表一致。
        width 必须是 100%：它是滚动容器里唯一在文档流里的子元素，
        脱离文档流的 list 不贡献高度。
      -->
      <div class="vsc__phantom" :style="{ height: totalHeight + 'px' }"></div>

      <!--
        只渲染 [start, end) 这一段，再把它摆到该在的位置。
        ⚠️ 这里的位置**故意不写 :style**，由 syncTransform() 直接改 DOM：
        包含块是 scroller（见 style 里的 position: relative），列表会跟着容器一起滚，
        所以每帧都要用 scrollTop 补偿。走 Vue 的话，每帧都得重渲染 21 行，
        而我们其实只需要改一个 transform。
      -->
      <div ref="list" class="vsc__list">
        <div
          v-for="row in visibleRows"
          :key="row.key"
          class="vsc__item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="row.item" :index="row.index"></slot>
        </div>
      </div>
    </div>

    <div v-if="!count" class="vsc__empty">
      <slot name="empty">暂无数据</slot>
    </div>
  </div>
</template>

<script>
/**
 * VirtualScroll —— 固定行高虚拟滚动
 *
 * 解决的问题：div 里 500 / 5000 / 20000 条数据，不分页、不删数据，
 * 但 DOM 里永远只有「一屏 + 上下缓冲」那么多行。
 *
 * 三个关键点
 * ---------
 * 1. 位置靠算：start = floor(scrollTop / itemHeight) - buffer，
 *    固定行高时这一步是 O(1) 除法，不需要遍历、不需要测量。
 * 2. 高度靠撑：一个 phantom 元素把滚动高度撑到 n * itemHeight，
 *    否则滚动条只有一屏长，根本没得滚。
 * 3. 更新靠闸门：scroll 回调走 rAF（一帧最多算一次），
 *    并且只有 start/end 真的变了才 setData —— 滚动 60 次但区间没变，
 *    就一次渲染都不做。
 * 4. 定位靠 transform：list 的 transform = start * itemHeight，
 *    表示「第一行在内容坐标系里的位置」，滚动量由浏览器自己扣。
 *    ⚠️ 前提是 list 的包含块就是 scroller（scroller 必须 position: relative），
 *    否则浏览器按包含块链找滚动目标会跳过它，表现是「拖动滚动条能滚、滚轮滚不动」。
 *
 * ⚠️ 行高必须固定（或至少同一屏内一致）。内容长短不一请用 VirtualScrollDynamic。
 *
 * 用法：
 *   <virtual-scroll :items="rows" :item-height="48" height="420px" :buffer="6">
 *     <template #default="{ item, index }">
 *       <div class="row">{{ index }} - {{ item.name }}</div>
 *     </template>
 *   </virtual-scroll>
 */
export default {
  name: 'VirtualScroll',

  props: {
    items: { type: Array, default: function () { return [] } },
    // 每一行的固定高度（px）
    itemHeight: { type: Number, default: 48 },
    // 视口高度：数字按 px，字符串原样透传（'420px' / '60vh' / '100%'）
    height: { type: [Number, String], default: 400 },
    // 上下各多渲染几条，避免快速滚动时白屏
    buffer: { type: Number, default: 6 },
    // 取 key 的字段名，或 (item, index) => key
    itemKey: { type: [String, Function], default: 'id' }
  },

  data() {
    return {
      start: 0,
      end: 0,
      scrollTop: 0,
      // 视口高要实测：height 可能是 '100%'，prop 里拿不到像素值
      viewport: 0
    }
  },

  computed: {
    count() {
      return this.items.length
    },
    totalHeight() {
      return this.count * this.itemHeight
    },
    wrapStyle() {
      return {
        height: typeof this.height === 'number' ? this.height + 'px' : this.height
      }
    },
    visibleRows() {
      const out = []
      const items = this.items
      const total = items.length
      // items 变了但 start/end 要等 nextTick 才刷新，这中间 render 会读到越界下标。
      // 渲染函数里抛错整棵组件树都会挂，所以这里必须按当前长度夹一次。
      const start = Math.min(this.start, total)
      const end = Math.min(this.end, total)
      for (let i = start; i < end; i++) {
        const item = items[i]
        out.push({
          index: i,
          item: item,
          key: this.keyOf(item, i)
        })
      }
      return out
    }
  },

  watch: {
    // 换了一批数据（引用变）或追加了数据（长度变）都要重算
    items: function () {
      this.$nextTick(this.refresh)
    },
    'items.length': function () {
      this.$nextTick(this.refresh)
    },
    itemHeight: function () {
      this.refresh()
    },
    height: function () {
      this.$nextTick(this.refresh)
    }
  },

  mounted() {
    this.refresh()
    this.watchSize()
  },

  // 区间变了 → Vue 换完 DOM 再摆一次位置（rAF 里设的那次用的是新 start、旧内容）
  updated() {
    this.syncTransform()
  },

  beforeDestroy() {
    if (this._raf) cancelAnimationFrame(this._raf)
    if (this._endTimer) clearTimeout(this._endTimer)
    if (this._resizeObs) {
      this._resizeObs.disconnect()
      this._resizeObs = null
    }
  },

  methods: {
    keyOf(item, index) {
      const key = this.itemKey
      if (typeof key === 'function') return key(item, index)
      if (item && item[key] != null) return item[key]
      // 没 key 就退回下标：固定行高场景下下标是稳定的
      return index
    },

    /** 视口高度可能由 CSS 决定（height="100%"），必须实测 */
    measureViewport() {
      const el = this.$refs.scroller
      if (el) {
        this.viewport = el.clientHeight
      } else if (typeof this.height === 'number') {
        this.viewport = this.height
      } else {
        this.viewport = 400
      }
    },

    /** 全量重算：用在挂载、数据变化、容器尺寸变化 */
    refresh() {
      const el = this.$refs.scroller
      this.measureViewport()
      this.scrollTop = el ? el.scrollTop : 0
      this.computeRange(true)
      this.syncTransform()
    },

    /**
     * 把渲染出来的这一段摆到它该在的位置。
     *
     * list 的包含块是 scroller，容器滚动时它会像普通内容一样跟着走，
     * 所以这里只要给出「第一行的内容坐标」= start * itemHeight，滚动量由浏览器自己扣。
     * 区间没变就不写 DOM（滚动过程中 99% 的帧都属于这种情况）。
     *
     * 直接写 style 而不是绑 :style：每帧走 Vue 要重渲染 21 行，实际只需要改一个字符串。
     */
    syncTransform() {
      const el = this.$refs.list
      if (!el) return
      const y = Math.min(this.start, this.count) * this.itemHeight
      if (el.__vscY === y) return
      el.__vscY = y
      el.style.transform = 'translate3d(0,' + y + 'px,0)'
    },

    /**
     * 核心：算出这一屏该渲染哪几条
     * @param {boolean} force 区间没变也 emit（挂载/重置时用）
     */
    computeRange(force) {
      const total = this.count
      const per = this.itemHeight || 1
      const vh = this.viewport || 400

      if (!total) {
        const changed = this.start !== 0 || this.end !== 0
        this.start = 0
        this.end = 0
        if (changed || force) this.emitRange()
        return
      }

      const viewCount = Math.max(1, Math.ceil(vh / per))
      const span = Math.min(total, viewCount + this.buffer * 2)
      // start 的上界：保证末尾不会渲染出半屏空白
      const maxStart = Math.max(0, total - span)

      let start = Math.floor(this.scrollTop / per) - this.buffer
      start = Math.max(0, Math.min(start, maxStart))
      const end = Math.min(total, start + span)

      if (force || start !== this.start || end !== this.end) {
        this.start = start
        this.end = end
        this.emitRange()
      }
    },

    emitRange() {
      this.$emit('range-change', {
        start: this.start,
        end: this.end,
        rendered: this.end - this.start,
        total: this.count
      })
    },

    /** scroll 一秒能来几十上百次，一帧只处理一次 */
    onScroll() {
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          this._raf = 0
          const el = this.$refs.scroller
          if (!el) return
          this.scrollTop = el.scrollTop
          this.computeRange()
          this.syncTransform()
        })
      }
      // 滚停 140ms 算一次「滚动结束」，给外部做懒加载 / 埋点用
      if (this._endTimer) clearTimeout(this._endTimer)
      this._endTimer = setTimeout(() => {
        this.$emit('scroll-end', { scrollTop: this.scrollTop })
      }, 140)
    },

    // ---- 对外方法 ----

    /**
     * 滚到第 index 条
     * @param {number} index
     * @param {'start'|'center'|'end'} align 对齐方式
     */
    scrollToIndex(index, align) {
      const el = this.$refs.scroller
      if (!el) return
      const per = this.itemHeight
      const maxTop = Math.max(0, this.totalHeight - el.clientHeight)
      let top = index * per
      if (align === 'center') top -= (el.clientHeight - per) / 2
      else if (align === 'end') top -= el.clientHeight - per
      el.scrollTop = Math.max(0, Math.min(top, maxTop))
      this.refresh()
    },

    scrollToTop() {
      const el = this.$refs.scroller
      if (!el) return
      el.scrollTop = 0
      this.refresh()
    },

    /** 调试/演示用：拿当前渲染区间与 DOM 行数 */
    getMetrics() {
      const el = this.$refs.scroller
      return {
        total: this.count,
        start: this.start,
        end: this.end,
        rendered: this.end - this.start,
        domRows: el ? el.children.length : 0,
        scrollTop: this.scrollTop,
        viewport: this.viewport
      }
    },

    /** 容器尺寸变化（窗口缩放、父级折叠展开）时视口高会变，区间要重算 */
    watchSize() {
      if (typeof ResizeObserver === 'undefined') return
      const el = this.$refs.scroller
      if (!el) return
      this._resizeObs = new ResizeObserver(() => this.refresh())
      this._resizeObs.observe(el)
    }
  }
}
</script>

<style lang="scss" scoped>
.vsc {
  position: relative;
  width: 100%;

  &__scroller {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    // 滚到底不要带着外层页面一起滚
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    // ⚠️ 必须是 relative：list 是 absolute，如果 scroller 是 static，
    // 它的包含块会跑到更外层去，于是「列表在布局上不在滚动容器里」——
    // 滚轮/触摸板按包含块链找滚动目标，会直接跳过这个容器去滚页面。
    // 表现就是「滚动条能拖，但滚轮怎么滚都不动」。
    position: relative;
  }

  &__phantom {
    width: 100%;
    pointer-events: none;
  }

  &__list {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    will-change: transform;
  }

  &__item {
    box-sizing: border-box;
    overflow: hidden;
    // 行内变化（hover、改文字）只影响这一行，不牵连整张列表
    contain: layout paint;
  }

  &__empty {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;
    font-size: 13px;
  }
}
</style>
