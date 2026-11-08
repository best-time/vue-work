/**
 * modules/app.js —— 应用外壳状态：布局 / 主题 / 设备类型
 *
 * 这类状态的特点：**和业务无关，但全站都要读**。
 * 放组件 data 里会散成几十份，放这里一份搞定。
 */

const STORAGE_KEY = 'app:theme'

/** localStorage 读写一律包 try/catch：隐私模式 / 禁用 Cookie 时直接抛异常，会白屏 */
function readTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || 'light'
  } catch (e) {
    return 'light'
  }
}

function writeTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch (e) {
    /* 存不进去就算了，内存里照样生效 */
  }
}

const state = {
  /** 侧边栏是否收起 */
  sidebarCollapsed: false,
  /** 'desktop' | 'tablet' | 'mobile' —— 由 initDevice 按窗口宽度算出来 */
  device: 'desktop',
  /** 'light' | 'dark' */
  theme: readTheme(),
  /** 全局 loading（路由切换 / 大块数据请求） */
  pageLoading: false,
}

const getters = {
  // 注意：getters 里拿到的是**自己模块**的 state，要用别的模块得走 rootState
  isMobile: (state) => state.device === 'mobile',
  isDark: (state) => state.theme === 'dark',
  sidebarWidth: (state) => (state.sidebarCollapsed ? 64 : 210),
}

const mutations = {
  // 命名空间开了之后，真实 type 是 'app/TOGGLE_SIDEBAR'
  TOGGLE_SIDEBAR(state) {
    state.sidebarCollapsed = !state.sidebarCollapsed
  },
  SET_SIDEBAR(state, collapsed) {
    state.sidebarCollapsed = !!collapsed
  },
  SET_DEVICE(state, device) {
    state.device = device
  },
  SET_THEME(state, theme) {
    state.theme = theme
    // 副作用（落盘）放 mutation 里是可以的：它同步、可预测、不改别的 state。
    // 但异步（请求 / 定时器）绝不能放 mutation —— 那是 action 的活。
    writeTheme(theme)
  },
  SET_PAGE_LOADING(state, loading) {
    state.pageLoading = !!loading
  },
}

const actions = {
  /**
   * 按窗口宽度定设备类型，并挂一次 resize 监听。
   * 为什么是 action：它读外部环境（window），且只应初始化一次。
   */
  initDevice({ commit, state }) {
    const calc = () => {
      const w = window.innerWidth
      const device = w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop'
      if (device !== state.device) commit('SET_DEVICE', device)
    }
    calc()
    window.addEventListener('resize', calc)
    // 返回「卸载函数」，调用方（通常是 App.vue）在 beforeDestroy 里执行
    return () => window.removeEventListener('resize', calc)
  },

  /**
   * 主题切换：异步（真实项目里可能要拉一份主题变量）也写在 action 里。
   */
  toggleTheme({ commit, state }) {
    const next = state.theme === 'dark' ? 'light' : 'dark'
    commit('SET_THEME', next)
    return next
  },

  /**
   * 演示「action 里串异步 + 批量 commit」，同时也是 UI 层最常用的写法：
   * 组件只 `dispatch`，不关心内部改了几个 mutation。
   */
  async setPageLoading({ commit }, loading) {
    commit('SET_PAGE_LOADING', loading)
    return loading
  },
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}
