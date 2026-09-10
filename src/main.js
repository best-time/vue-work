// Vue 构造器必须从 'vue' 导入；'@vue/composition-api' 的 default 是插件对象（只有 install，没有 use）
import Vue from 'vue'
import VueCompositionAPI from '@vue/composition-api'
import App from './App.vue'
import router from './router'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import './styles/reset.css'
import './styles/base.scss'
Vue.use(ElementUI)

Vue.config.productionTip = false
// 必须在创建根实例前显式安装，否则 setup() 不会被执行
// （之前只是靠 vue-demi 被 import 时顺带安装，依赖 import 顺序，很脆弱）
Vue.use(VueCompositionAPI)
new Vue({
  router,
  render: h => h(App),
}).$mount('#app')
