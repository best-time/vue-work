/**
 * src/store/index.js —— 全局状态中心（Vuex 3.6.2 / Vue 2.6.14）
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 三条必须记住的规矩（踩过才知道）
 *
 * 1) `Vue.use(Vuex)` 必须在 `new Vuex.Store()` 之前、且只做一次。
 *    它给 Vue 装的是 `beforeCreate` mixin：`this.$store = options.store || parent.$store`。
 *
 * 2) 所以 `$store` 只沿着「组件树父子链」传。
 *    凡是**自己 new 出来、不挂在根实例下**的 Vue 实例都拿不到 `this.$store`：
 *      · `new (Vue.extend(DialogHost))().$mount()` —— 弹窗宿主那种独立根实例
 *      · `new Vue({ render: h => h(SomeComp) }).$mount('#box')` —— 脱挂载渲染
 *    这类地方请 `import store from '@/store'`（下面同时导出了具名 `store`），
 *    或者把宿主实例的 `parent` 指向页面 vm（本项目 dialog-nest-demo 的做法）。
 *
 * 3) 模块一律 `namespaced: true`。
 *    不开命名空间时两个模块都写 `SET_LOADING` 会直接报
 *    `[vuex] duplicate mutation type`，而且 `dispatch('getList')` 到底打到谁全看注册顺序。
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 目录约定（模块多了之后照这个长）
 *   store/
 *     index.js          只做「装配」：注册插件、挂 modules、导出 store
 *     modules/app.js    布局 / 主题 / 设备类型这类「外壳」状态
 *     modules/user.js   登录态 / 用户信息 / 权限
 *   业务状态一律进 module，不要往根 state 上堆 —— 根 state 只有一个，谁都能改，最后没人敢删。
 */

import Vue from 'vue'
import Vuex from 'vuex'

import app from './modules/app'
import user from './modules/user'

Vue.use(Vuex)

const isDev = process.env.NODE_ENV !== 'production'

/** UMD 与 ESM 的互操作：`module.exports = fn` 时没有 .default，别想当然取 default */
function createDevLogger() {
  // 双打包器兼容：vite（原生 ESM）里没有 require，此时干脆不挂 logger，功能不受影响
  if (typeof require !== 'function') return null
  const mod = require('vuex/dist/logger')
  const createLogger = mod && mod.default ? mod.default : mod
  return createLogger()
}

const store = new Vuex.Store({
  /**
   * 严格模式：只允许在 mutation 里改 state。
   * 开了它，任何 `this.$store.state.xxx = 1` 或 action 里直接赋值都会抛
   * `[vuex] do not mutate vuex store state outside mutation handlers.`
   *
   * 生产环境关掉：它靠 deep watch 全量 state 做校验，大 state 下是纯开销，
   * 而且生产不该为「开发期写错」付运行时成本。
   */
  strict: isDev,

  modules: {
    app,
    user,
  },

  /**
   * 开发期日志插件：每次 mutation 打印 before / after 快照，action 打印分发链路。
   * 用 require 而不是 import，是为了让生产环境的 DefinePlugin 能把**调用**折叠掉。
   *
   * ⚠️ 但别指望它「不进包」：实测生产构建后 `vuex/dist/logger` 这个模块仍然在
   *    chunk-vendors 里（logger.js 5046B，gzip 1617B）。webpack 4 只按依赖关系收录
   *    CJS 模块，没有跨模块 tree-shaking，被折叠掉的只是 `createDevLogger()` 这次调用。
   *    在意这 1.6KB 就把 plugins 这一行删掉，dev 用 Vue Devtools 的 Vuex 面板看即可。
   *
   * ⚠️ `vuex/dist/logger` 是 UMD 产物，走的是 `module.exports = createLogger`，
   * 所以**没有 `.default`**。直接 `require('vuex/dist/logger').default()` 会得到
   * `__webpack_require__(...).default is not a function`（整个应用白屏，实测踩过）。
   * 统一按「有 default 用 default，没有用自身」的方式取。
   */
  plugins: isDev ? [createDevLogger()].filter(Boolean) : [],

  // 根级 getter 只放「跨模块拼装」的东西，单模块能算出来的就写在模块自己的 getters 里
  getters: {
    // 例：一次拿全「当前用户 + 当前设备」，省得组件里 map 两个模块
    currentUserWithDevice(state, getters, rootState) {
      return {
        ...state.user.userInfo,
        device: rootState.app.device,
      }
    },
  },
})

// HMR：改 modules 时热替换，而不是整页刷新丢掉登录态
// （`typeof module` 兜住 vite：那边没有 module 对象，少这一层判断会直接 ReferenceError）
if (typeof module !== 'undefined' && module.hot) {
  module.hot.accept(['./modules/app', './modules/user'], () => {
    store.hotUpdate({
      modules: {
        app: require('./modules/app').default,
        user: require('./modules/user').default,
      },
    })
  })
}

export { store }
export default store
