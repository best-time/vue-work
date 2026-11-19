<template>
  <div class="vsd" :style="wrapStyle">
    <div ref="scroller" class="vsd__scroller" @scroll.passive="onScroll">
      <div class="vsd__phantom" :style="{ height: totalHeight + 'px' }"></div>

      <!--
        每行的 top 都不一样，所以逐行绝对定位。
        行本身不设 height，让内容自然撑开 —— 测量到的才是真实高度。
        行用 top 定位、list 不位移 —— 包含块是 scroller，内容会跟着容器自然滚动。
      -->
      <div ref="list" class="vsd__list">
        <div
          v-for="row in visibleRows"
          :key="row.key"
          class="vsd__item"
          :style="{ top: row.top + 'px' }"
        >
          <slot :item="row.item" :index="row.index"></slot>
        </div>
      </div>
    </div>

    <div v-if="!count" class="vsd__empty">
      <slot name="empty">暂无数据</slot>
    </div>
  </div>
</template>

<script>
/**
 * VirtualScrollDynamic —— 动态行高虚拟滚动
 *
 * 和固定行高版的区别只有一个：位置算不出来，得记账。
 *
 *   positions[i] = { top, height }   // 每一项的起点和高度
 *
 * 三个必须自己补的坑
 * ----------------
 * 1. 没渲染过的行不知道高度 → 用预估（item[heightKey] 或 estimatedHeight），
 *    渲染出来后再用 offsetHeight 校正。所以「总高度」是估算+实测的混合值，
 *    斜着滚会看到滚动条长度有一点变化，这是所有动态高度虚拟列表的通病
 *    （vue-virtual-scroller / vant 的 List 也一样），不是 bug。
 * 2. 滚动位置不能除，要二分：在 positions 里找第一个 bottom > scrollTop 的项。
 *    O(log n)，500 条约 9 次比较。
 * 3. 校正了可视区第一行的高度之后，下面的行整体位移了 → 必须把 scrollTop
 *    按锚点补偿回去，否则列表会在滚动时自己「跳」一下。
 *
 * ⚠️ 预估值越准越稳。真实项目里让接口直接带回高度、或按字号/图片数估算，
 *    比统一给一个 60px 靠谱得多。
 *
 * 用法：
 *   <virtual-scroll-dynamic :items="rows" height="420px" height-key="estHeight">
 *     <template #default="{ item }">
 *       <div class="card">{{ item.content }}</div>
 *     </template>
 *   </virtual-scroll-dynamic>
 */
