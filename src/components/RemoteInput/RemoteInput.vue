<template>
  <div class="ri" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <el-input
      ref="input"
      :value="text"
      :size="size"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      :prefix-icon="icon"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open ? 'true' : 'false'"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @clear="onClear"
      @keydown.native.down.prevent="move(1)"
      @keydown.native.up.prevent="move(-1)"
      @keydown.native.enter.prevent="onEnter"
      @keydown.native.esc.stop="onEsc"
    />

    <!-- 下拉面板：始终作为输入框的兄弟节点，不做 teleport，
         所以外层容器不能是 overflow: hidden 的（el-card 就是），演示页里靠 min-height 留出空间 -->
    <div v-if="open" class="ri__panel" @mousedown.prevent>
      <div v-if="loading" class="ri__state">
        <i class="el-icon-loading"></i>
        <span>搜索中…</span>
      </div>

      <div v-else-if="error" class="ri__state ri__state--error">
        <span>搜索失败：{{ error }}</span>
        <el-button type="text" size="mini" @click="doSearch()">重试</el-button>
      </div>

      <div v-else-if="!trimmedLength" class="ri__state">
        输入关键词开始搜索（输入内容可直接使用）
      </div>

      <div v-else-if="trimmedLength < minLength" class="ri__state">
        至少输入 {{ minLength }} 个字符
      </div>

      <div v-else-if="!options.length" class="ri__state">
        没有匹配项 —— 当前输入可直接使用
      </div>

      <ul v-else class="ri__list">
        <li
          v-for="(item, i) in options"
          :key="itemKey(item, i)"
          class="ri__item"
          :class="{ 'is-active': i === activeIndex }"
          @mouseenter="activeIndex = i"
          @click="pick(item)"
        >
          <slot name="option" :item="item" :keyword="keyword">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="ri__label" v-html="highlight(itemLabel(item))"></span>
            <span v-if="metaText(item)" class="ri__meta">{{
              metaText(item)
            }}</span>
          </slot>
        </li>
      </ul>

      <div v-if="!loading && options.length" class="ri__foot">
        ↑↓ 选择 · Enter 确认 · Esc 关闭 · 不选则保留当前输入
      </div>
    </div>
  </div>
</template>

<script>
/**
 * RemoteInput —— 可输入 + 远程搜索 + 选中回填 的输入框
 *
 * 为什么不用 el-select remote：它选完只有「已选项」，用户没法输入一个
 * 列表里不存在但合法的值；el-autocomplete 能输入，但 loading / 空态 /
 * 错误态都只能靠插槽硬塞，也没有「丢弃过期响应」的处理。
 *
 * v-model 语义：**输入框里的文本**（用户看到什么就是什么）。
 * 选中项本身（带 id）通过 @select 抛出去 —— 这两者不能混成一个值。
 */
