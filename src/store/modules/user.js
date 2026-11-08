/**
 * modules/user.js —— 登录态 / 用户信息 / 角色
 *
 * 三个约定：
 *   1. token 落 localStorage（刷新不掉登录），但**只在这一层读写**，
 *      组件永远不要自己去碰 localStorage，否则以后换加密方案要改一片。
 *   2. `login` 是 action 不是 mutation —— 它要 await 接口。
 *      mutation 只负责「把结果写进 state」这一瞬间。
 *   3. 角色判断写成 getter（hasRole），别在组件里 `roles.includes('admin')` 满天飞。
 */

const TOKEN_KEY = 'app:token'

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

function writeToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch (e) {
    /* 存不进去不影响本次会话 */
  }
}

/**
 * 假接口：真项目里换成 `request.post('/login', payload)`。
 * 这里留一个 300ms 延迟，是为了让「loading / 按钮禁用 / 并发点击」这些
 * 真实问题在 demo 阶段就能暴露出来。
 */
function mockLoginApi({ username, password }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!username || !password) {
        reject(new Error('用户名和密码不能为空'))
        return
      }
      resolve({
        token: `mock-token-${Date.now()}`,
        userInfo: {
          id: 1001,
          name: username,
          nickName: username === 'admin' ? '管理员' : '普通用户',
          avatar: '',
          roles: username === 'admin' ? ['admin'] : ['user'],
        },
      })
    }, 300)
  })
}

const state = {
  token: readToken(),
  userInfo: {},
  roles: [],
}

const getters = {
  isLogin: (state) => !!state.token,
  userName: (state) => state.userInfo.nickName || state.userInfo.name || '',
  /** 用法：`this.$store.getters['user/hasRole']('admin')` */
  hasRole: (state) => (role) => state.roles.includes(role),
}

const mutations = {
  SET_TOKEN(state, token) {
    state.token = token
    writeToken(token)
  },
  SET_USER_INFO(state, info) {
    state.userInfo = info || {}
    state.roles = (info && info.roles) || []
  },
  RESET(state) {
    state.token = ''
    state.userInfo = {}
    state.roles = []
    writeToken('')
  },
}

const actions = {
  /**
   * @returns {Promise<object>} 登录成功后的 userInfo —— 调用方 await 就能拿到
   * 失败时直接 throw，调用方自己 catch 弹 message（store 里不弹 UI，保持可测）
   */
  async login({ commit }, payload) {
    const { token, userInfo } = await mockLoginApi(payload || {})
    commit('SET_TOKEN', token)
    commit('SET_USER_INFO', userInfo)
    return userInfo
  },

  logout({ commit }) {
    // 真项目里这里还要顺手调一下后端的 logout、清理定时器、断开 websocket
    commit('RESET')
  },
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}
