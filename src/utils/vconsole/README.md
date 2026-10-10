# 简易 vConsole（`src/utils/vconsole`）

移动端网页调试面板。**零依赖**：样式运行时注入（一个 `<style data-vconsole>`），面板 DOM 用原生 API 拼，
不走 Vue 模板、不依赖 `scss` / `vue.config.js`，任何文件 `import` 就能用。

```js
// App.vue —— 全局初始化一次，所有路由页面共用同一个面板实例（本项目当前接法）
export default {
  name: 'App',
  created() {
    if (process.env.NODE_ENV !== 'production') {
      const vc = require('@/utils/vconsole')
      ;(vc.default || vc).init()   // harmony 模块被 require 时默认导出在 .default 上
    }
  },
  beforeDestroy() {
    if (process.env.NODE_ENV !== 'production') {
      const vc = require('@/utils/vconsole')
      ;(vc.default || vc).destroy()
    }
  },
}

// 页面 / 组件里不用再 init，直接用（入口已 install(Vue)）
this.$vconsole.log('任意位置都能写', { a: 1 })
```

> ⚠️ 生产环境不要开：它会替换 `console` / `XMLHttpRequest` / `fetch`，面板本身也有体积。
> 上面的写法里，生产构建时 `'production' !== 'production'` 恒为 false，webpack 的常量折叠会把
> 整个 if 分支（含 `require`）丢掉 —— **vConsole 不会进主包**（已实测构建产物 grep 不到）。
> 放 `created` 而不是 `mounted`：子组件的 mounted 先于父组件执行，`created` 能保证页面组件
> 挂载时面板已就绪；面板 DOM 挂在 `<body>` 下，是应用级单例，切路由不重建。

---

## 一、四个面板

| 面板 | 内容 |
| --- | --- |
| **Log** | 拦截 `console.log / info / warn / error / debug`，多参数、对象、`Error`（带 stack）都能读；`window.onerror` 与 `unhandledrejection` 也自动进面板 |
| **Network** | 拦截 XHR + fetch，记录 method / 状态 / 耗时；点击条目展开请求头、请求体、响应头、响应体（fetch 的响应体是异步读的，展开时才去 `clone()` 里取） |
| **System** | UA、平台、语言、屏幕、视口、DPR、在线状态、网络类型、时区、Cookie、JS 堆、当前地址 |
| **Storage** | localStorage / sessionStorage / cookie 的键值查看与单条删除 |

底部命令栏可直接跑 JS 表达式（`↑` `↓` 翻历史），结果回写到 Log：

```
› window.innerWidth * 2      ← 15:04:21.318  ← 2560
```

悬浮球上的红色角标 = 面板收起期间累积的 **error + warn** 条数，切到 Log 面板自动清零。

---

## 二、API

| 方法 | 说明 |
| --- | --- |
| `VConsole.init(options?)` | 初始化（**幂等**，重复调用无副作用）；`ball: false` 可不开悬浮球 |
| `VConsole.isInited()` | 面板是否真的建起来了（已 init 且 DOM 还在文档里） |
| `VConsole.show()` / `hide()` / `toggle()` | 面板显隐（没 init 过会顺手初始化一次） |
| `VConsole.clear()` | 清空日志 |
| `VConsole.switchTab('log'\|'network'\|'system'\|'storage')` | 切面板（会自动打开） |
| `VConsole.setBallVisible(bool)` | 显隐悬浮球 |
| `VConsole.log(...) / info / warn / error / debug` | 主动写日志（即使面板收起也会记录） |
| `VConsole.destroy()` | 还原 `console` / XHR / `fetch`，移除面板 DOM 与样式 |
| `VConsole.getState()` | 只读状态快照（`logs` / `networks` / `tab`…），调试用 |

Vue 组件里也可以用 `this.$vconsole`（等价于上面这个对象）。

### init 选项

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `ball` | `true` | 是否显示悬浮球 |
| `position` | `{ right: 12, bottom: 80 }` | 悬浮球 / 面板位置（px） |
| `maxLogs` | `800` | 日志上限，超出丢最早的（数组与 DOM 同步裁剪） |
| `maxNetworks` | `100` | 请求记录上限 |
| `maxBody` | `1500` | 文本 / 响应体截断长度 |
| `captureConsole` | `true` | 拦截 `console` |
| `captureError` | `true` | 拦截 `window.onerror` / `unhandledrejection` |
| `captureNetwork` | `true` | 拦截 XHR / `fetch` |
| `keepConsole` | `false` | 拦截的同时是否仍输出到原生 console |
| `defaultTab` | `'log'` | 初始面板 |
| `theme` | `{}` | 覆盖 CSS 变量，见下 |

### 换肤

