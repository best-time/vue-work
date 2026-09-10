const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  // transpileDependencies: true,
  chainWebpack: (config) => {
    // ---- 屏蔽 vue-loader 15 的 style0 噪音警告 ----
    // 现象：每个带 <style> 的 .vue 都会报
    //   export 'default' (imported as 'styleN') was not found in
    //   './xxx.vue?vue&type=style&index=N&id=xxx&scoped=true&lang=css'
    //
    // 成因：Vue CLI 5 给 Vue 2 项目选的是 @vue/vue-loader-v15（15.11.1）。
    // 它对每个 <style> 块都会生成 `import styleN from "...?vue&type=style..."`，
    // 这个默认导入只在 CSS Modules 场景下有意义；普通样式块没有 default 导出，
    // 于是 webpack 5 每个组件报一条。**样式本身完全正常**（已核对产物 css 含对应选择器），
    // 属已知噪音。上游说明：https://github.com/vuejs/vue-loader/issues/1742
    //
    // 为什么不用「正规」写法（本机 webpack 5.110.2 + CLI 5 实测均无效）：
    //   - configureWebpack.stats.warningsFilter  → 仍然 14 条（该字段已被 webpack 标记为
    //     deprecated，且 CLI 是拿自己的 toJson 选项去取 stats，覆盖了它的生效路径）
    //   - configureWebpack.ignoreWarnings:[fn]   → 仍然 14 条（IgnoreWarningsPlugin 只挂在
    //     compilation.getWarnings() 的 processWarnings 钩子上，而 CLI 这条链路根本没调用它，
    //     实测过滤函数一次都没被触发）
    // 因此改在 afterSeal 直接改 compilation.warnings 数组——这是 stats 真正被生成之前的
    // 最后时机，实测有效（14 → 0）。若你想让这些警告重新显示出来，把下面这段注释掉即可。
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
      }
    })
  },
  css: {
  //   preprocessorOptions: {
  //   scss: { api: 'legacy' }   // 或升级 sass 到最新后用 'modern-compiler'
  // },
    loaderOptions: {
      scss: {
        additionalData: `@use "~@/styles/variables.scss" as *;\n@use "~@/styles/mixin.scss" as *;`
      }
    }
  }
})
