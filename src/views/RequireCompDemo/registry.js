/**
 * 用 require 动态加载「项目内的公共组件」
 * =============================================
 * 本项目公共组件的约定（两种形状）：
 *   src/components/Xxx/index.js   → 入口文件，模块作用域里已经 Vue.component 注册过
 *   src/components/Xxx/index.vue  → 纯组件，没人用它就没有名字（只能自己注册/局部注册）
 *
 * 所以「动态加载」要解决两件事：
 *   1) 怎么在运行时按名字找到文件 —— require.context 给出 map，require('前缀' + name) 给出单点
 *   2) 怎么让两种形状归一化 —— index.js 要执行 install，index.vue 要取 default
 *
 * ⚠️ 前提认知：require 是**同步**的。webpack 在构建期就把匹配到的文件全部打进当前 chunk，
 *    运行时只是从已打好的 map 里查表 —— 它解决的是「按名字取」，不是「按需下载」。
 *    真要按需下载，得用 require.ensure / import()，或者下面 sfcCtx 的 'lazy' 模式。
 */
import Vue from 'vue'

/** 只匹配「一层目录 + index.js」的入口文件：AppDialog / GridBox / VxeTable */
export const entryCtx = require.context(
  '@/components',
  true,
  /^\.\/[^/]+\/index\.js$/
)

/**
 * 只匹配「一层目录 + index.vue」的单文件组件，第 4 个参数 'lazy' 是关键：
 *   'sync'（默认）      全部打进当前 chunk，ctx(key) 同步返回模块
 *   'eager'            同上，但不额外包一层（webpack 4 里两者行为接近）
 *   'lazy'             每个匹配文件一个独立 chunk，ctx(key) 返回 Promise
 *   'lazy-once'        所有匹配文件合成一个 chunk，ctx(key) 返回 Promise
 * 注意正则只写了「一层目录」，避免把 AppDialogDemoPage.vue / README 之类扫进来。
 */
export const sfcCtx = require.context(
  '@/components',
  true,
  /^\.\/[^/]+\/index\.vue$/,
  'lazy'
)

/** 目录名 → 展示用标签（只用于 demo 里给组件配示例 props，扫描本身不依赖它） */
export const SFC_META = {
  './title-header/index.vue': {
    label: 'title-header',
    desc: '标题 + 分割线，props: title',
    props: { title: '动态加载的标题' }
  },
  './Icon/index.vue': {
    label: 'Icon',
    desc: '三条渐变竖线，无 props',
    props: {}
  },
  './card/index.vue': {
    label: 'card',
    desc: '指标卡，props: cards 数组',
    props: {
      cards: [
        { title: '今日 GMV', value: '128.43', unit: '万' },
        { title: '订单数', value: '3,271', unit: '单', type: '#ff3b3b' },
        { title: '退款率', value: '1.2', unit: '%', type: '#52c41a' }
      ]
    }
  },
  './EChart/index.vue': {
    label: 'EChart',
    desc: 'ECharts 封装，props: option（很重，用来演示按需下载）',
    props: {
      height: '240px',
      option: {
        grid: { left: 44, right: 16, top: 24, bottom: 28 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: ['5月', '6月', '7月', '8月', '9月', '10月']
        },
        yAxis: { type: 'value' },
        series: [
          {
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.15 },
            data: [82, 121, 98, 156, 134, 178]
          }
        ]
      }
    }
  }
}

/**
 * 归一化 require / require.context 拿到的模块对象。
 * ESM 被 babel 转成 CJS 后是 { __esModule: true, default: ... }，
 * 直接把它当组件用 → 得到一个空对象 → 页面空白且不报错。
 */
export function unpack(mod) {
  if (!mod) return { mod: null, isEsm: false, def: null, keys: [] }
  const isEsm = mod.__esModule === true
  const def = isEsm ? mod.default : mod
  return { mod, isEsm, def, keys: Object.keys(mod) }
}