```js
VConsole.init({
  theme: {
    bg: '#101418',      // 面板底色
    bg2: '#182028',     // 导航 / 命令栏底色
    fg: '#e8eef5',
    dim: '#7b8794',
    accent: '#326fff',  // method / key 高亮
    warn: '#f5c451',
    err: '#ff6b6b',
    ok: '#4ade80',      // 悬浮球文字 / 命令输出
  },
})
```

---

## 三、附带：Vue 组件调试助手（`debug.js`）

同目录的 `debug.js` 是**独立**的一个小工具（和上面的面板没有依赖关系），解决「在控制台里找不到组件实例」：

```js
// main.js —— 必须在 new Vue(...).$mount('#app') 之前
if (process.env.NODE_ENV === 'development') {
  require('@/utils/vconsole/debug')
}
```

控制台里直接可用（也挂在 `this.$debug` 上）：

| API | 说明 |
| --- | --- |
| `$vm` | 根实例（getter，挂载后访问也能拿到） |
| `$getAllVm(opts?)` | 当前存活的全部实例，父在前，跳过抽象组件（`<keep-alive>`） |
| `$findVm('GridDemo')` | 按组件 name 找 → 实例数组；也支持传 `(vm) => boolean` |
| `$firstVm('GridDemo')` | 同上，只取第一个（找不到返回 `null`） |
| `$vmTree(opts?)` | 打印组件树（`⌂ Root / ├─ / └─`），同时返回文本；`{ maxDepth }` 限深 |
| `$inspectVm('GridDemo')` | 打印实例快照：`name / uid / props / propsPassed / data / computed / el` |
| `$vmFromEl(el)` | 从 DOM 节点往上找出它属于哪个组件 |
| `$countVm()` | 按组件名统计数量（找重复渲染 / 内存泄漏） |
| `$forceUpdateAll()` | 强制刷新所有组件 |
| `$debug.getState()` / `$debug.uninstall()` | 只看只读状态 / 完全还原（连 `$mount` 都还回去） |

```
⌂ Root  (uid:0)
└─ App  (uid:1)
   └─ GridDemo  (uid:2)
      ├─ ElCard  (uid:3)
      └─ ElCard  (uid:4)
         └─ ElSlider  (uid:5)
```

**两个必须知道的坑（都在代码注释里写了）**

1. **不要 `new Vue()`**。它不 hook `$mount`，而是自己 new 一个根实例 —— 那个实例根本没 `$mount`，
   `$children` 永远是空的，查不到任何东西。正确做法是 hook `Vue.prototype.$mount`，
   在真根实例挂载的那一刻把它抓下来。
2. **根实例 `$el` 上的 `__vue__` 会被子组件覆盖**。`new Vue({ render: h => h(App) })` 时
   根实例和 `App` 的 `$el` 是同一个 DOM，后跑的 `App._update` 会把 `__vue__` 改成 App 的实例。
   所以「从 DOM 反查根实例」不能断言拿到的是根，必须用 `vm.$root` 回来。

另外：`__vue__` 只在 Vue 2 的 **dev 构建**里有，所以这个工具天生只在开发环境有效（`install` 里有 `NODE_ENV` 判断 + 幂等保护）。

**看 props 的两个词别搞混**：`vm.$props`（快照里的 `props`）是**合并 default 之后**的完整值，`vm.$options.propsData`（快照里的 `propsPassed`）只有父组件真正传的那几个。
`inspectVm` 两个都给，就是为了让你一眼看出某个值是「外面传的」还是「走默认值的」——只看 `propsData` 会把带 default 的 props 全漏掉（这个坑本工具自己也踩过一次）。

---

## 四、实现要点

- **入口注册**：模块作用域直接 `install(Vue)`（项目约定），不依赖 `window.Vue`。
- **日志裁剪**：`logs` 数组和 DOM 子节点同步 `splice / removeChild`，长时间挂着也不会越滚越大。
- **不自我递归**：拦截前先把原生方法 `bind(console)` 存起来，`keepConsole` 时走这份原生引用。
- **对象格式化**：`JSON.stringify` + MDN 的「祖先栈」replacer —— 能正确标出真正的循环引用（兄弟节点重复出现的同一对象不会被误判成环）；`Window` / `Document` / DOM 节点给短标记（`[Window]` / `<div.class>`）。**Vue 实例**不做 `JSON.stringify`（几百个 `_` 开头的内部字段 + 满屏循环引用），只转成两块摘要：`$props`（生效值，并标出父组件真正传了哪几个、哪些走 default）+ `$data`，顶上带 `[Vue 名字 · uid:N]`；长字符串、数组、大对象在摘要里进一步压成 `"abc…+98"` / `[…×9]` / `{…12 个键}`，单条日志点开可看全。
- **实例数组单独走一条路**：`$findVm()` / `$getAllVm()` 返回的是实例数组，整体 `JSON.stringify` 有两个后果 —— ① 刷一屏 `[Vue warn] Property or method "toJSON" is not defined ...`（规范里 `toJSON` 的读取发生在 replacer **之前**，replacer 拦不住；Vue 2 的 dev 代理对实例上不存在的属性就会 warn），② 把整个组件树序列化出来。所以实例数组改成逐个 `formatArg`（每个给一份摘要，>5 个只列前 5 个），其它值进 `JSON.stringify` 之前先过一遍 `sanitizeForJson()`，把任意深度里的实例换成 `[Vue 名字 · uid:N]`（顺带处理循环引用 / DOM / Error / Date / RegExp，且**不调用**用户对象的 `toJSON`）。实测命令栏跑 `$findVm('GridDemo')` 从 51 条 warn → 0 条，1ms 内出结果。
- **异步响应体**：fetch 在 `then` 里立刻 `res.clone()`，展开条目时才 `text()`，既不消耗业务拿到的那份响应，也不阻塞渲染。
- **滚动跟随**：只有在「面板开着 + 停在 Log + 本来就贴着底部」时才自动滚到底，你上滑看历史时不会被新日志顶走。
- **销毁干净**：`destroy()` 把 `console`、`XMLHttpRequest.prototype.open/send/setRequestHeader`、`window.fetch`、错误监听、DOM、样式全部还原。

