<template>
  <probe-view
    name="ShowGetter"
    inject-key="getTheme"
    :value="seen"
    :ok="true"
    tip="注入的是函数（引用不变），真正读取发生在 computed 里 —— 依赖记在子组件身上，所以祖先一改就跟着变。"
  />
</template>

<script>
/**
 * D 的消费者：注入取值函数，在 computed 里调用。
 *
 * 为什么这样也行：computed 求值时读了祖先的 this.theme（响应式属性），
 * 依赖就被记到**这个 computed 的 watcher** 上，于是祖先一改，这里就重算。
 * 而 B 那种直接注入值，读取发生在 initInjections，那时候还没有任何 watcher。
 */
import ProbeView from "./ProbeView.vue";

export default {
  name: "ShowGetter",

  components: { ProbeView },

  inject: {
    // 注入的是「返回取值函数的函数」，default 要套两层
    getTheme: { default: () => () => "（无 provider）" },
  },

  computed: {
    seen() {
      return this.getTheme();
    },
  },
};
</script>
