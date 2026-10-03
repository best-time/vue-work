<template>
  <div class="sd">
    <h2>简易骨架屏 · v-skeleton / sk* 占位块</h2>
    <p class="sd__tip">
      源码 <code>src/utils/skeleton/index.js</code>（样式运行时注入，不依赖
      scss，任何文件里 import 就能用）。<br />
      三种用法：① <code>v-skeleton="loading"</code> 给已有真实节点套骨架态（一份
      DOM 两态、尺寸不抖动）&nbsp;·&nbsp; ②
      <code>v-bind="skRect(120, 16)"</code> 手摆骨架块 &nbsp;·&nbsp; ③
      <code>renderSkeleton(h, 'card')</code> 预设一把出整块骨架。
    </p>

    <!-- ================= 总控 ================= -->
    <el-card shadow="never" class="sd__card sd__card--ctrl">
      <div slot="header">总控 · 切换 loading，看 ①②③④ 各区块的变化</div>
      <div class="sd-ctrl">
        <el-switch
          v-model="loading"
          active-text="loading"
          inactive-text="loaded"
        />
        <el-button type="primary" size="small" @click="reload">
          模拟请求（1.5s 后返回数据）
        </el-button>
        <span class="sd-ctrl__state">
          loading = <b>{{ loading }}</b>
        </span>
      </div>
      <p class="sd__tip sd__tip--inline">
        骨架屏的两种接法：<strong>同构</strong>（真实 DOM
        已经在了，加载中把它变灰块 → 用指令）和
        <strong>异构</strong>（还没有数据，用占位块/预设先搭一个 →
        <code>sk*</code> / <code>renderSkeleton</code>）。下面两种都演示了。
      </p>
    </el-card>

    <!-- ================= ① 指令最小用法 ================= -->
    <el-card shadow="never" class="sd__card">
      <div slot="header">
        ① <code>v-skeleton="loading"</code> · 一份 DOM 两态，尺寸不抖动
      </div>
      <div class="sd-cmp">
        <div class="sd-cmp__col">
          <p class="sd-cmp__cap">不加指令（始终是真实内容）</p>
          <div class="sd-real">
            <h3 class="sd-real__title">本周工作计划</h3>
            <p class="sd-real__desc">
              把骨架屏接到列表页，加载中先出灰块，数据回来自动变回真实内容。
            </p>
          </div>
        </div>
        <div class="sd-cmp__col">
          <p class="sd-cmp__cap">
            加上 <code>v-skeleton="loading"</code>（右边跟随总控开关）
          </p>
          <div ref="probe" class="sd-real sd-real--probe">
            <h3 v-skeleton="loading" class="sd-real__title">本周工作计划</h3>
            <p v-skeleton="loading" class="sd-real__desc">
              把骨架屏接到列表页，加载中先出灰块，数据回来自动变回真实内容。
            </p>
          </div>
        </div>
      </div>
      <p class="sd__tip sd__tip--inline">
        右侧容器实测尺寸：<code>{{ probeSize }}</code> —— 切换 loading 前后
        <strong>完全一致</strong>：文字只是 <code>color: transparent</code>，
        仍然占着原来的文档流位置，所以不会像
        <code>v-if</code> 那样把页面顶得一跳。
      </p>
      <pre class="sd__code">{{ CODE.directive }}</pre>
    </el-card>

    <!-- ================= ② 指令参数 ================= -->
    <el-card shadow="never" class="sd__card">
      <div slot="header">② 指令参数 · radius / tone / animated / 尺寸兜底</div>
      <div class="sd-params">
        <div v-for="p in params" :key="p.key" class="sd-params__box">
          <p class="sd-params__cap">{{ p.cap }}</p>
          <div
            v-skeleton="p.value"
            :class="[
              'sd-skin',
              p.key === 'size' ? 'sd-skin--size' : 'sd-skin--tall',
            ]"
          >
            {{ p.text }}
          </div>
        </div>
      </div>
      <pre class="sd__code">{{ CODE.params }}</pre>
      <p class="sd__tip sd__tip--inline">
        ⚠️ 指令靠<strong>内容撑开尺寸</strong>：内容为空时元素高度会塌成
        0，骨架块也就看不见了。 这种情况给 <code>width</code> /
        <code>height</code> 兜底参数（见
        <code>no-content</code> 那格），或者干脆改用占位块（③）。
      </p>
    </el-card>

    <!-- ================= ③ 原子块 ================= -->
    <el-card shadow="never" class="sd__card">
      <div slot="header">
        ③ 占位块原子 · <code>v-bind="skRect(120, 16)"</code>
      </div>
      <p class="sd__sub">
        这些函数返回 <code>{ class, style }</code>，直接
        <code>v-bind</code> 就能用（class 会合并、style 会绑定）。
      </p>
      <div class="sd-atoms">
        <div v-for="a in atomList" :key="a.name" class="sd-atoms__item">
          <div v-bind="a.block" />
          <code>{{ a.name }}</code>
        </div>
      </div>
      <pre class="sd__code">{{ CODE.atoms }}</pre>
    </el-card>

    <!-- ================= ④ 段落 skLines ================= -->
    <el-card shadow="never" class="sd__card">
      <div slot="header">
        ④ 段落 · <code>skLines(4)</code>（末行自动收窄 60%）
      </div>
      <div class="sd-lines">
        <div v-for="(it, i) in lineBlocks" :key="i" v-bind="it" />
      </div>
      <pre class="sd__code">{{ CODE.lines }}</pre>
      <p class="sd__tip sd__tip--inline">
        <code>skLines(count, { gap, height, width, lastRatio })</code>
        返回的就是普通对象数组，<code>v-for</code> +
        <code>v-bind</code> 循环出来即可。
      </p>
    </el-card>

    <!-- ================= ⑤ 预设结构 ================= -->
    <el-card shadow="never" class="sd__card sd__card--wide">
      <div slot="header">
        ⑤ 预设结构 · <code>renderSkeleton(h, 'card' | 'list' | 'article')</code>
      </div>
      <p class="sd__sub">
        下面三块是<strong>函数式组件</strong>
        <code>&lt;sk-preset&gt;</code> 渲染出来的， 内部只有一句
        <code>renderSkeleton(h, ctx.props.name, ctx.props.options)</code>。
      </p>
      <div class="sd-presets">
        <div v-for="p in presetList" :key="p.name" class="sd-presets__box">
          <p class="sd-presets__cap">
            <code>{{ p.call }}</code>
          </p>
          <sk-preset :name="p.name" :options="p.options" />
        </div>
      </div>
      <pre class="sd__code">{{ CODE.preset }}</pre>
    </el-card>

    <!-- ================= ⑥ 真实请求 + 淡入 ================= -->
    <el-card shadow="never" class="sd__card sd__card--wide">
      <div slot="header">
        ⑥ 实战 · 列表页：请求中出骨架，数据回来淡入（<code
          >&lt;transition name="sk-fade"&gt;</code
        >）
      </div>
      <div class="sd-list__bar">
        <el-button type="primary" size="small" @click="fetchList">
          重新请求（1.5s）
        </el-button>
        <span class="sd-ctrl__state">
          listLoading = <b>{{ listLoading }}</b> · rows = {{ rows.length }}
        </span>
      </div>
      <div class="sd-list__body">
        <transition name="sk-fade" mode="out-in">
          <div v-if="listLoading" key="sk" class="sd-list__sk">
            <sk-preset name="list" :options="{ count: 3 }" />
          </div>
          <ul v-else key="real" class="sd-ul">
            <li v-for="r in rows" :key="r.name" class="sd-ul__item">
              <span class="sd-ul__avatar">{{ r.name.charAt(0) }}</span>
              <span class="sd-ul__main">
                <b>{{ r.name }}</b>
                <em>{{ r.desc }}</em>
              </span>
            </li>
          </ul>
        </transition>
      </div>
      <pre class="sd__code">{{ CODE.fade }}</pre>
    </el-card>

    <!-- ================= ⑦ 换肤 ================= -->
    <el-card shadow="never" class="sd__card">
      <div slot="header">
        ⑦ 换肤 · <code>setSkeletonTheme</code> / 局部 <code>.sk--dark</code>
      </div>
      <div class="sd-ctrl">
        <el-button
          v-for="t in themes"
          :key="t.name"
          size="small"
          :type="themeName === t.name ? 'primary' : 'default'"
          @click="applyTheme(t)"
        >
          {{ t.cap }}
        </el-button>
        <el-button size="small" @click="applyTheme(null)">恢复默认</el-button>
      </div>
      <div class="sd-cmp sd-cmp--mt">
        <div class="sd-cmp__col">
          <p class="sd-cmp__cap">全局主题（当前：{{ themeName || "默认" }}）</p>
          <div class="sd-real">
            <h3 v-skeleton="true" class="sd-real__title">跟着全局主题走</h3>
            <div v-bind="pageLines[0]" />
            <div v-bind="pageLines[1]" />
          </div>
        </div>
        <div class="sd-cmp__col">
          <p class="sd-cmp__cap">
            局部暗色（祖先加 <code>class="sk--dark"</code>，靠 CSS 变量继承）
          </p>
          <div class="sd-real sd-real--dark sk--dark">
            <h3 v-skeleton="true" class="sd-real__title">这一段是暗色</h3>
            <div v-bind="pageLines[0]" />
            <div v-bind="pageLines[1]" />
          </div>
        </div>
      </div>
      <pre class="sd__code">{{ CODE.theme }}</pre>
    </el-card>

    <!-- ================= ⑧ 注入的样式 + 注意事项 ================= -->
    <el-card shadow="never" class="sd__card sd__card--wide">
      <div slot="header">⑧ 运行时注入的样式（真实文本）+ 注意事项</div>
      <el-collapse v-model="openCss">
        <el-collapse-item
          name="css"
          title="展开看注入的完整 CSS（<style data-skeleton>）"
        >
          <pre class="sd__code sd__code--scroll">{{ css }}</pre>
        </el-collapse-item>
      </el-collapse>
      <el-table :data="notes" size="small" border class="sd-table">
        <el-table-column prop="topic" label="注意点" width="150" />
        <el-table-column prop="detail" label="说明" />
      </el-table>
      <p class="sd__tip sd__tip--inline">
        完整文档见 <code>src/utils/skeleton/README.md</code>；API 表也在里面（含
        <code>skeletonStyles</code> / <code>removeSkeletonStyle</code> /
        <code>this.$skeleton</code> 等）。
      </p>
    </el-card>
  </div>
