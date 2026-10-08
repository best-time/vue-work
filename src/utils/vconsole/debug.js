/**
 * Vue 2 组件调试助手 —— 开发环境专用（零依赖）
 *
 * 解决的问题：在浏览器控制台里「找不到组件实例」。
 * 有了它，控制台可以直接：
 *   $vm                          → 根实例
 *   $findVm('GridDemo')          → 按组件 name 找实例（不是 DOM）
 *   $getAllVm()                  → 拿到当前存活的所有组件实例
 *   $vmTree()                    → 打印整棵组件树（一眼看清嵌套关系）
 *   $inspectVm('GridDemo')       → 打印某个实例的 props / propsPassed / data / computed
 *   $vmFromEl(document.body)     → 从 DOM 节点反查它属于哪个组件
 *   $forceUpdateAll()            → 强制刷新所有组件（验证响应式是否生效）
 *   $countVm()                   → 按组件名统计数量（找内存泄漏 / 重复渲染）
 *
 * ─────────────── 用法 ───────────────
 *   // main.js：放在 new Vue(...).$mount('#app') **之前**（hook 才抓得到真根实例；
 *   // 放在之后也不会坏，只是会退回扫 DOM 找根实例）
 *   if (process.env.NODE_ENV === 'development') {
 *     require('@/utils/vconsole/debug')
 *   }
 *
 *   // 也可以显式安装（第二个参数 { force: true } 可强行在生产环境打开）
 *   import { installVueDebug } from '@/utils/vconsole/debug'
 *   installVueDebug(Vue)
 *
 * ─────────────── 关键约定（踩过的坑）───────────────
 *  · **绝不 new Vue()**。老版本这里 `new Vue({ render: h => h(App) })` 又没 $mount，
 *    等于凭空多造一个没挂载的根实例 —— $vm.$children 永远是空的，查不到任何东西，
 *    而且和 main.js 里的真根实例是两个世界。正确做法：hook `Vue.prototype.$mount`，
 *    在真根实例挂载的那一刻把它抓下来（见 installVueDebug）。
 *  · 只在开发环境生效：Vue 2 只在 dev 构建里给 `$el.__vue__` 赋值，生产环境取不到。
 *  · 幂等：重复 install 不会二次 hook $mount；uninstall() 可完全还原（连 $mount 都还回去）。
 *  · 根实例还没挂载时访问会给出明确提示，而不是静默返回空数组。
 */

import Vue from 'vue'

/* ------------------------------------------------------------------ *
 * 常量 & 内部状态
 * ------------------------------------------------------------------ */

/** 挂在 window 上的根实例名（与 main.js 历史约定保持一致） */
export const ROOT_KEY = '__rootVm'

/** 开发环境判断 */
const IS_DEV = (() => {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch (e) {
    return true
  }
})()

const isBrowser = typeof window !== 'undefined'

