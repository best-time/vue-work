// src/hooks/vueusePolyfill.js
//
// 轻量版 VueUse 常用能力（Vue 2.6 + @vue/composition-api）。
// 只依赖 composition-api，不依赖 @vueuse/core（后者 v10+ 需要 Vue 3）。
//
// 元素可见性统一走 src/hooks/useElementVisibility.js，在本文件末尾 re-export，
// 这样使用方只需要从一个地方 import。
import { ref, watch, onMounted, onUnmounted } from '@vue/composition-api'

/**
 * useLocalStorage
 * @param {string} key
 * @param {any} initialValue
 */
export function useLocalStorage(key, initialValue) {
  const stored = localStorage.getItem(key)
  let init
  if (stored !== null) {
    try {
      init = JSON.parse(stored)
    } catch {
      init = stored
    }
  } else {
    init = initialValue
  }
  const data = ref(init)

  watch(
    data,
    (val) => {
      if (val === null || val === undefined) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val))
      }
    },
    { deep: true }
  )
  return data
}

/**
 * useSessionStorage
 * @param {string} key
 * @param {any} initialValue
 */
export function useSessionStorage(key, initialValue) {
  const stored = sessionStorage.getItem(key)
  let init
  if (stored !== null) {
    try {
      init = JSON.parse(stored)
    } catch {
      init = stored
    }
  } else {
    init = initialValue
  }
  const data = ref(init)

  watch(
    data,
    (val) => {
      if (val === null || val === undefined) {
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val))
      }
    },
    { deep: true }
  )
  return data
}

/**
 * useDebounceFn 防抖
 * @param {Function} fn
 * @param {number} delay ms
 */
export function useDebounceFn(fn, delay) {
  let timer = null
  const run = (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(null, args)
    }, delay)
  }
  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return { run, cancel }
}

/**
 * useThrottleFn 节流
 * @param {Function} fn
 * @param {number} delay ms
 */
export function useThrottleFn(fn, delay) {
  let last = 0
  let timer = null
  const run = (...args) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(null, args)
    } else {
      if (timer) return
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn.apply(null, args)
      }, delay - (now - last))
    }
  }
  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return { run, cancel }
}

/**
 * useMouse 鼠标位置
 */
export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  const handler = (e) => {
    x.value = e.clientX
    y.value = e.clientY
  }

  onMounted(() => {
    window.addEventListener('mousemove', handler)
  })
  onUnmounted(() => {
    window.removeEventListener('mousemove', handler)
  })

  return { x, y }
}

/**
 * useNow 当前时间 Date
 * @param {number} interval 刷新间隔ms
 */
export function useNow(interval = 1000) {
  const now = ref(new Date())
  let timer = null

  const update = () => {
    now.value = new Date()
  }

  onMounted(() => {
    update()
    timer = setInterval(update, interval)
  })
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return now
}

/**
 * useInterval
 * @param {Function} callback
 * @param {number} delay ms，0不执行
 */
export function useInterval(callback, delay) {
  const isActive = ref(false)
  let timer = null

  const start = () => {
    if (delay <= 0) return
    isActive.value = true
    timer = setInterval(callback, delay)
  }

  const stop = () => {
    isActive.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(() => {
    if (delay > 0) start()
  })
  onUnmounted(() => stop())

  return { isActive, start, stop }
}

/**
 * useCounter 计数器
 * @param {number} initialValue
 */
export function useCounter(initialValue = 0) {
  const count = ref(initialValue)

  const inc = (delta = 1) => {
    count.value += delta
  }
  const dec = (delta = 1) => {
    count.value -= delta
  }
  const set = (val) => {
    count.value = val
  }
  const reset = () => {
    count.value = initialValue
  }

  return { count, inc, dec, set, reset }
}

/**
 * useToggle 布尔切换
 * @param {boolean} initialValue
 */
export function useToggle(initialValue = false) {
  const state = ref(initialValue)

  const toggle = (val) => {
    console.log(val, 'vvv')
    if (val !== undefined) {
      state.value = val
    } else {
      state.value = !state.value
    }
  }

  return { state, toggle }
}

// 元素可见性：统一使用独立实现，支持 root / threshold / once / onChange / 降级
export { useElementVisibility, useIntersectionObserver } from './useElementVisibility'
