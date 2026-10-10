// Vue 构造器必须从 'vue' 导入；'vue-demi' 的 default 是插件对象（只有 install，没有 use）
import Vue from 'vue'
// import VueCompositionAPI from 'vue-demi'
import App from './App.vue'
import router from './router'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import './styles/reset.css'
import './styles/base.scss'

import '@/components/FunComponent/$dialog'
import '@/components/VxeTable' // vxe-table 3.6（Vue2 兼容版）+ 全局格式化器 + CommonTable 公共组件
import '@/components/GridBox' // CSS Grid 非响应式栅格（props 驱动）：<grid-box> / <grid-box-item>

import '@/utils/skeleton' // 简易骨架屏：v-skeleton 指令 + sk* 占位块工具（运行时注入样式）


// 简易 vConsole（移动端调试面板）在 App.vue 的 created 里全局初始化（dev-only，生产不进主包），
// 所有路由页面共用同一个面板实例，页面里直接 this.$vconsole.xxx 就行。演示见 /vconsole-demo

Vue.use(ElementUI)

Vue.config.productionTip = false


// 必须在创建根实例前显式安装，否则 setup() 不会被执行
// （之前只是靠 vue-demi 被 import 时顺带安装，依赖 import 顺序，很脆弱）
// Vue.use(VueCompositionAPI)

// Vue 组件调试助手（src/utils/vconsole/debug.js）——必须放在 new Vue().$mount() 之前
//   $vm / $findVm('Xxx') / $getAllVm() / $vmTree() / $inspectVm('Xxx') / $countVm()
// 它 hook 了 Vue.prototype.$mount 来抓真根实例；用一个开发环境判断包住 require，
// 生产构建时 webpack 的常量折叠会整段丢掉，不会打进主包。
if (process.env.NODE_ENV === 'development') {
  require('@/utils/vconsole/debug')
}

new Vue({
  router,
  render: h => h(App),
}).$mount('#app');




