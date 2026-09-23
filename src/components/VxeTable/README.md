# VxeTable 公共组件

> 版本约束：`vxe-table 3.6.x`（Vue 2.6 兼容）。
> ⚠️ vxe-table 4.x（≥4.7 依赖 @vxe-ui/core，peer 要求 vue ^3.2）是 **Vue3 专用**，Vue2 项目不要装。

## 目录

| 文件 | 说明 |
|------|------|
| `index.js` | 入口：注册 vxe-table、全局参数（size/zIndex）、全局格式化器（formatMoney/formatDate）、全局注册 `<CommonTable>` |
| `CommonTable.vue` | 对 vxe-grid 的公共封装：本地 / 远程两种模式，插槽全透传 |
| `VxeTableDemoPage.vue` | 常用示例页（路由 `/vxe-table`） |

main.js 中 `import '@/components/VxeTable'` 即完成全部注册。

## CommonTable 用法

### 本地模式（传 data）

```html
<CommonTable :data="rows" :columns="columns" border stripe show-overflow>
  <template #status_default="{ row }">
    <el-tag size="mini">{{ row.status }}</el-tag>
  </template>
</CommonTable>
```

```js
columns: [
  { type: 'seq', width: 50 },
  { field: 'name', title: '姓名' },
  { field: 'status', title: '状态', slots: { default: 'status_default' } }
]
```

### 远程模式（传 query）

翻页 / 表头排序（`sortable: 'custom'`）/ 表头筛选确认，都会自动触发 query 并打包条件：

```html
<CommonTable
  ref="table"
  :query="fetchUsers"
  :columns="columns"
  :page-size="10"
  border height="420"
  @filter-change="..." @sort-change="..." >
```

```js
// query 签名（组件会归一化，返回 { rows, total } / { list, total } / { result, total } 均可）
async fetchUsers({ page, sorts, filters }) {
  // page    { currentPage, pageSize }
  // sorts   [{ field, order: 'asc'|'desc' }]
  // filters [{ field, values: [] }]
  const { data } = await axios.get('/api/users', { params: { ...page, sorts, filters } })
  return { rows: data.list, total: data.total }
}
```

### 表头自定义（三种方式）

1. **插槽表头**：列配置 `slots: { header: 'nameHeader' }` + 页面 `<template #nameHeader="{ column }">`（可放图标、el-tooltip、必填星号）。
2. **内置提示**：`titlePrefix: { content: '说明' }` / `titleSuffix: { content, icon: 'vxe-icon--question-circle' }`。
3. **对齐**：`headerAlign: 'center'`。

### 表头远程筛选

```js
// 输入式筛选（确认后 values=[输入值]）
{ field: 'age', title: '年龄', filters: [{ data: '' }],
  filterRender: { name: 'VxeInput', props: { type: 'integer', placeholder: '最小年龄', clearable: true } } }
// 多选式筛选（确认后 values=[勾选值]）
{ field: 'city', title: '城市', filters: [{ label: '北京', value: '北京' }, { label: '上海', value: '上海' }] }
```

### 常用 API（通过 ref）

```js
this.$refs.table.getGrid()   // 拿 vxe-grid 实例（setFilter/sort/getCheckboxRecords 等全部可用）
this.$refs.table.refresh()   // 保持当前条件与页码刷新（commitProxy('query')）
this.$refs.table.reload()    // 重置到第一页并清空筛选/排序（commitProxy('reload')，3.6 里 reload = clearAll）
```

## 3.6 的坑（实测）

1. `commitProxy('reload')` 会先 `clearAll()` 清空筛选/排序再查询——想保留条件用 `refresh()`。
2. vxe-pager 的 `layouts` 是 **PascalCase**（`Total/PrevJump/PrevPage/Number/Jump/NextPage/NextJump/Sizes`），不是 4.x 的小写驼峰；CommonTable 已做小写别名映射。
3. grid 自带的 sort/filter 自动联动在部分编程式调用下不触发，CommonTable 里自行监听 `sort-change` / `filter-change` 后 `commitProxy('query')`（父级监听同名事件不受影响）。
4. 图标类名是 `vxe-icon--xxx`（双横线），与 4.x 的 `vxe-icon-xxx` 不同。
