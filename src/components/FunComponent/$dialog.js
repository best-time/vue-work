import Vue from 'vue'
import FuncDialog from './FuncDialog.vue'

// 生成弹窗容器构造器（Vue2.6 的 Vue.extend）
const DialogConstructor = Vue.extend(FuncDialog)

/**
 * 函数式调用 el-dialog
 * @param {Object} options 同 FuncDialog.open() 的参数
 * @returns {Promise<{type:'confirm'|'cancel', data:*}>}
 *
 * 用法：
 *   const res = await this.$dialog({
 *     title: '弹窗标题',
 *     component: SomeContent,
 *     props: { msg: 'xxx' },
 *     dialogProps: { width: '500px', closeOnClickModal: false },
 *     beforeClose: async (vm, action) => { ...; return true }
 *   })
 *   if (res.type === 'confirm') { /* 业务处理 *\/ }
 */
function $dialog(options) {
  const vm = new DialogConstructor({
    parent: options.context || null // 传入上下文，保证组件内 $router/$store/全局可用
  })
  vm.$mount()
  document.body.appendChild(vm.$el)
  // 返回 Promise（open 内部返回）
  return vm.open(options)
}

/**
 * 返回 vm 句柄的变体，便于手动控制（loading、直接改 visible 等）
 * 用法：const dlg = this.$dialogWithHandle({...}); dlg.confirmLoading = true
 */
function $dialogWithHandle(options) {
  const vm = new DialogConstructor({
    parent: options.context || null
  })
  vm.$mount()
  document.body.appendChild(vm.$el)
  vm.open(options) // 不返回 promise
  return vm
}

/**
 * 全局快捷确认框，语义贴近 ElementUI 的 this.$confirm
 * 确认 -> resolve；取消/关闭 -> reject（便于 try/catch）
 *
 * 用法：
 *   try {
 *     await this.$confirm('确定删除这条记录吗？', '提示', {
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
 * 全局单按钮提示，语义贴近 ElementUI 的 this.$alert
 * 只有一个"知道了"按钮；无论确定还是右上角关闭，都视为完成并 resolve
 *
 * 用法：
 *   await this.$alert('操作已成功', '提示', { confirmText: '好的' })
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

// 挂载全局，页面通过 this.$dialog / this.$dialogWithHandle / this.$confirm / this.$alert 使用
Vue.prototype.$dialog = $dialog
Vue.prototype.$dialogWithHandle = $dialogWithHandle
Vue.prototype.$confirm = $confirm
Vue.prototype.$alert = $alert

export { $dialog, $dialogWithHandle, $confirm, $alert }
export default $dialog
