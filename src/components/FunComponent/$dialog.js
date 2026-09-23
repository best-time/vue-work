import Vue from 'vue'
import FuncDialog from './FuncDialog.vue'

// 生成弹窗容器构造器（Vue2.6 的 Vue.extend）
const DialogConstructor = Vue.extend(FuncDialog)

/* ------------------------------------------------------------------ *
 * 插槽注入：函数式调用没有「模板父级」，插槽只能靠 JS 传进来
 *
 * 为什么需要这一步：
 *   容器是 `new DialogConstructor()` 出来的「无父级实例」。
 *   Vue 的 initRender 会把 $slots 置为 {} 、$scopedSlots 置为 emptyObject，
 *   而 _render 里只在存在 _parentVnode（有 vnode 占位节点）时才会重建
 *   $scopedSlots —— 函数式创建的实例没有 _parentVnode，所以两个都是空的，
 *   容器模板里的 `<slot name="xx">` 永远拿不到东西。
 *
 * 做法：
 *   在 $mount() 之前，手工把调用方传入的 slots / scopedSlots
 *   归一化后挂到实例上（$slots / $scopedSlots），
 *   之后容器模板就能和普通组件一样使用插槽，业务组件也能正常收到。
 * ------------------------------------------------------------------ */

/**
 * 归一化单个插槽值 -> (scope) => VNode[]
 *
 * 支持 4 种写法（作用域插槽只能用函数式）：
 *   1. 字符串 / 数字            '一段文案'
 *   2. VNode                    h('span', '一段文案')
 *   3. VNode[]                  [h('span', 'a'), h('span', 'b')]
 *   4. (h, scope) => VNode|VNode[]      函数式，scope 为业务组件回传的作用域数据
 *
 * @param {Function} h      createElement（来自调用方 $createElement）
 * @param {*}        value  插槽值
 * @returns {Function} (scope) => VNode[]
 */
function normalizeSlot(h, value) {
  if (typeof value === 'function') {
    return scope => {
      const res = value(h, scope)
      return Array.isArray(res) ? res : [res]
    }
  }
  // 静态值：每次渲染返回同一批节点（内容不跟随数据变化，需要响应式请用函数式）
  const nodes = Array.isArray(value) ? value : [value]
  return () => nodes
}

/**
 * 把 slots / scopedSlots 注入容器实例
 * @param {Vue}    vm      容器实例（尚未 $mount）
 * @param {Object} options $dialog 的入参
 */
function injectSlots(vm, options) {
  const slotValues = options.slots || {}
  const scopedSlotValues = options.scopedSlots || {}
  if (!Object.keys(slotValues).length && !Object.keys(scopedSlotValues).length) {
      return
  }

  // 优先用调用方的 $createElement：插槽内容的 render context 就是调用方，
  // 与「在调用方模板里写插槽」完全一致（scoped 样式、$refs、事件 this 都正常）
  const h = (options.context && options.context.$createElement) || vm.$createElement

  const $slots = {}
  const $scopedSlots = {}

  // ① 普通插槽：同时挂 $slots（给 v-if="$slots.xx"、<slot> 兜底渲染用）与 $scopedSlots
  Object.keys(slotValues).forEach(name => {
    const fn = normalizeSlot(h, slotValues[name])
    $scopedSlots[name] = fn
    // 用 getter 惰性求值：容器每次 re-render 都会重新执行插槽函数，
    // 插槽内容才能跟着调用方的响应式数据变化（直接存 VNode 数组会被「冻在」首次渲染）
    Object.defineProperty($slots, name, {
      enumerable: true,
      configurable: true,
      get: () => fn()
    })
  })

  // ② 作用域插槽：只挂 $scopedSlots —— 必须等业务组件把 scope 传上来才能求值
  Object.keys(scopedSlotValues).forEach(name => {
    $scopedSlots[name] = normalizeSlot(h, scopedSlotValues[name])
  })

  vm.$slots = $slots
  vm.$scopedSlots = $scopedSlots
}

/**
 * 创建容器实例并挂载到 body（插槽必须在 $mount 之前注入）
 * @returns {Vue} 容器实例
 */
function mountDialog(options) {
  const vm = new DialogConstructor({
    parent: options.context || null // 传入上下文，保证组件内 $router/$store/全局可用
  })
  injectSlots(vm, options)
  vm.$mount()
  document.body.appendChild(vm.$el)
  return vm
}

