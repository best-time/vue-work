/**
 * 元素可见性 Hook —— Vue 2.6 + @vue/composition-api
 *
 * 对外提供两个 API：
 *   1. useElementVisibility(target, options) -> Ref<boolean>
 *      常用场景：判断某个模块/组件是否进入可视区域（懒加载、曝光埋点、入场动画、无限滚动）
 *   2. useIntersectionObserver(target, callback, options)
 *      底层实现，需要拿到完整的 IntersectionObserverEntry（intersectionRatio、boundingClientRect 等）时使用
 *
 * 相比「只在 onMounted 里 observe 一次」的朴素写法，这里处理了几个实际会踩的坑：
 *   - target 支持 Ref / 函数 / 原生元素 / 组件实例（自动取 $el），且元素是异步渲染出来时会在
 *     target 变化后自动重新观察（v-if、接口返回后才渲染、弹窗内的元素都能正常工作）
 *   - root 支持自定义滚动容器（同样是 Ref / 函数 / 元素），用于「滚动容器内判断子元素可见」
 *   - 组件卸载时自动 disconnect 并解绑监听，不泄漏
 *   - 环境不支持 IntersectionObserver 时自动降级为 scroll/resize + getBoundingClientRect
 *
 * 注意：为兼容本项目的 babel 配置，本文件不使用对象展开（...rest）与可选链语法。
 */
import {
  ref,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  unref
} from '@vue/composition-api'

const isClient = typeof window !== 'undefined'
const hasIntersectionObserver = isClient && 'IntersectionObserver' in window

/**
 * 把各种形态的 target 归一化成真实 DOM 元素
 * @param {*} target Ref<Element> | () => Element | Element | 组件实例 | null
 * @returns {Element|null}
 */
function resolveElement(target) {
  let raw = typeof target === 'function' ? target() : unref(target)
  if (!raw) return null
  // template ref 指向子组件时拿到的是组件实例，取它的根元素
  if (raw.$el) raw = raw.$el
  return raw && raw.nodeType === 1 ? raw : null
}

/**
 * target 是否可被监听（ref / getter 会变化，需要 watch 重新 observe）
 */
function isWatchableTarget(target) {
  return (
    typeof target === 'function' ||
    (target !== null && typeof target === 'object' && 'value' in target)
  )
}

/**
 * 降级方案：用 getBoundingClientRect 判断元素是否与视口/容器相交
 */
function isInViewport(el, rootEl) {
  const rect = el.getBoundingClientRect()
  if (!rect.width && !rect.height) return false

  let container
  if (rootEl && rootEl.nodeType === 1) {
    container = rootEl.getBoundingClientRect()
  } else {
    container = {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    }
  }

  return (
    rect.bottom > container.top &&
    rect.top < container.bottom &&
    rect.right > container.left &&
    rect.left < container.right
  )
}

/**
 * 底层 hook：观察元素与视口（或指定容器）的交叉状态
 *
 * @param {*} target 同 resolveElement
 * @param {(entry: IntersectionObserverEntry) => void} callback 交叉状态变化回调
 * @param {Object} [options]
 * @param {*} [options.root=null] 滚动容器，null 表示视口
 * @param {string} [options.rootMargin='0px'] 例如 '100px 0px'（提前/延后触发，适合预加载）
 * @param {number|number[]} [options.threshold=0] 触发阈值，0 表示刚露出 1px 就触发
 * @param {boolean} [options.once=false] 首次进入可视区域后自动停止观察
 * @returns {{ isSupported: boolean, start: Function, stop: Function, observer: IntersectionObserver|null }}
 */
export function useIntersectionObserver(target, callback, options) {
  const opts = options || {}
  const root = opts.root === undefined ? null : opts.root
  const rootMargin = opts.rootMargin === undefined ? '0px' : opts.rootMargin
  const threshold = opts.threshold === undefined ? 0 : opts.threshold
  const once = opts.once === true

  let observer = null
  let removeFallback = null
  let stopped = false

  function clean() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (removeFallback) {
      removeFallback()
      removeFallback = null
    }
  }

  /** 停止观察 */
  function stop() {
    stopped = true
    clean()
  }

  /** 开始（或重新）观察，元素还没渲染出来时返回 false */
  function start() {
    clean()
    stopped = false

    const el = resolveElement(target)
    if (!el) return false

    const rootEl = resolveElement(root)

    // 降级：老浏览器或特殊环境下没有 IntersectionObserver
    if (!hasIntersectionObserver) {
      const check = () => {
        if (stopped) return
        const visible = isInViewport(el, rootEl)
        callback({
          target: el,
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0
        })
        if (visible && once) stop()
      }
      window.addEventListener('scroll', check, { passive: true })
      window.addEventListener('resize', check, { passive: true })
      removeFallback = () => {
        window.removeEventListener('scroll', check)
        window.removeEventListener('resize', check)
      }
      check()
      return true
    }

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        callback(entry)
        if (once && entry.isIntersecting) stop()
      },
      { root: rootEl, rootMargin: rootMargin, threshold: threshold }
    )
    observer.observe(el)
    return true
  }

  // 元素是异步渲染出来的：target 变化后重新观察
  if (isWatchableTarget(target)) {
    watch(target, () => {
      if (!stopped) nextTick(start)
    })
  }
  onMounted(() => {
    nextTick(start)
  })
  onUnmounted(stop)

  return {
    isSupported: hasIntersectionObserver,
    start: start,
    stop: stop,
    get observer() {
      return observer
    }
  }
}

/**
 * 判断目标元素是否在可视区域
 *
 * @param {*} target Ref<Element> | () => Element | Element | 组件实例
 * @param {Object} [options]
 * @param {*} [options.root=null] 滚动容器，默认视口
 * @param {string} [options.rootMargin='0px'] 例如 '200px 0px' 可提前判定为可见
 * @param {number|number[]} [options.threshold=0]
 * @param {boolean} [options.once=false] 只关心「第一次可见」（懒加载、曝光埋点）
 * @param {boolean} [options.initialValue=false] 初始值
 * @param {(visible: boolean, entry: Object) => void} [options.onChange] 状态变化回调
 * @returns {import('@vue/composition-api').Ref<boolean>} 是否可见
 *
 * @example 基础用法
 * const boxRef = ref(null)
 * const isVisible = useElementVisibility(boxRef)
 * // <div ref="boxRef">{{ isVisible ? '可见' : '不可见' }}</div>
 *
 * @example 懒加载 / 曝光埋点：只触发一次
 * useElementVisibility(boxRef, {
 *   once: true,
 *   rootMargin: '200px 0px',
 *   onChange: (visible) => { if (visible) loadImage() }
 * })
 *
 * @example 滚动容器内的子元素
 * const isVisible = useElementVisibility(itemRef, { root: scrollBoxRef, threshold: 0.5 })
 */
export function useElementVisibility(target, options) {
  const opts = options || {}
  const isVisible = ref(opts.initialValue === true)
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : null

  const ioOptions = Object.assign({}, opts)
  delete ioOptions.onChange
  delete ioOptions.initialValue

  useIntersectionObserver(
    target,
    (entry) => {
      const visible =
        typeof entry.isIntersecting === 'boolean'
          ? entry.isIntersecting
          : entry.intersectionRatio > 0

      if (isVisible.value === visible) return
      isVisible.value = visible
      if (onChange) onChange(visible, entry)
    },
    ioOptions
  )

  return isVisible
}
