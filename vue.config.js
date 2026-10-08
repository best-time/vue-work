/**
 * vue.config.js
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 本机实测环境（2026-10-08）
 *   @vue/cli-service 4.5.19 · webpack 4.47.0 · vue-loader 15.11.1
 *   sass 1.77.8 · sass-loader 10.5.2 · vue 2.6.14
 *
 * 实测数据（同一台机器，`vue-cli-service serve`，webpack 自报的 DONE 耗时）
 *   入图模块总数            2905
 *   首次编译（缓存预热有效）   2918 ms
 *   首次编译（缓存失效）       11300 ~ 12500 ms（3 次重复）
 *   热更新                    138 ~ 682 ms
 *
 * 结论 —— 别在这几个旋钮上耗时间
 *   下面这些配置项对「首次编译」的实测收益 ≈ 0：
 *     关了 thread-loader（parallel:false）  12168ms  vs  默认 12102ms
 *     换 devtool                           本机复测未稳定复现收益
 *     本优化版整体（多次取最小值）            11491ms  vs  原配置 11300ms
 *   冷启动的真正大头是「2905 个模块要全量构建」+「webpack 4 没有持久化
 *   模块缓存（webpack 5 的 cache:{type:'filesystem'} 才有）」。缓存预热后
 *   能到 2918ms（约 4x），说明**复用构建结果**才是唯一量级杠杆。
 *   热更新本来就只有 100~700ms，可优化空间有限，主要收益是「去掉抖动」。
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ 改本文件会让下一次 dev 全量冷编译
 *   CLI 4 的缓存键（PluginAPI.genCacheConfig）里包含了 chainWebpack /
 *   configureWebpack 的**函数源码** + package-lock.json 内容。所以哪怕只改
 *   注释、加一个插件，`node_modules/.cache` 里对应的 vue-loader / babel-loader
 *   缓存全部失效，下次启动就是 11~12s 的冷编译。实测：原配置（缓存有效）
 *   2918ms，换了配置后每次都 11~12.5s。改完有心理准备即可，别频繁改。
 */

