# el-dialog 函数式调用（Vue 2.6.14）

不写 `<template>`、不定义 `dialogVisible` 变量，直接用 `this.$dialog({...})` 打开弹窗，返回 Promise 拿结果。

## 目录结构

```
src/
├── components/
│   ├── FuncDialog.vue      # 弹窗容器（核心，增强版）
│   ├── DemoContent.vue     # 示例业务组件
│   ├── DemoPage.vue        # 调用示例页面（this.$dialog 方式）
│   └── UseDialogDemo.vue   # setup 组合式 API 示例（不依赖 this）
└── utils/
    ├── $dialog.js          # 函数式入口（挂载 $dialog/$confirm/$alert）
    └── useDialog.js        # setup 组合式 API 封装（useDialog）
```

## 接入步骤

1. 已安装 ElementUI（`Vue.use(ElementUI)`）。

2. 在入口（`main.js`）引入并挂载：
```js
import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './utils/$dialog' // 挂载全局 this.$dialog
Vue.use(ElementUI)
```

3. 若 `@` 别名未配置，将文件中的 `@/` 改为相对路径，或配置：
```js
// vue.config.js
module.exports = {
  configureWebpack: {
    resolve: { alias: { '@': require('path').resolve(__dirname, 'src') } }
  }
}
```

## API

### `this.$dialog(options) => Promise<{type, data}>`
| 参数 | 类型 | 说明 |
|------|------|------|
| title | String | 弹窗标题 |
| component | Component | 业务组件 |
| props | Object | 传给业务组件的 props |
| dialogProps | Object | el-dialog 原生属性透传（width/close-on-click-modal 等） |
| beforeClose | Function | `async (vm, action) => Boolean`，返回 false 阻止关闭 |
| context | Object | 调用方实例，保证弹窗内 `$router/$store` 可用 |

### `this.$dialogWithHandle(options) => vm`
返回容器实例句柄，可手动控制 `confirmLoading`、`visible` 等。

### `this.$confirm(message, title?, options?) => Promise<true>`
全局快捷确认框，语义贴近 ElementUI 的 `this.$confirm`：**确认 resolve，取消/关闭 reject**。

```js
try {
  await this.$confirm('确定删除这条记录吗？', '删除确认', {
    confirmText: '删 除',   // 自定义确定按钮文案
    cancelText: '再想想',   // 自定义取消按钮文案
    width: '440px',         // 其余属性透传给 el-dialog
    context: this
  })
  // 用户点了确定
} catch (e) {
  // 用户取消或关闭
}
```

### `this.$alert(message, title?, options?) => Promise<true>`
全局单按钮提示，语义贴近 ElementUI 的 `this.$alert`。只有一个"知道了"按钮，**无论确定还是右上角关闭都 resolve（不 reject）**：

```js
await this.$alert('操作已成功，请继续。', '完成', { confirmText: '好 的' })
```

### 多级弹窗叠加
容器已内置 `append-to-body`，多层弹窗天然可叠加（各自独立挂载到 body、互不干扰）。只需在某个弹窗的 `confirm` 回调里再调 `$dialog` 即可：
```js
const first = await this.$dialog({ ... })
if (first.type === 'confirm') {
  const second = await this.$dialog({ ... }) // 第二层
}
```

## setup / 组合式 API（不依赖 this）

`$dialog/$confirm/$alert` 本身就是纯函数、不依赖 `this`，setup 里可直接 `import` 使用；更推荐用 `useDialog()` 组合式函数自动绑定当前组件上下文。

```js
import { useDialog } from '@/utils/useDialog'
import DemoContent from '@/components/DemoContent.vue'

export default {
  name: 'Xxx',
  setup() {
    const { dialog, confirm, alert } = useDialog()

    const open = async () => {
      const res = await dialog({
        title: '弹窗',
        component: DemoContent,
        props: { msg: 'setup 用法' },
        dialogProps: { width: '500px' },
        beforeClose: async () => true
      })
      if (res.type === 'confirm') { /* 业务处理 */ }
    }

    const del = async () => {
      try {
        await confirm('确定删除吗？', '提示', { confirmText: '删 除' })
      } catch (e) { /* 已取消 */ }
      await alert('已完成', '完成', { confirmText: '好 的' })
    }

    return { open, del }
  }
}
```

**注意：**
- `useDialog` 自动把当前组件实例绑定为 `context`，弹窗内业务组件可正常用 `$router/$store`。
- setup 里没有 `this`，`$message` 等实例方法拿不到；要弹消息可配合 `@vue/composition-api` 的 `useMessage`，或把结果交给模板展示。
- `useDialog.js` 第一行 import 来自 `@vue/composition-api`（Vue2.6 需先安装该插件并 `Vue.use(CompositionApi)`）；Vue2.7 原生组合式 API 请改为 `from 'vue'`。

### 业务组件约定
- 确定：`$emit('confirm', data)`
- 取消：`$emit('cancel')`
- 支持插槽（容器会把外部插槽透传给业务组件）
- 默认 footer 提供"取消/确定（带 loading）"；传 `slot="footer"` 可自定义

## 常见坑（Vue 2.6）
1. el-dialog 用 `:visible.sync`（Vue2 语法，非 v-model）。
2. `append-to-body` 已内置，防父级 overflow 截断。
3. 关闭动画后 `$destroy()` + `remove()`，防止 DOM 残留与内存泄漏。
4. `Vue.extend` 为 Vue2 API；Vue3 已移除，需换方案。
