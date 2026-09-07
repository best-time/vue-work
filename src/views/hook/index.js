// src/hooks/vueusePolyfill.js
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
    if (val !== undefined) {
      state.value = val
    } else {
      state.value = !state.value
    }
  }

  return { state, toggle }
}

/**
 * useElementVisibility 元素是否在视口，IntersectionObserver
 * @param {import('@vue/composition-api').Ref<HTMLElement|null>} target
 * @param {IntersectionObserverInit} options
 */
export function useElementVisibility(target, options = {}) {
  const isVisible = ref(false)
  let observer = null

  const cb = (entries) => {
    const entry = entries[0]
    isVisible.value = entry.isIntersecting
  }

  onMounted(() => {
    if (!window.IntersectionObserver) return
    observer = new IntersectionObserver(cb, options)
    if (target.value) {
      observer.observe(target.value)
    }
  })

  onUnmounted(() => {
    if (observer) observer.disconnect()
  })

  return isVisible
}
