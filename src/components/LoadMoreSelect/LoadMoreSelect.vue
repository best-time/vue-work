<template>
  <el-select
    ref="select"
    class="lms"
    :value="value"
    :multiple="multiple"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    :filterable="searchable"
    :remote="searchable"
    :remote-method="searchable ? onRemoteQuery : null"
    :loading="initialLoading"
    :collapse-tags="collapseTags"
    :no-data-text="noDataText"
    :loading-text="loadingText"
    :popper-class="popperClassNames"
    @input="onInput"
    @change="onChange"
    @clear="onClear"
    @visible-change="onVisibleChange"
  >
    <el-option
      v-for="item in allOptions"
      :key="optValue(item)"
      :label="optLabel(item)"
      :value="optValue(item)"
    >
      <slot name="option" :item="item">
        <span class="lms__opt-label">{{ optLabel(item) }}</span>
        <span v-if="item.code" class="lms__opt-meta">{{ item.code }}</span>
      </slot>
    </el-option>

    <!--
      列表底部的状态行。
      注意它写在默认插槽里 —— el-select 会把默认插槽塞进
      <ul class="el-select-dropdown__list">（el-scrollbar tag="ul"），
      所以这个 <li> 必须用 <li> 才合法，并且会跟着列表一起滚动，
      「滚到底」时才出现在视口里，正好当加载提示。
      不要用 el-select 的 loading 属性来显示「加载更多」：源码里
      <el-scrollbar v-show="options.length > 0 && !loading"> —— loading 一旦为 true，
      已经加载出来的选项会全部消失（演示页 ④ 有对照实验）。
    -->
    <li
      v-if="showFooter"
      class="lms__footer"
      :class="{ 'is-error': !!error, 'is-finished': finished }"
      @click.stop="onFooterClick"
    >
      <i v-if="loading" class="el-icon-loading lms__spin"></i>
      <span>{{ footerText }}</span>
    </li>

    <!-- 空列表时 el-select 不渲染 <ul>，上面的 footer 也就没有；这里兜住「首屏加载 / 失败重试」 -->
    <template slot="empty">
      <p class="lms__empty">
        <template v-if="loading">
          <i class="el-icon-loading lms__spin"></i>
          <span>加载中…</span>
        </template>
        <template v-else-if="error">
          <span class="lms__empty-err">{{ error }}</span>
          <el-button type="text" size="mini" @click.stop="retry">重试</el-button>
        </template>
        <template v-else>{{ noDataText || '暂无数据' }}</template>
      </p>
    </template>
  </el-select>
</template>

<script>
/**
 * LoadMoreSelect —— el-select 的「滚动到底加载下一页」封装
 *
 * 为什么不用 el-select 自带的 remote 搜索就够了：
 *   remote 只能一次返回一批，没有「再往后翻」的能力；选项一多就得一次拉全量。
 *
 * 三条关键实现（都是 Element 2.15 源码里的硬约束，绕不过去）：
 *   1. 滚动容器是 `.el-select-dropdown__wrap`（el-scrollbar 的 wrap），
 *      不是 `.el-select-dropdown`，也不是 `document`。要从
 *      `$refs.select.$refs.popper.$el` 里捞，且每个实例必须捞自己的那份
 *      （下拉默认 append-to-body，全局 querySelector 会串到别的下拉上）。
 *   2. 加载更多【不能】用 el-select 的 loading 属性：它会 v-show 掉整个
 *      已加载列表（`options.length > 0 && !loading`），只剩一句「加载中」。
 *      所以首次加载才用 loading，后续加载用列表底部的 footer 行。
 *   3. 首屏不满一屏时永远不会触发 scroll —— 要主动「续拉」直到撑出滚动条
 *      （autoFill），否则小 pageSize 的下拉永远只有一页。
 *
 * v-model：单选是 value 本身，多选是 value 数组；
 * 选中项整条记录走 @select（单选给对象，多选给数组）。
 */
