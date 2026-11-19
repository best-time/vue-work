# VirtualScroll · 性能版滚动（虚拟滚动）

`div` 里 500 / 5 000 / 20 000 条数据，不分页、不删数据，**DOM 里永远只有一屏**。

演示：`/virtual-scroll`（首页「公共组件」分组）

```
src/components/VirtualScroll/
├── VirtualScroll.vue          固定行高，O(1) 定位
├── VirtualScrollDynamic.vue   动态行高，二分 + 实测校正
├── mockData.js                可复现的假数据（含 estHeight 预估）
├── VirtualScrollDemoPage.vue  四路对照 + 压测
└── index.js                   install(Vue) + 导出
```

`main.js` 里 `import '@/components/VirtualScroll'` 后，全局有 `<virtual-scroll>` 和 `<virtual-scroll-dynamic>`。

---

## 一、先说实话：500 条到底卡不卡

本机实测（M 系列 / Chrome headless / 冻结数据），四块并排同一页：

| 数据量 | 方案 | 渲染行数 | DOM 元素 | 挂载 |
| --- | --- | --- | --- | --- |
| 500 | ① 全量 `v-for` | 500 | 3 992 | 15.8 ms |
| 500 | ② 虚拟 · 固定行高 | **21** | **189** | 4.0 ms |
| 500 | ③ 虚拟 · 动态行高 | **8** | **85** | 2.5 ms |
| 500 | ④ 全量 + `content-visibility` | 500 | 3 992 | 5.8 ms |
| 10 000 | ① 全量 `v-for` | 10 000 | 79 639 | **253 ms** |
| 10 000 | ② 虚拟 · 固定行高 | **21** | **189** | 4.5 ms |
| 10 000 | ③ 虚拟 · 动态行高 | **8** | **85** | 16 ms |
| 10 000 | ④ 全量 + `content-visibility` | 10 000 | 79 639 | 78 ms |

500 条时四块**滚动都是满帧**（16.7 ms）—— 这个量级浏览器扛得住，虚拟滚动省的是 3800 个元素的样式计算和内存，不是帧率。
真正的分水岭在 1 万条：全量挂载 253 ms，其中 8 万个元素的布局和首次绘制占大头；虚拟滚动还是 4.5 ms，**和 500 条时一样**。

所以选型的判断标准不是「500 条卡不卡」，而是：

- 数据会不会涨到几千以上？（会 → 虚拟）
- 首屏要不要在 100 ms 内出来？（要 → 虚拟）
- 列表里有没有视频/图表/富文本这种「一行就贵」的内容？（有 → 虚拟，因为离屏的行根本不存在）
- 只有几百条、还要 Ctrl+F 能搜到？（→ 别虚拟，用 ① 或 ④）

---

## 二、`<virtual-scroll>` 固定行高

### 原理：三件事

```html
<div class="vsc" style="height: 420px">
  <div class="vsc__scroller" style="overflow-y: auto; position: relative">  <!-- ⚠️ relative 不能省 -->
    <div class="vsc__phantom" style="height: 24000px"></div>   <!-- ① 撑出滚动条 -->
    <div class="vsc__list" style="transform: translate3d(0, 4704px, 0)">  <!-- ② 摆到第一行的位置 -->
      <div class="vsc__item" style="height: 48px">…</div>      <!-- ③ 只渲染 21 条 -->
    </div>
  </div>
</div>
```

⚠️ **scroller 上的 `position: relative` 不是装饰**。list 是 `position: absolute`，
如果 scroller 是 `static`，list 的包含块会落到更外层的 `.vsc` 上 ——
视觉上看不出任何区别，但**滚轮和触摸板会直接滚页面，怎么滚都不动**
（拖动滚动条却是好的）。因为浏览器按包含块链找滚动目标，发现列表"在布局上不在这个容器里"，就跳过了。
这个 bug 只影响手势滚动，`scrollTop = x` 的赋值和滚动条拖动都正常，所以很容易漏测。
给 scroller 加上 `relative` 后，列表的包含块回到容器内，同时 transform 也只需要写
`start × itemHeight`（滚动量由浏览器自己扣），每帧不用再补偿 `scrollTop`。

1. **撑**：phantom 的高度 = `条数 × 行高`。不撑的话滚动条只有一屏长，根本滚不动。
2. **算**：`start = floor(scrollTop / itemHeight) - buffer`，一个除法，不需要遍历、不需要测量。
3. **迁**：把渲染出来的这一小段 `translate3d` 到它该在的位置。用 transform 不用 `top`，
   因为 transform 不参与布局，改它只走合成，不会触发 scroller 内部 reflow。

更新靠闸门：`scroll` 回调进 rAF（一帧最多一次），**并且 start/end 没变就不 setData**。
慢慢滚 60 帧但区间没变，一次渲染都不做。

### API

| prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `items` | Array | `[]` | 数据源，长度变了会自动重算区间 |
| `itemHeight` | Number | 48 | 每行固定高度（px），必须和实际渲染高度一致 |
| `height` | Number \| String | 400 | 视口高。数字按 px，`'420px'` / `'100%'` 原样透传 |
| `buffer` | Number | 6 | 上下各多渲染几条，防快速滚动白屏 |
| `itemKey` | String \| Function | `'id'` | 取 key 的字段名或函数 |

| 事件 | 参数 |
| --- | --- |
| `range-change` | `{ start, end, rendered, total }` |
| `scroll-end` | `{ scrollTop }`，滚停 140ms 触发 |

| 方法 | 说明 |
| --- | --- |
| `scrollToIndex(i, align)` | `align`: `'start'`(默认) / `'center'` / `'end'` |
| `scrollToTop()` | |
| `getMetrics()` | `{ total, start, end, rendered, scrollTop, viewport }` |

```html
<virtual-scroll
  ref="list"
  :items="rows"
  :item-height="48"
  height="420px"
  :buffer="6"
  @range-change="onRange"
>
  <template #default="{ item, index }">
    <div class="row">{{ index + 1 }} · {{ item.name }}</div>
  </template>
  <template #empty>没有数据</template>
</virtual-scroll>
```

### 坑

- **滚动条能拖、但滚轮怎么滚都不动** → 见上面那条：scroller 少了 `position: relative`。
  测试时一定要用真实滚轮事件（`Input.dispatchMouseEvent` 的 `mouseWheel`）或手动滚，
  只断言 `scrollTop = x` 是测不出来的 —— 赋值永远有效。
- **别在外面再套 `overflow: auto`**。组件自带滚动容器，套两层会有两条滚动条，而且外层滚、内层不滚，永远不触发。
- `height="100%"` 要求**父级有确定高度**（`height` / `max-height` / flex + `min-height: 0`），`height: auto` 的父级会算出 0。
- **行高必须真的等于 `itemHeight`**。差 1px，滚到第 500 条就偏 500px，表现为「越滚越对不上」。
  内容单行放不下就用 `text-overflow: ellipsis`，别指望它自己缩。
- `items` 变短时要防越界：`visibleRows` 会把 `start/end` 按当前长度夹一次。
  少了这一步，`rows = []`（比如搜索没结果）时 render 会读 `items[i].name` 抛错，
  **整棵组件树直接白屏** —— 这是本项目探针实测抓到的真 bug。
- `buffer` 是「条数」不是「屏数」。给 6 表示上下各 6 条，快速拖动滚动条时够用；给 50 就白渲染了。
- `:key` 用 `item.id` 更安全（增删排序不会串），代价是滚动换区间时整屏重建 21 个节点。
  想复用 DOM 可以把 key 换成「槽位下标」，但数据一变就会张冠李戴，不建议。

---

## 三、`<virtual-scroll-dynamic>` 动态行高

### 和固定版只差一件事：位置算不出来，得记账

```js
positions[i] = { top, height }
```

- 没渲染过的行不知道多高 → 用预估（`item[heightKey]` 或 `estimatedHeight`）
- 渲染出来立刻用 `offsetHeight` 校正，并重建 positions
- 滚动定位不能除，要**二分**：找第一个 `bottom > scrollTop` 的项，O(log n)

### 三个必须自己补的坑

**1. 校正后要补偿滚动位置，否则列表会自己跳**

可视区的第一行被量出真实高度后，它下面所有行的 `top` 都变了。不回补 `scrollTop`，
用户会看到内容「往上蹿了一截」。做法是记下锚点行离视口顶部的距离，重建后原样放回去：

```js
anchorDelta = el.scrollTop - positions[anchorIdx].top
// …重建…
el.scrollTop = arr[anchorIdx].top + anchorDelta
```

锚点用 `start`（缓冲区第一条）：它上面的行不会被测量，所以 delta 恒定。

**2. 实测缓存不能放 `data`**

```js
created() {
  this._measured = Object.create(null)   // index -> height
}
```

放 data 里，每次测量都触发一轮依赖收集 + 渲染，然后渲染完又测量 —— 死循环。
它只影响「下次算 top」，不需要驱动视图。

**3. 同一个区间不要重复量**

`measure()` 里用 `start:end` 记一次戳，同一区间直接返回。否则每次 `updated` 都读一遍
`offsetHeight`（**强制同步布局**），滚动立刻掉帧。

另外窗口 resize 时宽度变了、换行数变了，所有实测值作废，要清空重来。

### 关于「总高度会变」

预估高度和真实高度永远有误差，已经量过的行变准了、没量过的还是估的，
所以**总高度是两者的混合值**，滚动条长度会随滚动轻微变化。这不是 bug，
`vue-virtual-scroller`、`vant` 的 List 都一样。

