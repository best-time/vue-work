# 简易 vConsole（`src/utils/vconsole`）

移动端网页调试面板。**零依赖**：样式运行时注入（一个 `<style data-vconsole>`），面板 DOM 用原生 API 拼，
不走 Vue 模板、不依赖 `scss` / `vue.config.js`，任何文件 `import` 就能用。

```js
// main.js —— 只在开发环境开
import VConsole from '@/utils/vconsole'
if (process.env.NODE_ENV !== 'production') VConsole.init()
```

> ⚠️ 生产环境不要开：它会替换 `console` / `XMLHttpRequest` / `fetch`，面板本身也有体积。
> 折中做法：用 `process.env.NODE_ENV` 判断，或者只在需要时手动 `VConsole.init()`。

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
| `VConsole.show()` / `hide()` / `toggle()` | 面板显隐 |
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
- **对象格式化**：`JSON.stringify` + MDN 的「祖先栈」replacer —— 能正确标出真正的循环引用（兄弟节点重复出现的同一对象不会被误判成环）；`Window` / `Document` / Vue 实例 / DOM 节点都给短标记，不会把页面结构整个打出来。
- **异步响应体**：fetch 在 `then` 里立刻 `res.clone()`，展开条目时才 `text()`，既不消耗业务拿到的那份响应，也不阻塞渲染。
- **滚动跟随**：只有在「面板开着 + 停在 Log + 本来就贴着底部」时才自动滚到底，你上滑看历史时不会被新日志顶走。
- **销毁干净**：`destroy()` 把 `console`、`XMLHttpRequest.prototype.open/send/setRequestHeader`、`window.fetch`、错误监听、DOM、样式全部还原。

---

## 五、和真 vConsole 的差距

想更全（Plugin 机制、`Log` 的 `$` 选择器、DOM 树查看、XHR 断点、性能面板）请直接上
[vConsole](https://github.com/Tencent/vConsole) —— 本实现是「够用 + 可读 + 零依赖」，
适合塞进已有项目而不用多加一个 npm 包。
