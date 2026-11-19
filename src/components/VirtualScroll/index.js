/**
 * VirtualScroll 公共组件入口（性能版滚动 / 虚拟滚动）
 *
 * 两套：
 *   <virtual-scroll>         固定行高，O(1) 定位，最常用
 *   <virtual-scroll-dynamic> 动态行高，二分定位 + 实测校正，内容长短不一时用
 *
 * 使用：main.js 里 `import '@/components/VirtualScroll'` 即可。
 *
 * 固定行高最小用法：
 *   <virtual-scroll :items="rows" :item-height="48" height="420px">
 *     <template #default="{ item, index }">
 *       <div class="row">{{ index }} - {{ item.name }}</div>
 *     </template>
 *   </virtual-scroll>
 *
 * 动态行高最小用法：
 *   <virtual-scroll-dynamic :items="rows" height="420px" height-key="estHeight">
 *     <template #default="{ item }">
 *       <div class="card">{{ item.content }}</div>
 *     </template>
 *   </virtual-scroll-dynamic>
 *
 * 两者都只负责「渲染第几条」，滚动容器由组件自己带（height 指定视口高）。
 * 不要在组件外面再套一个 overflow:auto，会多一层滚动条。
 *
 * 演示见 /virtual-scroll
 */
import Vue from 'vue'
import VirtualScroll from './VirtualScroll.vue'
import VirtualScrollDynamic from './VirtualScrollDynamic.vue'
import { makeRows, ROW_HEIGHT } from './mockData'

const components = { VirtualScroll, VirtualScrollDynamic }

const install = (vue) => {
  Object.keys(components).forEach((name) => vue.component(name, components[name]))
}

// 模块作用域直接注册（webpack 下 Vue 不在 window 上，只判 window.Vue 会永不执行）
install(Vue)

export { VirtualScroll, VirtualScrollDynamic, makeRows, ROW_HEIGHT }
export default { install, VirtualScroll, VirtualScrollDynamic }
