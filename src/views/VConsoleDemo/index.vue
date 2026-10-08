<template>
  <div class="vd">
    <h2>简易 vConsole · 移动端调试面板</h2>
    <p class="vd__tip">
      源码 <code>src/utils/vconsole/index.js</code>（零依赖，样式运行时注入；面板是原生
      DOM，不占 Vue 组件树，也不依赖 scss / vue.config.js）。<br />
      右下角悬浮球 → <strong>Log / Network / System / Storage</strong> 四个面板，底部命令栏可直接跑
      JS（↑↓ 翻历史）。本页 <code>mounted</code> 时已自动
      <code>VConsole.init()</code>，下面每个按钮都会喂数据给它。
    </p>

    <!-- ===================== ① 总控 ===================== -->
    <el-card shadow="never" class="vd__card vd__card--ctrl">
      <div slot="header">① 总控 · init / 显隐 / 位置 / 悬浮球</div>
      <div class="vd-ctrl">
        <el-button
          size="small"
          :type="inited ? 'danger' : 'primary'"
          @click="toggleInit"
        >
          {{ inited ? "destroy()" : "init()" }}
        </el-button>
        <el-button size="small" @click="api.show">show()</el-button>
        <el-button size="small" @click="api.hide">hide()</el-button>
        <el-button size="small" @click="api.toggle">toggle()</el-button>
        <el-button size="small" @click="api.clear">clear()</el-button>
        <el-switch v-model="ballVisible" active-text="悬浮球" @change="onBall" />
        <el-radio-group v-model="posKey" size="mini" @change="onPos">
          <el-radio-button label="rb">右下</el-radio-button>
          <el-radio-button label="lb">左下</el-radio-button>
          <el-radio-button label="rt">右上</el-radio-button>
        </el-radio-group>
      </div>
      <p class="vd__tip vd__tip--inline">
        实时状态：inited = <b>{{ inited }}</b> &nbsp;·&nbsp; open = <b>{{ open }}</b> &nbsp;·&nbsp;
        tab = <b>{{ curTab }}</b> &nbsp;·&nbsp; logs = <b>{{ logsCount }}</b> &nbsp;·&nbsp; networks =
        <b>{{ netsCount }}</b> &nbsp;·&nbsp; 未读角标 = <b>{{ badge }}</b>
      </p>
      <p class="vd__tip vd__tip--inline">
        <code>destroy()</code> 会把 <code>console</code> / <code>XMLHttpRequest</code> /
        <code>fetch</code> 和错误监听<strong>原样还回去</strong>，并移除面板 DOM
        与注入的样式 —— 所以生产环境可以安全地只在 dev 打开。
      </p>
      <pre class="vd__code">{{ CODE.init }}</pre>
    </el-card>

    <!-- ===================== ② Log ===================== -->
    <el-card shadow="never" class="vd__card">
      <div slot="header">② Log 面板 · 拦截 console + 未捕获错误</div>
      <div class="vd-btns">
        <el-button size="small" @click="logPlain">log 多参数 + 对象</el-button>
        <el-button size="small" @click="logInfo">info + 数组</el-button>
        <el-button size="small" @click="logWarn">warn</el-button>
        <el-button size="small" @click="logError">error（Error 对象带 stack）</el-button>
        <el-button size="small" @click="logCircular">循环引用对象</el-button>
        <el-button size="small" @click="logLong">超长字符串</el-button>
        <el-button size="small" @click="logNode">DOM 节点 / Vue 实例</el-button>
        <el-button size="small" type="warning" @click="logThrow">
          未捕获错误 → onerror
        </el-button>
        <el-button size="small" type="warning" @click="logReject">
          未处理 rejection
        </el-button>
        <el-button size="small" type="primary" @click="logDirect">
          走 API 主动写日志
        </el-button>
      </div>
      <p class="vd__tip vd__tip--inline">
        面板收起时新日志会在悬浮球上累计<strong>红色角标</strong>（只统计 error / warn），切到 Log
        面板自动清零。<br />
        单条日志点击可展开完整内容（默认限高 4.6em，长堆栈 / 大对象不会把面板撑爆）。
      </p>
      <pre class="vd__code">{{ CODE.log }}</pre>
    </el-card>

    <!-- ===================== ③ Network ===================== -->
    <el-card shadow="never" class="vd__card">
      <div slot="header">③ Network 面板 · 拦截 XHR + fetch</div>
      <div class="vd-btns">
        <el-button size="small" @click="netXhr200">XHR GET /（200）</el-button>
        <el-button size="small" @click="netXhr404">XHR GET 不存在的路径</el-button>
        <el-button size="small" type="warning" @click="netXhrError">XHR 非法协议（status 0）</el-button>
        <el-button size="small" @click="netFetch200">fetch GET /（200）</el-button>
        <el-button size="small" @click="netFetchPost">fetch POST（带 body / 自定义头）</el-button>
        <el-button size="small" type="warning" @click="netFetchFail">
          fetch 拒绝（非法协议）
        </el-button>
        <el-button size="small" @click="api.switchTab('network'); api.show()">
          切到 Network 面板
        </el-button>
      </div>
      <p class="vd__tip vd__tip--inline">
        点网络条目<strong>展开</strong>：URL、状态、耗时、请求头 / 请求体 / 响应头 / 响应体（各截断
        <code>maxBody</code> 字符）。<br />
        ⚠️ 顺带一个 dev 陷阱：「不存在的路径」在 dev server 下<strong>也是 200</strong> ——
        CLI 4 的 <code>historyApiFallback</code> 会把未知路径（<code>.js</code> 后缀也一样）
        rewrite 成 <code>index.html</code>。想验证 4xx / 5xx 的红色条目，用「非法协议」那个按钮。<br />
        fetch 的响应体是<strong>异步读的</strong> —— 面板内部在 <code>then</code>
        里立刻 <code>res.clone()</code>，展开时才 <code>text()</code>，既不消耗业务那份响应，也不阻塞渲染。
      </p>
      <pre class="vd__code">{{ CODE.network }}</pre>
    </el-card>

    <!-- ===================== ④ System ===================== -->
    <el-card shadow="never" class="vd__card">
      <div slot="header">④ System 面板 · 环境信息</div>
      <el-button size="small" type="primary" @click="api.switchTab('system'); api.show()">
        打开 System 面板
      </el-button>
      <p class="vd__tip vd__tip--inline">
        UA、平台、语言、屏幕、视口、DPR、在线状态、网络类型（<code>navigator.connection</code>）、
        时区、Cookie 开关、JS 堆占用、当前地址、面板打开时间。切到该面板时实时采集，面板内点「刷新」可重取。
      </p>
    </el-card>

    <!-- ===================== ⑤ Storage ===================== -->
    <el-card shadow="never" class="vd__card">
      <div slot="header">⑤ Storage 面板 · localStorage / sessionStorage / cookie</div>
      <div class="vd-btns">
        <el-button size="small" type="primary" @click="seedStorage">写入测试数据</el-button>
        <el-button size="small" @click="clearStorage">清掉测试数据</el-button>
        <el-button size="small" @click="api.switchTab('storage'); api.show()">
          打开 Storage 面板
        </el-button>
      </div>
      <p class="vd__tip vd__tip--inline">
        面板里每项后面都有「删除」按钮 —— <strong>点它是真的删</strong>（
        <code>removeItem</code>），不只是展示。cookie 那组用
        <code>max-age=0</code> 删除。
      </p>
      <pre class="vd__code">{{ CODE.storage }}</pre>
    </el-card>

    <!-- ===================== ⑥ 命令栏 ===================== -->
    <el-card shadow="never" class="vd__card">
      <div slot="header">⑥ 底部命令栏 · 直接跑 JS</div>
      <p class="vd__sub">打开面板后，底部输入框回车即执行；<code>↑</code> <code>↓</code> 翻历史。</p>
      <pre class="vd__code">{{ CODE.cmd }}</pre>
      <p class="vd__tip vd__tip--inline">
        实现是「先当表达式求值（<code>return (code)</code>），失败再当语句执行」，所以
        <code>location.href</code> 和 <code>localStorage.setItem('a', 1)</code> 都能跑。
        用 <code>new Function</code> 构造 —— <strong>页面 CSP 若禁了 <code>unsafe-eval</code> 会抛错</strong>，
        面板会把异常打到 Log 里，不会静默。
      </p>
    </el-card>

    <!-- ===================== ⑦ API 速查 ===================== -->
    <el-card shadow="never" class="vd__card">
      <div slot="header">⑦ API 速查</div>
      <el-table :data="apiRows" size="mini" border stripe class="vd-table">
        <el-table-column prop="name" label="方法" width="210" />
        <el-table-column prop="desc" label="说明" />
      </el-table>
      <p class="vd__tip vd__tip--inline">
        入口已在模块作用域 <code>install(Vue)</code>，所以组件里可直接写
        <code>this.$vconsole.log(...)</code>（等价于上面的默认导出对象）。
      </p>
    </el-card>

    <!-- ===================== ⑧ 注意事项 ===================== -->
    <el-card shadow="never" class="vd__card">
      <div slot="header">⑧ 注意事项</div>
      <el-table :data="notes" size="mini" border class="vd-table">
        <el-table-column prop="topic" label="事项" width="140" />
        <el-table-column prop="detail" label="说明" />
      </el-table>
      <pre class="vd__code">{{ CODE.init_guard }}</pre>
    </el-card>
  </div>
