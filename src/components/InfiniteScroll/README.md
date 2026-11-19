# InfiniteScroll

两套东西，一套入口，都随 `import '@/components/InfiniteScroll'` 全局注册：

| | 注册名 | 谁持有数据 | 适合 |
|---|---|---|---|
| 组件 | `<infinite-scroll>` | 组件（自带分页/去重/状态机） | 普通列表，一把梭 |
| 指令 | `v-scroll-load` | 调用方 | 已有自己的列表逻辑，只缺触底感知 |

演示页：`/infinite-scroll`（源码 `InfiniteScrollDemoPage.vue`）

> ⚠️ 命名：Element UI 2.15 也内置了一个 `v-infinite-scroll`，但注册在 **`InfiniteScroll`（PascalCase）** 键上；
> Vue 解析 `v-infinite-scroll` 的顺序是 **kebab 精确键 → camelCase → PascalCase**。因此：
> - 全局注册一个 `infinite-scroll` 不会「被 Element 覆盖」，而是**反过来把 Element 顶掉**（实测：注册后 Element 的指令不再执行）——
>   等于悄悄抢注全项目的名字，不推荐；
> - 一定要写 `v-infinite-scroll`，就在**组件内局部注册** `directives: { infiniteScroll }`，只影响该组件（实测有效）；
> - 所以本项目的全局指令换名 `v-scroll-load`，两者可并存。

---

## 一、组件 <infinite-scroll>

组件持有列表数据，只管 **滚动感知 + 分页 + 去重 + 状态机**；列表长什么样交给 `#default` 插槽。

### 最小用法

```html
<div ref="box" class="list-box">
  <infinite-scroll
    ref="list"
    container=".list-box"
    :request="fetchList"
    :page-size="10"
    @load="onLoad"
  >
    <template #default="{ list }">
      <div v-for="it in list" :key="it.id" class="row">{{ it.title }}</div>
    </template>
  </infinite-scroll>
</div>
```

```js
methods: {
  // page 从 1 开始；total 可以不给（不给就靠 list.length < pageSize 判到底）
  fetchList({ page, pageSize }) {
    return api.get('/feed', { params: { page, pageSize } })
      .then(res => ({ list: res.rows, total: res.total }))
  }
}
```

```scss
.list-box {
  height: 420px;   /* 必须有确定高度 */
  overflow: auto;  /* 必须真的能滚 */
}
```

### 数据流

```
mounted → load() → 第 1 页
哨兵进入「容器底边 + offset」→ load() → 下一页追加（按 itemKey 去重）
本页条数 < pageSize 或 page*pageSize >= total → finished，底部显示「没有更多了」
请求 reject → error 停住，底部变「点击重试」（不会自动重试）
reload() → seq+1 作废在途请求 → page/list 归零 → 重新拉第 1 页
```

### Props

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `request` | Function | 必填 | `({ page, pageSize }) => Promise<{ list, total } \| Array>` |
| `page-size` | Number | `10` | 每页条数；变化会自动 `reload()` |
| `container` | String/Element/null | `null` | 滚动容器：CSS 选择器 / DOM 元素 / `'window'` / `null`=视口 |
| `offset` | Number | `200` | 距底多少 px 提前触发（IO 的 `rootMargin` 底边扩展） |
| `auto` | Boolean | `true` | `false` = 底部只给「点击加载更多」，滚到底也不自动拉 |
| `auto-fill` | Boolean | `true` | 一页填不满一屏时自动续拉（否则没有滚动条就永远等不到触底） |
| `immediate` | Boolean | `true` | `mounted` 就拉第 1 页 |
| `item-key` | String/Function | `'id'` | 去重用的字段 |
| `loading-text` / `finished-text` / `more-text` / `empty-text` | String | 见源码 | 底部/空态文案 |

### 事件

| 名称 | 参数 | 说明 |
|---|---|---|
| `load` | `{ page, pageSize, count, loaded, total, cost, finished }` | 每页成功后；`count`=本页新增，`loaded`=累计条数 |
| `error` | `Error` | 某页失败（此时组件停住，等 `retry()` 或点击） |
| `reset` | — | `reload()` 时，列表已清空、页码已归零 |
| `ready` | `{ mode: 'io' \| 'scroll', root }` | 观察器绑好（`mode` 可在无 IO 环境下降级） |
| `intersect` | `Boolean` | 哨兵进出可视区 |

### 插槽

| 名称 | 作用域 | 说明 |
|---|---|---|
| `default` | `{ list, page, total, loading, finished, error }` | 列表内容 |
| `empty` | `{ loading, error }` | 空态（首屏加载中不显示，只显示底部条） |
| `footer` | `{ loading, finished, error, page, total, count, load, retry }` | 替换底部状态条 |

### 方法

| 名称 | 说明 |
|---|---|
| `reload()` | 回第 1 页，作废在途请求，容器 `scrollTop` 归零 |
| `loadMore()` | 手动再拉一页（`auto=false` 时给自定义 footer 用） |
| `retry()` | 清掉 error 后重试当前页 |
| `getMetrics()` | `{ scrollTop, clientHeight, scrollHeight, rest }`，做调试探针用 |

### 实现要点 / 坑

