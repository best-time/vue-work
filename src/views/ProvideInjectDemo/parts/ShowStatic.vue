<template>
  <probe-view
    name="ShowStatic"
    inject-key="themeStatic"
    :value="themeStatic"
    :ok="themeStatic === 'light'"
    tip="常量。祖先切到 dark 之后这里仍是 light —— 不是 bug，它本来就没跟任何状态绑定。"
  />
</template>

<script>
/**
 * A 的消费者：注入一个常量。
 * 用了对象写法 + default，取不到时也有兜底（不会 warn）。
 */
import ProbeView from "./ProbeView.vue";

export default {
  name: "ShowStatic",

  components: { ProbeView },

  inject: {
    themeStatic: { default: "（无 provider）" },
  },
};
</script>