/** PascalCase → kebab-case，用于把组件名注册成模板里能写的标签 */
export function toKebab(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/** './AppDialog/index.js' → 'AppDialog' */
export function dirOf(key) {
  const m = /^\.\/([^/]+)\//.exec(key)
  return m ? m[1] : key
}

/** 判断一个导出值像不像「组件选项」（用来过滤 DEFAULT_COLS / isEmpty 这类普通导出） */
export function isComponentLike(v) {
  if (!v || typeof v !== 'object') return false
  return (
    typeof v.render === 'function' ||
    typeof v.template === 'string' ||
    typeof v.functional === 'function' ||
    !!v.name ||
    !!v.__file
  )
}

/** 描述一个 index.js 入口：导出什么、有没有 install、install 会注册哪些名字 */
export function describeEntry(key) {
  const parsed = unpack(entryCtx(key))
  const { mod, isEsm, def, keys } = parsed
  const install =
    def && typeof def.install === 'function'
      ? def.install
      : mod && typeof mod.install === 'function'
      ? mod.install
      : null
  // 只挑「大驼峰 + 长得像组件」的命名导出；DEFAULT_COLS / isEmpty 这类常量要排掉，
  // 否则自动注册会真的往 Vue.component 里塞一个 default-cols 出来
  const exported = keys.filter(
    (k) => k !== 'default' && /^[A-Z]/.test(k) && isComponentLike(mod[k])
  )
  const isSfc = isComponentLike(def)
  return {
    key,
    dir: dirOf(key),
    file: key.replace(/^\.\//, ''),
    isEsm,
    keys,
    hasInstall: !!install,
    isSfc,
    defaultName: (def && def.name) || (isSfc ? '(匿名组件)' : '(非组件)'),
    exported,
    __install: install
  }
}

/**
 * 把一个 index.js 入口「装上」。
 * 优先用模块自己导出的 install（它知道要注册几个组件），
 * 没有 install 就退化成把大驼峰命名导出按 kebab-case 注册。
 */
export function installEntry(info, vue = Vue) {
  const registered = []
  if (info.__install) {
    info.__install(vue)
    // install 内部注册了什么，模块自己没告诉我们，只能看导出名做个近似
    info.exported.forEach((n) => registered.push(toKebab(n)))
    if (!registered.length && info.isSfc) registered.push(toKebab(info.defaultName))
    return registered
  }
  info.exported.forEach((n) => {
    const comp = entryCtx(info.key)[n]
    if (comp) {
      vue.component(n, comp)
      registered.push(toKebab(n))
    }
  })
  return registered
}
/** 载入一个 index.vue（lazy 上下文 → Promise），返回组件选项对象 */
export function loadSfc(key) {
  if (!SFC_META[key] && sfcCtx.keys().indexOf(key) === -1) {
    return Promise.reject(new Error('sfcCtx 的白名单里没有：' + key))
  }
  return Promise.resolve(sfcCtx(key)).then((mod) => {
    const { def } = unpack(mod)
    if (!def) throw new Error('模块没有 default 导出：' + key)
    return def
  })
}

/** resource timing 条目 → 展示用结构 */
function toChunk(e) {
  const bytes = e.decodedBodySize || e.encodedBodySize || e.transferSize || 0
  const sizeText =
    bytes >= 1024 * 1024
      ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
      : bytes >= 1024
      ? Math.round(bytes / 1024) + ' KB'
      : bytes + ' B'
  return {
    url: e.name.split('/').pop(),
    full: e.name,
    bytes,
    sizeText,
    ms: Math.round(e.duration),
    at: Math.round(e.startTime)
  }
}

/**
 * 取「t0 之后才开始请求」的 js 资源。
 *
 * 为什么不用「前后两个名字快照做差集」：dev 下同名 chunk 会被请求多次
 * （HMR 重载、二次拉取），差集会把新请求当成「已存在」而漏掉。
 * startTime 是相对 time origin 的毫秒数，和 performance.now() 同一基准，
 * 按时间过滤既不会漏、也不会被历史条目污染。
 */
export function chunkSince(t0) {
  return performance
    .getEntriesByType('resource')
    .filter((e) => /\.js(\?|$)/.test(e.name) && e.startTime >= t0)
    .map(toChunk)
}

/**
 * 等 chunk 的 resource timing 落地：脚本 load 事件先到，条目可能晚一两帧，
 * 所以轮询几百毫秒，不能只查一次。返回 Promise<chunk[]>。
 */
export function pollChunks(t0, tries = 10, gap = 80) {
  return new Promise((resolve) => {
    const tick = (n) => {
      const list = chunkSince(t0)
      if (list.length || n <= 1) resolve(list)
      else setTimeout(() => tick(n - 1), gap)
    }
    tick(tries)
  })
}
