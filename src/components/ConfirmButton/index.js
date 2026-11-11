/**
 * ConfirmButton 公共组件入口
 *
 * 使用：main.js 里 `import '@/components/ConfirmButton'` 即可，
 *       之后模板里直接用 <confirm-button>。
 *
 * 最小用法：
 *   <confirm-button type="primary" :action="del" success-text="已删除">删除</confirm-button>
 *
 * 演示见 /confirm-button-demo
 */
import Vue from 'vue'
import ConfirmButton from './ConfirmButton.vue'

const components = { ConfirmButton }

const install = (vue) => {
  Object.keys(components).forEach((name) => vue.component(name, components[name]))
}

// 模块作用域直接注册（webpack 下 Vue 不在 window 上，只判 window.Vue 会永不执行）
install(Vue)

export { ConfirmButton }
export default { install, ConfirmButton }
