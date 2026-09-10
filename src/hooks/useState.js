/**
 * useState —— React 风格的响应式状态 Hook（Vue 2.6 + vue）
 *
 * 解决两个日常痛点：
 *   1. 想要 React 那种「一个值 + 一个 setter」的写法，但 Vue 里只能手写 ref + 一堆赋值逻辑；
 *   2. setter 需要支持「基于旧值更新」（setState(prev => prev + 1)），避免闭包拿到过期值。
 *
 * 返回值是「数组 + 命名属性」的混合形态，两种解构都能用：
 *   const [count, setCount] = useState(0)              // 数组解构（React 风格）
 *   const { state, setState, reset } = useState(0)     // 对象解构（Vue 风格）
 *
 * ---------------------------------------------------------------------------
 * @example 基础用法
 * import { useState } from '@/hooks/useState'
 *
 * export default {
 *   setup() {
 *     const [count, setCount] = useState(0)
 *     const inc = () => setCount(count.value + 1)   // 直接传值
 *     const incSafe = () => setCount(prev => prev + 1) // 基于旧值（推荐）
 *     return { count, inc, incSafe }
 *   }
 * }
 *
 * @example 对象状态 + 变化回调
 * const [form, setForm] = useState(
 *   { name: '', age: 0 },
 *   {
 *     onChange: (val) => console.log('form 变化了', val),
 *     immediate: true
 *   }
 * )
 * setForm({ name: 'tom', age: 18 })     // 整体替换
 * setForm(prev => ({ ...prev, age: 19 })) // 局部更新（自行合并）
 *
 * @example 惰性初始值：初始值用函数包一层，只在需要时计算
 * const [list, setList] = useState(() => expensiveParse())
 *
 * @example 跨组件共享状态（同一 key 全局唯一）
 * import { useSharedState } from '@/hooks/useState'
 * const [theme, setTheme] = useSharedState('theme', 'light')
 *
 * ---------------------------------------------------------------------------
 * 实现说明：
 *   - 状态本体就是 composition-api 的 ref，所以模板里自动解包、可作为 watch 的 source、
 *     也可以直接传给子组件；不引入任何额外依赖（项目已移除 @vueuse/core）。
 *   - onChange 只是 watch 的语法糖。watcher 在 setup() 内创建时会被 composition-api
 *     自动收集（库内 recordEffectScope），组件销毁自动停止，因此这里不写 onUnmounted，
 *     这样即使 hook 在组件外被调用也不会出现「no active instance」告警。
 *   - 为兼容本项目的 babel 配置与同目录 hook 的写法，本文件不使用对象展开（...rest）
 *     与可选链语法。
 */
import { ref, watch } from '@vue/composition-api'

function isFn(v) {
  return typeof v === 'function'
}

/**
 * 解析初始值。
 * 传入函数时视为「工厂」，每次调用都重新执行以拿到一份新的初始值（惰性初始化），
 * 这也让 reset() 能拿到干净的初始状态（例如 () => new Date()）。
 */
function resolveInitial(initialValue) {
  return isFn(initialValue) ? initialValue() : initialValue
}

/**
 * 创建一个响应式状态
 *
 * @param {*} [initialValue] 初始值；传函数则作为工厂惰性求值
 * @param {Object} [options]
 * @param {(value: any, oldValue: any) => void} [options.onChange] 状态变化回调
 * @param {boolean} [options.deep=true] onChange 是否深度监听（对象状态建议保持 true）
 * @param {boolean} [options.immediate=false] 是否立即用初始值触发一次 onChange
 * @returns {[Ref, Function] & { state: Ref, setState: Function, reset: Function }}
 *          [state, setState] 元组，同时挂载 state / setState / reset 命名属性
 */
export function useState(initialValue, options) {
  const opts = options || {}
  const state = ref(resolveInitial(initialValue))

  const onChange = isFn(opts.onChange) ? opts.onChange : null
  const deep = opts.deep !== false
  const immediate = opts.immediate === true

  /**
   * 更新状态
   * @param {*} next 新值，或 (prev) => next 形式的更新函数
   * @returns {*} 更新后的值
   */
  function setState(next) {
    const prev = state.value
    const value = isFn(next) ? next(prev) : next

    // 与 React 语义一致：值没有变化就不触发更新，避免无意义的重渲染与回调
    if (Object.is(value, prev)) return prev

    state.value = value
    return value
  }

  /** 恢复到初始状态（初始值为工厂函数时会重新执行一次） */
  function reset() {
    return setState(resolveInitial(initialValue))
  }

  if (onChange) {
    watch(
      state,
      function (val, oldVal) {
        onChange(val, oldVal)
      },
      { deep: deep, immediate: immediate }
    )
  }

  // 数组解构为主，同时挂命名属性以兼容对象解构
  const result = [state, setState]
  result.state = state
  result.setState = setState
  result.reset = reset
  return result
}

/**
 * 跨组件共享状态。同一个 key 在全应用内只创建一次，所有调用方拿到同一个 ref，
 * 任何一处 setState 都会同步到其它组件。
 *
 * 注意：
 *   - 这里刻意不接收 onChange —— 共享状态的 watcher 若绑定在「第一个创建它的组件」上，
 *     该组件销毁后回调就会失效。需要监听时请在使用它的组件里自行 watch(state, cb)。
 *   - 共享状态常驻内存，页面长期不销毁且 key 很多时建议用 clearSharedState 主动清理。
 *
 * @param {string} key 唯一标识
 * @param {*} [initialValue] 仅在首次创建时生效
 * @returns {同 useState}
 *
 * @example
 * // A 组件
 * const [count, setCount] = useSharedState('count', 0)
 * // B 组件
 * const [count] = useSharedState('count', 0)   // 拿到的是同一个值
 */
const sharedStore = Object.create(null)

export function useSharedState(key, initialValue) {
  if (!sharedStore[key]) {
    sharedStore[key] = useState(initialValue)
  }
  return sharedStore[key]
}

/**
 * 清理共享状态（不传 key 则清空全部）
 * @param {string} [key]
 */
export function clearSharedState(key) {
  if (key === undefined || key === null) {
    Object.keys(sharedStore).forEach(function (k) {
      delete sharedStore[k]
    })
    return
  }
  delete sharedStore[key]
}

export default useState
