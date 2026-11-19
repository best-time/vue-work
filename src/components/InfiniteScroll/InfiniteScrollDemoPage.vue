<template>
  <div class="ifs">
    <h2 class="ifs__hd">无限滚动加载 · InfiniteScroll</h2>
    <p class="ifs__tip">
      滚到底自动拉下一页，到底了显示「没有更多」，失败了点一下重试。<br />
      组件只管<strong>滚动感知 + 分页 + 去重 + 状态机</strong
      >，列表长什么样交给默认插槽。<br />
      滚动感知用 <code>IntersectionObserver</code> 而不是
      <code>scroll</code> 事件： 滚动回调在惯性滚动里一秒几十次，而 IO
      的回调只在「哨兵进出视口」时来一次。
    </p>

    <!-- ================= 控制台 ================= -->
    <el-card shadow="never" class="ifs__card">
      <div slot="header">控制台 · 改完点「重置」，从第 1 页重来</div>
      <div class="ifs-ctrl">
        <el-input
          v-model="keyword"
          size="small"
          class="ifs-ctrl__search"
          placeholder="搜索标题 / 作者 / 部门"
          clearable
          @keyup.enter.native="reloadA"
          @clear="reloadA"
        >
          <el-button slot="append" icon="el-icon-search" @click="reloadA">
            搜索
          </el-button>
        </el-input>

        <label class="ifs-ctrl__f">
          <span>pageSize</span>
          <el-select v-model="pageSize" size="small" class="ifs-ctrl__sel">
            <el-option :value="5" label="5" />
            <el-option :value="10" label="10" />
            <el-option :value="20" label="20" />
          </el-select>
        </label>

        <label class="ifs-ctrl__f">
          <span>网络延迟</span>
          <el-select v-model="delay" size="small" class="ifs-ctrl__sel">
            <el-option :value="0" label="0ms" />
            <el-option :value="300" label="300ms" />
            <el-option :value="1500" label="1500ms" />
          </el-select>
        </label>

        <label class="ifs-ctrl__f">
          <span>下次请求失败</span>
          <el-switch v-model="failNext" />
        </label>

        <el-button type="primary" size="small" @click="reloadA">
          重置列表 ①
        </el-button>
      </div>
      <p class="ifs__tip ifs__tip--inline">
        <code>pageSize = 5</code> + 容器 420px 时，一页填不满一屏 ——
        这正是无限滚动最经典的坑：<strong>没有滚动条就永远等不到触底</strong>。
        组件在每次加载完会检查一次「哨兵还在可视区吗」，是就继续拉（<code>autoFill</code>），
        看下面「请求次数」会一次跳好几个。
      </p>
    </el-card>

    <!-- ================= 两个列表对照 ================= -->
    <div class="ifs-grid">
      <!-- ① 自动加载 -->
      <el-card shadow="never" class="ifs__card">
        <div slot="header">
          ① 自动加载 · <code>container=".ifs-box-a"</code>
        </div>
        <div ref="boxA" class="ifs-box ifs-box-a">
          <infinite-scroll
            ref="listA"
            container=".ifs-box-a"
            :request="fetchA"
            :page-size="pageSize"
            :offset="160"
            @load="onLoad('a', $event)"
            @error="onError('a', $event)"
            @reset="onReset('a')"
          >
            <template #default="{ list }">
              <ul class="ifs-ul">
                <li v-for="it in list" :key="it.id" class="ifs-ul__item">
                  <span class="ifs-ul__tag">{{ it.tag }}</span>
                  <p class="ifs-ul__title">{{ it.title }}</p>
                  <p class="ifs-ul__meta">
                    {{ it.dept }} · {{ it.author }} · {{ it.time }} · 阅读
                    {{ it.read }}
                  </p>
                </li>
              </ul>
            </template>
          </infinite-scroll>
        </div>
        <p class="ifs-probe">
          <b>{{ statusText("a") }}</b> · 已加载
          <b>{{ a.count }}/{{ totalText("a") }}</b> 条 · 第
          <b>{{ a.page }}</b> 页 · 请求 <b>{{ a.requests }}</b> 次 · 上次耗时
          <b>{{ a.cost }}ms</b>
        </p>
        <p class="ifs-probe ifs-probe--sub">
          容器 scrollHeight {{ mA.scrollHeight }}px · 可视
          {{ mA.clientHeight }}px · 距底 <b>{{ mA.rest }}px</b>（offset=160
          时提前开拉）
        </p>
      </el-card>

      <!-- ② 手动加载 -->
      <el-card shadow="never" class="ifs__card">
        <div slot="header">
          ② 手动加载 · <code>:auto="false"</code> + 自定义 footer
        </div>
        <div ref="boxB" class="ifs-box ifs-box-b">
          <infinite-scroll
            ref="listB"
            container=".ifs-box-b"
            :request="fetchB"
            :page-size="8"
            :auto="false"
            :immediate="false"
            @load="onLoad('b', $event)"
            @error="onError('b', $event)"
            @reset="onReset('b')"
          >
            <template #default="{ list }">
              <div class="ifs-ul">
                <div v-for="it in list" :key="it.id" class="ifs-ul__item">
                  <span class="ifs-ul__tag ifs-ul__tag--grey"
                    >#{{ it.id }}</span
                  >
                  <p class="ifs-ul__title">{{ it.title }}</p>
                  <p class="ifs-ul__meta">{{ it.author }} · {{ it.time }}</p>
                </div>
              </div>
            </template>

            <!-- footer 插槽拿到全部状态，想画成什么样都行 -->
            <template #footer="{ loading, finished, error, page, load, retry }">
              <div class="ifs-manual">
                <span v-if="finished" class="ifs-manual__done">
                  — 已加载全部 {{ page }} 页 —
                </span>
                <template v-else>
                  <el-button
                    size="mini"
                    type="primary"
                    plain
                    :loading="loading"
                    @click="error ? retry() : load()"
                  >
                    {{ error ? "重试" : page ? "加载更多" : "开始加载" }}
                  </el-button>
                  <em class="ifs-manual__hint">
                    {{ error || "auto=false：滚到底也不会自动拉" }}
                  </em>
                </template>
              </div>
            </template>
          </infinite-scroll>
        </div>
        <p class="ifs-probe">
          <b>{{ statusText("b") }}</b> · 已加载
          <b>{{ b.count }}/{{ totalText("b") }}</b> 条 · 第
          <b>{{ b.page }}</b> 页 · 请求 <b>{{ b.requests }}</b> 次
        </p>
        <p class="ifs-probe ifs-probe--sub">
          自定义 footer 里 <code>page</code> 为 0 表示还没拉过第一页 ——
          所以按钮文案是「开始加载」
        </p>
      </el-card>
    </div>

    <!-- ================= ③ 指令版 ================= -->
    <el-card shadow="never" class="ifs__card">
      <div slot="header">
        ③ 指令版 · <code>v-scroll-load</code>（数据自己管，指令只管触底）
      </div>
      <div class="ifs-split">
        <div class="ifs-split__main">
          <!--
            指令挂在滚动容器自己身上即可：容器有确定高度 + overflow:auto 就被识别为滚动根。
            disabled 绑「加载中 || 已到底」—— 指令不知道你在不在请求，必须由你告诉它。
          -->
          <div ref="boxC" class="ifs-box ifs-box-c" v-scroll-load="dirOptions">
            <ul class="ifs-ul">
              <li v-for="it in cList" :key="it.id" class="ifs-ul__item">
                <span class="ifs-ul__tag ifs-ul__tag--line">指令</span>
                <p class="ifs-ul__title">{{ it.title }}</p>
                <p class="ifs-ul__meta">
                  {{ it.dept }} · {{ it.author }} · {{ it.time }}
                </p>
              </li>
            </ul>
            <p class="ifs-dir-end">
              <template v-if="c.pending">
                <i class="el-icon-loading"></i> 加载中…
              </template>
              <template v-else-if="!cList.length">— 没有数据 —</template>
              <template v-else-if="c.finished">— 没有更多了 —</template>
            </p>
          </div>
          <p class="ifs-probe">
            <b>{{ statusText("c") }}</b> · 已加载
            <b>{{ c.count }}/{{ totalText("c") }}</b> 条 · 第
            <b>{{ c.page }}</b> 页 · 请求 <b>{{ c.requests }}</b> 次 · 上次耗时
            <b>{{ c.cost }}ms</b>
          </p>
          <p class="ifs-probe ifs-probe--sub">
            距底 {{ mC.rest }}px（distance=160）· 滚动根
            <code>{{ mC.root }}</code> · 一条列表数据都没经过组件
          </p>
        </div>

        <aside class="ifs-split__side">
          <h4 class="ifs-side__t">指令 vs 组件</h4>
          <ul class="ifs-side__list">
            <li>
              指令<strong>不管数据</strong>：分页、去重、空态、错误态、到底文案都由你写，
              适合已有自己列表逻辑、只缺「触底感知」的场景。
            </li>
            <li>
              <code>disabled</code> 是唯一的刹车：绑
              <code>loading || finished</code>，否则加载中还会重复触发。
            </li>
            <li>
              <code>handler</code> 返回 Promise 时指令自动加锁，结束后自己再判一次
              （首屏不满一屏会连续续拉）。
            </li>
            <li>③ 是独立的：不吃上面那条搜索条件，用「重置 ③」重来。</li>
            <li>
              为什么叫 <code>v-scroll-load</code>：Element UI 2.15 也内置了
              <code>v-infinite-scroll</code>（注册在 <code>InfiniteScroll</code> 这个 PascalCase 键上）。
              Vue 的解析顺序是 kebab 精确键 → camelCase → PascalCase，全局抢注册同名会
              <strong>顶掉</strong> Element 的指令；要保留那个名字请在组件内局部注册
              <code v-pre>directives: { infiniteScroll }</code>。
            </li>
          </ul>
          <el-button size="mini" plain @click="resetC">重置 ③</el-button>
        </aside>
      </div>
    </el-card>

    <!-- ================= 要点 / 坑 ================= -->
    <el-card shadow="never" class="ifs__card">
      <div slot="header">实现要点与坑（都是实测踩出来的）</div>

      <el-table :data="notes" size="small" border class="ifs-table">
        <el-table-column prop="topic" label="问题" width="180" />
        <el-table-column prop="detail" label="原因 / 做法" />
      </el-table>

      <el-collapse v-model="openCode" class="ifs-collapse">
        <el-collapse-item name="use" title="完整用法（props / 事件 / 方法）">
          <pre class="ifs__code">{{ CODE.use }}</pre>
        </el-collapse-item>
        <el-collapse-item
          name="core"
          title="核心：为什么加载完要重新 observe 一次"
        >
          <pre class="ifs__code">{{ CODE.core }}</pre>
        </el-collapse-item>
        <el-collapse-item name="directive" title="指令版 v-scroll-load 用法">
          <pre class="ifs__code">{{ CODE.directive }}</pre>
        </el-collapse-item>
        <el-collapse-item
          name="compare"
          title="三版对照：组件版 / v-scroll-load / Element 内置 v-infinite-scroll"
        >
          <pre class="ifs__code">{{ CODE.compare }}</pre>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script>
