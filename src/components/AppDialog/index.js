/**
 * AppDialog 公共组件入口（el-dialog 的轻封装）
 *
 * 使用：main.js 里 `import '@/components/AppDialog'` 即可，
 *       之后模板里直接用 <app-dialog>（或 <AppDialog>）。
 *
 * 打开方式三种，看场景挑：
 *   <app-dialog v-model="show" />                    声明式，父组件管一个布尔
 *   <app-dialog :visible.sync="show" />              同上，写法二
 *   this.$refs.dlg.open(row)  → 返回 Promise          命令式，父组件不用维护布尔
 *     const res = await this.$refs.dlg.open(row)
 *     // res: { type: 'confirm' | 'cancel', data, payload, source }
 *
 * 演示见 /app-dialog-demo
 */
import Vue from "vue";
import AppDialog from "./AppDialog.vue";

const components = { AppDialog };

const install = (vue) => {
  Object.keys(components).forEach((name) =>
    vue.component(name, components[name])
  );
};

/**
 * ⚠️ 必须在模块作用域直接执行一次注册（不能只写 if (window.Vue) ...）：
 * webpack / vite 打包时 Vue 是被 import 的模块、不会挂到 window 上，
 * 只判 window.Vue 的话 install 永远不执行 —— 模板里的 <app-dialog>
 * 会退化成「未知自定义元素」，页面只 warn 不报错，表现为弹窗完全不出现。
 */
install(Vue);

export { AppDialog };
export default { install, AppDialog };