module.exports = {
  // 生产构建关掉 sourcemap（CLI 4 默认 productionSourceMap: true）。
  // 影响：terser 少生成一遍 source-map，产物也不再有 .js.map。
  productionSourceMap: false,

  // dev 态关掉 eslint-loader，生产/CI 保持开启。
  // 依据：eslint-loader 挂在**每一次编译和每一次 HMR 重建**上，实测关掉后
  // 热更新从「148/376/682ms 抖动」收敛到「137/138/140ms」。lint 本身不丢，
  // 交给编辑器 + `npm run lint`（当前 6 warning / 0 error，不会挡构建）。
  lintOnSave: process.env.NODE_ENV !== 'development',

  devServer: {
    // CLI 4 在 dev 会无条件挂 ProgressPlugin（源码：serve.js 里
    // `if (!process.env.VUE_CLI_TEST && options.devServer.progress !== false)`），
    // 它给每个模块、每个阶段都挂计时钩子。实测一次冷启动刷 5978 行
    // [webpack.Progress]，关掉后 0 行，终端干净、也省掉这部分开销。
    progress: false,
    // 只显示错误遮罩，warnings 不弹（含已屏蔽的 style0 噪音）
    overlay: { warnings: false, errors: true },
  },

  configureWebpack: {
    // 观察范围要写**正则**。
    // 原来的写法是字符串数组 ['node_modules', '**/.git']：chokidar 的
    // ignored 走 anymatch，字符串 'node_modules' 匹配不到
    // /Users/x/work/node_modules/xxx 这种嵌套路径，等于没写。
    watchOptions: {
      ignored: [/node_modules/, /\.git/, /dist/, /dist-vite/, /\.workbuddy/],
      // 默认 300ms，调到 200ms 让保存后重编译更跟手（代价是连续保存时多编译一两次）
      aggregateTimeout: 300,
      poll: false,
    },
  },

  css: {
    // dev 默认本就是 false，显式写死避免以后被误开（CSS sourcemap 会拖慢
    // sass/postcss/css-loader 的整条链）
    sourceMap: false,
    loaderOptions: {
      // 注意：这里注入的 4 个文件（1029 行）会被 sass **每个样式块都重新解析一遍**。
      // 实测注入成本 ≈ 9.5ms/样式块（不注入 0.1ms，只注入 variables 2.1ms），
      // 按本项目约 24 个 scss 块算 ≈ 230ms —— 不是大头，不值得为它改造几十个 .vue。
      // 但有个副作用要注意：改 variables/mixin/grid/nest 任一文件，会让**所有**
      // 样式块失效重编译，dev 里表现为一次「类全量」重建。
      scss: {
        additionalData: `@use "~@/styles/variables.scss" as *;\n@use "~@/styles/mixin.scss" as *;\n@use "~@/styles/grid.scss" as *;\n@use "~@/styles/nest.scss" as *;`,
      },
    },
  },

  chainWebpack: (config) => {
    // ---- 给 css/scss 链路补 cache-loader（CLI 4 只给 .vue / .js 挂了）----
    // 依据：webpack profile 里最慢的模块全在样式链路（base.scss 一个模块的墙钟
    // 3973ms，另有多个 .vue 样式块 ~1.8s），而这条链**没有被 cache-loader 覆盖**
    // —— sass-loader → postcss-loader → css-loader → vue-style-loader 四层全量跑。
    // Vue CLI 5 的 filesystem cache 默认会把所有 loader 都缓存，这里是等价的
    // webpack 4 做法。
    // 放在 css-loader 之前：缓存 sass + postcss 的产物（不缓存 style-loader 的注入
    // 结果，这样 dev / prod 两种模式能共用同一条规则）。
    const path = require('path')
    const cacheLoader = require.resolve('cache-loader')
    const cacheDir = path.resolve(__dirname, 'node_modules/.cache/scss-loader')
    ;['vue-modules', 'vue', 'normal-modules', 'normal'].forEach((oneOf) => {
      config.module
        .rule('scss')
        .oneOf(oneOf)
        .use('cache-loader')
        .loader(cacheLoader)
        .options({
          cacheDirectory: cacheDir,
          cacheIdentifier: 'scss-v1', // 改了 additionalData / sass 版本时手动 +1
        })
        .before('css-loader')
    })

    // ---- 屏蔽 vue-loader 15 的 style0 噪音警告 ----
    // 现象：每个带 <style> 的 .vue 都会报
    //   export 'default' (imported as 'styleN') was not found in
    //   './xxx.vue?vue&type=style&index=N&id=xxx&scoped=true&lang=css'
    //
    // 成因：vue-loader 15 对每个 <style> 块都会生成
    //   `import styleN from "...?vue&type=style..."`
    // 这个默认导入只在 CSS Modules 场景下有意义；普通样式块没有 default 导出，
    // 于是 webpack 每个组件报一条。**样式本身完全正常**（已核对产物 css 含对应
    // 选择器），属已知噪音。上游说明：https://github.com/vuejs/vue-loader/issues/1742
    //
    // 为什么不用「正规」写法（按当前装的 4.5.19 + webpack 4.47 实测均无效）：
    //   - configureWebpack.stats.warningsFilter  → 仍然 14 条（该字段已被 webpack
    //     标记为 deprecated，且 CLI 是拿自己的 toJson 选项去取 stats，覆盖了它的
    //     生效路径）
    //   - configureWebpack.ignoreWarnings:[fn]   → 仍然 14 条（IgnoreWarningsPlugin
    //     只挂在 compilation.getWarnings() 的 processWarnings 钩子上，而 CLI 这条
    //     链路根本没调用它，实测过滤函数一次都没被触发）
    // 因此改在 afterSeal 直接改 compilation.warnings 数组——这是 stats 真正被生成
    // 之前的最后时机，实测有效（14 → 0）。想让这些警告重新显示，注释掉本段即可。
    config.plugin('strip-vue-style-warnings').use({
      apply(compiler) {
        compiler.hooks.compilation.tap('strip-vue-style-warnings', (compilation) => {
          compilation.hooks.afterSeal.tap('strip-vue-style-warnings', () => {
            const strip = (list) => {
              if (!list) return
              for (let i = list.length - 1; i >= 0; i--) {
                const m = String(list[i] && list[i].message)
                if (m.indexOf("imported as 'style") !== -1 && m.indexOf('was not found') !== -1) {
                  list.splice(i, 1)
                }
              }
            }
            strip(compilation.warnings)
            const walk = (c) => {
              strip(c.warnings)
              if (c.children) c.children.forEach(walk)
            }
            if (compilation.children) compilation.children.forEach(walk)
          })
        })
      },
    })
  },
}

