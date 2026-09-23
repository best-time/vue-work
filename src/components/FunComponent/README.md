# el-dialog 函数式调用（Vue 2.6.14）

不写 `<template>`、不定义 `dialogVisible` 变量，直接用 `this.$_dialog({...})` 打开弹窗，返回 Promise 拿结果。

## 目录结构

```
src/
├── components/
│   ├── FuncDialog.vue      # 弹窗容器（核心，增强版）
│   ├── DemoContent.vue     # 示例业务组件
│   ├── DemoPage.vue        # 调用示例页面（this.$_dialog 方式）
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
import './utils/$dialog' // 挂载全局 this.$_dialog
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

### `this.$_dialog(options) => Promise<{type, data}>`
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

### `this.$_confirm(message, title?, options?) => Promise<true>`
全局快捷确认框，语义贴近 ElementUI 的 `this.$_confirm`：**确认 resolve，取消/关闭 reject**。

```js
try {
  await this.$_confirm('确定删除这条记录吗？', '删除确认', {
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

### `this.$_alert(message, title?, options?) => Promise<true>`
全局单按钮提示，语义贴近 ElementUI 的 `this.$_alert`。只有一个"知道了"按钮，**无论确定还是右上角关闭都 resolve（不 reject）**：

```js
await this.$_alert('操作已成功，请继续。', '完成', { confirmText: '好 的' })
```

### 多级弹窗叠加
容器已内置 `append-to-body`，多层弹窗天然可叠加（各自独立挂载到 body、互不干扰）。只需在某个弹窗的 `confirm` 回调里再调 `$dialog` 即可：
```js
const first = await this.$_dialog({ ... })
if (first.type === 'confirm') {
  const second = await this.$_dialog({ ... }) // 第二层
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

## h-dialog —— 纯 render 函数版（`h-dialog/` 目录）

与上面 `FuncDialog.vue` 模板容器的区别：**整棵弹窗树用 `h()` 渲染，没有 .vue 容器、没有模板编译**，插槽直接在 render 里包成 `scopedSlots` 传给业务组件。实现见 `h-dialog/index.js`，注册后提供 `this.$hDialog`（Promise 版）与 `this.$hDialogWithHandle`（句柄版），参数、约定（confirm/cancel 事件、beforeClose、confirmLoading、openPromise）与 `$dialog.js` 完全一致。

```js
// ① Promise 版
const res = await this.$hDialog({
  title: '标题',
  component: SomeContent,          // 不传 component 只传 message 时是快捷确认框
  context: this,                   // 决定插槽渲染上下文（$router/$store 可用）
  props: { list },
  slots:      { default: '字符串 / VNode / VNode[] / (h)=>VNode', header: h('b', 'xxx') },
  scopedSlots:{ row: (h, { row, index, checked }) => [h('span', `${index}-${row.name}`)] },
  dialogProps: { width: '560px' }
})
// res: { type: 'confirm' | 'cancel', data }

// ② 句柄版（自定义 footer 必用）
const dlg = this.$hDialogWithHandle({
  title: '标题', component: SomeContent, context: this,
  slots: { footer: h => [
    h('el-button', { on: { click: () => dlg.onCancel() } }, '取消'),
    h('el-button', { props: { type: 'primary', loading: dlg.confirmLoading },
      on: { click: () => dlg.onConfirm(data) } }, '确定')
  ]}
})
await dlg.openPromise
```

示例页：`h-dialog/HDialogDemoPage.vue`（路由 `/fun-h-dialog`），业务组件 `HDialogDemoContent.vue`。

### 实现要点（与模板版的差异）
1. **插槽统一走 scopedSlots**：Vue2.6 官方推荐 render 函数用 scopedSlots 表达所有插槽；业务组件里判断插槽是否存在要写 `$slots[name] || $scopedSlots[name]` 双判断。
2. **footer 例外**：el-dialog 模板是 `v-if="$slots.footer"`，只认同 context 渲染、带 `data.slot` 的子节点——所以 footer 用容器自己的 `h('div', { slot: 'footer' }, nodes)` 包一层传给 el-dialog，不能走 scopedSlots。
3. **TDZ 防护**：首次 `$mount()` 只渲染隐藏占位节点（`inited=false`），`open()` 后由异步渲染队列完成真正渲染——此时调用方 `const dlg = $hDialogWithHandle(...)` 已完成赋值，footer 函数闭包里引用 `dlg` 不会报 "Cannot access before initialization"。
4. 插槽函数收到的 `h` 优先取调用方的 `$createElement`：插槽内容渲染上下文即调用方，作用域样式、事件 this 均正确。