export default {
  name: 'LoadMoreSelect',

  model: { prop: 'value', event: 'input' },

  props: {
    /** v-model：单选为值，多选为值数组 */
    value: { type: [String, Number, Array], default: '' },
    /**
     * 分页请求函数：(params) => Promise<{ list, total }>
     * params = { page, pageSize, keyword }，page 从 1 开始。
     * total 可以不给 —— 不给就靠「返回条数 < pageSize」判断是否到底。
     */
    request: { type: Function, required: true },
    pageSize: { type: Number, default: 10 },

    /** 选项里取「显示文案」的字段，可传 (item) => string */
    labelKey: { type: [String, Function], default: 'label' },
    /** 选项里取「值」的字段，可传 (item) => string|number */
    valueKey: { type: [String, Function], default: 'value' },

    multiple: { type: Boolean, default: false },
    /** 打开搜索：el-select 的 filterable + remote，关键词交给服务端 */
    searchable: { type: Boolean, default: false },

    /** 首次打开下拉时自动拉第一页（默认开） */
    autoLoad: { type: Boolean, default: true },
    /** mounted 就拉第一页（需要立即回显 / 父组件要立刻用到列表时开） */
    preload: { type: Boolean, default: false },
    /** 一屏没填满就自动续拉下一页（关掉的话 pageSize 太小会卡在第一页） */
    autoFill: { type: Boolean, default: true },
    /** 距底部多少 px 触发加载 */
    offset: { type: Number, default: 24 },

    /**
     * 回显项（单选给对象，多选给数组）。
     * 值是从接口/详情页拿来的、当前列表里还没有的那条（那几条）记录 ——
     * 不给的话 el-select 找不到对应 option，输入框里会直接显示裸的 id。
     */
    valueItem: { type: [Object, Array], default: null },

    placeholder: { type: String, default: '请选择' },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    collapseTags: { type: Boolean, default: false },
    /** 追加到 el-select 的 popper-class，方便业务自定义下拉样式 */
    popperClass: { type: String, default: '' },
    noDataText: { type: String, default: '' },
    loadingText: { type: String, default: '' },

    /** footer 三段文案，方便业务改成自己的口吻 */
    scrollText: { type: String, default: '滚动到底加载更多' },
    finishedText: { type: String, default: '没有更多了' },
    retryText: { type: String, default: '加载失败，点击重试' }
  },

  data() {
    return {
      /** 服务端分页数据（不含回显项） */
      options: [],
      page: 0,
      loading: false,
      finished: false,
      error: '',
      /** 当前服务端关键词（searchable 时才有值） */
      keyword: '',
      /** 请求序号：只有最新一次的响应允许写数据 */
      seq: 0,
      /** 是否是「重置失败」（重试要重新从第 1 页来，而不是接着下一页） */
      pendingReset: false,
      dropdownVisible: false
    }
  },

  computed: {
    /** 回显项：父组件传进来、但可能不在当前分页里的记录 */
    pinned() {
      const v = this.valueItem
      if (!v) return []
      return (Array.isArray(v) ? v : [v]).filter(Boolean)
    },

    /**
     * 渲染用的完整列表 = 服务端分页数据（保持原顺序）+ 回显项里「还没加载出来」的那些。
     *
     * 为什么不是简单地把 pinned 拼在最前面：多选时每选一条，pinned 就多一条，
     * 拼接方式会让刚点过的选项立刻跳到列表最上面 —— 用户下一次点就点空了。
     * 所以已经在列表里的回显项原地不动，只有列表里找不到的才补到最前面（用户一眼能看到）。
     */
    allOptions() {
      const seen = new Set()
      const out = []
      this.options.forEach((item) => {
        const v = this.optValue(item)
        if (seen.has(v)) return
        seen.add(v)
        out.push(item)
      })
      const extra = this.pinned.filter((item) => !seen.has(this.optValue(item)))
      return extra.concat(out)
    },

    /** 首屏（还没有任何服务端数据）才用 el-select 自己的 loading */
    initialLoading() {
      return this.loading && this.options.length === 0
    },

    /** footer 只在「已经有列表」时才有意义（空列表走 empty 插槽） */
    showFooter() {
      return this.options.length > 0
    },

    footerText() {
      if (this.loading) return '加载中…'
      if (this.error) return this.retryText
      if (this.finished) return this.finishedText
      return this.scrollText
    },

    popperClassNames() {
      return ['lms-popper', this.popperClass].filter(Boolean).join(' ')
    }
  },

  watch: {
    /** 外部改了 pageSize（很少见）就当换了一套分页，重来 */
    pageSize() {
      this.reload()
    }
  },

  mounted() {
    // 下拉菜单在 el-select 里是常驻 DOM（只是 v-show），mounted 后就能拿到滚动容器
    this.$nextTick(this.bindScroll)
    if (this.preload) this.reload()
  },

  beforeDestroy() {
    this.seq += 1 // 作废在途请求，避免销毁后 setState
    this.unbindScroll()
  },

  methods: {
    /* ---------------- 取值 / 文案 ---------------- */

    optLabel(item) {
      const k = this.labelKey
      return typeof k === 'function' ? k(item) : item[k]
    },

    optValue(item) {
      const k = this.valueKey
      return typeof k === 'function' ? k(item) : item[k]
    },

    findItem(val) {
      return this.allOptions.find((item) => this.optValue(item) === val) || null
    },

    now() {
      return typeof performance !== 'undefined' ? performance.now() : Date.now()
    },

    /* ---------------- 滚动容器 ---------------- */

    getWrap() {
      const popper = this.$refs.select && this.$refs.select.$refs.popper
      if (!popper) return null
      // 只在自己的 popper 里找；下拉 append-to-body，用 document 查会拿到别人的
      return popper.$el.querySelector('.el-select-dropdown__wrap')
    },

    bindScroll() {
      const wrap = this.getWrap()
      if (!wrap || wrap === this._wrapEl) return
      this.unbindScroll()
      this._wrapEl = wrap
      wrap.addEventListener('scroll', this.handleScroll, { passive: true })
    },

    unbindScroll() {
      if (this._wrapEl) {
        this._wrapEl.removeEventListener('scroll', this.handleScroll)
        this._wrapEl = null
      }
    },

    handleScroll() {
      const wrap = this._wrapEl
      if (!wrap) return
      const rest = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight
      this.$emit('scroll', { rest })
      if (rest > this.offset) return
      this.load()
    },

    /* ---------------- 打开 / 关闭 ---------------- */

    onVisibleChange(open) {
      this.dropdownVisible = open
      this.$emit('visible-change', open)
      if (!open) return

      this.$nextTick(() => {
        this.bindScroll()
        // 首次打开才拉第一页；失败过（finished 仍为 false）会再试一次
        if (this.autoLoad && !this.options.length && !this.finished && !this.loading) {
          this.load({ reset: true })
        } else if (this.autoFill) {
          this.fillIfNeeded()
        }
      })
    },

    /* ---------------- 搜索 ---------------- */

    /**
     * el-select remote 的 remote-method（已由 el-select 的 debounce 属性防抖，默认 300ms）。
     * 关键词变了就重置分页，从第 1 页重新来。
     */
    onRemoteQuery(q) {
      // 选中/清空时 el-select 会把 query 归零并触发一次 remote-method，
      // 那不是用户在搜索 —— 下拉关着就直接忽略，省掉一次无意义请求
      if (!this.dropdownVisible) return
      const kw = String(q == null ? '' : q).trim()
      if (kw === this.keyword) return
      this.keyword = kw
      this.reload({ keepKeyword: true })
    },

    /* ---------------- 选中 ---------------- */

    onInput(val) {
      this.$emit('input', val)
    },

    onChange(val) {
      const item = this.multiple
        ? (Array.isArray(val) ? val : []).map((v) => this.findItem(v)).filter(Boolean)
        : this.findItem(val)
      this.$emit('change', val)
      this.$emit('select', item)
    },

    onClear() {
      this.$emit('clear')
    },

    /* ---------------- 加载 ---------------- */

    /**
     * 拉一页。
     * reset=true：从第 1 页重新拉，并作废在途请求（搜索/换筛选条件）。
     * reset=false：接着下一页（滚动到底）。
     */
    async load({ reset = false } = {}) {
      if (!reset && (this.loading || this.finished)) return
      const page = reset ? 1 : this.page + 1
      const seq = ++this.seq
      const startedAt = this.now()

      this.loading = true
      this.error = ''
      if (reset) this.pendingReset = false

      try {
        const res = await this.request({
          page,
          pageSize: this.pageSize,
          keyword: this.keyword
        })
        if (seq !== this.seq) return // 过期响应：一个字段都不许写回

        const raw = res && Array.isArray(res.list) ? res.list : []
        const total = res && typeof res.total === 'number' ? res.total : null

        // 去重：分页之间可能重叠（后端按 offset 分页时常见），重复 value 会让选中态错乱。
        // 这里只管「已加载数据」之间，回显项由 allOptions 统一去重（已加载的优先保留原位）
        const exists = new Set(
          (reset ? [] : this.options).map((i) => this.optValue(i))
        )
        const fresh = raw.filter((item) => {
          const v = this.optValue(item)
          if (exists.has(v)) return false
          exists.add(v)
          return true
        })

        const before = this.options.length
        this.options = reset ? fresh : this.options.concat(fresh)
        this.page = page
        this.finished =
          raw.length < this.pageSize ||
          (total !== null && page * this.pageSize >= total) ||
          // 兜底：一整页都是重复数据，再接下去也是死循环
          (raw.length > 0 && this.options.length === before)

        this.$emit('load', {
          page,
          pageSize: this.pageSize,
          keyword: this.keyword,
          count: fresh.length,
          total,
          cost: Math.round(this.now() - startedAt),
          finished: this.finished
        })

        if (reset) {
          this.$nextTick(() => {
            const wrap = this.getWrap()
            if (wrap) wrap.scrollTop = 0 // 换了关键词还要停在底部会看不到结果
          })
        }
        if (this.autoFill) this.fillIfNeeded()
      } catch (e) {
        if (seq !== this.seq) return
        this.error = (e && e.message) || '加载失败'
        this.pendingReset = reset
        this.$emit('error', e)
      } finally {
        if (seq === this.seq) this.loading = false
      }
    },

    /**
     * 一屏没填满 → 没有滚动条 → 永远触发不了 scroll。
     * 这里补一刀：拉完发现内容撑不满容器，就自动再拉一页。
     * 下拉关着（offsetParent 为 null）时不补，避免后台空转。
     */
    fillIfNeeded() {
      this.$nextTick(() => {
        if (this.loading || this.finished) return
        const wrap = this.getWrap()
        if (!wrap || !wrap.offsetParent) return
        if (wrap.scrollHeight - wrap.clientHeight <= this.offset) this.load()
      })
    },

    /* ---------------- 对外方法 ---------------- */

    /** 重新加载第一页（外部筛选条件变了、或提交后刷新列表时调） */
    reload(opts = {}) {
      this.seq += 1 // 作废在途
      this.loading = false
      this.finished = false
      this.page = 0
      this.error = ''
      this.pendingReset = false
      if (!opts.keepKeyword) this.keyword = opts.keyword || ''
      return this.load({ reset: true })
    },

    /** 供外部（也供 footer / empty 里的重试按钮）调用 */
    retry() {
      if (this.pendingReset || !this.options.length) return this.reload({ keepKeyword: true })
      return this.load()
    },

    onFooterClick() {
      if (this.error) this.retry()
    }
  }
}
</script>

<style lang="scss" scoped>
.lms {
  width: 100%;
}
</style>

<!--
  popper 默认 append-to-body，被挪到 <body> 下，拿不到 scoped 的 data-v 属性，
  所以下拉里的样式必须写成非 scoped，并统一收在 .lms-popper 下避免污染别的下拉。
-->
<style lang="scss">
.lms-popper {
  .lms__opt-label {
    float: left;
    max-width: 72%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .lms__opt-meta {
    float: right;
    margin-left: 12px;
    color: #a8b0bd;
    font-size: 12px;
  }

  .lms__footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 12px;
    color: #9aa4b2;
    font-size: 12px;
    line-height: 18px;
    cursor: default;
    user-select: none;

    &.is-error {
      color: #ff3b3b;
      cursor: pointer;
    }

    &.is-finished {
      color: #c0c6d0;
    }
  }

  .lms__spin {
    margin-right: 4px;
    color: #326fff;
  }

  .lms__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 0;
    margin: 0;
    color: #999;
    font-size: 14px;
    text-align: center;
  }

  .lms__empty-err {
    color: #ff3b3b;
  }
}
</style>
