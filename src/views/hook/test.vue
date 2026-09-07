<template>
  <div>
    <div>count: {{ count }}</div>
    <el-button @click="inc">+</el-button>
    <el-button @click="toggleFlag">toggle</el-button>
    <div>mouse x: {{ x }} y: {{ y }}</div>
  </div>
</template>

<script>
import {
  useLocalStorage,
  useSessionStorage,
  useDebounceFn,
  useThrottleFn,
  useMouse,
  useNow,
  useInterval,
  useCounter,
  useToggle,
  useElementVisibility
} from '@/hooks/vueusePolyfill'
import { ref } from '@vue/composition-api'

export default {
  setup() {
    // counter
    const { count, inc } = useCounter(0)

    // toggle
    const { state: flag, toggle: toggleFlag } = useToggle(false)

    // mouse
    const { x, y } = useMouse()

    // storage
    const lsToken = useLocalStorage('demo_token', '')
    const ssTmp = useSessionStorage('demo_tmp', 1)

    // debounce
    const { run: debSearch } = useDebounceFn(() => {
      console.log('防抖搜索')
    }, 300)

    // throttle
    const { run: throttleLog } = useThrottleFn(() => {
      console.log('节流')
    }, 500)

    // now
    const now = useNow(1000)

    // interval
    const { stop: stopTimer } = useInterval(() => {
      console.log('interval tick')
    }, 2000)

    // element visibility
    const domRef = ref(null)
    const visible = useElementVisibility(domRef)

    return {
      count,
      inc,
      flag,
      toggleFlag,
      x,
      y,
      lsToken,
      now,
      domRef,
      visible,
      debSearch,
      throttleLog
    }
  }
}
</script>