</template>

<script>
import VConsole from "@/utils/vconsole";

// 故意超过 maxBody(1500)，用来演示面板的截断
const LONG_TEXT =
  "这是一条很长的日志，用来验证面板在长文本下的表现。" +
  "Lorem ipsum dolor sit amet consectetur adipisicing elit. ".repeat(40);

export default {
  name: "VConsoleDemo",

  props: {
    keyType: {
      type: String,
      default: "vConsole"
    }
  },

  data() {
    return {
      inited: false,
      open: false,
      curTab: "log",
      logsCount: 0,
      netsCount: 0,
      badge: 0,
      ballVisible: true,
      posKey: "rb",
      api: VConsole,
      apiRows: [
        { name: "init(options?)", desc: "初始化（幂等）；ball: false 可不开悬浮球" },
        { name: "show() / hide() / toggle()", desc: "面板显隐" },
        { name: "clear()", desc: "清空日志" },
        { name: "switchTab(tab)", desc: "切换 log | network | system | storage（并自动打开）" },
        { name: "setBallVisible(bool)", desc: "显隐悬浮球" },
        { name: "setPosition({ right, bottom })", desc: "调整悬浮球 / 面板位置，支持 left、任意 CSS 长度" },
        { name: "log / info / warn / error / debug(...)", desc: "主动写日志（面板收起也记录）" },
        { name: "getState()", desc: "只读状态快照：logs / networks / tab / options" },
        { name: "destroy()", desc: "还原 console / XHR / fetch，移除 DOM 与样式" },
      ],
      notes: [
        { topic: "生产环境", detail: "不要开：会替换 console / XHR / fetch，面板本身也有体积；用 NODE_ENV 判断" },
        { topic: "只读不改写", detail: "拦截只做记录，不修改请求参数、不改响应内容，透传原方法" },
        { topic: "上限裁剪", detail: "日志默认 800 条、请求 100 条，数组与 DOM 同步丢最早的，挂着不动也不会涨内存" },
        { topic: "对象格式化", detail: "JSON.stringify + 祖先栈 replacer，能标出真正的循环引用；Window / DOM / Vue 实例只给短标记" },
        { topic: "滚动跟随", detail: "只有「面板开着 + 停在 Log + 本来就贴底」才自动滚到底，你上滑看历史时不会被新日志顶走" },
        { topic: "Storage 删除", detail: "面板里的「删除」是真删，操作前自己确认清楚" },
        { topic: "CSP", detail: "命令栏用 new Function，禁了 unsafe-eval 的页面会抛错（异常会打到 Log）" },
        { topic: "入口注册", detail: "模块作用域直接 install(Vue)，import 一次即可；重复 init 无副作用" },
      ],
      CODE: {
        init: `// main.js —— 只在开发环境开
import VConsole from '@/utils/vconsole'
if (process.env.NODE_ENV !== 'production') VConsole.init()

// 带配置
VConsole.init({
  ball: true,                                    // 悬浮球
  position: { right: 12, bottom: 80 },           // 位置
  maxLogs: 800,                                  // 日志上限
  maxBody: 1500,                                 // 响应体截断
  keepConsole: false,                            // 拦截后是否仍输出到原生 console
  defaultTab: 'log',
  theme: { accent: '#326fff', ok: '#4ade80' },    // 覆盖 CSS 变量
})

// 组件里（入口已 install(Vue)）
this.$vconsole.log('任意位置都能写', { a: 1 })`,

        log: `console.log('普通日志', { name: 'vue-work', vue: '2.6.14' })
console.info('提示：接口已降级', [1, 2, 3])
console.warn('警告：本地缓存命中失败')
console.error(new Error('模拟业务错误'))          // 面板里带 stack

// 循环引用：面板标 [Circular]，不会爆栈
const o = { name: 'loop' }
o.self = o
console.log('循环引用', o)

// DOM 节点 / Vue 实例不会把整个页面结构打出来，只给短标记
console.log('节点与实例', document.body, this)     // <body> / [Vue VConsoleDemo]

// 未被捕获的错误也会自动进面板
setTimeout(() => { undefinedFn() })              // → window.onerror
Promise.reject(new Error('未处理的 rejection'))    // → unhandledrejection

// 也可以完全绕开 console，直接走 API
this.$vconsole.log('通过 API 主动写日志')`,

        network: `// ---- XHR：open / setRequestHeader / send 都被包装 ----
const x = new XMLHttpRequest()
x.open('GET', '/__vc_not_found__.js')   // 带后缀，否则 dev server 的 historyFallback 会给 200
x.setRequestHeader('X-Demo', 'vc')      // 会出现在面板的 Request Headers
x.send()                                 // 状态 / 耗时 / 响应体自动记录

// ---- fetch：then 里 clone 一份，展开详情时才读 body ----
fetch('/', { method: 'POST', headers: { 'X-Demo': 'vc' }, body: JSON.stringify({ a: 1 }) })

// ---- 失败的请求：status 0 + 错误信息，条目变红 ----
fetch('bad-scheme://x').catch(() => {})`,

        storage: `localStorage.setItem('vc:token', 'abc123')
localStorage.setItem('vc:user', JSON.stringify({ id: 1, name: '张三' }))
localStorage.setItem('vc:long', '这是一段很长的值，'.repeat(50))
sessionStorage.setItem('vc:tab', 'log')
// 打开 Storage 面板即可查看 / 逐条删除`,

        cmd: `> location.href                 ← "http://localhost:8080/vconsole-demo"
> document.title                 ← "vue-work"
> localStorage.length            ← 4
> $vconsole.getState().logs.length
> $vconsole.getState().options
> new Date().toLocaleString()
> Array.from({ length: 5 }, (_, i) => i * i)`,

        init_guard: `// 只有开发环境才开（生产环境即使误开也建议销毁）
if (process.env.NODE_ENV !== 'production') {
  VConsole.init()
} else if (window.$vconsole) {
  window.$vconsole.destroy()
}`,
      },
    };
  },

  created() {
    this.__timer = null;
  },

  mounted() {
    // demo 方便：把 API 挂到 window，命令栏里可以直接 $vconsole.xxx
    window.$vconsole = VConsole;
    window.__page = this;
    if (!VConsole.getState().inited) VConsole.init();
    this.ballVisible = VConsole.getState().options.ball;
    this.sync();
    // vConsole 的状态在它自己的闭包里，这里定时同步回来展示
    this.__timer = setInterval(this.sync, 400);
  },

  beforeDestroy() {
    clearInterval(this.__timer);
    window.__page = null;
  },

  methods: {
    /** 把 vConsole 内部状态同步到页面上 */
    sync() {
      const s = VConsole.getState();
      this.inited = s.inited;
      this.open = s.open;
      this.curTab = s.tab;
      this.logsCount = s.logs.length;
      this.netsCount = s.networks.length;
      this.badge = s.badge;
    },

    toggleInit() {
      if (this.inited) {
        VConsole.destroy();
      } else {
        VConsole.init();
      }
      this.sync();
    },

    onBall(v) {
      VConsole.setBallVisible(v);
    },

    onPos(key) {
      // setPosition 内部：显式给了 left 就清掉 right，反之亦然
      const map = {
        rb: { right: 12, bottom: 80 },
        lb: { left: 12, bottom: 80 },
        rt: { right: 12, bottom: "calc(100vh - 64px)" },
      };
      VConsole.setPosition(map[key]);
    },

    /* ---------------- Log ---------------- */
    logPlain() {
      console.log("普通日志", { name: "vue-work", vue: "2.6.14", grid: ["grid.scss", "nest.scss"] });
    },
    logInfo() {
      console.info("提示：接口已降级到本地缓存", [1, 2, 3]);
    },
    logWarn() {
      console.warn("警告：本地缓存命中失败，已回源");
    },
    logError() {
      console.error(new Error("模拟业务错误：订单状态不合法"));
    },
    logCircular() {
      const o = { name: "loop", list: [1, 2] };
      o.self = o;
      o.deep = { back: o };
      console.log("循环引用对象", o);
    },
    logLong() {
      console.log(LONG_TEXT);
    },
    logNode() {
      console.log("DOM 节点与 Vue 实例", document.body, this);
    },
    logThrow() {
      setTimeout(() => {
        // eslint-disable-next-line no-undef
        window.__vc_not_exist_fn__();
      }, 0);
    },
    logReject() {
      Promise.reject(new Error("模拟未处理的 rejection"));
    },
    logDirect() {
      VConsole.log("通过 API 主动写日志", { from: "$vconsole.log", time: Date.now() });
    },

    /* ---------------- Network ---------------- */
    netXhr200() {
      const x = new XMLHttpRequest();
      x.open("GET", window.location.pathname);
      x.setRequestHeader("X-Demo", "vc");
      x.send();
    },
    netXhr404() {
      const x = new XMLHttpRequest();
      // dev server 的 historyApiFallback 会把未知路径（连 .js 后缀也一样）rewrite 成
      // index.html → 这里拿到的是 200。部署到 Nginx / 静态服务器后才是 404。
      x.open("GET", "/__vc_not_found__.js");
      x.send();
    },
    netFetch200() {
      fetch(window.location.pathname).catch(() => {});
    },
    netFetchPost() {
      fetch(window.location.pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Demo": "vc" },
        body: JSON.stringify({ a: 1, from: "vconsole-demo" }),
      }).catch(() => {});
    },
    netXhrError() {
      const x = new XMLHttpRequest();
      x.open("GET", "bad-scheme://vc");
      x.onerror = () => {};
      x.send();
    },
    netFetchFail() {
      fetch("bad-scheme://vc").catch(() => {});
    },

    /* ---------------- Storage ---------------- */
    seedStorage() {
      try {
        localStorage.setItem("vc:token", "abc123");
        localStorage.setItem("vc:user", JSON.stringify({ id: 1, name: "张三" }));
        localStorage.setItem("vc:long", "这是一段很长的值，".repeat(50));
        sessionStorage.setItem("vc:tab", "log");
      } catch (e) {
        console.warn("写入 storage 失败", e);
      }
      VConsole.switchTab("storage");
      VConsole.show();
    },
    clearStorage() {
      try {
        ["vc:token", "vc:user", "vc:long"].forEach((k) => localStorage.removeItem(k));
        sessionStorage.removeItem("vc:tab");
      } catch (e) {
        /* ignore */
      }
      VConsole.switchTab("storage");
    },
  },
};
</script>

<style lang="scss" scoped>
.vd {
  padding: 20px 24px 80px;
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
      font-size: 16px;
    }
  }

  &__card {
    margin-bottom: 20px;

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
      font-size: 16px;
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
    overflow-x: auto;
  }

  &__btns {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    ::v-deep .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__ctrl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;

    ::v-deep .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__table {
    font-size: 13px;

    ::v-deep .cell {
      font-size: 13px;
      line-height: 1.7;
      word-break: break-all;
    }
  }
}
</style>
