/**
 * v-scroll-load —— 无限滚动的「指令版」（没人管数据，只负责喊「该拉下一页了」）
 *
 * 和组件版的关系：
 *   组件版 InfiniteScroll 自带分页/去重/状态机，适合「一个普通列表」；
 *   指令版只做滚动感知，列表数据、请求、空态/错误态全部由调用方持有，
 *   适合「已经有自己的列表逻辑、只缺触底感知」或者「列表结构很特殊、不想被组件包一层」。
 *
 * 为什么指令不叫 v-infinite-scroll：
 *   Element UI 2.15 也内置了这个指令，但它注册在 **`InfiniteScroll`（PascalCase）** 这个键上
 *   （element-ui/packages/infinite-scroll：`Vue.directive(InfiniteScroll.name)`）。
 *   Vue 解析 `v-infinite-scroll` 的顺序是：kebab 精确键 → camelCase → PascalCase。
 *   所以「全局再注册一个 infinite-scroll」不是被 Element 覆盖，而是**反过来把 Element 顶掉**
 *   （实测：注册后 Element 的 inserted 不再执行）—— 等于悄悄抢注全项目的名字，不推荐。
 *   稳妥做法有两个：
 *     ① 换名（本项目选这个：v-scroll-load，两个指令可并存对照）；
 *     ② 一定要写 v-infinite-scroll，就在组件内局部注册
 *        `directives: { infiniteScroll }`，只影响这个组件（实测有效）。
 *
 * 用法：
 *   <div class="list" v-scroll-load="loadMore">…</div>
 *   <div class="list" v-scroll-load="{ handler: loadMore, distance: 200, disabled: finished }">…</div>
 *
 * 选项（指令值可以是函数，也可以是对象）：
 *   handler   必填，Function，触底时调用，参数 { rest, root, el }
 *   distance  Number  160  距底多少 px 触发
 *   disabled  Boolean false 为 true 时不再触发（一般绑「加载中 || 已到底」）
 *   immediate Boolean true  绑定后先检查一次（首屏不满自动续拉）
 *   container String|Element|null  滚动容器；不传 = 自动找（自己 → 最近的可滚祖先 → 视口）
 *
 * 两个「比 scroll 事件多出来」的能力：
 *   1. handler 返回 Promise 时自动加锁（busy），请求期间不会重复触发；
 *   2. componentUpdated 钩子会在宿主组件每次更新后重新判定 —— 数据进来、列表变长以后
 *      如果还是贴着底，会继续拉（等价于组件版的 autoFill），不需要 MutationObserver。
 */
const SCOPE = '__scrollLoad__'

const DEFAULTS = {
  distance: 160,
  disabled: false,
  immediate: true,
  container: null
}

/** 元素自身是否声明了「能滚」（只看样式；不管现在有没有溢出） */
function isStyleScrollable(node) {
  if (!node || node.nodeType !== 1) return false
  const oy = window.getComputedStyle(node).overflowY
  return oy === 'auto' || oy === 'scroll' || oy === 'overlay'
}

/** 祖宗里第一个「能滚且确实在滚」的节点 */
function findScrollAncestor(el) {
  let p = el.parentElement
  while (p && p !== document.body && p !== document.documentElement) {
    // 祖先必须已经在溢出，否则它只是「声明了 overflow」而不是滚动容器
    if (isStyleScrollable(p) && p.scrollHeight > p.clientHeight + 1) return p
    p = p.parentElement
  }
  return null
}

function resolveRoot(el, container) {
  if (container) {
    if (container === 'window' || container === 'document') return window
    if (typeof container === 'string') return document.querySelector(container) || window
    return container
  }
  // 指令挂在滚动容器上是最常见的写法（容器自己 height + overflow）
  if (isStyleScrollable(el)) return el
  return findScrollAncestor(el) || window
}

/** 距底还有多少 px：<= distance 就该拉下一页了 */
function measure(el, root) {
  if (root === el) {
    // 自己是滚动容器：ScrollTop + clientHeight 与 scrollHeight 的差；
    // 空列表时是负数，同样满足「该加载」，正好当首屏加载用
    return el.scrollHeight - el.scrollTop - el.clientHeight
  }
  if (root === window) {
    // 视口：用元素自身底边到视口底边的距离，不受「列表后面还有别的卡片」干扰
    const vh = window.innerHeight || document.documentElement.clientHeight
    return el.getBoundingClientRect().bottom - vh
  }
  return el.getBoundingClientRect().bottom - root.getBoundingClientRect().bottom
}