export default {
  name: 'VirtualScrollDynamic',

  props: {
    items: { type: Array, default: function () { return [] } },
    height: { type: [Number, String], default: 400 },
    // 预估值：item 上没有 heightKey 字段时用它
    estimatedHeight: { type: Number, default: 88 },
    // 从 item 上取预估高度的字段名（可选）
    heightKey: { type: String, default: '' },
    buffer: { type: Number, default: 4 },
    itemKey: { type: [String, Function], default: 'id' }
  },

  data() {
    return {
      // 每项 { top, height }。整体替换，不逐项改，少一堆 watcher
      positions: [],
      totalHeight: 0,
      start: 0,
      end: 0,
      scrollTop: 0,
      viewport: 0,
      // 已经实测过的条数，演示用
      measuredCount: 0
    }
  },

  computed: {
    count() {
      return this.items.length
    },
    wrapStyle() {
      return {
        height: typeof this.height === 'number' ? this.height + 'px' : this.height
      }
    },
    visibleRows() {
      const out = []
      const pos = this.positions
      const total = this.items.length
      for (let i = this.start; i < this.end; i++) {
        const p = pos[i]
        // positions 可能比 items 长一截（数据刚被清空/过滤短了，还没重建）
        if (!p || i >= total) break
        const item = this.items[i]
        out.push({
          index: i,
          item: item,
          top: p.top,
          key: this.keyOf(item, i)
        })
      }
      return out
    }
  },

  watch: {
    items: function () {
      this.reset()
    },
    'items.length': function () {
      this.reset()
    },
    height: function () {
      this.$nextTick(this.refresh)
    },
    estimatedHeight: function () {
      this.reset()
    }
  },

  created() {
    // 实测缓存：index -> height。
    // 故意不放 data：它只影响「下次算 top」，本身不需要驱动视图，
    // 放 data 会让每次测量都多一轮依赖收集和渲染。
    this._measured = Object.create(null)
    this._measuredRange = ''
  },

  mounted() {
    this.reset()
    this.watchSize()
  },

  updated() {
    // DOM 更新完才能量到真实高度
    this.$nextTick(this.measure)
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
      return index
    },

    /** 这一项的高度：实测优先 → item 自带预估 → 全局预估 */
    heightOf(item, index) {
      const m = this._measured[index]
      if (m) return m
      if (this.heightKey && item && item[this.heightKey]) return item[this.heightKey]
      return this.estimatedHeight
    },

    /** 数据换了：实测缓存全部作废 */
    reset() {
      this._measured = Object.create(null)
      this._measuredRange = ''
      this.measuredCount = 0
      this.rebuild(null)
    },

    refresh() {
      const el = this.$refs.scroller
      this.measureViewport()
      this.scrollTop = el ? el.scrollTop : 0
      this.computeRange(true)
    },

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

    /**
     * 重建 positions
     * @param {number|null} anchorIndex 锚点行：重建后让它相对视口的位置保持不变
     */
    rebuild(anchorIndex) {
      const el = this.$refs.scroller
      const total = this.count

      // 记下锚点行「离视口顶部多远」，重建后按新 top 把它放回原位
      let anchorDelta = 0
      if (el && anchorIndex != null && this.positions[anchorIndex]) {
        anchorDelta = el.scrollTop - this.positions[anchorIndex].top
      }

      const arr = new Array(total)
      let top = 0
      for (let i = 0; i < total; i++) {
        const h = this.heightOf(this.items[i], i)
        arr[i] = { top: top, height: h }
        top += h
      }
      this.positions = arr
      this.totalHeight = top

      if (el && anchorIndex != null && arr[anchorIndex]) {
        el.scrollTop = Math.max(0, arr[anchorIndex].top + anchorDelta)
      }

      this.measureViewport()
      this.scrollTop = el ? el.scrollTop : 0
      this.computeRange(true)
    },

    /** 二分：第一个 bottom > offset 的项 */
    findStartIndex(offset) {
      const pos = this.positions
      let lo = 0
      let hi = pos.length - 1
      let ans = pos.length ? pos.length - 1 : 0
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (pos[mid].top + pos[mid].height > offset) {
          ans = mid
          hi = mid - 1
        } else {
          lo = mid + 1
        }
      }
      return ans
    },

    computeRange(force) {
      const total = this.count
      const pos = this.positions

      if (!total || !pos.length) {
        const changed = this.start !== 0 || this.end !== 0
        this.start = 0
        this.end = 0
        if (changed || force) this.emitRange()
        return
      }

      const start = Math.max(0, this.findStartIndex(this.scrollTop) - this.buffer)

      // 从 start 往后累加到盖满视口，再补 buffer 条
      const limit = this.viewport || 400
      let acc = 0
      let end = start
      while (end < total && acc < limit) {
        acc += pos[end].height
        end++
      }
      end = Math.min(total, end + this.buffer)

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
        total: this.count,
        measured: this.measuredCount
      })
    },

    /**
     * 量当前这一屏的行高，和记账值比对，差超过 0.5px 才重建。
     * 同一个渲染区间不重复量（除非换了数据或尺寸变了），
     * 否则每次 updated 都要读一遍 offsetHeight=强制同步布局，滚动会掉帧。
     */
    measure() {
      const list = this.$refs.list
      if (!list || !list.children.length) return
      const stamp = this.start + ':' + this.end
      if (stamp === this._measuredRange) return
      this._measuredRange = stamp

      const nodes = list.children
      let changed = false
      for (let k = 0; k < nodes.length; k++) {
        const index = this.start + k
        const h = nodes[k].offsetHeight
        if (!h) continue
        if (Math.abs(h - this.heightOf(this.items[index], index)) > 0.5) {
          this._measured[index] = h
          changed = true
        }
      }

      if (changed) {
        this.measuredCount = Object.keys(this._measured).length
        // 以 start 为锚点：校正它自己的高度不会让上面的内容动
        this.rebuild(this.start)
      }
    },

    onScroll() {
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          this._raf = 0
          const el = this.$refs.scroller
          if (!el) return
          this.scrollTop = el.scrollTop
          this.computeRange()
        })
      }
      if (this._endTimer) clearTimeout(this._endTimer)
      this._endTimer = setTimeout(() => {
        this.$emit('scroll-end', { scrollTop: this.scrollTop })
      }, 140)
    },

    scrollToIndex(index) {
      const el = this.$refs.scroller
      const p = this.positions[index]
      if (!el || !p) return
      el.scrollTop = Math.max(0, Math.min(p.top, this.totalHeight - el.clientHeight))
      this.refresh()
    },

    scrollToTop() {
      const el = this.$refs.scroller
      if (!el) return
      el.scrollTop = 0
      this.refresh()
    },

    getMetrics() {
      return {
        total: this.count,
        start: this.start,
        end: this.end,
        rendered: this.end - this.start,
        measured: this.measuredCount,
        totalHeight: this.totalHeight,
        scrollTop: this.scrollTop,
        viewport: this.viewport
      }
    },

    watchSize() {
      if (typeof ResizeObserver === 'undefined') return
      const el = this.$refs.scroller
      if (!el) return
      this._resizeObs = new ResizeObserver(() => {
        // 宽度变了，换行数会变，之前量的高度全部作废
        this._measured = Object.create(null)
        this._measuredRange = ''
        this.measuredCount = 0
        this.rebuild(this.start)
      })
      this._resizeObs.observe(el)
    }
  }
}
</script>

<style lang="scss" scoped>
.vsd {
  position: relative;
  width: 100%;

  &__scroller {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    // 和固定行高版同一个原因：list 是 absolute，包含块必须落在滚动容器上，
    // 否则滚轮/触摸板会绕过它去滚页面（滚动条还能拖，但滚轮不动）。
    position: relative;
  }

  &__phantom {
    width: 100%;
    pointer-events: none;
  }

  &__list {
    // 只做定位基准，不做位移：行是 absolute + top，会跟着容器自然滚动
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  &__item {
    position: absolute;
    left: 0;
    right: 0;
    box-sizing: border-box;
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
