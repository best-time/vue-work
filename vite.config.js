import { defineConfig } from 'vite'
import { createVuePlugin } from 'vite-plugin-vue2'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite 配置 —— 与 vue.config.js（webpack / vue-cli）能力对齐：
 *   - `@` 别名 -> src
 *   - scss 全局注入 variables / mixin（vue-cli 里用 `~@/...`，vite 的 sass 不认 `~`，
 *     直接用 `@` 别名，vite 编译 scss 时会走自己的 resolver 解析）
 *   - Vue 2.6 SFC 编译由 vite-plugin-vue2 负责（基于 vue-template-compiler 2.6.14）
 *
 * 命令对应关系（见 package.json scripts）：
 *   npm run dev:vite   -> vite 开发服务器（与 `npm run dev` 的 webpack dev server 并存，端口不同）
 *   npm run build:vite -> vite 生产构建，输出到 dist-vite（避免覆盖 webpack 的 dist/）
 *   npm run preview:vite -> 本地预览构建产物
 *
 * 版本约束：vite-plugin-vue2@2.0.3 只支持 vite ^2 || ^3 || ^4，
 * 所以本项目锁 vite 4.x；Vue 2.6 也只能用这个插件（官方 @vitejs/plugin-vue2 仅支持 Vue 2.7+）。
 */
export default defineConfig({
  base: '/',
  plugins: [
    createVuePlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;\n@use "@/styles/mixin.scss" as *;\n`,
      },
    },
  },
  server: {
    port: 8090,
    open: false,
  },
  build: {
    outDir: 'dist-vite',
    sourcemap: false,
    // 大依赖手动分包，效果对应 webpack 的 splitChunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'element-ui', 'echarts', 'moment', 'lodash'],
        },
      },
    },
  },
})
