<template>
  <probe-view
    name="ShowValue"
    inject-key="themeValue"
    :value="themeValue"
    :ok="false"
    tip="只在 initProvide 那一刻读过一次。祖先已经是 dark 了，这里还是挂载时那个值 —— 这就是「provide 不响应」的现场。"
  />
</template>

<script>
/**
 * B 的消费者：注入「值」。
 * 无论祖先怎么改，这个字符串都不会变了（字符串是原始值，连引用都没有）。
 */
import ProbeView from "./ProbeView.vue";

export default {
  name: "ShowValue",

  components: { ProbeView },

  inject: {
    themeValue: { default: "（无 provider）" },
  },
};
</script>
