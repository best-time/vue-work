# AppDialog

`el-dialog` 的轻封装公共组件。演示页 `/app-dialog-demo`。

```
src/components/AppDialog/
├── index.js             入口（模块作用域直接 install(Vue)，注册成 <app-dialog>）
├── AppDialog.vue        组件本体
├── AppDialogDemoPage.vue 演示页（已注册路由 /app-dialog-demo）
└── README.md
```

`main.js` 里 `import '@/components/AppDialog'` 一次即可，之后模板里直接用 `<app-dialog>`。

---

## 一、为什么包一层

直接用 `el-dialog` 当然可以，只是每多一个弹窗，父组件就要多维护一份
「一个 `visible` 布尔 + 一份数据 + 一坨 `@confirm` / `@cancel` / `:before-close`」：

```js
// 原生写法：一个弹窗就要 4 个 data + 3 个方法
data() { return { editVisible: false, editRow: null, editLoading: false } },
methods: {
  onEdit() { this.editRow = row; this.editVisible = true },
  onEditConfirm() { ... 校验 ... 关闭 ... },
  onEditClosed() { ... }
}
```

包一层之后，「点行 → 开弹窗 → 收结果」只有三行：

```js
// AppDialog
editRow(row) { this.$refs.edit.open(row) }              // 打开，数据一并带进去
async onSave() { await api.save(); return true }        // 返回 true 自动关、false 不关
const res = await this.$refs.confirm.open({ name })     // 只要结果？一行
```

它比项目里已有的 `$_dialog` / `$hDialog`（运行时 `new Vue` 挂 body 的函数式弹窗）
多出来的是「模板里声明式」：父组件看得见结构、能写 scoped 样式、能用 `ref` 拿句柄。三者互补。

---

## 二、三种打开方式

```html
<!-- 1) v-model：父组件管布尔 -->
<app-dialog v-model="show" title="标题">...</app-dialog>

<!-- 2) :visible.sync：等价写法 -->
<app-dialog :visible.sync="show" title="标题">...</app-dialog>

<!-- 3) ref.open(data)：组件自己管布尔，数据通过作用域插槽下发 -->
<app-dialog ref="edit" title="编辑">
  <template #default="{ payload }">{{ payload.name }}</template>
</app-dialog>
```

```js
// 打开并等结果（不用先 this.show = true，也不用再声明一份数据）
const res = await this.$refs.edit.open({ id: 1, name: "张三" });
// res = { type: 'confirm' | 'cancel', data, payload, source }
```

`source` 告诉你这次是怎么关的：`footer`（点按钮）/ `close`（X、遮罩、ESC）/ `api`（代码关的）。

> 组件内部用 `model: { prop: 'visible', event: 'update:visible' }`，
> 所以 `v-model` 和 `:visible.sync` 同时都能用，不用记两套 prop 名。

---

## 三、props

| prop                              | 类型             | 默认                       | 说明                                                                                                |
| --------------------------------- | ---------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| `visible`                         | Boolean          | `false`                    | 显隐，支持 v-model / `.sync`                                                                        |
| `title`                           | String           | `''`                       | 标题；也可以用 `#title` 插槽                                                                        |
| `width`                           | String           | `'520px'`                  | 宽度                                                                                                |
| `top`                             | String           | —                          | 距顶距离，不传走 el-dialog 默认 `15vh`                                                              |
| `fullscreen` / `center` / `modal` | Boolean          | `false` / `false` / `true` | 透传                                                                                                |
| `append-to-body`                  | Boolean          | **`true`**                 | 原生默认 `false`，这里改成 true：挂 body 下才不会被父级 `overflow: hidden` / `transform` 裁掉或压住 |
| `modal-append-to-body`            | Boolean          | `true`                     | 透传                                                                                                |
| `lock-scroll`                     | Boolean          | `true`                     | 透传                                                                                                |
| `close-on-click-modal`            | Boolean          | `true`                     | 透传                                                                                                |
| `close-on-press-escape`           | Boolean          | `true`                     | 透传                                                                                                |
| `show-close`                      | Boolean          | `true`                     | 右上角 X                                                                                            |
| `custom-class`                    | String           | `''`                       | 透传给 el-dialog                                                                                    |
| `destroy-on-close`                | Boolean          | `false`                    | 关掉就销毁内容                                                                                      |
| `show-footer`                     | Boolean          | `true`                     | 关掉后底部整块不渲染（自己用 `#footer` 也行）                                                       |
| `show-cancel`                     | Boolean          | `true`                     | 默认底部要不要取消按钮                                                                              |
| `confirm-text` / `cancel-text`    | String           | `'确 定'` / `'取 消'`      | 默认按钮文案                                                                                        |
| `confirm-type`                    | String           | `'primary'`                | 确认按钮类型（可设 `danger`）                                                                       |
| `close-on-confirm`                | Boolean          | `true`                     | 关掉后不自动关，自己 `submit()` / `close()`                                                         |
| `loading`                         | Boolean          | `false`                    | 确认按钮 loading                                                                                    |
| `auto-loading`                    | Boolean          | `true`                     | `@confirm` 返回 Promise 时是否自动 loading                                                          |
| `body-max-height`                 | String \| Number | —                          | 内容区最大高度，数字按 px，超出滚动                                                                 |
| `body-style`                      | Object           | `{}`                       | 内容区附加样式（设了才多包一层 div）                                                                |
| `reset-on-close`                  | Boolean          | `true`                     | 关闭后清空 payload / loading                                                                        |
| `before-close`                    | Function         | `null`                     | 见第五节                                                                                            |