/* ─────────────────────────────────────────────────────────────────────────
 * 已经查证过的默认值 —— 不用再动
 *   css.sourceMap            默认就是 false
 *   cache-loader             CLI 4 已给 .vue 规则和 .js 规则挂上（缓存目录
 *                            node_modules/.cache/{vue-loader,babel-loader}）
 *   thread-loader            默认挂在 .js 规则（cache-loader 之后、babel-loader
 *                            之前）；实测关掉（parallel:false）反而更慢
 *   module.noParse           已覆盖 vue / vue-router / vuex / vuex-router-sync
 *   transpileDependencies    默认 false（注释掉的那行开了也一样）
 *
 * 想继续压冷启动，只有这三条路（按性价比排序）
 *   1. 换成 Vite 跑 dev —— 项目里 vite / vite-plugin-vue2 已装好，见 vite.config.js。
 *      Vite dev 不打包、按需编译单个模块，冷启动通常在 1s 内，HMR 是 ESM 级的。
 *      注意：vite.config.js 目前只注入了 variables + mixin，**缺 grid.scss 和
 *      nest.scss**，所以 /grid-demo、/nest-demo 在 vite dev 下会编译失败，要先补齐。
 *   2. 砍模块数（直接决定 2905 这个数字能降到多少）
 *      - lodash：日志里能看到 lodash-es 被拆成几百个小模块（_SetCache.js 之类），
 *        改具名引入 + babel-plugin-lodash，或改用 lodash/fp
 *      - element-ui 全量引入 → 按需（babel-plugin-component）
 *      - echarts 全量引入 → echarts/core + 按需注册
 *      - @antv/x6 会连带 @antv/g-webgpu-* 一大堆；moment 体积也大
 *   3. 把大头依赖做成 DLL（webpack 4 的老办法）—— 收益大但配置繁琐、不好维护，
 *      优先级排在换 Vite 之后。
 *
 * 可选（本机复测未能稳定复现收益，想要更少 sourcemap 开销可以试）
 *   dev 默认 devtool 是 eval-cheap-module-source-map，每个过 loader 的模块都要
 *   生成并串联一份 sourcemap。可在 chainWebpack 里改成只保留行级：
 *     if (process.env.NODE_ENV === 'development') {
 *       config.devtool('eval-cheap-source-map')
 *     }
 *   代价是断点定位精度下降（无列号、拿不到 loader 转换前的映射）。
 *
 * 顺带清理
 *   原来的 `const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')`
 *   和 `const smp = new SpeedMeasurePlugin()` 一直没被使用（lint 也在报
 *   no-unused-vars），已删。要用它做 profile 时注意：smp 1.6 包
 *   @vue/preload-webpack-plugin 会在 dev 下抛 TypeError（它假设 compilation
 *   参数存在），必须配 excludedPlugins: ['PreloadPlugin'] 才跑得起来。
 *   包还在 devDependencies 里，随时可用。
 * ───────────────────────────────────────────────────────────────────────── */