/** 指令值 → 选项对象（函数形式只给 handler，其余走默认值） */
function parse(binding) {
  const v = binding.value
  if (typeof v === 'function') return { handler: v }
  if (v && typeof v.handler === 'function') return v
  return null
}

function bindListener(el, st) {
  unbindListener(st)
  st.root = resolveRoot(el, st.opts.container)
  st.target = st.root === el ? el : st.root
  st.target.addEventListener('scroll', st.onScroll, { passive: true })
}

function unbindListener(st) {
  if (st.target) {
    st.target.removeEventListener('scroll', st.onScroll)
    st.target = null
  }
}

/** 同步选项：每次宿主更新都会走，disabled 才能跟着变 */
function sync(el, st, binding) {
  const parsed = parse(binding)
  const container = parsed ? parsed.container : null
  st.handler = parsed ? parsed.handler : null
  st.opts = Object.assign({}, DEFAULTS, parsed)
  // 只在「还没绑」或「container 变了」时重算滚动根（getComputedStyle 不便宜）
  if (!st.target || st.containerRef !== container) {
    st.containerRef = container
    bindListener(el, st)
  }
}

function check(el, st) {
  if (!st.handler || !st.opts) return
  if (st.opts.disabled || st.busy) return

  const rest = measure(el, st.root)
  if (rest > st.opts.distance) return

  // 冷却：scroll / componentUpdated / Promise 解锁可能在同一帧里各喊一次
  const now = Date.now()
  if (now - st.lastAt < 60) return
  st.lastAt = now

  const ret = st.handler.call(st.vm, { rest, root: st.root, el })

  // handler 返回 Promise → 请求期间自动加锁，结束后再判一次（autoFill）
  if (ret && typeof ret.then === 'function') {
    st.busy = true
    const done = () => {
      st.busy = false
      if (st.timer) return
      st.timer = setTimeout(() => {
        st.timer = 0
        check(el, st)
      }, 0)
    }
    ret.then(done, done)
  }
}

function destroy(el) {
  const st = el[SCOPE]
  if (!st) return
  unbindListener(st)
  if (st.raf) cancelAnimationFrame(st.raf)
  if (st.timer) clearTimeout(st.timer)
  st.api = null
  delete el[SCOPE]
}

export default {
  name: 'scroll-load',

  inserted(el, binding, vnode) {
    const st = {
      vm: vnode.context,
      handler: null,
      opts: null,
      root: null,
      target: null,
      containerRef: undefined,
      busy: false,
      lastAt: 0,
      raf: 0,
      timer: 0
    }
    el[SCOPE] = st

    // 滚动回调只标脏，真正的计算放 rAF 里：一帧最多一次（惯性滚动里 scroll 一秒几十次）
    st.onScroll = () => {
      if (st.raf) return
      st.raf = requestAnimationFrame(() => {
        st.raf = 0
        check(el, st)
      })
    }

    // 给外部留个手动入口（切页签显示出来、或被 display:none 藏过之后要重新判一次）
    st.api = {
      check: () => check(el, st),
      destroy: () => destroy(el)
    }

    sync(el, st, binding)
    if (st.opts.immediate) check(el, st)
  },

  /** 宿主重渲染：选项/disabled 变了就同步（这里不判触底，交给 componentUpdated） */
  update(el, binding) {
    const st = el[SCOPE]
    if (st) sync(el, st, binding)
  },

  /**
   * 宿主更新完成（DOM 已经 patch 完）：数据可能刚追加进列表 —— 重新判一次。
   * 这就是指令版的 autoFill：首屏不满一屏、或一页拉完还贴着底，会继续触发。
   * 不用 MutationObserver，因为宿主更新时它本来就会被调用。
   */
  componentUpdated(el) {
    const st = el[SCOPE]
    if (st) check(el, st)
  },

  unbind(el) {
    destroy(el)
  }
}