未声明的属性（`modal-class`、`z-index`、`:close-on-click-modal` 之类）会原样透传给 `el-dialog`。

---

## 四、事件与插槽

| 事件               | 来源           | 说明                                                                                                          |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------- |
| `update:visible`   | 本组件         | v-model / `.sync` 用；X / 遮罩 / ESC 关掉也会发                                                               |
| `open` / `opened`  | el-dialog 透传 | 打开时 / 动画结束后                                                                                           |
| `close` / `closed` | el-dialog 透传 | 开始关闭 / 动画结束后                                                                                         |
| `confirm`          | 本组件         | 点确定（或调 `confirm()`）。**返回值说了算**：`false` → 不关；Promise → 自动 loading，`resolve(false)` → 不关 |
| `cancel`           | 本组件         | 点取消（或调 `cancel()`），返回值同样可以拦住                                                                 |

`@confirm` 支持返回值是这里最省事的一点：

```js
async onSave() {
  const ok = await api.save()   // 期间确认按钮自动 loading
  if (!ok) { this.$message.error('保存失败'); return false }  // 留在弹窗里
  return true                                                 // 自动关闭
}
```

| 插槽       | 作用域                                         | 说明                                                         |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `#title`   | `{ title, payload, close }`                    | 自定义标题（状态标签 / 关闭按钮）                            |
| `#default` | `{ payload, loading, confirm, cancel, close }` | 内容区                                                       |
| `#footer`  | 同上                                           | 自定义底部；不传就用 `confirm-text` / `cancel-text` 默认按钮 |

---

## 五、关闭闸门 `beforeClose`

底部按钮、右上角 X、点遮罩、ESC —— **全部先过 `beforeClose(action, done)`**：

```js
beforeClose(action, done) {
  if (this.locked) return false                        // 锁死，任何方式都关不掉
  if (!this.dirty) return true                         // 没改过，放行
  return this.$confirm('有未保存的修改，确定关闭吗？')    // 返回 Promise 就等它
    .then(() => true, () => false)
}
```

- `action`：`'confirm'` / `'cancel'`
- 返回 `false`（或 Promise `resolve(false)`）→ 拦住不关
- 也可以按 ElementUI 原生写法直接调 `done()` 放行（两者等价，先到先算）

**唯一的例外**：父组件直接把 `v-model` 改成 `false` 时不过闸门（父组件说了算），
但挂起的 `open()` Promise 会被结算成 `{ type: 'cancel' }`，不会永远 pending。

---

## 六、实例方法（`this.$refs.xxx`）

| 方法                         | 说明                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `open(payload)`              | 打开，返回 `Promise<{ type, data, payload, source }>`；已打开时只更新 payload 并返回同一个 Promise |
| `submit(data)`               | 以「确认」结果结束（不发 `confirm` 事件）。`close-on-confirm: false` + 自己校验/异步成功后用它     |
| `close(data)`                | 直接关闭，结果按「取消」结算                                                                       |
| `cancel()` / `confirm(data)` | 等价于点底部按钮（会调 `@cancel` / `@confirm`，返回值可拦住关闭）                                  |
| `setLoading(v)`              | 手动控制确认按钮 loading                                                                           |
| `setVisible(v)`              | 只切显隐，不结算 Promise、不过闸门                                                                 |
| `toggle(payload)`            | 开着就关、关着就开                                                                                 |

---

## 七、常见需求对照

| 需求                | 写法                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| 列表行 → 编辑       | `this.$refs.edit.open(row)` + `#default="{ payload }"`，`@opened` 里回填表单     |
| 校验通过才关        | `@confirm` 里 `validate()` 失败就 `return false`                                 |
| 异步提交 + loading  | `@confirm` 写成 `async`，返回 `true` / `false`                                   |
| 完全自己控制关闭    | `:close-on-confirm="false"`，成功后 `submit(form)`，失败 `setLoading(false)`     |
| 只要「确定 / 取消」 | `const res = await this.$refs.dlg.open(row)`，看 `res.type`                      |
| 关之前二次确认      | `:before-close`，返回 `this.$confirm(...)` 的 Promise                            |
| 内容太长            | `:body-max-height="320"`，超出自己滚动                                           |
| 自定义标题 / 底部   | `#title` / `#footer` 插槽，作用域里有 `close` / `confirm` / `cancel` / `loading` |
| 连续点确定防重复    | `@confirm` 返回 Promise 时按钮自动 loading；也可 `:loading` 手动控制             |

---

## 八、注意

- **`destroy-on-close` + `#default` 作用域插槽**：关闭会销毁内容，所以每次打开都会重新走一遍
  `open()` → 渲染 → 插槽；用 `payload` 回填表单时请放在 `@opened` 里（DOM 已就绪）。
- **不要在 `#default` 里直接 `v-model` 绑列表行对象**：`payload` 是引用，改一半就脏了列表数据。
  用 `@opened` 拷一份到本地 `form` 再绑（演示页 ② 就是这么做的）。
- **`open()` 的返回值只有一个**：同一个弹窗连续 `open()` 两次时，第二次只更新 payload 并返回同一个
  Promise，避免「两个 await 各拿到一半结果」。
- **滚动的父级**：`append-to-body` 默认 true，弹窗挂在 `body` 下；若你的页面把 `body` 设了
  `transform` / `perspective`，固定定位会失效，弹窗可能跟着页面滚 —— 这时改成 `:append-to-body="false"`
  并把组件放在合适的位置。