</template>

<script>
import {
  sk,
  skLine,
  skCircle,
  skRect,
  skLines,
  renderSkeleton,
  setSkeletonTheme,
  clearSkeletonTheme,
  getSkeletonCss,
} from "@/utils/skeleton";

/** 预设骨架的函数式组件：内部只有一句 renderSkeleton */
const SkPreset = {
  functional: true,
  props: {
    name: { type: String, default: "card" },
    options: { type: Object, default: () => ({}) },
  },
  render: (h, ctx) => renderSkeleton(h, ctx.props.name, ctx.props.options),
};

/** ⑥ 里「真实请求」返回的数据 */
const MOCK_ROWS = [
  { name: "张伟", desc: "把首页接上骨架屏，首屏不再白屏" },
  { name: "李娜", desc: "补充列表页在弱网下的加载体验" },
  { name: "王强", desc: "骨架屏样式接入设计稿走查" },
];

export default {
  name: "SkeletonDemo",
  components: { SkPreset },
  data() {
    return {
      loading: true,
      listLoading: true,
      rows: [],
      probeSize: "",
      themeName: "",
      openCss: [],
      notes: [
        {
          topic: "绑定对象",
          detail: "指令请绑在容器元素（div / p / h3 / 卡片根节点）上",
        },
        {
          topic: "不要绑 img",
          detail:
            "img/video 自身就是内容，没有文字可以变透明；图片请用占位块 + v-if，或绑到父容器",
        },
        {
          topic: "内容不能为空",
          detail:
            "指令靠内容撑开高度，空内容塌成 0；给 width/height 参数兜底，或改用 skRect",
        },
        {
          topic: "骨架态不可点",
          detail: "开启时临时 pointer-events: none，避免加载中点到里面的按钮",
        },
        {
          topic: "动效可关",
          detail:
            "内置 prefers-reduced-motion 适配；也可 animated: false 或全局 --sk-duration: 0s",
        },
        {
          topic: "类名前缀",
          detail:
            "统一 sk 前缀 + CSS 变量主题，不入侵项目原有样式；样式运行时注入一次",
        },
      ],
      atomList: [],
      lineBlocks: [],
      presetList: [
        {
          name: "card",
          call: 'renderSkeleton(h, "card", { lines: 2 })',
          options: { lines: 2 },
        },
        {
          name: "list",
          call: 'renderSkeleton(h, "list", { count: 2 })',
          options: { count: 2 },
        },
        {
          name: "article",
          call: 'renderSkeleton(h, "article", { lines: 4 })',
          options: { lines: 4 },
        },
      ],
      themes: [
        {
          name: "blue",
          cap: "蓝色调",
          theme: { base: "#dfe9ff", highlight: "#f2f7ff", duration: "1.2s" },
        },
        {
          name: "warm",
          cap: "暖色调",
          theme: { base: "#f2ece4", highlight: "#fdfaf6", duration: "1.6s" },
        },
        { name: "slow", cap: "慢速微光", theme: { duration: "3s" } },
      ],
    };
  },
  computed: {
    /** ② 指令参数对照：value 跟着 loading 走 */
    params() {
      return [
        {
          key: "default",
          cap: "默认",
          text: "圆角继承 --sk-radius",
          value: this.loading,
        },
        {
          key: "radius",
          cap: "radius: 12",
          text: "圆角 12px",
          value: { loading: this.loading, radius: 12 },
        },
        {
          key: "dark",
          cap: "tone: 'dark'",
          text: "暗色骨架",
          value: { loading: this.loading, tone: "dark" },
        },
        {
          key: "static",
          cap: "animated: false",
          text: "无微光动画",
          value: { loading: this.loading, animated: false },
        },
        {
          key: "size",
          cap: "width / height 兜底（内容为空）",
          text: "",
          value: { loading: this.loading, width: 160, height: 44 },
        },
      ];
    },
    /** ① 指令：真实内容 + 一行指令 */
    CODE() {
      return {
        directive: `<!-- 一份 DOM 两态：文字透明但仍占位，尺寸不变 -->
<h3 v-skeleton="loading">本周工作计划</h3>
<p  v-skeleton="loading">把骨架屏接到列表页……</p>

<!-- 等价于给元素加属性 data-sk="on" + sk--animated 类 -->
<!-- 关闭时移除属性，并还原被改过的内联样式 -->`,
        params: `<!-- 布尔开关 -->
<div v-skeleton="loading">默认（圆角继承 --sk-radius）</div>

<!-- 对象：loading / width / height / radius / animated / tone / class -->
<div v-skeleton="{ loading, radius: 12 }">圆角 12px</div>
<div v-skeleton="{ loading, tone: 'dark' }">暗色骨架</div>
<div v-skeleton="{ loading, animated: false }">无微光动画</div>
<div v-skeleton="{ loading, width: 160, height: 44 }">内容为空时用尺寸兜底</div>`,
        atoms: this.atomCode,
        lines: `import { skLines } from '@/utils/skeleton'

<!-- 默认 3 行、行距 12、末行 60% -->
<div v-for="(it, i) in skLines(4)" :key="i" v-bind="it" />

<!-- 每行返回的就是：{ class: 'sk sk--animated', style: { width, height, borderRadius, marginBottom } } -->
${JSON.stringify(this.lineBlocks, null, 2)}`,
        preset: `import { renderSkeleton } from '@/utils/skeleton'

// 包成函数式组件，模板里当普通标签用
const SkPreset = {
  functional: true,
  props: { name: String, options: Object },
  render: (h, ctx) => renderSkeleton(h, ctx.props.name, ctx.props.options || {})
}

<sk-preset name="card"    :options="{ lines: 2 }" />
<sk-preset name="list"    :options="{ count: 3, avatarSize: 40 }" />
<sk-preset name="article" :options="{ lines: 6 }" />`,
        fade: `<!-- 骨架 → 真实内容，用内置的 sk-fade 过渡类 -->
<transition name="sk-fade" mode="out-in">
  <div v-if="listLoading" key="sk">
    <sk-preset name="list" :options="{ count: 3 }" />
  </div>
  <ul v-else key="real">
    <li v-for="r in rows" :key="r.name">{{ r.name }} — {{ r.desc }}</li>
  </ul>
</transition>`,
        theme: `import { setSkeletonTheme, clearSkeletonTheme } from '@/utils/skeleton'

/* 全局换肤：写到 documentElement 的内联 CSS 变量上 */
setSkeletonTheme({ base: '#dfe9ff', highlight: '#f2f7ff', duration: '1.2s' })
clearSkeletonTheme()

/* 局部暗色：套在任意祖先上即可（CSS 变量继承） */
<div class="sk--dark"> … v-bind="skLine('80%')" … </div>`,
      };
    },
    css() {
      return getSkeletonCss();
    },
    /** ③ 把真实返回值贴出来（对齐展示，不用 padEnd，避免旧浏览器 polyfill 依赖） */
    atomCode() {
      const w = this.atomList.reduce((m, a) => Math.max(m, a.name.length), 0);
      return this.atomList
        .map(
          (a) =>
            a.name +
            " ".repeat(w - a.name.length) +
            "  ->  " +
            JSON.stringify(a.block)
        )
        .join("\n");
    },
    pageLines() {
      return skLines(2, { gap: 8, height: 12 });
    },
  },
  watch: {
    loading() {
      this.$nextTick(this.measure);
    },
  },
  created() {
    // ③ 原子块
    this.atomList = [
      { name: "skRect(120, 16)", block: skRect(120, 16) },
      {
        name: "skRect(72, 72, { radius: 8 })",
        block: skRect(72, 72, { radius: 8 }),
      },
      { name: "skCircle(48)", block: skCircle(48) },
      { name: "skLine('60%')", block: skLine("60%") },
      {
        name: "sk({ w: 96, h: 96, tone: 'dark' })",
        block: sk({ w: 96, h: 96, tone: "dark" }),
      },
      {
        name: "sk({ w: 140, h: 24, animated: false })",
        block: sk({ w: 140, h: 24, animated: false }),
      },
    ];
    // ④ 段落
    this.lineBlocks = skLines(4, { gap: 10 });
  },
  mounted() {
    this.measure();
    this.reload();
    this.fetchList();
  },
  beforeDestroy() {
    clearTimeout(this.__timer);
    clearTimeout(this.__listTimer);
  },
  methods: {
    /** 总控：模拟一次请求 */
    reload() {
      clearTimeout(this.__timer);
      this.loading = true;
      this.__timer = setTimeout(() => {
        this.loading = false;
        this.$nextTick(this.measure);
      }, 1500);
    },
    /** ⑥ 列表页：骨架 → 真实数据 */
    fetchList() {
      clearTimeout(this.__listTimer);
      this.listLoading = true;
      this.rows = [];
      this.__listTimer = setTimeout(() => {
        this.rows = MOCK_ROWS;
        this.listLoading = false;
      }, 1500);
    },
    /** ① 量右侧容器尺寸，证明切换 loading 前后不变 */
    measure() {
      const el = this.$refs.probe;
      if (!el) return;
      const r = el.getBoundingClientRect();
      this.probeSize =
        Math.round(r.width) + " × " + Math.round(r.height) + " px";
    },
    applyTheme(t) {
      if (!t) {
        clearSkeletonTheme();
        this.themeName = "";
        return;
      }
      setSkeletonTheme(t.theme);
      this.themeName = t.cap;
    },
  },
};
</script>

