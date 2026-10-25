/**
 * RemoteInput 公共组件入口
 *
 * 使用：main.js 里 `import '@/components/RemoteInput'` 即可，
 *       之后模板里直接用 <remote-input>（或 <RemoteInput>）。
 *
 * 最小用法：
 *   <remote-input
 *     v-model="form.customerName"
 *     :fetch-method="searchCustomers"
 *     label-key="name"
 *     value-key="id"
 *     @select="onPick" />          <!-- onPick(item) 里存 item.id -->
 *
 * 演示见 /remote-input-demo
 */
import Vue from "vue";
import RemoteInput from "./RemoteInput.vue";

const components = { RemoteInput };

const install = (vue) => {
  Object.keys(components).forEach((name) =>
    vue.component(name, components[name])
  );
};

// 模块作用域直接注册（webpack 下 Vue 不在 window 上，只判 window.Vue 会永不执行）
install(Vue);

export { RemoteInput };
export default { install, RemoteInput };
