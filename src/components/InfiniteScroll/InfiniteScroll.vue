<template>
  <div class="is">
    <!--
      列表内容交给使用者渲染（作用域插槽把 list / 各状态透出去）。
      组件不管「长什么样」，只管「什么时候拉下一页」。
    -->
    <slot
      :list="list"
      :page="page"
      :total="total"
      :loading="loading"
      :finished="finished"
      :error="error"
    />

    <div v-if="showEmpty" class="is__empty">
      <slot name="empty" :loading="loading" :error="error">
        <i v-if="loading" class="el-icon-loading is__spin"></i>
        <span v-else-if="error" class="is__err">{{ error }}</span>
        <span v-else class="is__muted">{{ emptyText }}</span>
      </slot>
    </div>

    <!--
      ★ 哨兵（sentinel）
      IntersectionObserver 观察的就是这个节点，不是滚动容器、也不是列表。
      它必须是「列表最后一个元素之后」的常驻节点：
        - 用 v-if 随状态增删 → 观察目标没了，observer 静默失效；
        - 放进列表里面 → 列表清空时一起消失，同样失效。
      它同时兼任底部状态条，所以本来就一直在。
    -->
    <div
      ref="sentinel"
      class="is__footer"
      :class="['is__footer--' + status, { 'is__footer--clickable': clickable }]"
      @click="onFooterClick"
    >
      <slot
        name="footer"
        :loading="loading"
        :finished="finished"
        :error="error"
        :page="page"
        :total="total"
        :count="list.length"
        :load="loadMore"
        :retry="retry"
      >
        <span v-if="loading" class="is__row">
          <i class="el-icon-loading is__spin"></i>{{ loadingText }}
        </span>
        <span v-else-if="error" class="is__row">
          <b class="is__err">{{ error }}</b>
          <em class="is__act">点击重试</em>
        </span>
        <span v-else-if="finished" class="is__muted"
          >— {{ finishedText }} —</span
        >
        <span v-else-if="!auto" class="is__act">点击加载更多</span>
        <span v-else class="is__muted">{{ moreText }}</span>
      </slot>
    </div>
  </div>
</template>

<script>
/**
 * InfiniteScroll —— 无限滚动加载（触底自动拉下一页）
 *
 * 设计取舍：**组件持有列表数据**（和 LoadMoreSelect 一致）。
 *   只给「滚动感知、分页、去重、状态机」这些每个列表都要重写一遍的东西，
 *   长什么样交给默认插槽 —— 否则每个列表都得在自己页面里复制一份 load()。
 *
 * 三个真正难的点（都在下面就着代码写了原因）：
 *   1. 用 IntersectionObserver，不用 scroll 事件：滚动回调在惯性滚动里一秒几十次，
 *      而 IO 由浏览器在合成线程算，回调只在「相交状态翻转」时来一次。
 *   2. 首屏不满一屏时永远不会有「触底」→ 必须自动续拉（autoFill）。
 *   3. IO 只在状态**翻转**时回调：加载完若哨兵仍然可见，它不会再叫你一次 → 卡死。
 *      所以每次加载完要主动让 IO 重新补发一次当前状态（reobserve）。
 *
 * 最小用法：
 *   <infinite-scroll ref="list" :request="fetchList" :page-size="10">
 *     <template #default="{ list }">
 *       <div v-for="it in list" :key="it.id">{{ it.title }}</div>
 *     </template>
 *   </infinite-scroll>
 *   // request: ({ page, pageSize }) => Promise<{ list, total }>
 */
function now() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