/**
 * 函数式调用 el-dialog
 * @param {Object} options 同 FuncDialog.open() 的参数
 * @returns {Promise<{type:'confirm'|'cancel', data:*}>}
 *
 * 用法：
 *   const res = await this.$_dialog({
 *     title: '弹窗标题',
 *     component: SomeContent,
 *     props: { msg: 'xxx' },
 *     dialogProps: { width: '500px', closeOnClickModal: false },
 *     beforeClose: async (vm, action) => { ...; return true }
 *   })
 *   if (res.type === 'confirm') { /* 业务处理 *\/ }
 *
 * 插槽用法（支持 slots / scopedSlots，写法见 README 与 demo1.vue 示例）：
 *   const dlg = this.$dialogWithHandle({
 *     title: '标题',
 *     component: SomeContent,
 *     slots: {
 *       default: '普通插槽：字符串 / VNode / 数组 / 渲染函数都可以',
 *       footer: h => [h('el-button', { on: { click: () => dlg.onCancel() } }, '取消')]
 *     },
 *     scopedSlots: {
 *       row: (h, { row, index }) => [h('span', `${index}-${row.name}`)]
 *     }
 *   })
 */
function $dialog(options) {
  return mountDialog(options).open(options)
}

/**
 * 返回 vm 句柄的变体，便于手动控制（loading、直接改 visible 等）
 * 用法：const dlg = this.$dialogWithHandle({...}); dlg.confirmLoading = true
 *      dlg.onConfirm(data) / dlg.onCancel() 可手动触发容器的确定/取消逻辑
 *      await dlg.openPromise 仍可拿到 { type, data } 结果（句柄 + 结果两不误）
 */
function $dialogWithHandle(options) {
  const vm = mountDialog(options)
  vm.openPromise = vm.open(options) // 句柄上同时挂一份结果 Promise，方便 await
  return vm
}

/**
 * 全局快捷确认框，语义贴近 ElementUI 的 this.$_confirm
 * 确认 -> resolve；取消/关闭 -> reject（便于 try/catch）
 *
 * 用法：
 *   try {
 *     await this.$_confirm('确定删除这条记录吗？', '提示', {
 *       confirmText: '删除',
 *       cancelText: '取消',
 *       type: 'warning' // 可传 el-dialog 属性
 *     })
 *     // 用户点了确定
 *   } catch (e) {
 *     // 用户取消或关闭
 *   }
 */
function $confirm(message, title = '提示', options = {}) {
  const {
    confirmText = '确定',
    cancelText = '取消',
    context = null,
    ...dialogProps
  } = options

  // 走标准 $dialog 流程，容器负责渲染 message + 默认 footer（自定义文案）
  return $dialog({
    title,
    message,
    context,
    confirmText,
    cancelText,
    dialogProps: { width: '420px', closeOnClickModal: false, ...dialogProps }
  }).then(res => {
    if (res.type === 'confirm') return true
    return Promise.reject('cancel')
  })
}

/**
 * 全局单按钮提示，语义贴近 ElementUI 的 this.$_alert
 * 只有一个"知道了"按钮；无论确定还是右上角关闭，都视为完成并 resolve
 *
 * 用法：
 *   await this.$_alert('操作已成功', '提示', { confirmText: '好的' })
 */
function $alert(message, title = '提示', options = {}) {
  const {
    confirmText = '知道了',
    context = null,
    ...dialogProps
  } = options

  return $dialog({
    title,
    message,
    context,
    confirmText,
    showCancel: false, // 只显示一个确定按钮
    dialogProps: { width: '420px', closeOnClickModal: false, ...dialogProps }
  }).then(() => true)  // 确定或关闭都视为完成，不 reject
}

// 挂载全局，页面通过 this.$_dialog / this.$dialogWithHandle / this.$_confirm / this.$_alert 使用
Vue.prototype.$_dialog = $dialog
Vue.prototype.$dialogWithHandle = $dialogWithHandle
Vue.prototype.$_confirm = $confirm
Vue.prototype.$_alert = $alert

export { $dialog, $dialogWithHandle, $confirm, $alert, injectSlots }
export default $dialog