<style lang="scss" scoped>
.sd {
  padding: 20px 24px 60px;
  font-size: 20px;
  color: #303133;

  &__tip {
    margin: 0 0 18px;
    padding: 10px 12px;
    background: #f4f8ff;
    border-left: 3px solid #326fff;
    border-radius: 2px;
    font-size: 13px;
    line-height: 1.9;
    color: #4a5568;

    &--inline {
      margin: 12px 0 0;
    }

    code {
      padding: 0 4px;
      background: #e8f0ff;
      border-radius: 2px;
      color: #326fff;
      font-size: 12px;
    }
  }

  &__card {
    margin-bottom: 20px;

    &--wide {
      ::v-deep .el-card__body {
        padding-top: 12px;
      }
    }

    &--ctrl {
      ::v-deep .el-card__header {
        font-weight: 600;
      }
    }
  }

  &__sub {
    margin: 0 0 8px;
    font-size: 13px;
    color: #606266;

    code {
      padding: 0 4px;
      background: #f0f2f5;
      border-radius: 2px;
      color: #326fff;
    }
  }

  &__code {
    margin: 8px 0 0;
    padding: 12px 14px;
    background: #f6f8fa;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.7;
    color: #24292e;
    white-space: pre-wrap;
    word-break: break-all;

    &--scroll {
      max-height: 320px;
      overflow: auto;
    }
  }
}