能做的只有让预估值更准：接口直接带回高度，或按字数/图片数估算。
本项目的 `mockData.js` 按「34 字一行」估，再故意加 ±6% 误差，就是为了演示这一步校正确实在发生。

### API

| prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `items` | Array | `[]` | |
| `height` | Number \| String | 400 | |
| `estimatedHeight` | Number | 88 | item 上没有高度字段时的兜底 |
| `heightKey` | String | `''` | 从 item 上取预估高度的字段名 |
| `buffer` | Number | 4 | 动态高度下按「条」算 |
| `itemKey` | String \| Function | `'id'` | |

```html
<virtual-scroll-dynamic :items="rows" height="420px" height-key="estHeight" :buffer="4">
  <template #default="{ item, index }">
    <div class="card">{{ index }} · {{ item.content }}</div>
  </template>
</virtual-scroll-dynamic>
```

⚠️ 行内容**不要设 height**，让它被内容撑开，否则量出来的永远是那个固定值，等于白量。

---

## 四、④ `content-visibility: auto` 是什么

```css
.row {
  content-visibility: auto;
  contain-intrinsic-size: auto 48px;
}
```

一行 CSS，离屏的行跳过**布局和绘制**（DOM 还在）。1 万条实测挂载从 253 ms 降到 78 ms，
滚动满帧，改动量几乎是零。

但它不省内存（8 万个节点还在），也没法做「无限数据」—— 数据量继续涨还是会撑爆。
**静态长列表、还想让浏览器 Ctrl+F 搜到内容**，这个方案性价比最高。
浏览器要求：Chrome 85+ / Safari 18+，不支持的浏览器会降级成普通渲染（页面上有提示）。

---

## 五、三个容易把自己骗了的测量陷阱

### 1. 邻居会拖累你

本机实测：1 万条时，如果页面上同时还摆着两块 1 万行的全量列表（8 万个元素），
虚拟列表的帧间隔会从 **16.7 ms 涨到 30 ms 以上** —— 而它自己只渲染 21 行。

慢的是**整页合成**，不是虚拟滚动。所以 demo 里压测默认把 ①④ 临时卸载
（控制台的「压测时隔离全量块」开关），测完再挂回来。关掉开关就能亲眼看到这个拖累。

### 2. 别用「固定时长滚到底」

1 万条时列表总高 48 万 px，900 ms 滚完 = 每帧跳 9 000 px ≈ 185 行，
一帧把整屏换掉 —— 那不是用户在滚，是按键翻页 ×20。测出来的是「跳跃渲染」，不是「滚动」。

demo 里改成**每帧固定 80 px（约 2 行，接近快速拖滚动条），连滚 100 帧**，
各方案滚过的距离完全一样，横向才可比。

### 3. headless 的数字只能横向比

`--disable-gpu` 下全走软件光栅，绝对值比真机乐观/悲观都不一定，
但同一台机器、同一次运行里的相对差异是可信的。

---

## 六、还能再压什么

- **行内容别做成组件**。每行一个组件实例 = 一个 watcher + 一次独立的 patch。
  纯 DOM 模板（或函数式组件）更轻。本 demo 的行就是普通 div。
- **`Object.freeze` 数据**。只读列表冻结后，Vue 2 的 `observe()` 检测到不可扩展会整段跳过。
  实测 1 万条 × 8 字段：不冻结 15.3 ms，冻结 0 ms（`__ob__` 确实不存在）。
  低端机会放大一个数量级。
- **别在行上绑内联对象/箭头函数**（`@click="() => …"`），每次渲染都是新引用，破坏复用。
- **图片行**：`loading="lazy"` + 固定宽高比，避免滚动时连续 tou 布局。
- **超长列表 + 搜索**：虚拟滚动下 `find-in-page` 找不到未渲染内容，要自己做一个「搜索结果定位 + 滚动到第 N 条」（`scrollToIndex` 就是为此准备的）。

---

## 七、选型口诀

| 场景 | 用 |
| --- | --- |
| 行高固定（表格、消息、日志） | **② `<virtual-scroll>`** |
| 内容长短不一（卡片流、评论、朋友圈） | **③ `<virtual-scroll-dynamic>`**，并尽量让接口带回预估高度 |
| 静态展示、要 Ctrl+F 能搜到、几百到一万条 | **④ `content-visibility`** |
| 几百条、要最简单、以后也不涨 | **① 普通 `v-for`** |

虚拟滚动的代价，选之前先认：

- `Ctrl+F` / `find-in-page` 搜不到未渲染的内容
- 屏幕阅读器读不全（只读到当前 DOM 里的）
- 滚动位置靠算，`scrollIntoView` / 锚点跳转要自己实现
- 每个边界（空数据、数据变短、容器 resize、快速拖拽）都要单独处理
