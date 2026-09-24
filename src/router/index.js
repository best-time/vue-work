// src/router/index.js
// Vue 构造器必须从 'vue' 导入；'vue-demi' 的 default 是插件对象（只有 install，没有 use）
import Vue from 'vue'
import VueRouter from 'vue-router'
// import Home from '@/views/homePage.vue'

Vue.use(VueRouter)

export const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Root.vue') },
  { path: '/chart', name: 'Chart', component: () => import('@/views/chartDemo.vue') },
  { path: '/hooks', name: 'Hooks', component: () => import('@/views/hook/test.vue') },
  { path: '/demo', name: 'Demo', component: () => import('@/demo.vue') },
  { path: '/test', name: 'Test', component: () => import('@/views/test/index.vue') },
  { path: '/fun', name: 'Fun', component: () => import('@/views/func/index.vue') },
  { path: '/fun1', name: 'Fun-demo1', component: () => import('@/views/func/demo1.vue') },
  { path: '/fun-h-dialog', name: 'FunHDialog', component: () => import('@/components/FunComponent/h-dialog/HDialogDemoPage.vue') },
  { path: '/vxe-table', name: 'VxeTableDemo', component: () => import('@/components/VxeTable/VxeTableDemoPage.vue') },
  { path: '/grid-box', name: 'GridBoxDemo', component: () => import('@/components/GridBox/GridBoxDemoPage.vue') },
]

export default new VueRouter({
  mode: 'history', // 去掉 hash 的 #；生产环境需后端配合
  routes
})
