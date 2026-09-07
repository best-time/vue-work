const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  // transpileDependencies: true,
  css: {
    loaderOptions: {
      scss: {
        additionalData: `@use "~@/styles/variables.scss" as *;\n@use "~@/styles/mixin.scss" as *;`
      }
    }
  }
})