const state = {
  installed: false,
  /** 抓到的根实例 */
  root: null,
  /** 是否已经警告过「根实例未挂载」，避免刷屏 */
  warned: false,
  /** 被我们替换掉的原始 $mount，用于还原 */
  originMount: null,
  /** hook 挂载的 Vue 构造器，uninstall 时要还回到它身上 */
  ctor: null,
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

function noop() {}

/** 只警告一次，避免控制台被刷爆 */
function warnOnce(msg) {
  if (state.warned) return
  state.warned = true
  console.warn('[vue-debug] ' + msg)
}

/** 组件名：优先 $options.name，退到 vnode tag；根实例没名字就叫 Root，最后给个匿名标记 */
export function getVmName(vm) {
  if (!vm) return ''
  const opts = vm.$options || {}
  if (opts.name) return opts.name
  if (opts._componentTag) return opts._componentTag
  const ctor = opts.Ctor || vm.constructor
  if (ctor && ctor.options && ctor.options.name) return ctor.options.name
  if (vm.$root === vm) return 'Root'
  if (vm.$vnode && vm.$vnode.tag) return String(vm.$vnode.tag).replace(/^vue-component-\d+-/, '')
  return 'AnonymousComponent'
}

/** 是否还活着（销毁过的实例不要出现在结果里） */
function isAlive(vm) {
  return !!(vm && !vm._isDestroyed && !vm._isBeingDestroyed)
}

/** 从 DOM 节点反查组件实例：Vue 2 在 dev 构建里会给 $el.__vue__ 赋值 */
export function vmFromEl(el) {
  let node = el
  while (node) {
    if (node.__vue__) return node.__vue__
    node = node.parentNode
  }
  return null
}

/**
 * 兜底：从 DOM 里把根实例翻出来。
 * `$mount` hook 没赶上（比如 install 发生在挂载之后 / uninstall 之后再 install）时用。
 *
 * 两个坑：
 *  1. Vue 2 只在 dev 构建里给 `vm.$el.__vue__` 赋值，生产环境这条路走不通（所以工具本身 dev-only）。
 *  2. **根实例 `$el` 上的 `__vue__` 会被它渲染出的子组件覆盖**——`new Vue({render: h => h(App)})`
 *     时根实例和 App 组件的 `$el` 是同一个 DOM，后跑的 App._update 会把 `__vue__` 改成 App 的实例。
 *     所以不能断言「找到的 vm 就是根」，一律用 `vm.$root` 反查。
 */
function findRootFromDom() {
  if (typeof document === 'undefined' || !document.body) return null

  const list = []
  const appEl = document.getElementById('app')
  if (appEl) list.push(appEl)
  // 从 #app 逐级往下扫（#app 在 mount 时可能已被 App.vue 的根元素替换掉，所以还要扫全量）
  const all = document.body.querySelectorAll('*')
  for (let i = 0; i < all.length; i++) list.push(all[i])

  for (let i = 0; i < list.length; i++) {
    const vm = list[i].__vue__
    if (!vm) continue
    const root = vm.$root
    if (root && root.$root === root && isAlive(root)) return root
  }
  return null
}

/**
 * 拿到根实例：优先取 hook 抓到的，退一步从 DOM 兜底。
 * 首次拿不到时给出可操作的提示。
 */
export function getRoot(options) {
  if (!isBrowser) return null
  if (state.root && isAlive(state.root)) return state.root

  const fromDom = findRootFromDom()
  if (fromDom) {
    state.root = fromDom
    window[ROOT_KEY] = fromDom
    return fromDom
  }

  if (!options || !options.silent) {
    warnOnce(
      '根实例还没挂载，等页面渲染完成再执行；' +
        '若一直为空，请确认 debug.js 是在 new Vue(...).$mount() 之前 import 的。'
    )
  }
  return null
}

/**
 * 该打印 / 收集的孩子列表。
 * hideAbstract 时把抽象组件（<keep-alive>）自己去掉、它的孩子顶到同一层，
 * 这样渲染出来的树才和「你写的模板」对得上，不带一堆 keepAlive 噪音。
 */
function printableKids(vm, hideAbstract) {
  const out = []
  const push = (list) => {
    for (let i = 0; i < list.length; i++) {
      const kid = list[i]
      if (!isAlive(kid)) continue
      if (hideAbstract && kid.$options && kid.$options.abstract) push(kid.$children || [])
      else out.push(kid)
    }
  }
  push(vm.$children || [])
  return out
}

/** 深度优先遍历（父在前），可带筛选 */
function walk(root, visit, options) {
  const opts = options || {}
  // 默认跳过抽象节点（keep-alive 之类），但它们的孩子要顶上来
  const hideAbstract = opts.hideAbstract !== false
  const stack = root ? [root] : []

  while (stack.length) {
    const vm = stack.pop()
    if (!isAlive(vm)) continue

    const abstract = !!(vm.$options && vm.$options.abstract)
    if (hideAbstract && abstract) {
      // 抽象组件本身不产出，但把它换来的真实子组件顶上来
      const kids = vm.$children || []
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
      continue
    }

    if (visit(vm) === false) continue

    const kids = vm.$children || []
    // 逆序压栈 → 出栈后仍是「父在前、兄弟按原顺序」
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
  }
}

/* ------------------------------------------------------------------ *
 * 对外 API
 * ------------------------------------------------------------------ */

/**
 * 所有存活的组件实例（含根实例），父在前。
 * @param {{ hideAbstract?: boolean }} [options]
 */
export function getAllVm(options) {
  const root = getRoot(options)
  const list = []
  walk(root, (vm) => {
    list.push(vm)
  }, options)
  return list
}

/**
 * 按组件 name 查找实例；也支持传一个判定函数。
 * @param {string|Function} name 组件 name，或 (vm) => boolean
 * @returns {Array} 匹配到的实例数组（按树中顺序）
 */
export function findVm(name, options) {
  if (typeof name !== 'function') {
    const target = name
    name = (vm) => getVmName(vm) === target
  }
  return getAllVm(options).filter(name)
}

/** 找到第一个匹配的实例，找不到返回 null（链式取单个实例时更顺手） */
export function firstVm(name, options) {
  return findVm(name, options)[0] || null
}

/**
 * 打印组件树，返回同一份文本（方便断言 / 复制）。
 * @param {{ root?: any, maxDepth?: number, hideAbstract?: boolean }} [options]
 */
export function vmTree(options) {
  const opts = options || {}
  const maxDepth = typeof opts.maxDepth === 'number' ? opts.maxDepth : 12
  const hideAbstract = opts.hideAbstract !== false
  const root = opts.root || getRoot(opts)
  const lines = []

  function walkTree(vm, prefix, isLast, depth, isRoot) {
    if (!isAlive(vm) || depth > maxDepth) return

    const label = getVmName(vm) + '  (uid:' + vm._uid + ')'
    lines.push(isRoot ? '⌂ ' + label : prefix + (isLast ? '└─ ' : '├─ ') + label)

    const kids = printableKids(vm, hideAbstract)
    const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ')
    kids.forEach((child, i) => {
      walkTree(child, childPrefix, i === kids.length - 1, depth + 1, false)
    })
  }

  walkTree(root, '', true, 0, true)
  const text = lines.join('\n')
  if (root) console.log('\n' + text)
  return text
}

/**
 * 打印某个实例的关键信息（props / data / computed / 所在路径）。
 * @param {string|Object} target 组件 name 或实例本身
 */
export function inspectVm(target, options) {
  const vm = typeof target === 'string' ? firstVm(target, options) : target
  if (!isAlive(vm)) {
    console.warn('[vue-debug] 没找到组件：', target)
    return null
  }

  const snapshot = {
    name: getVmName(vm),
    uid: vm._uid,
    // 生效值：父传入 + default 合并后的完整 props（`vm.$props` 的浅拷贝）
    props: Object.assign({}, vm.$props),
    // 父组件真正传进来的那几个（不含 default）—— 用「有没有」区分默认值 / 传入值
    propsPassed: Object.assign({}, vm.$options.propsData),
    data: vm._data ? Object.assign({}, vm._data) : {},
    computed: {},
    hasChildren: (vm.$children || []).length,
    el: vm.$el && vm.$el.nodeType === 1 ? vm.$el.tagName.toLowerCase() + (vm.$el.id ? '#' + vm.$el.id : '') : '(no element)',
  }

  // computed 只能通过 $options.computed 的 key 去取，取不到就标记一下
  const computedKeys = Object.keys(vm.$options.computed || {})
  computedKeys.forEach((k) => {
    try {
      snapshot.computed[k] = vm[k]
    } catch (e) {
      snapshot.computed[k] = '(取值失败: ' + e.message + ')'
    }
  })

  console.log('[vue-debug] ' + snapshot.name, snapshot, vm)
  return snapshot
}

/** 按组件名统计数量，返回 [{ name, count }]，按数量倒序 */
export function countVm(options) {
  const map = {}
  getAllVm(options).forEach((vm) => {
    const n = getVmName(vm)
    map[n] = (map[n] || 0) + 1
  })
  const list = Object.keys(map)
    .map((name) => ({ name: name, count: map[name] }))
    .sort((a, b) => b.count - a.count)
  console.log('[vue-debug] 组件数量统计（共 ' + getAllVm(options).length + ' 个）：', list)
  return list
}

/** 强制刷新所有组件（含根），用来验证「数据变了但没渲染」这类问题 */
export function forceUpdateAll(options) {
  const list = getAllVm(options)
  list.forEach((vm) => {
    try {
      vm.$forceUpdate()
    } catch (e) {
      /* 忽略个别组件刷新失败 */
    }
  })
  console.log('[vue-debug] 已强制刷新 ' + list.length + ' 个组件')
  return list.length
}

/** 完整的 API 对象（同时挂到 window.$debug 和 Vue.prototype.$debug） */
const api = {
  get root() {
    return getRoot({ silent: true })
  },
  getAllVm: getAllVm,
  findVm: findVm,
  firstVm: firstVm,
  vmTree: vmTree,
  inspectVm: inspectVm,
  countVm: countVm,
  forceUpdateAll: forceUpdateAll,
  vmFromEl: vmFromEl,
  getVmName: getVmName,
  install: installVueDebug,
  uninstall: uninstallVueDebug,
  getState: function () {
    return state
  },
}

/* ------------------------------------------------------------------ *
 * 安装 / 卸载
 * ------------------------------------------------------------------ */

/**
 * 安装调试助手。幂等，重复调用无副作用。
 * @param {Function} [VueCtor] Vue 构造器，默认取 import 进来的 Vue
 * @param {{ force?: boolean }} [options] force: 生产环境也强行安装
 */
export function installVueDebug(VueCtor, options) {
  const ctor = VueCtor || Vue
  const opts = options || {}
  if (!isBrowser || !ctor) return api
  if (state.installed) return api

  if (!IS_DEV && !opts.force) {
    console.warn('[vue-debug] 生产环境默认不安装（要强行安装请传 { force: true }）')
    return api
  }

  state.installed = true
  state.ctor = ctor

  // 1) hook $mount，在真根实例挂载的那一刻把它抓下来 —— 唯一可靠的时机
  const originMount = ctor.prototype.$mount
  state.originMount = originMount
  ctor.prototype.$mount = function () {
    const vm = originMount.apply(this, arguments)
    // $root === this 说明这是根实例；只认第一个，避免多实例互相覆盖
    if (!state.root && vm && vm.$root === vm) {
      state.root = vm
      window[ROOT_KEY] = vm
    }
    return vm
  }

  // 2) 挂全局：控制台直接可用
  const w = window
  // $vm 用 getter，保证「挂载后才访问」也能拿到，而不是一个快照 null
  Object.defineProperty(w, '$vm', {
    configurable: true,
    get: function () {
      return getRoot()
    },
  })
  w[ROOT_KEY] = state.root || w[ROOT_KEY]
  w.$getAllVm = getAllVm
  w.$findVm = findVm
  w.$firstVm = firstVm
  w.$vmTree = vmTree
  w.$inspectVm = inspectVm
  w.$countVm = countVm
  w.$forceUpdateAll = forceUpdateAll
  w.$vmFromEl = vmFromEl
  w.$debug = api

  // 3) 组件内也能用：this.$debug.findVm('GridDemo')
  ctor.prototype.$debug = api

  // 4) 老版本的 $getAllComponents 名字保留一个别名，避免旧代码报错
  if (!w.$getAllComponents) w.$getAllComponents = getAllVm

  return api
}

/** 完全还原：$mount 还回去，window / prototype 上的东西全删掉 */
export function uninstallVueDebug() {
  if (!isBrowser || !state.installed) return api

  if (state.originMount && state.ctor) {
    state.ctor.prototype.$mount = state.originMount
  }
  const w = window
  ;['$vm', ROOT_KEY, '$getAllVm', '$findVm', '$firstVm', '$vmTree', '$inspectVm', '$countVm', '$forceUpdateAll', '$vmFromEl', '$debug'].forEach(
    (key) => {
      try {
        delete w[key]
      } catch (e) {
        w[key] = undefined
      }
    }
  )
  if (state.ctor && state.ctor.prototype.$debug === api) delete state.ctor.prototype.$debug

  state.installed = false
  state.root = null
  state.warned = false
  return api
}

/**
 * 默认导出 = 完整 API（带 install，所以 `Vue.use(VueDebug)` 也能用）。
 * `require('@/utils/vconsole/debug')` 里的 debug 就是它。
 */
export default api

// 项目约定：入口在模块作用域直接安装（webpack 下 window 上没有 Vue，不能靠 window.Vue）
if (IS_DEV) installVueDebug(Vue)