/* ---------- 总控 ---------- */
.sd-ctrl {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  &__state {
    font-size: 13px;
    color: #606266;

    b {
      color: #326fff;
    }
  }
}

/* ---------- ① 左右对照 ---------- */
.sd-cmp {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;

  &--mt {
    margin-top: 16px;
  }

  &__col {
    flex: 1 1 300px;
    min-width: 0;
  }

  &__cap {
    margin: 0 0 8px;
    font-size: 12px;
    color: #909399;

    code {
      color: #326fff;
    }
  }
}

.sd-real {
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;

  &--dark {
    background: #23262d;
    border-color: #3b4350;

    .sd-real__title,
    .sd-real__desc {
      color: #cfd4dc;
    }
  }

  &__title {
    margin: 0 0 10px;
    font-size: 18px;
    line-height: 1.4;
  }

  &__desc {
    margin: 0;
    font-size: 13px;
    line-height: 1.9;
    color: #606266;
  }
}

/* ---------- ② 参数格 ---------- */
.sd-params {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;

  &__box {
    min-width: 0;
  }

  &__cap {
    margin: 0 0 8px;
    font-size: 12px;
    color: #909399;
  }
}

.sd-skin {
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.8;
  color: #303133;

  &--tall {
    min-height: 68px;
  }

  /* 尺寸兜底那格故意不给 min-height：height: 44 才能真的生效 */
  &--size {
    min-height: 0;
  }
}

/* ---------- ③ 原子块 ---------- */
.sd-atoms {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;

    code {
      font-size: 12px;
      color: #606266;
    }
  }
}

/* ---------- ④ 段落 ---------- */
.sd-lines {
  width: 420px;
  max-width: 100%;
}

/* ---------- ⑤ 预设 ---------- */
.sd-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;

  &__box {
    min-width: 0;
  }

  &__cap {
    margin: 0 0 10px;
    font-size: 12px;
    color: #909399;

    code {
      color: #326fff;
    }
  }
}

/* ---------- ⑥ 列表 ---------- */
.sd-list {
  &__bar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  &__body {
    min-height: 232px;
  }

  &__sk {
    padding: 2px 0;
  }
}

.sd-ul {
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f2f5;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__avatar {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #326fff;
    color: #fff;
    font-size: 15px;
    text-align: center;
    line-height: 40px;
  }

  &__main {
    min-width: 0;

    b {
      display: block;
      font-size: 14px;
    }

    em {
      font-style: normal;
      font-size: 12px;
      color: #909399;
    }
  }
}

.sd-table {
  margin-top: 14px;
}
</style>