export default {
  name: "InfiniteScroll",

  props: {
    /**
     * 分页请求：(params) => Promise<{ list, total } | Array>
     * params = { page, pageSize }，page 从 1 开始。
     * total 可以不给 —— 不给就靠「返回条数 < pageSize」判断到底。
     */
    request: { type: Function, required: true },
    pageSize: { type: Number, default: 10 },

    /**
     * 滚动容器：CSS 选择器 / DOM 元素 / 'window' / null（视口）。
     * ⚠️ 必须是这个组件**祖先**上的元素（IO 的 root 不能是 target 的兄弟或后代），
     *    而且通常得有 overflow:auto|scroll + 确定高度，否则它根本不滚。
     */
    container: { type: [String, Object], default: null },
    /** 距底部多少 px 提前触发（IO 的 rootMargin 底边扩展） */
    offset: { type: Number, default: 200 },

    /** true：触底自动加载；false：只把底部变成「点击加载更多」，交给用户点 */
    auto: { type: Boolean, default: true },
    /** 首屏/每页都不满一屏时自动续拉（关掉的话 pageSize 太小会卡在第一页） */
    autoFill: { type: Boolean, default: true },
    /** mounted 就拉第一页（由父组件自己控制时机时置 false） */
    immediate: { type: Boolean, default: true },

    /** 去重 + 取 key 的字段，可传 (item) => any */
    itemKey: { type: [String, Function], default: "id" },

    loadingText: { type: String, default: "加载中…" },
    finishedText: { type: String, default: "没有更多了" },
    moreText: { type: String, default: "上拉加载更多" },
    emptyText: { type: String, default: "暂无数据" },
  },

  data() {
    return {
      list: [],
      /** 已加载到第几页（0 = 一页都没加载） */
      page: 0,
      total: null,
      loading: false,
      finished: false,
      error: "",
      /** 发起过的请求次数（含失败）；空态判断和演示页的「触发次数」都用它 */
      hits: 0,
      /** 哨兵当前是否可见（只作调试/展示，不参与逻辑） */
      intersecting: false,
      /** 请求序号：只有最新一次的响应允许写回，防止慢请求覆盖新结果 */
      seq: 0,
    };
  },

  computed: {
    status() {
      if (this.loading) return "loading";
      if (this.error) return "error";
      if (this.finished) return "finished";
      return "idle";
    },

    /** 底部条能不能点：出错时点重试；手动模式下点加载更多 */
    clickable() {
      return !!this.error || !this.auto;
    },

    showEmpty() {
      return (
        !this.list.length &&
        !this.loading &&
        (this.finished || !!this.error || this.hits > 0)
      );
    },
  },

  watch: {
    /** 换 pageSize 等于换了一套分页，必须从第 1 页重来（继续接第 N 页会漏数据） */
    pageSize() {
      this.reload();
    },
    /** 换滚动容器要重新绑 root，否则 IO 还盯着旧节点 */
    container() {
      this.$nextTick(this.bind);
    },
  },

  mounted() {
    // 用 nextTick：父组件的 $refs / 布局尺寸此时才就绪，
    // 且 container 传选择器时，ancestor 一定已经在文档里
    this.$nextTick(this.bind);
    if (this.immediate) this.load({ force: true });
  },

  beforeDestroy() {
    this.seq += 1; // 作废在途请求，避免销毁后还写数据
    this.unbind();
  },

  methods: {
    /* ================= 滚动感知 ================= */

    /** 解析滚动根：null = 视口（window） */
    resolveRoot() {
      const c = this.container;
      if (!c || c === "window" || c === "document") return null;
      if (typeof c === "string") return document.querySelector(c) || null;
      return c;
    },

    bind() {
      const sentinel = this.$refs.sentinel;
      if (!sentinel) return;
      this.unbind();

      const root = this.resolveRoot();

      // root 必须是 sentinel 的祖先，否则 IO 永远不回调（浏览器只在 target 进 root 时通知）
      if (root && root !== sentinel && !root.contains(sentinel)) {
        /* eslint-disable no-console */
        console.warn(
          "[InfiniteScroll] container 不是组件祖先节点，IntersectionObserver 不会触发；" +
            "已退化为视口观察。请让 container 包住 <infinite-scroll>。"
        );
        /* eslint-enable no-console */
      }

      if (typeof IntersectionObserver !== "undefined") {
        this._io = new IntersectionObserver(this.onIntersect, {
          root: root && root.contains(sentinel) ? root : null,
          // 底边向下扩 offset：离底还有 offset px 时就算「相交」，提前开拉
          rootMargin: `0px 0px ${this.offset}px 0px`,
          threshold: 0,
        });
        this._io.observe(sentinel);
        this._mode = "io";
      } else {
        // 兜底：没有 IO 的老环境/测试环境，退回 scroll + 几何计算
        this._mode = "scroll";
        this._scrollEl = root || window;
        this._scrollEl.addEventListener("scroll", this.onScroll, {
          passive: true,
        });
      }

      this.$emit("ready", { mode: this._mode, root });
    },

    unbind() {
      if (this._io) {
        this._io.disconnect();
        this._io = null;
      }
      if (this._scrollEl) {
        this._scrollEl.removeEventListener("scroll", this.onScroll);
        this._scrollEl = null;
      }
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = 0;
      }
    },

    onIntersect(entries) {
      const last = entries[entries.length - 1];
      this.intersecting = !!last.isIntersecting;
      this.$emit("intersect", this.intersecting);
      // auto=false（手动模式）时只发事件，不自动拉 —— 否则滚动照样会触发加载，
      // 「手动」就名不副实了
      if (this.intersecting && this.auto) this.load();
    },

    /** 兜底模式的滚动回调：rAF 节流，一帧最多算一次 */
    onScroll() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        if (this.loading || this.finished || this.error || !this.auto) return;
        this.$emit("scroll", this.getMetrics());
        if (this.getMetrics().rest <= this.offset) this.load();
      });
    },

    /** 当前滚动位置/剩余距离（视口模式和容器模式都统一成同一份结构） */
    getMetrics() {
      const root = this.resolveRoot();
      if (!root) {
        const doc = document.documentElement;
        const top = window.pageYOffset || doc.scrollTop || 0;
        const clientHeight = window.innerHeight;
        const scrollHeight = Math.max(
          doc.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        );
        return {
          scrollTop: Math.round(top),
          clientHeight,
          scrollHeight,
          rest: Math.max(0, scrollHeight - clientHeight - top),
        };
      }
      const rest = Math.max(
        0,
        root.scrollHeight - root.clientHeight - root.scrollTop
      );
      return {
        scrollTop: Math.round(root.scrollTop),
        clientHeight: root.clientHeight,
        scrollHeight: root.scrollHeight,
        rest: Math.round(rest),
      };
    },

    /* ================= 加载 ================= */

    /**
     * 拉下一页。
     * force=true 用于：初次加载 / 重置 / 点重试 —— 会绕过「上次失败就别自动重试」的闸门。
     */
    async load({ force = false } = {}) {
      if (this.loading || this.finished) return;
      // 失败后 IO 仍然认为哨兵可见 → 不加这个闸门会无限重试（每次都失败，白刷接口）
      if (this.error && !force) return;

      const page = this.page + 1;
      const seq = ++this.seq;
      const startedAt = now();

      this.loading = true;
      this.error = "";
      this.hits += 1;

      try {
        const res = await this.request({ page, pageSize: this.pageSize });
        if (seq !== this.seq) return; // 过期响应：一个字段都不许写回

        const raw = Array.isArray(res) ? res : (res && res.list) || [];
        const total = res && typeof res.total === "number" ? res.total : null;

        // 去重：后端按 offset 分页时两页之间可能重叠，重复 id 会让列表 key 冲突、渲染错位
        const seen = new Set(this.list.map((it) => this.keyOf(it)));
        const fresh = raw.filter((it) => {
          const k = this.keyOf(it);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        this.list = this.list.concat(fresh);
        this.page = page;
        this.total = total;
        this.finished =
          // 一整页都是重复数据：再翻也是死循环，直接收工
          (raw.length > 0 && fresh.length === 0) ||
          raw.length < this.pageSize ||
          (total !== null && page * this.pageSize >= total);

        this.$emit("load", {
          page,
          pageSize: this.pageSize,
          count: fresh.length,
          loaded: this.list.length,
          total,
          cost: Math.round(now() - startedAt),
          finished: this.finished,
        });

        this.$nextTick(this.recheck);
      } catch (e) {
        if (seq !== this.seq) return;
        this.error = (e && e.message) || "加载失败";
        this.$emit("error", e);
      } finally {
        if (seq === this.seq) this.loading = false;
      }
    },

    /**
     * 加载完检查一次「要不要继续拉」。
     * IO 模式不能靠 observer 自己再回调 —— 内容虽然变长了，但哨兵可能还在可视范围内，
     * 相交状态没翻转，浏览器就不会再通知。而 IO 在 observe() 时会**立即补发**一次当前状态，
     * 所以「unobserve + observe」= 手动催一次回调，比手算几何更准（rootMargin 也算上了）。
     */
    recheck() {
      if (this.finished || this.error || this.loading || !this.auto) return;
      if (!this.autoFill) return;

      if (this._io && this.$refs.sentinel) {
        this._io.unobserve(this.$refs.sentinel);
        this._io.observe(this.$refs.sentinel);
      } else if (this.getMetrics().rest <= this.offset) {
        this.load();
      }
    },

    /* ================= 对外方法 ================= */

    /** 重置到第 1 页（换关键词 / 换筛选条件 / 刷新按钮） */
    reload() {
      this.seq += 1; // 作废在途请求
      this.loading = false;
      this.error = "";
      this.finished = false;
      this.page = 0;
      this.list = [];
      this.total = null;
      this.hits = 0;

      const root = this.resolveRoot();
      if (root) root.scrollTop = 0; // 换成新条件还停在底部会看不到结果

      this.$emit("reset");
      return this.load({ force: true });
    },

    /** 点底部条：出错 → 重试；手动模式 → 再拉一页 */
    onFooterClick() {
      if (this.error) this.retry();
      else if (!this.auto) this.load({ force: true });
    },

    retry() {
      this.error = "";
      return this.load({ force: true });
    },

    /** 手动加载更多（auto=false 时给自定义 footer 用，也可外部调用） */
    loadMore() {
      return this.load({ force: true });
    },

    keyOf(item) {
      const k = this.itemKey;
      if (typeof k === "function") return k(item);
      return item == null ? undefined : item[k];
    },
  },
};
</script>

<style lang="scss" scoped>
.is {
  display: flex;
  flex-direction: column;
  min-height: 0;

  &__empty {
    padding: 28px 0;
    text-align: center;
    font-size: 13px;
    color: #909399;
  }

  &__row {
    display: inline-flex;
    align-items: center;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 8px 12px;
    font-size: 12px;
    line-height: 20px;
    color: #9aa4b2;
    text-align: center;
    user-select: none;

    &--clickable {
      cursor: pointer;
    }

    &--finished {
      color: #c0c6d0;
    }

    &--error {
      color: #ff3b3b;
    }
  }

  &__muted {
    color: #a8b0bd;
  }

  &__err {
    font-weight: 400;
    color: #ff3b3b;
  }

  &__act {
    margin-left: 6px;
    font-style: normal;
    color: #326fff;
  }

  &__spin {
    margin-right: 5px;
    color: #326fff;
  }
}
</style>
