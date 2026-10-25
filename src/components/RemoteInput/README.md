# RemoteInput

可输入 + 远程搜索 + 选中回填 的输入框。已全局注册：`<remote-input>` / `<RemoteInput>`。
演示页：`/remote-input-demo`（源码 `RemoteInputDemoPage.vue`）

## 最小用法

```html
<remote-input
  v-model="form.customerName"
  :fetch-method="search"
  label-key="name"
  value-key="id"
  :meta-key="item => item.city + ' · ' + item.id"
  placeholder="输入公司名"
  @select="item => (form.customerId = item.id)"
/>
```

```js
methods: {
  search(keyword) {
    return api.get('/customer/search', { params: { keyword } }) // 必须返回 Promise<Array>
  }
}
```

## 为什么 v-model 是文本，不是 id

输入框里允许出现「库里没有但合法」的值（新客户首次录入）。如果 `v-model` 绑 id，
这种输入就没地方放。所以：

- `v-model` → 输入框里的**文本**，用户打什么就是什么
- `@select` → 选中项**整条记录**，业务自己存 `item.id`

提交时两个都带上：有 id 用 id，没有就按名称兜底。

## Props

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `value` | String/Number | `''` | v-model：输入框文本 |
| `fetch-method` | Function | 必填 | `(keyword) => Promise<Array>` |
| `label-key` | String/Function | `'label'` | 结果项显示字段 |
| `value-key` | String/Function | `'value'` | 结果项唯一键（用于 `:key`） |
| `meta-key` | String/Function | `''` | 右侧灰色副信息，空则不显示 |
| `debounce` | Number | `300` | 防抖毫秒，`0` 关掉 |
| `min-length` | Number | `1` | 少于该长度不发请求 |
| `limit` | Number | `20` | 最多展示几条 |
| `placeholder` / `icon` / `size` | String | — | 透传给 el-input |
| `clearable` | Boolean | `true` | 可清空 |
| `disabled` | Boolean | `false` | 禁用 |
| `trim` | Boolean | `true` | 是否用 trim 后的值搜索 |

## 事件

| 事件 | 参数 | 说明 |
|---|---|---|
| `input` | `text` | v-model 同步，不等搜索结果 |
| `select` | `item` | 选中一条（回填后） |
| `invalidate` | `{ previous }` | **选中后又改了文字** → 之前的选中作废，父组件必须把 id 清掉 |
| `clear` | — | 点清空 |
| `enter` | `text` | 回车时没有高亮项 → 用户要自由输入 |
| `search` | `{ keyword, seq }` | 请求发起 |
| `result` | `{ keyword, seq, cost, count, dropped, error }` | 请求结束；`dropped: true` 表示结果因过期被丢弃 |

## 公开方法

```js
this.$refs.ri.search('杭州') // 设置文本 + 立刻搜索（不走防抖）
this.$refs.ri.doSearch()     // 用当前文本再搜一次（失败重试用）
```

## 三个实现要点

1. **竞态**：每个请求一个 `seq`，回来时对不上就整体丢弃（包括 `loading`、`options`）。
   `input`、`pick`、`clear`、`destroy` 都会 `++seq`，所以不会出现「清空之后旧结果把面板顶开」。
2. **选中不重复搜索**：回填是程序赋值，`el-input` 的 `@input` 不会触发；`pick` 里还会再
   `++seq` 作废在途请求。
3. **改字要作废选中**（最容易漏的一条）：选过「深圳腾讯」之后把文字改成「火星事业部」，
   如果只更新文本、不动 id，提交上去就是 `{name: '火星事业部', id: 'C1008'}` ——
   文本和 id 对不上，后端要么存错客户，要么静默串数据。所以 `onInput` 里判断
   `val !== pickedLabel` 就发 `invalidate`，父组件收到后清 id。
   外部改 `value`（回填详情）不算，不会发 `invalidate`。
4. **高亮不 XSS**：远程数据先 HTML 转义再插 `<em>`，不吃 `v-html` 注入。

## 已知边界

- 面板是 `position: absolute` 的兄弟节点，**外层容器不能 `overflow: hidden`**（`el-card`
  默认就是）。演示页用 `min-height` 给面板留了空间；放进「内容会滚动的 el-dialog」
  时要留意面板被裁，需要的话改成 `append-to-body` 的浮层。
- 键盘：`↑` `↓` 循环、`Enter` 选高亮项、`Esc` 关闭。没有做 `Tab` 补全。
- 不支持多选。多选场景用 `el-select multiple remote`。
