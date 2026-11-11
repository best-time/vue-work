# ConfirmButton

带 **loading** 与 **二次确认弹窗** 的 `el-button`。已全局注册：`<confirm-button>`。
演示页：`/confirm-button-demo`（源码 `ConfirmButtonDemoPage.vue`）

## 目录

```
ConfirmButton.vue            组件本体
index.js                     模块作用域 install(Vue)
demo.scss                    演示页样式（全局，子组件共用）
ConfirmButtonDemoPage.vue    演示页外壳：头部 + 四个页签 + 常驻事件日志
parts/
  BasicTab.vue               ① 三种用法（A 外部 loading / B action / C 不确认 / D 失败）
  DangerTab.vue              ② 危险操作（逐行删除 / before-confirm 守卫 / props 表）
  RichTab.vue                ③ 富内容确认（#content 插槽 + close-on-confirm="false"）
  PitfallTab.vue             ④ 透传与坑（$attrs 透传 + 四条踩坑记录）
  logMixin.js                页签共用：log() → $emit('log')、msgOf()
  wait.js                    模拟接口延迟
```

页签是 `el-tabs` + `lazy`，每个页签是独立组件，只持有自己的状态与假接口；
事件日志跨页签共用一份，所以数据留在页面（父级），子组件 `$emit('log', { type, text })`。
样式不能写在页面里做 scoped —— 子组件的内部元素拿不到父级 `data-v`，卡片会全部掉样式，
因此 `demo.scss` 走全局，作用域靠唯一的 `.cbd` 前缀。

## 最小用法

```html
<!-- 确认后由组件执行 action，并负责 loading / 成功失败提示 -->
<confirm-button
  type="danger"
  :action="remove"
  confirm-title="删除招聘计划"
  confirm-content="删除后不可恢复，确认继续？"
  confirm-type="danger"
  confirm-icon="warning"
  success-text="已删除"
>
  删除
</confirm-button>
```

```js
methods: {
  remove() {
    return api.delete('/plan/1')   // 必须返回 Promise；reject 会自动 toast + emit error
  }
}
```

## 三种用法（按「谁来管 loading」区分）

| 写法 | 适合 | loading 谁管 |
|---|---|---|
| `@confirm` + `:loading` | 已有统一提交逻辑 | 业务自己 |
| `:action` | 大多数场景（推荐） | 组件 |
| `:need-confirm="false" :action` | 高频、可逆、不需要问 | 组件 |

## Props

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `loading` | Boolean | `false` | 外部 loading，与内部 action 的 loading 取「或」 |
| `need-confirm` | Boolean | `true` | `false` 时点一下直接执行，`@confirm` 的 `from` 为 `direct` |
| `confirm-title` | String | `操作确认` | 弹窗标题 |
| `confirm-content` | String | `''` | 弹窗正文；有 `#content` 插槽时以插槽为准 |
| `confirm-text` / `cancel-text` | String | `确定` / `取消` | 底部按钮文案 |
| `confirm-type` | String | `primary` | 确定按钮颜色，危险操作用 `danger` |
| `confirm-width` | String | `460px` | 弹窗宽度 |
| `confirm-top` | String | `15vh` | 弹窗距顶 |
| `confirm-icon` | String | `none` | `warning / info / success / error / question` 或任意 `el-icon-*` |
| `close-on-confirm` | Boolean | `true` | `false` = 点确定不关弹窗，成功后才关（见下） |
| `before-confirm` | Function | `null` | `(event) => boolean \| Promise<boolean>`，返回 `false` 不弹框、emit `block` |
| `action` | Function | `null` | `() => Promise`，确认后执行 |
| `success-text` | String | `''` | 成功后 toast，空串不弹 |
| `error-text` | String | `''` | 失败 toast 文案，空串用 `err.message`，再兜底「操作失败」 |

`type / size / plain / round / circle / icon / disabled …` 这些 **el-button 原生属性全部透传**
（`inheritAttrs: false` + `v-bind="$attrs"`），组件不重复声明。

根节点是 `<span class="cb-wrap">`（Vue 2 单根节点，里面放按钮 + 弹窗），
所以写在组件上的 `class` / `style` 落在这一层，加外边距没问题，别指望它直接命中 `button`。

## 事件

| 事件 | 时机 | 参数 |
|---|---|---|
| `click` | 按钮被点（业务事件，先于确认） | 原生 event |
| `confirm` | 确认通过 | `{ from: 'dialog' \| 'direct', event }` |
| `cancel` | 取消 / ✕ / ESC | — |
| `block` | `before-confirm` 返回 `false` | 原生 event |
| `success` | `action` resolve | `action` 的返回值 |
| `error` | `action` reject 或守卫抛错 | `Error` |

## 方法

- `ref.open()` —— 直接弹确认框（跳过 `before-confirm`）
- `ref.close()` —— 关掉确认框（`close-on-confirm="false"` 时由父级调）

## 弹窗是懒挂载的

第一次点开才创建 `el-dialog` 的 DOM（`v-if="dialogReady"`，下一帧再置 `visible` 保住入场动画）。
这样「表格每行一个删除按钮」时不会先渲染出几十个 `display:none` 的弹窗。

## 两种关闭模式

```html
<!-- 默认：关框 → 按钮转圈 → toast，用户始终能看见按钮上的 loading -->
<confirm-button :action="save">保存</confirm-button>

<!-- 卡住型：不关框，确定按钮转圈，父级校验不过就停在框里改，成功才 close() -->
<confirm-button ref="ok" :close-on-confirm="false" :loading="busy" @confirm="submit">
  提交
  <template #content>
    <el-input v-model="reason" type="textarea" />
    <p v-if="err" class="err">{{ err }}</p>
  </template>
</confirm-button>
```

## 四个坑（都已处理，改代码时别踩回去）

1. **两处 loading 必须取「或」**：`actionLoading || loading`。只认一个的话，action 转圈期间外部还能点。
2. **不能 `v-on="$listeners"` 全量转发**：本组件自己 `$emit('click')`，再转发给 `el-button` 会让 `@click` 触发两次。按白名单剔除本组件事件，其余（鼠标事件等）才转发。
3. **`el-dialog` 的 `@close` 分不清是谁关的**：✕ / ESC / 点遮罩 / 父级置 `visible=false` 都会触发。内部用 `closeBy` 标记，只在 `'none'` 时才 `emit('cancel')`。
4. **`append-to-body` 后拿不到父级 scoped 样式与 CSS 变量**：弹窗样式是本文件里一份 `.cb-dlg` 前缀的**非 scoped** 样式；`#content` 插槽内的节点属于父级作用域，仍然吃父页面样式。

## 为什么不用 `$confirm` / `ElMessageBox`

它的内容只能是字符串或 render 函数里的 vnode。需要「确认前填个原因、勾选已知晓」时，
用 `el-dialog` + `#content` 插槽在模板里直接写表单更省事，也能控制宽度与关闭时机。