---

## 五、容错：这些情况都不会炸

面板 DOM、浏览器全局、被替换掉的原生方法，任何一样拿不到都不应该让业务代码崩。取值统一走
`elOf() / listOf()`（内部判 `nodeType` + `isConnected`），拿不到就当作「没有面板」，静默跳过：

| 场景 | 行为 |
| --- | --- |
| 没 `init()` 就调 `hide / switchTab / clear / addLog / setPosition / setBallVisible / destroy` | 不抛；配置先存下来，下次 `init` 自动生效 |
| 没 `init()` 就 `show()` / `toggle()` | 顺手初始化一次（而不是报 `Cannot read classList of undefined`） |
| `destroy()` 之后调任何 API | 不抛；日志仍进 `state.logs`，下次 `init` 会补渲染 |
| 面板 DOM 被业务代码摘掉（`el.root` 不存在 / 已脱离文档） | 按「没有面板」处理，只记录不渲染（不再往野节点上写） |
| 单个元素缺失（badge、`logs` 列表、命令栏输入框） | 只跳过涉及它的更新：角标、滚动到底、追加 DOM 全部判空 |
| `logs` 列表已脱离文档（`parentNode` 为 null） | 滚动跟随安全退出（原先会在这里抛） |
| 脚本写在 `<head>` 里同步执行、`document.body` 还没解析出来 | `init()` 挂一次 `DOMContentLoaded`，DOM 就绪后自动补建，不丢这次调用 |
| 非浏览器环境（SSR / Node / 单测） | `init()` 直接返回 API；`document / window / navigator / screen / performance / Intl` 逐个 `typeof` 兜底 |
| `console` 被冻结 / 只读（部分沙箱） | 跳过该方法的接管，其它方法照常拦截；`destroy()` 写不回去也不抛 |
| `localStorage` / `sessionStorage` 被禁用或中途失效（隐私模式） | 显示「不可用」，渲染时不抛；单条读取失败显示「（读取失败）」 |
| cookie 被沙箱禁用（`document.cookie` 抛 `SecurityError`） | 显示 0 项 |
| cookie 值含非法百分号转义 | `safeDecode` 兜住，不抛 `URIError` |
| XHR 实例不可扩展 / 原型只读 | 放弃记录或整块还原，**请求照发** |
| `fetch` 被其它库包成不返回 Promise | 原样转发，不记录 |
| `init()` 中途任何一步出错 | 回滚 `inited` 标记 + 打一条 `[vconsole] 初始化失败`，不让 import 方崩掉 |

另外顺手修了一个真 bug：fetch 记录原来存的是**原响应**而不是 `res.clone()`，展开详情读响应体时会把业务那份吃掉的流转走——
调用方的 `res.text()` 就会报 `body stream already read`。现在存的是真克隆。

验证：CDP 驱动真实 Chrome，`/tmp/vconsole-test/tolerance.cjs` **78 项断言全过**（destroy 后调用 / DOM 被摘 / console 冻结 /
fetch 克隆 / `document.body` 缺失 + `DOMContentLoaded` 延迟 / 正常功能回归），**零页面告警零异常**；
同一份改动下 debug 助手 51 项断言在两条路由也仍全过。

---

## 六、和真 vConsole 的差距

想更全（Plugin 机制、`Log` 的 `$` 选择器、DOM 树查看、XHR 断点、性能面板）请直接上
[vConsole](https://github.com/Tencent/vConsole) —— 本实现是「够用 + 可读 + 零依赖」，
适合塞进已有项目而不用多加一个 npm 包。
