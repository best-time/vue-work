<template>
  <probe-view
    name="ShowCtx"
    inject-key="themeCtx"
    :value="themeCtx.value"
    :ok="true"
    tip="注入的是容器引用，读的是 themeCtx.value —— 依赖收集在子组件自己的渲染 watcher 上，所以改字段就重渲染。"
  />
</template>

<script>
/**
 * C 的消费者：注入容器，用字段。
 *
 * 注意 default 写成了工厂函数 `() => ({...})`：
 * 如果写成 `default: { value: '—' }`，所有实例会共用同一个对象（页签③有现场）。
 */
import ProbeView from "./ProbeView.vue";

export default {
  name: "ShowCtx",

  components: { ProbeView },

  inject: {
    themeCtx: { default: () => ({ value: "（无 provider）" }) },
  },
};
</script>
