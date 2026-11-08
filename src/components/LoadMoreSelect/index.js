/**
 * LoadMoreSelect 公共组件入口
 *
 * 使用：main.js 里 `import '@/components/LoadMoreSelect'` 即可，
 *       之后模板里直接用 <load-more-select>（或 <LoadMoreSelect>）。
 *
 * 最小用法：
 *   <load-more-select
 *     v-model="form.skuId"
 *     :request="fetchSkus"        <!-- ({page,pageSize,keyword}) => Promise<{list,total}> -->
 *     label-key="name"
 *     value-key="id"
 *     :page-size="10"
 *     @select="item => (form.skuName = item.name)" />
 *
 * 演示见 /load-more-select
 */
import Vue from "vue";
import LoadMoreSelect from "./LoadMoreSelect.vue";

const components = { LoadMoreSelect };

const install = (vue) => {
  Object.keys(components).forEach((name) =>
    vue.component(name, components[name])
  );
};

// 模块作用域直接注册（webpack 下 Vue 不在 window 上，只判 window.Vue 会永不执行）
install(Vue);

export { LoadMoreSelect };
export default { install, LoadMoreSelect };
