/**
 * InfiniteScroll 公共组件入口
 *
 * 两套东西一起装：
 *   组件 <infinite-scroll>  —— 自带分页/去重/状态机
 *   指令 v-scroll-load      —— 只管滚动感知，数据自己管
 *
 * 使用：main.js 里 `import '@/components/InfiniteScroll'` 即可。
 *
 * 组件最小用法：
 *   <infinite-scroll
 *     ref="list"
 *     :request="fetchList"     <!-- ({page,pageSize}) => Promise<{list,total}> -->
 *     :page-size="10">
 *     <template #default="{ list }">
 *       <div v-for="it in list" :key="it.id">{{ it.title }}</div>
 *     </template>
 *   </infinite-scroll>
 *
 * 指令最小用法：
 *   <div class="list" v-scroll-load="{ handler: loadMore, disabled: finished }">…</div>
 *
 * ⚠️ 指令不叫 v-infinite-scroll：Element UI 2.15 也内置了一个，但它注册在
 *    `InfiniteScroll`（PascalCase）键上；Vue 解析顺序是 kebab 精确键 → camelCase → PascalCase，
 *    全局再注册 infinite-scroll 会把 Element 的顶掉（不是被覆盖）。要保留那个名字，
 *    请在组件内局部注册 `directives: { infiniteScroll }`。
 *
 * 演示见 /infinite-scroll
 */
import Vue from "vue";
import InfiniteScroll from "./InfiniteScroll.vue";
import scrollLoad from "./scrollLoad";

const components = { InfiniteScroll };
const directives = { "scroll-load": scrollLoad };

const install = (vue) => {
  Object.keys(components).forEach((name) =>
    vue.component(name, components[name])
  );
  Object.keys(directives).forEach((name) =>
    vue.directive(name, directives[name])
  );
};

// 模块作用域直接注册（webpack 下 Vue 不在 window 上，只判 window.Vue 会永不执行）
install(Vue);

export { InfiniteScroll, scrollLoad };
export default { install, InfiniteScroll, scrollLoad };
