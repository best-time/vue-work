# LoadMoreSelect

`el-select` 的「滚动到底加载下一页」封装。已全局注册：`<load-more-select>` / `<LoadMoreSelect>`。
演示页：`/load-more-select`（源码 `LoadMoreSelectDemoPage.vue`）

## 最小用法

```html
<load-more-select
  v-model="form.skuId"
  :request="fetchSkus"
  label-key="name"
  value-key="id"
  :page-size="10"
  placeholder="请选择物料"
  @select="item => (form.skuName = item.name)"
/>
```

```js
methods: {
  // page 从 1 开始；total 可以不给（不给就靠 list.length < pageSize 判到底）
  fetchSkus({ page, pageSize, keyword }) {
    return api.get('/sku/page', { params: { page, pageSize, keyword } })
      .then(res => ({ list: res.rows, total: res.total }))
  }
}
```

## 数据流

```
打开下拉 → load({reset:true}) → 第 1 页
滚动到底（距底 ≤ offset）→ load() → 下一页追加
list.length >= total（或本页不足 pageSize）→ finished，底部显示「没有更多了」
关键词变化（searchable）→ keyword 更新 → reload() → 页码/滚动位置一起归零
```

## Props

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | String/Number/Array | `''` | v-model：单选为值，多选为值数组 |
| `request` | Function | 必填 | `({ page, pageSize, keyword }) => Promise<{ list, total }>` |
| `page-size` | Number | `10` | 每页条数 |
| `label-key` | String/Function | `'label'` | 显示文案字段 |
| `value-key` | String/Function | `'value'` | 值字段（同时用于 `:key`） |
| `multiple` | Boolean | `false` | 多选 |
| `searchable` | Boolean | `false` | 开启 `filterable + remote`，关键词走服务端 |
| `auto-load` | Boolean | `true` | 首次打开下拉时拉第 1 页 |
| `preload` | Boolean | `false` | `mounted` 就拉第 1 页 |
| `auto-fill` | Boolean | `true` | 一屏没填满就自动续拉（否则永远没有滚动条） |
| `offset` | Number | `24` | 距底部多少 px 触发加载 |
| `value-item` | Object/Array | `null` | 回显项（列表里还没有的那条记录） |
| `placeholder` / `clearable` / `disabled` / `collapse-tags` | — | — | 透传 el-select |
| `popper-class` | String | `''` | 追加下拉样式类 |
| `scroll-text` / `finished-text` / `retry-text` | String | — | 底部三段文案 |

## 事件

| 事件 | 参数 | 说明 |
|---|---|---|
| `input` | value | v-model |
| `change` | value | 值变化 |
| `select` | item \| item[] | 选中项整条记录（多选给数组） |
| `load` | `{ page, pageSize, keyword, count, total, cost, finished }` | 每页拉完 |
| `error` | Error | 请求失败（不会清掉已加载数据） |
| `visible-change` | Boolean | 下拉开关 |
| `scroll` | `{ rest }` | 距底部剩余 px（调试用） |

## 方法

| 名称 | 说明 |
|---|---|
| `reload({ keyword })` | 从第 1 页重新拉（外部筛选条件变了就调它） |
| `retry()` | 按上次失败的意图重试（重置 or 下一页） |

## 四个绕不过去的细节

1. **滚动容器是 `.el-select-dropdown__wrap`**（el-scrollbar 的 wrap，`max-height: 274px`），
   要从 `$refs.select.$refs.popper.$el` 里取**自己那份**。下拉默认 `append-to-body`，
   用 `document.querySelector` 会串到别的下拉上。

2. **加载更多不能用 el-select 的 `loading`**。源码：
   `<el-scrollbar v-show="options.length > 0 && !loading">` —— loading 一开，
   已加载的选项全部消失，只剩「加载中」。所以只在**首屏**用 `loading`，
   翻页用列表底部那个 `<li class="lms__footer">`。

3. **首屏不满一屏就永远没有 scroll 事件**。`pageSize` 小（比如 4）时列表撑不满
   274px，滚动条都不出现，第 2 页永远拉不到。`auto-fill` 会在每次拉完后检查
   `scrollHeight - clientHeight`，撑不满就继续拉。

4. **回显要靠 `value-item`**。v-model 里放了一个还没加载出来的 id 时，
   el-select 找不到对应 option，输入框直接显示裸 id。把那条记录通过
   `value-item` 传进来，组件会把它钉在列表最前面（并按值去重）。
   **只有列表里找不到的回显项**才会补到最前面；已经在分页数据里的原地不动
   （否则多选时刚点过的选项会跳到首位，下一次就点空了）。
   多选同理：选项组件销毁时 Element 会 `onOptionDestroy → setSelected()` 重算，
   已选但不在当前列表里的项会被打回裸 id —— 一直传 `value-item`
   （父组件从 `@select` 收集）就没事。

## 已知的 Element 行为（不是本组件的 bug）

`remote` 模式下，如果**关键词为空且一条选项都没有**，`emptyText` 计算会返回
`false`，整个下拉 popper 被 `v-show` 掉 —— 点了没反应。输入关键词后恢复。
