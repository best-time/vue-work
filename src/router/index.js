// src/router/index.js
// Vue 构造器必须从 'vue' 导入；'@vue/composition-api' 的 default 是插件对象（只有 install，没有 use）
import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '@/views/homePage.vue'

Vue.use(VueRouter)

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: () => import('@/views/aboutPage.vue') },
  { path: '/chart', name: 'Chart', component: () => import('@/views/chartDemo.vue') },
  { path: '/hooks', name: 'Hooks', component: () => import('@/views/hook/test.vue') },
  { path: '/demo', name: 'Demo', component: () => import('@/demo.vue') },
  { path: '/test', name: 'Test', component: () => import('@/views/test/index.vue') }
]

export default new VueRouter({
  mode: 'history', // 去掉 hash 的 #；生产环境需后端配合
  routes
})