import { fetchFeed, TOTAL_COUNT } from "./mockApi";

/** 一个列表的统计信息（只用于页面上那行探针文案） */
function blankStat() {
  return {
    count: 0,
    page: 0,
    total: null,
    requests: 0,
    pending: false,
    finished: false,
    error: "",
    cost: 0,
  };
}

export default {
  name: "InfiniteScrollDemoPage",

  data() {
    return {
      keyword: "",
      pageSize: 10,
      delay: 300,
      failNext: false,
      openCode: ["use"],

      a: blankStat(),
      b: blankStat(),

      /** ③ 指令版：数据、页码、状态全在这个页面里，指令只负责喊「该拉了」 */
      c: blankStat(),
      cList: [],
      cPageSize: 8,

      /** 两个容器的滚动尺寸（scroll / 加载完都要刷） */
      mA: { scrollHeight: 0, clientHeight: 0, rest: 0, scrollTop: 0 },
      mB: { scrollHeight: 0, clientHeight: 0, rest: 0, scrollTop: 0 },
      mC: { scrollHeight: 0, clientHeight: 0, rest: 0, scrollTop: 0, root: "-" },

      notes: [
        {
          topic: "为什么用 IO 不用 scroll",
          detail:
            "scroll 回调在惯性滚动里一秒几十次，每次都要读 scrollHeight/scrollTop 触发同步布局；IntersectionObserver 由浏览器在合成线程判定，回调只在「哨兵进出视口」时来一次。",
        },
        {
          topic: "观察谁：哨兵，不是容器",
          detail:
            "观察列表末尾那个常驻的底部状态条。不要让它随状态 v-if 增删，也不要放进列表内部 —— 目标节点一没，observer 就静默失效（不报错、也不再回调）。",
        },
        {
          topic: "首屏不满一屏 → 永不触底",
          detail:
            "pageSize=5、容器 420px 时一页撑不出滚动条，scroll 事件根本不会发生。每次 load 完要检查「哨兵还在可视区吗」，是就继续拉（autoFill），否则列表永远停在第 1 页。",
        },
        {
          topic: "加载完哨兵仍可见 → 卡住",
          detail:
            "IO 只在「相交状态翻转」时回调。加载后内容虽然变长，但哨兵可能还在视口里，状态没翻转就不会再叫你。做法：unobserve + observe，IO 在 observe 时会立即补发一次当前状态。",
        },
        {
          topic: "container 必须是祖先",
          detail:
            "IO 的 root 不能是 target 的兄弟/后代，否则永不回调。组件里做了 contains() 校验，不合格时 console.warn 并退化为视口观察。容器还得有确定高度 + overflow:auto，否则它本身不滚。",
        },
        {
          topic: "失败后不能自动重试",
          detail:
            "出错时哨兵通常仍在可视区，IO 会一直认为「该加载」→ 无限重试刷接口。所以 error 非空时 load() 直接返回，只有点击（force=true）才继续。",
        },
        {
          topic: "翻页去重",
          detail:
            "后端按 offset 分页时两页可能重叠，重复 id 会让列表 key 冲突、渲染错位。每次合并前用 itemKey 建 Set 过滤；一整页全是重复数据时直接置 finished，避免死循环。",
        },
        {
          topic: "过期响应",
          detail:
            "搜索/换条件必须 seq += 1 作废在途请求，否则第 2 页的慢响应回来会把新关键词的第 1 页覆盖掉（mock 里把第 2 页故意做慢就能复现）。",
        },
      ],
    };
  },

  computed: {
    /**
     * ③ 的指令选项：每次渲染返回新对象，指令的 update 钩子会重读它 ——
     * disabled 才能跟着 pending/finished 及时变化。
     */
    dirOptions() {
      return {
        handler: this.loadC,
        distance: 160,
        disabled: this.c.pending || this.c.finished,
      };
    },

    CODE() {
      return {
        use: `<infinite-scroll
  ref="list"
  container=".list-box"        <!-- 滚动容器：选择器 / DOM / null=视口 -->
  :request="fetchList"         <!-- ({page,pageSize}) => Promise<{list,total}> -->
  :page-size="10"
  :offset="160"                <!-- 距底 160px 提前开拉 -->
  :auto="true"                 <!-- false = 只给「点击加载更多」 -->
  :auto-fill="true"            <!-- 一页不满一屏时自动续拉 -->
  @load="onLoad"
  @error="onError"
>
  <template #default="{ list, loading, finished }">
    <div v-for="it in list" :key="it.id">{{ it.title }}</div>
  </template>

  <!-- 想自己画底部状态条就用这个插槽 -->
  <template #footer="{ loading, finished, error, page, load, retry }">…</template>
</infinite-scroll>

// fetchList 就是普通的分页接口，total 可以不给（靠「条数 < pageSize」判到底）
async fetchList({ page, pageSize }) {
  const res = await api.getList({ page, pageSize })
  return { list: res.rows, total: res.total }
}

// 对外方法
this.$refs.list.reload()    // 回第 1 页，作废在途请求
this.$refs.list.loadMore()  // 手动再拉一页
this.$refs.list.retry()     // 出错后重试
this.$refs.list.getMetrics()// { scrollTop, clientHeight, scrollHeight, rest }`,
        core: `// load() 成功后
this.$nextTick(this.recheck)

recheck() {
  if (this.finished || this.error || this.loading || !this.auto) return

  // IO 只在相交状态「翻转」时回调；内容变长但哨兵还在视口里 → 不会再有回调。
  // observe() 会立即补发一次当前相交状态，等于手动催一次判断。
  this._io.unobserve(this.$refs.sentinel)
  this._io.observe(this.$refs.sentinel)
}`,
        directive: `<!-- 函数式：只有触底回调，其余走默认值 -->
<div class="list" v-scroll-load="loadMore">…</div>

<!-- 对象式：能控制 distance / disabled / immediate / container -->
<div
  class="list"
  v-scroll-load="{
    handler: loadMore,
    distance: 160,
    disabled: loading || finished,
    container: null,      <!-- 不传=自己→最近可滚祖先→视口 -->
  }"
>
  <div v-for="it in list" :key="it.id">{{ it.title }}</div>
</div>

// handler 收到 { rest, root, el }；返回 Promise 会被自动加锁
loadMore({ rest }) {
  this.loading = true
  return api.list({ page: this.page + 1, pageSize: 8 }).then(res => {
    this.list = this.list.concat(res.rows)
    this.page += 1
    this.finished = res.rows.length < 8
    this.loading = false
  })
}

// 手动补判一次（切页签显示、从 display:none 恢复后）
this.$refs.box.__scrollLoad__.check()`,
        compare: `滚动感知      组件: IntersectionObserver + 哨兵
              指令: scroll(rAF 节流) + componentUpdated 复判
              内置: scroll(debounce 200) + MutationObserver

参数形式      组件: props / 事件 / 插槽
              指令: 指令值对象（函数式只给 handler）
              内置: HTML 属性 infinite-scroll-distance / -disabled / -delay / -immediate

数据归属      组件: 组件持有 list，自带分页去重状态机
              指令: 调用方持有，指令只喊「该拉了」
              内置: 调用方持有

请求期间防重  组件: loading 闸门
              指令: handler 返回 Promise 自动加锁
              内置: 只能靠 infinite-scroll-disabled 自己挡

数据变了复判  组件: recheck() 重新 observe
              指令: componentUpdated 钩子（宿主每次更新）
              内置: MutationObserver，且某次未触发后即 disconnect`,
      };
    },
  },

  mounted() {
    // 容器滚动时刷探针（组件内部的 IO 也在这时候判定，这里只是展示用）
    this.$nextTick(() => {
      this.boxes().forEach((el) => {
        el.addEventListener("scroll", this.refreshMetrics, { passive: true });
      });
      this.refreshMetrics();
    });
  },

  beforeDestroy() {
    this.boxes().forEach((el) => {
      el.removeEventListener("scroll", this.refreshMetrics);
    });
  },

  methods: {
    /** 两个滚动容器的元素（还没渲染时返回空数组） */
    boxes() {
      return [this.$refs.boxA, this.$refs.boxB, this.$refs.boxC].filter(Boolean);
    },

    /** ① 的请求：带上搜索关键词 / 延迟 / 失败开关 */
    fetchA(params) {
      return this.request("a", {
        ...params,
        keyword: this.keyword,
        delay: this.delay,
        fail: this.takeFail(),
      });
    },

    /** ② 的请求：固定条件，只演示手动加载 */
    fetchB(params) {
      return this.request("b", {
        ...params,
        delay: Math.min(this.delay, 600),
        fail: this.takeFail(),
      });
    },

    /** 包一层：记请求次数 / 挂 pending，页面探针才有「请求 N 次」可看 */
    request(kind, opts) {
      const st = this[kind];
      st.requests += 1;
      st.pending = true;
      return fetchFeed(opts).then(
        (res) => {
          st.pending = false;
          return res;
        },
        (err) => {
          st.pending = false;
          throw err;
        }
      );
    },

    /** 失败开关用一次就关，否则后面每一页都失败、看不到「点重试成功」 */
    takeFail() {
      const f = this.failNext;
      if (f) this.failNext = false;
      return f;
    },

    onLoad(kind, e) {
      const st = this[kind];
      st.count = e.loaded;
      st.page = e.page;
      st.total = e.total == null ? TOTAL_COUNT : e.total;
      st.cost = e.cost;
      st.finished = e.finished;
      st.error = "";
      this.$nextTick(this.refreshMetrics);
    },

    onError(kind, e) {
      this[kind].error = (e && e.message) || "加载失败";
      this[kind].pending = false;
    },

    onReset(kind) {
      Object.assign(this[kind], blankStat());
      this.$nextTick(this.refreshMetrics);
    },

    reloadA() {
      if (this.$refs.listA) this.$refs.listA.reload();
    },

    /**
     * ③ 的加载：完全自己写 —— 指令只负责在触底时喊一声。
     * 返回 Promise，指令会自动加锁（请求期间不再触发）。
     */
    loadC() {
      const st = this.c;
      if (st.pending || st.finished) return;

      const page = st.page + 1;
      st.requests += 1;
      st.pending = true;
      const t0 = performance.now();

      return fetchFeed({
        page,
        pageSize: this.cPageSize,
        delay: this.delay,
      }).then(
        (res) => {
          const seen = new Set(this.cList.map((it) => it.id));
          this.cList = this.cList.concat(
            res.list.filter((it) => !seen.has(it.id))
          );
          st.count = this.cList.length;
          st.page = page;
          st.total = res.total;
          st.cost = Math.round(performance.now() - t0);
          st.finished = res.list.length < this.cPageSize;
          st.pending = false;
          this.$nextTick(this.refreshMetrics);
        },
        () => {
          st.pending = false;
          this.$nextTick(this.refreshMetrics);
        }
      );
    },

    /** ③ 重置：清空后 componentUpdated 会自己再判一次，第 1 页就回来了 */
    resetC() {
      this.cList = [];
      this.c = blankStat();
      this.$nextTick(this.refreshMetrics);
    },

    refreshMetrics() {
      const a = this.$refs.listA;
      const b = this.$refs.listB;
      if (a) this.mA = a.getMetrics();
      if (b) this.mB = b.getMetrics();

      // ③ 没有组件可问，直接从盒子上量（指令的滚动根就是它自己）
      const c = this.$refs.boxC;
      if (c) {
        this.mC = {
          scrollTop: Math.round(c.scrollTop),
          clientHeight: c.clientHeight,
          scrollHeight: c.scrollHeight,
          rest: Math.max(0, c.scrollHeight - c.clientHeight - c.scrollTop),
          root: c.__scrollLoad__ ? "自身" : "?",
        };
      }
    },

    /** total 还没拿到时（没加载过 / 重置后）显示「—」而不是 0 */
    totalText(kind) {
      const t = this[kind].total;
      return t == null ? "—" : t;
    },

    statusText(kind) {
      const st = this[kind];
      if (st.error) return "失败：" + st.error;
      if (st.pending) return "加载中";
      if (st.finished) return "已到底";
      if (!st.page) return "待加载";
      return "可继续加载";
    },
  },
};
</script>