1. **用 `IntersectionObserver` 而不是 `scroll`**：滚动回调在惯性滚动里一秒几十次，每次读 `scrollHeight` 都触发同步布局；IO 由浏览器在合成线程判定，只在状态翻转时回调。

2. **观察目标是「哨兵」**：列表末尾那个常驻的底部状态条。它不能随状态 `v-if` 增删，也不能放进列表内部——目标节点一消失，observer 就静默失效（不报错、也不再回调）。

3. **首屏不满一屏 → 永远没有触底**：`pageSize=5` 时一页撑不出滚动条，`scroll` 根本不触发。每次 `load` 完要检查「哨兵还在可视区吗」，是就继续拉（`auto-fill`）。

4. **加载完哨兵仍可见 → 卡住**：IO 只在「相交状态翻转」时回调；内容变长但哨兵还在视口里，就不会再叫你。做法是 `unobserve + observe`——`observe()` 会立即补发一次当前状态。

5. **`container` 必须是祖先**：IO 的 `root` 不能是 target 的兄弟或后代，否则永不回调。组件里做了 `contains()` 校验，不合格时 `console.warn` 并退化为视口观察。

6. **失败后不能自动重试**：出错时哨兵通常仍在可视区，IO 会一直认为「该加载」→ 无限刷接口。所以 `error` 非空时 `load()` 直接返回，只有点击（`force=true`）才继续。

7. **翻页去重**：后端按 offset 分页时两页可能重叠，重复 key 会让列表渲染错位。合并前用 `item-key` 建 `Set` 过滤；一整页全是重复数据时直接 `finished`，避免死循环。

8. **过期响应**：搜索/换条件必须 `seq += 1` 作废在途请求，否则慢响应的旧页会覆盖新条件的结果。

9. **`container` 传选择器而不是 `:container="$refs.box"`**：父组件 render 时 `$refs` 还没赋值，传进去就是 `undefined`（且之后不会更新）。要么用选择器，要么在 `mounted` 后再赋值给绑定的 data。

---

## 二、指令 `v-scroll-load`

指令**不持有数据**：只负责在「快到底了」的时候喊一声，分页、去重、空态、错误态、到底文案都由你写。

### 最小用法

```html
<!-- 函数式：只有触底回调 -->
<div class="list" v-scroll-load="loadMore">…</div>

<!-- 对象式：能控制 distance / disabled / immediate / container -->
<div class="list"
  v-scroll-load="{ handler: loadMore, distance: 160, disabled: loading || finished }">
  <div v-for="it in list" :key="it.id">{{ it.title }}</div>
</div>
```

```js
loadMore({ rest, root, el }) {
  if (this.loading || this.finished) return
  this.loading = true
  // 返回 Promise → 指令自动加锁，请求期间不会再触发
  return api.list({ page: ++this.page, pageSize: 8 }).then(res => {
    this.list = this.list.concat(res.rows)
    this.finished = res.rows.length < 8
    this.loading = false
  })
}
```

### 选项

指令值可以是**函数**（当作 handler），也可以是**对象**：

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `handler` | Function | 必填 | 触底回调，参数 `{ rest, root, el }` |
| `distance` | Number | `160` | 距底多少 px 触发 |
| `disabled` | Boolean | `false` | 唯一刹车：绑 `加载中 \|\| 已到底`，否则加载中还会重复触发 |
| `immediate` | Boolean | `true` | 绑定后先检查一次（首屏不满一屏会直接拉） |
| `container` | String/Element/null | `null` | 滚动容器；不传 = 自己（若带 `overflow:auto/scroll`）→ 最近的可滚祖先 → 视口 |

### 手动补判

```js
this.$refs.box.__scrollLoad__.check()   // 切页签显示、从 display:none 恢复后
this.$refs.box.__scrollLoad__.destroy() // 一般不用，unbind 会自动清理
```

### 与组件版的实现差异

| | 组件 | 指令 |
|---|---|---|
| 滚动感知 | `IntersectionObserver` + 常驻哨兵 | `scroll`（rAF 节流） |
| 「数据变了再判一次」 | `recheck()` 重新 `observe` | `componentUpdated` 钩子 |
| 请求期间防重 | `loading` 闸门 | handler 返回 Promise 自动加锁 |
| 状态 | 组件内置 loading/finished/error | 调用方自己出 |

指令用 scroll 而不是 IO，是因为 IO 必须有个「列表末尾的哨兵节点」才能感知触底，
而指令往用户的 DOM 里塞节点会破坏 `:last-child` 之类的选择器；
反过来指令有 `componentUpdated`（宿主每次更新后触发），拿到的是「数据已经进 DOM」的时机，
比 IO 的「相交状态翻转」更贴近这里的需求。

### 指令的坑

1. **`disabled` 必须绑**。指令不知道你在不在请求，不绑就是「一次到底刷十几次接口」。
2. **指令挂在滚动容器上**最常见：此时容器自己要有确定高度 + `overflow: auto`，否则它不会滚，`rest` 恒为 0，会一直触发。
3. **挂在列表上、容器是祖先**时，`rest` 用「元素底边 − 容器底边」，所以列表后面还有别的卡片也不会误判。
4. 指令值用对象时请每次渲染返回**新对象**（`computed` 里 return 字面量），这样 `disabled` 变化才能被 `update` 钩子读到。
