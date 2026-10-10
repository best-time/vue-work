<template>
  <div id="app">
    <!-- <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/> -->
    <!-- 路由出口：匹配到的页面组件渲染在这里 -->
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',

  /**
   * 全局初始化简易 vConsole（src/utils/vconsole）—— 所有路由页面共用这一个面板实例。
   *
   * 为什么放 App.vue：
   *   - 面板 DOM 挂在 <body> 下、不占 Vue 组件树，是天然的「应用级单例」，
   *     放在根组件里初始化，任何路由页面（含懒加载的）都不用自己 init；
   *   - 用 created 而不是 mounted：子组件的 mounted 先于父组件执行，
   *     放 created 能保证页面组件挂载时面板已经就绪（init 内部有 document.body 兜底，不怕早）；
   *   - 切路由不会重建面板，日志 / 网络记录 / 命令历史全程保留。
   *
   * 只在非生产环境开：生产构建时 `'production' !== 'production'` 恒为 false，
   * webpack 的常量折叠会把整个 if 分支（含 require）丢掉，vConsole 不会进主包。
   */
  created() {
    if (process.env.NODE_ENV !== 'production') {
      const vconsole = require('@/utils/vconsole');
      // harmony 模块被 require 时拿到的是命名空间对象，默认导出在 .default 上
      (vconsole.default || vconsole).init();
    }
  },

  beforeDestroy() {
    // 根组件销毁（整个应用卸载）时把 console / XHR / fetch 和样式还原干净
    if (process.env.NODE_ENV !== 'production') {
      const vconsole = require('@/utils/vconsole');
      (vconsole.default || vconsole).destroy();
    }
  },
}
</script>

<style>

</style>
