// src/router/index.js
// Vue 构造器必须从 'vue' 导入；'vue-demi' 的 default 是插件对象（只有 install，没有 use）
import Vue from 'vue'
import VueRouter from 'vue-router'
// import Home from '@/views/homePage.vue'

Vue.use(VueRouter)

/**
 * meta 约定
 * ---------
 * meta.title  页面中文名（必填）：首页列表、浏览器标签页标题都读它。
 * meta.group  所属分组（选填）：只在首页用来分组展示，纯展示字段，不参与逻辑。
 *
 * 为什么名字放 meta.title 而不是直接用 route.name：
 *   - name 是「路由标识」，会被 $router.push({ name: 'Xxx' }) 引用，
 *     改名会连带改代码，通常是英文、且要全局唯一且稳定；
 *   - title 是「给人看的文案」，会跟着产品/设计改，也可能需要 i18n，
 *     两者生命周期不同，混在一起改一个动全身。
 *   所以：name 给代码用，meta.title 给人看。
 */
export const routes = [
  { path: '/', name: 'Home', meta: { title: '首页 · 路由索引', group: '基础' }, component: () => import('@/views/Root.vue') },
  { path: '/chart', name: 'Chart', meta: { title: '图表 Demo', group: '基础' }, component: () => import('@/views/chartDemo.vue') },
  { path: '/hooks', name: 'Hooks', meta: { title: 'Hooks', group: '基础' }, component: () => import('@/views/hook/test.vue') },
  { path: '/demo', name: 'Demo', meta: { title: 'Demo', group: '基础' }, component: () => import('@/demo.vue') },
  { path: '/test', name: 'Test', meta: { title: '测试页', group: '基础' }, component: () => import('@/views/test/index.vue') },
  { path: '/fun', name: 'Fun', meta: { title: '函数式组件', group: '基础' }, component: () => import('@/views/func/index.vue') },
  { path: '/fun1', name: 'Fun-demo1', meta: { title: '函数式组件 Demo1', group: '基础' }, component: () => import('@/views/func/demo1.vue') },
  { path: '/fun-h-dialog', name: 'FunHDialog', meta: { title: '函数式弹窗 HDialog', group: '公共组件' }, component: () => import('@/components/FunComponent/h-dialog/HDialogDemoPage.vue') },
  { path: '/app-dialog-demo', name: 'AppDialogDemo', meta: { title: 'AppDialog 弹窗', group: '公共组件' }, component: () => import('@/components/AppDialog/AppDialogDemoPage.vue') },
  { path: '/remote-input-demo', name: 'RemoteInputDemo', meta: { title: 'RemoteInput 远程输入', group: '公共组件' }, component: () => import('@/components/RemoteInput/RemoteInputDemoPage.vue') },
  { path: '/load-more-select', name: 'LoadMoreSelectDemo', meta: { title: 'el-select 滚动加载', group: '公共组件' }, component: () => import('@/components/LoadMoreSelect/LoadMoreSelectDemoPage.vue') },
  { path: '/vxe-table', name: 'VxeTableDemo', meta: { title: 'vxe-table 表格', group: '公共组件' }, component: () => import('@/components/VxeTable/VxeTableDemoPage.vue') },
  { path: '/grid-box', name: 'GridBoxDemo', meta: { title: 'GridBox 布局容器', group: '公共组件' }, component: () => import('@/components/GridBox/GridBoxDemoPage.vue') },
  { path: '/param-props', name: 'ParamPropsDemo', meta: { title: 'props 层层传参', group: '传参' }, component: () => import('@/views/ParamPassDemo/PropsModePage.vue') },
  { path: '/param-provide', name: 'ParamProvideDemo', meta: { title: 'provide / inject 传参', group: '传参' }, component: () => import('@/views/ParamPassDemo/ProvideModePage.vue') },
  { path: '/event-bus-demo', name: 'EventBusDemo', meta: { title: 'eventBus 跨组件传参', group: '传参' }, component: () => import('@/views/EventBusDemo/index.vue') },
  { path: '/query-demo', name: 'QueryDemo', meta: { title: '搜索条件 → 多下游联动', group: '传参' }, component: () => import('@/views/QueryDemo/QueryDemoPage.vue') },
  { path: '/dialog-org-demo', name: 'DialogOrgDemo', meta: { title: '弹窗组织方式', group: '弹窗' }, component: () => import('@/views/DialogOrgDemo/index.vue') },
  { path: '/dialog-nest-demo', name: 'DialogNestDemo', meta: { title: '弹窗嵌套与跨层传参', group: '弹窗' }, component: () => import('@/views/DialogNestDemo/index.vue') },
  { path: '/dialog-ex', name: 'DialogEx', meta: { title: '弹窗示例', group: '弹窗' }, component: () => import('@/views/dialogExp/index.vue') },
  { path: '/require-comp-demo', name: 'RequireCompDemo', meta: { title: 'require 动态加载组件', group: '工程化' }, component: () => import('@/views/RequireCompDemo/index.vue') },
  { path: '/emotion', name: 'EmotionDemo', meta: { title: 'css-in-js（仿 emotion）', group: '工程化' }, component: () => import('@/views/EmotionDemo/index.vue') },
  { path: '/style-demo', name: 'StyleDemo', meta: { title: '样式 Demo', group: '样式' }, component: () => import('@/views/StyleDemo/index.vue') },
  { path: '/grid-demo', name: 'GridDemo', meta: { title: 'Grid 布局 Mixin', group: '样式' }, component: () => import('@/views/GridDemo/index.vue') },
  { path: '/nest-demo', name: 'NestDemo', meta: { title: '嵌套分层 SCSS', group: '样式' }, component: () => import('@/views/NestDemo/index.vue') },
  { path: '/skeleton-demo', name: 'SkeletonDemo', meta: { title: '骨架屏', group: '样式' }, component: () => import('@/views/SkeletonDemo/index.vue') },
  { path: '/vconsole-demo', name: 'VConsoleDemo', meta: { title: 'vConsole 调试面板', group: '调试' }, component: () => import('@/views/VConsoleDemo/index.vue') },
]

const BASE_TITLE = 'vue-work'

const router = new VueRouter({
  mode: 'history', // 去掉 hash 的 #；生产环境需后端配合
  routes
})

/**
 * 路由变了就同步浏览器标签页标题。
 * 放在 afterEach：此时导航已确认通过（beforeEach 里可能被 next(false) 拦掉，
 * 提前改标题会出现「标题换了页面没换」）。首次进入也会执行一次。
 *
 * 兜底顺序：meta.title → name → path，保证任何路由都有个可读标题。
 */
router.afterEach((to) => {
  const title = (to.meta && to.meta.title) || to.name || to.path
  document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE
})

export default router