<style lang="scss" scoped>
.ifs {
  padding: 20px 24px 60px;
  color: $color-3;

  &__hd {
    margin-bottom: 10px;
    font-size: 20px;
    font-weight: 600;
  }

  &__tip {
    margin: 0 0 18px;
    padding: 10px 12px;
    border-left: 3px solid $color-primary;
    border-radius: 2px;
    background: #f4f8ff;
    font-size: 13px;
    line-height: 1.9;
    color: #4a5568;

    &--inline {
      margin: 14px 0 0;
    }

    code {
      padding: 0 4px;
      border-radius: 2px;
      background: #e8f0ff;
      color: $color-primary;
      font-size: 12px;
    }
  }

  &__card {
    margin-bottom: 18px;
    min-width: 0;

    ::v-deep .el-card__header {
      font-size: 14px;
      font-weight: 600;
    }

    code {
      padding: 0 4px;
      border-radius: 2px;
      background: #f0f2f5;
      color: $color-primary;
      font-size: 12px;
    }
  }

  &__code {
    margin: 0;
    padding: 12px 14px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background: #f6f8fa;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.75;
    color: #24292e;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

/* ---------- 控制台 ---------- */
.ifs-ctrl {
  display: flex;
  flex-wrap: wrap;
  align-items: center;

  > *:not(:last-child) {
    margin-right: 16px;
  }

  &__search {
    width: 260px;
  }

  &__f {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: $color-6;

    span {
      margin-right: 6px;
      white-space: nowrap;
    }
  }

  &__sel {
    width: 92px;
  }
}

/* ---------- 两个列表 ---------- */
.ifs-grid {
  display: grid;
  /* 420 起：窄到 900px 左右就自动堆成单列，不把列表挤成窄条 */
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  grid-gap: 18px;
  min-width: 0;
}

.ifs-box {
  height: 420px;
  overflow: auto;
  border: 1px solid #e6ebf2;
  border-radius: 6px;
  background: #fbfcfe;

  /* 滚动条皮肤（和全站一致，方便看清滚到哪了） */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: rgba($color-primary, 0.28);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.ifs-ul {
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    padding: 10px 14px 11px;
    border-bottom: 1px solid #eef1f6;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__tag {
    display: inline-block;
    margin-bottom: 5px;
    padding: 0 6px;
    border-radius: 3px;
    background: rgba($color-primary, 0.1);
    color: $color-primary;
    font-size: 11px;
    line-height: 18px;

    &--grey {
      background: #f0f2f5;
      color: #909399;
    }

    &--line {
      background: transparent;
      box-shadow: inset 0 0 0 1px rgba($color-primary, 0.45);
    }
  }

  &__title {
    margin: 0 0 4px;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
    color: #2c3340;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__meta {
    margin: 0;
    font-size: 12px;
    color: #9aa4b2;
  }
}

/* ---------- 探针 ---------- */
.ifs-probe {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.8;
  color: $color-6;

  b {
    color: $color-primary;
    font-weight: 600;
  }

  &--sub {
    margin-top: 2px;
    color: #9aa4b2;
  }
}

/* ---------- ② 自定义 footer ---------- */
.ifs-manual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 4px 0;

  &__hint {
    margin-left: 10px;
    font-style: normal;
    font-size: 12px;
    color: #9aa4b2;
  }

  &__done {
    font-size: 12px;
    color: #c0c6d0;
  }
}

/* ---------- ③ 指令版左右分栏 ---------- */
.ifs-split {
  display: flex;
  flex-wrap: wrap;

  > *:not(:last-child) {
    margin-right: 20px;
  }

  &__main {
    flex: 1 1 520px;
    max-width: 780px;
    min-width: 0;
  }

  &__side {
    flex: 1 1 300px;
    min-width: 280px;
    padding: 14px 16px;
    border-radius: 6px;
    background: #f7f9fd;
  }
}

.ifs-side {
  &__t {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: #2c3340;
  }

  &__list {
    margin: 0 0 12px;
    padding-left: 16px;
    list-style: disc;

    li {
      margin-bottom: 8px;
      font-size: 12px;
      line-height: 1.85;
      color: #5b6472;

      &:last-child {
        margin-bottom: 0;
      }
    }

    code {
      padding: 0 3px;
      border-radius: 2px;
      background: #e8f0ff;
      color: $color-primary;
      font-size: 11px;
    }

    strong {
      color: #2c3340;
    }
  }
}

/* 指令版底部（自己写的，不是组件的 footer） */
.ifs-dir-end {
  margin: 0;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 20px;
  color: #a8b0bd;
  text-align: center;
  user-select: none;

  i {
    margin-right: 4px;
    color: $color-primary;
  }
}

/* ---------- 表格 / 折叠 ---------- */
.ifs-table {
  margin-bottom: 14px;
}

.ifs-collapse {
  ::v-deep .el-collapse-item__header {
    font-size: 13px;
  }
}
</style>
