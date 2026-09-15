import { getCurrentInstance } from 'vue-demi'
import { $dialog, $dialogWithHandle, $confirm, $alert } from '@/utils/$dialog'

// Vue 2.7+ 原生组合式 API：把上面一行改为 `from 'vue'` 即可

/**
 * useDialog — 在 setup() 中使用的函数式弹窗（无需 this）
 *
 * 依赖：@vue/composition-api（Vue 2.6 的 Composition API 插件）
 *   main.js:  import VueCompositionAPI from 'vue-demi'
 *             Vue.use(VueCompositionAPI)
 *
 * 用法：
 *   setup() {
 *     const { dialog, confirm, alert } = useDialog()
 *     const open = async () => {
 *       const res = await dialog({ title: '标题', component: Xxx, props: {} })
 *     }
 *     return { open }
 *   }
 *
 * 说明：
 *  - 自动通过 getCurrentInstance() 取当前组件实例作为 context，
 *    保证弹窗内业务组件 $router/$store/provide 链可用；
 *  - beforeClose 回调在 setup 里写箭头函数即可直接闭包访问 setup 变量，
 *    不存在 this 指向问题；
 *  - 也可以不调用本函数，直接 import { $dialog, $confirm, $alert }
 *    从 '@/utils/$dialog' 使用（它们本身就是纯函数，不依赖 this）。
 */
export function useDialog() {
  const instance = getCurrentInstance()
  // @vue/composition-api 的 proxy 即当前组件实例（Vue3 同样适用）
  const ctx = instance && instance.proxy ? { context: instance.proxy } : {}

  return {
    /** 通用业务弹窗，返回 Promise<{type:'confirm'|'cancel', data:*}> */
    dialog: (options = {}) => $dialog({ ...ctx, ...options }),

    /** 返回容器实例句柄，可手动控制 confirmLoading / visible */
    dialogWithHandle: (options = {}) => $dialogWithHandle({ ...ctx, ...options }),

    /** 确认框：确认 resolve，取消 reject */
    confirm: (message, title = '提示', options = {}) =>
      $confirm(message, title, { ...ctx, ...options }),

    /** 单按钮提示：恒 resolve */
    alert: (message, title = '提示', options = {}) =>
      $alert(message, title, { ...ctx, ...options })
  }
}

export default useDialog