export default {
  name: 'RemoteInput',

  model: {
    prop: 'value',
    event: 'input'
  },

  props: {
    /** 输入框文本（v-model） */
    value: { type: [String, Number], default: '' },
    /** (keyword) => Promise<Array>，必须返回数组 */
    fetchMethod: { type: Function, required: true },
    placeholder: { type: String, default: '输入关键词搜索' },
    /** 防抖毫秒，0 表示不防抖 */
    debounce: { type: Number, default: 300 },
    /** 少于这个长度不发请求 */
    minLength: { type: Number, default: 1 },
    /** 结果项里作为显示文本的字段，可传 (item) => string */
    labelKey: { type: [String, Function], default: 'label' },
    /** 结果项里作为唯一键的字段，可传 (item) => string|number */
    valueKey: { type: [String, Function], default: 'value' },
    /** 右侧灰色副信息字段，可传 (item) => string，空则不显示 */
    metaKey: { type: [String, Function], default: '' },
    /** 最多展示几条 */
    limit: { type: Number, default: 20 },
    icon: { type: String, default: 'el-icon-search' },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    size: { type: String, default: '' },
    /** 是否按 trim 后的值搜索 */
    trim: { type: Boolean, default: true }
  },

  data() {
    return {
      /** 输入框当前文本 */
      text: '',
      /** 当前结果对应的关键词（用于高亮，和 text 可能不一致：用户还在打字） */
      keyword: '',
      options: [],
      loading: false,
      error: '',
      open: false,
      activeIndex: -1,
      /** 请求序号：只有最新一次的响应才允许写 options */
      seq: 0,
      /** 上一次选中项的文本：用来判断「用户是在改文字」还是「文字没动」 */
      pickedLabel: '',
      timer: null,
      closeTimer: null
    }
  },

  computed: {
    trimmedLength() {
      return this.trimmed ? this.trimmed.length : 0
    },
    trimmed() {
      const s = this.text == null ? '' : String(this.text)
      return this.trim ? s.trim() : s
    }
  },

  watch: {
    value: {
      immediate: true,
      handler(v) {
        const s = v == null ? '' : String(v)
        if (s === this.text) return
        // 外部赋值（回填详情、重置表单）：同步文本，收起面板，
        // 但【不发 invalidate】—— 父组件是在自己赋值的同时维护 id 的，不该被反过来清掉
        this.text = s
        this.keyword = s
        this.pickedLabel = s
        this.seq += 1
        this.clearTimer()
        this.blank()
        this.open = false
      }
    }
  },

  beforeDestroy() {
    this.clearTimer()
    if (this.closeTimer) clearTimeout(this.closeTimer)
    this.seq += 1
  },

  methods: {
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    },

    blank() {
      this.options = []
      this.activeIndex = -1
      this.loading = false
    },

    /* ---------------- 输入 ---------------- */

    onInput(val) {
      this.text = val
      this.error = ''
      this.$emit('input', val) // v-model：文本立即同步，不等搜索

      // 选过一条之后又改了文字 → 之前的选中作废，必须通知父组件清掉 id，
      // 否则会出现「文本是 A、id 还是 B」这种提交到后端的脏数据
      if (this.pickedLabel && val !== this.pickedLabel) {
        const previous = this.pickedLabel
        this.pickedLabel = ''
        this.$emit('invalidate', { previous })
      }

      this.clearTimer()
      // 每次输入都作废在途请求，避免「清空后旧结果又把面板顶开」
      this.seq += 1

      const kw = this.trimmed
      this.blank()

      if (!kw) {
        this.open = false
        return
      }

      this.open = true
      if (kw.length < this.minLength) return

      if (this.debounce > 0) {
        this.timer = setTimeout(() => this.doSearch(kw), this.debounce)
      } else {
        this.doSearch(kw)
      }
    },

    /* ---------------- 搜索 ---------------- */

    /**
     * 发起搜索。不传参就用当前输入值。
     * 公开方法：外部可以用 $refs.xx.search('阿里') 编程式触发。
     */
    doSearch(kw) {
      const keyword = typeof kw === 'string' ? kw : this.trimmed
      if (!keyword || keyword.length < this.minLength) return

      this.clearTimer()
      const seq = ++this.seq
      const startedAt = this.now()

      this.keyword = keyword
      this.loading = true
      this.error = ''
      this.open = true
      this.activeIndex = -1
      this.$emit('search', { keyword, seq })

      let task
      try {
        task = Promise.resolve(this.fetchMethod(keyword))
      } catch (e) {
        task = Promise.reject(e)
      }

      task
        .then((res) => {
          const cost = Math.round(this.now() - startedAt)
          const list = Array.isArray(res) ? res : []
          // 关键：过期响应的结果一个字段都不许写回去
          const dropped = seq !== this.seq
          this.$emit('result', {
            keyword,
            seq,
            cost,
            dropped,
            count: list.length
          })
          if (dropped) return
          this.options = list.slice(0, this.limit)
          this.loading = false
          this.activeIndex = this.options.length ? 0 : -1
        })
        .catch((e) => {
          const cost = Math.round(this.now() - startedAt)
          const dropped = seq !== this.seq
          const message = (e && e.message) || String(e)
          this.$emit('result', {
            keyword,
            seq,
            cost,
            dropped,
            count: 0,
            error: message
          })
          if (dropped) return
          this.blank()
          this.error = message
        })
    },

    now() {
      return typeof performance !== 'undefined' ? performance.now() : Date.now()
    },

    /**
     * 公开方法：编程式设置文本并立刻搜索（不走防抖）。
     * 外部可用 this.$refs.xx.search('杭州') 触发，演示页用它复现竞态。
     */
    search(value) {
      if (value !== undefined) {
        this.text = value == null ? '' : String(value)
        this.$emit('input', this.text)
      }
      this.doSearch()
    },

    /* ---------------- 选中 / 回填 ---------------- */

    pick(item) {
      const label = this.itemLabel(item)
      // 选中后作废在途请求：否则慢请求回来会把面板重新打开、覆盖 input
      this.seq += 1
      this.clearTimer()

      this.text = label
      this.keyword = label
      this.pickedLabel = label
      this.blank()
      this.open = false

      this.$emit('input', label) // 回填到输入框（v-model）
      this.$emit('select', item) // 整条记录：id / 其他字段都在里面
    },

    onClear() {
      this.seq += 1
      this.clearTimer()
      this.text = ''
      this.keyword = ''
      this.pickedLabel = ''
      this.blank()
      this.open = false
      this.$emit('input', '')
      this.$emit('clear')
    },

    /* ---------------- 焦点 / 键盘 ---------------- */

    onFocus() {
      if (this.options.length) {
        this.open = true
        return
      }
      if (!this.trimmed) this.open = true
    },

    onBlur() {
      if (this.closeTimer) clearTimeout(this.closeTimer)
      this.closeTimer = setTimeout(() => {
        this.open = false
        this.activeIndex = -1
      }, 120)
    },

    onEsc() {
      this.open = false
      this.activeIndex = -1
    },

    move(step) {
      if (!this.options.length) return
      if (!this.open) {
        this.open = true
        return
      }
      const n = this.options.length
      let i = this.activeIndex + step
      if (i < 0) i = n - 1
      if (i >= n) i = 0
      this.activeIndex = i
    },

    onEnter() {
      if (this.open && this.activeIndex >= 0 && this.options[this.activeIndex]) {
        this.pick(this.options[this.activeIndex])
        return
      }
      // 没高亮项 = 用户就是要用当前这串文字，交给业务判断
      this.$emit('enter', this.text)
      this.open = false
    },

    /* ---------------- 取值 / 渲染辅助 ---------------- */

    read(item, key) {
      if (!item) return ''
      return typeof key === 'function' ? key(item) : item[key]
    },
    itemLabel(item) {
      const v = this.read(item, this.labelKey)
      return v == null ? '' : String(v)
    },
    itemValue(item) {
      return this.read(item, this.valueKey)
    },
    itemKey(item, i) {
      const v = this.itemValue(item)
      return v == null || v === '' ? 'idx-' + i : v
    },
    metaText(item) {
      if (!this.metaKey) return ''
      const v = this.read(item, this.metaKey)
      return v == null ? '' : String(v)
    },

    /**
     * 关键词高亮。远程数据是「别人给的字符串」，直接拼进 v-html 就是 XSS，
     * 所以先转义再插 <em>。
     */
    highlight(label) {
      const safe = String(label).replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          }[c])
      )
      const kw = this.keyword
      if (!kw) return safe
      const pattern = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      try {
        return safe.replace(new RegExp(pattern, 'gi'), (m) => '<em class="ri__hit">' + m + '</em>')
      } catch (e) {
        return safe
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.ri {
  position: relative;
  width: 100%;

  &__panel {
    position: absolute;
    z-index: 2200;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    padding: 4px 0;
    background: $white;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    max-height: 268px;
    overflow-y: auto;
  }

  &__state {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    font-size: $font-s;
    color: $color-9;
    line-height: 1.6;

    &--error {
      color: $red-color;
      justify-content: space-between;
    }
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    line-height: 1.5;
    transition: background-color 0.15s;

    &.is-active {
      background: #eef3ff;
    }
  }

  &__label {
    flex: 1 1 auto;
    min-width: 0;
    font-size: $font-m;
    color: $color-3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    ::v-deep .ri__hit {
      font-style: normal;
      color: $color-primary;
      font-weight: 500;
    }
  }

  &__meta {
    flex: 0 0 auto;
    font-size: $font-s;
    color: $color-9;
  }

  &__foot {
    padding: 6px 12px 2px;
    border-top: 1px solid #f2f4f7;
    font-size: $font-s;
    color: #b4b8c0;
  }
}
</style>
