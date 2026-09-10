<template>
  <div class="hook-test">
    <h2>Composition API Hooks 演示</h2>

    <!-- 基础能力 -->
    <section class="card">
      <div>count: {{ count }}</div>

      <el-button size="mini" @click="() => inc()">+</el-button>
      <el-button size="mini" @click="() => toggleFlag()">toggle: {{ flag }}</el-button>


      <div>mouse x: {{ x }} y: {{ y }}</div>
      <div>now: {{ nowText }}</div>
    </section>

    <!-- 元素可见性 -->
    <section class="card">
      <h3>useElementVisibility —— 模块是否在可视区域</h3>
      <p>
        目标模块当前状态：
        <b :class="['badge', visible ? 'in' : 'out']">
          {{ visible ? '在可视区域' : '不在可视区域' }}
        </b>
      </p>
      <!-- 滚动容器作为 root 传入，容器内滚动也能正确判断 -->
      <div class="scroll-box" ref="scrollBoxRef">
        <div class="spacer">↓ 往下滚动 ↓</div>
        <div class="target" ref="targetRef">
          {{ visible ? '👀 我看到你了' : '还没进入可视区域' }}
        </div>
      </div>

      <p class="tip">
        曾经进入过可视区域（onChange 回调，懒加载/曝光埋点常用）：
        <b>{{ everVisible ? '是' : '否' }}</b>
      </p>
    </section>
  </div>
</template>

<script>
import {
  useCounter,
  useToggle,
  useMouse,
  useNow,
  useElementVisibility
} from '@/hooks/vueusePolyfill'
import { ref, computed } from '@vue/composition-api'

export default {
  setup() {
    const { count, inc } = useCounter(0)
    const { state: flag, toggle: toggleFlag } = useToggle(false)
    const { x, y } = useMouse()
    const now = useNow(1000)
    const nowText = computed(() => now.value.toLocaleTimeString())

    // 目标模块 + 滚动容器，都以 ref 绑定，hook 内部会自动解包
    const targetRef = ref(null)
    const scrollBoxRef = ref(null)

    // threshold: 0.5 —— 元素露出 50% 才判定为可见
    // root: scrollBoxRef —— 以滚动容器为参照，而不是整个视口
    const everVisible = ref(false)
    const visible = useElementVisibility(targetRef, {
      root: scrollBoxRef,
      once: true,
      threshold: 0.5,
      onChange: (isIn) => {
        if (isIn) everVisible.value = true
      }
    })

    return {
      count,
      inc,
      flag,
      toggleFlag,
      x,
      y,
      nowText,
      targetRef,
      scrollBoxRef,
      visible,
      everVisible
    }
  }
}
</script>

<style scoped>
p {
  font-size: 14px;
}
</style>
