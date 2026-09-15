import { defineConfig } from 'vite'
import { createVuePlugin } from 'vite-plugin-vue2'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const baseUrl = process.env.VUE_APP_BASE_URL
const reportUrl = process.env.VUE_APP_REPORT_URL
const datartUrl = process.env.VUE_APP_DATART_URL
const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'

export default defineConfig({
  publicPath: '/',
  // 打包输出目录，对应原来 outputDir: 'docker/dist'
  build: {
    outDir: 'docker/dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.error']
      },
      format: {
        comments: false
      }
    },
    // ========== 对应webpack splitChunks分包 ==========
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: {
            test: /node_modules/,
          },
          'other-vendors': {
            test: /node_modules[\\/](pdfh5|exceljs|pdfjs-dist|echarts-gl|echarts|claygl|quill|quill-image-resize-module|bin-code-editor|d3)[\\/]/
          },
          view: {
            test: /src[\\/]views[\\/](ciic-ihr-atd-service|ciic-bnf-salary-service|ciic-cdr-service|ciic-ihr-org-service|ciic-ihr-service)[\\/]/
          }
        }
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 全局注入mixin，对应原来 sass.data
        additionalData: `@import "@/styles/mixin.scss";`
      }
    }
  },
  server: {
    https: false,
    open: true,
    port: 8086,
    proxy: {
      '/api': {
        target: baseUrl,
        changeOrigin: true,
        ws: false,
        headers: {
          Connection: 'keep-alive'
        },
        rewrite: path => path.replace(/^\/api/, '/api')
      },
      '/report/': {
        target: reportUrl,
        changeOrigin: true,
        ws: false,
        rewrite: path => path.replace(/^\/report\//, '/report/')
      },
      '/datart/': {
        target: datartUrl,
        changeOrigin: true,
        ws: false,
        rewrite: path => path.replace(/^\/datart\//, '/datart/')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // codemirror 别名，和webpack保持一致
      '@codemirror/state': path.resolve(__dirname, 'node_modules/@codemirror/state')
    }
  },
  plugins: [
    createVuePlugin(),
    {
      // ========== 打包时间统计插件，替换webpack的钩子 ==========
      name: 'build-timer',
      buildStart() {
        this.startTime = Date.now()
        console.log(`打包开始时间: ${new Date(this.startTime).toLocaleString()}`)
      },
      closeBundle() {
        const endTime = Date.now()
        const duration = (endTime - this.startTime) / 1000
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        console.log(`打包结束时间: ${new Date(endTime).toLocaleString()}`)
        console.log(`总耗时: ${minutes} 分 ${seconds} 秒`)
      }
    },
    {
      // vxe-table 只保留zh-CN语言包，替代 ContextReplacementPlugin
      name: 'vxe-locale-filter',
      config(config) {
        if (isProduction) {
          config.optimizeDeps = config.optimizeDeps || {}
          config.optimizeDeps.exclude = config.optimizeDeps.exclude || []
        }
      },
      load(id) {
        if (/vxe-table[\\/]lib[\\/]locales[\\/]/.test(id) && !/zh-CN/.test(id)) {
          return ''
        }
      }
    }
  ],
  // ========== externals 生产环境排除（和原来webpack一致） ==========
  ...(isProduction
    ? {
        build: {
          rollupOptions: {
            external: ['vue', 'vue-router', 'vuex', 'element-ui', 'axios', 'moment', 'echarts'],
            output: {
              globals: {
                vue: 'Vue',
                'vue-router': 'VueRouter',
                vuex: 'Vuex',
                'element-ui': 'ELEMENT',
                axios: 'axios',
                moment: 'moment',
                echarts: 'echarts'
              },
              manualChunks: {
                vendor: {
                  test: /node_modules/,
                },
                'other-vendors': {
                  test: /node_modules[\\/](pdfh5|exceljs|pdfjs-dist|echarts-gl|echarts|claygl|quill|quill-image-resize-module|bin-code-editor|d3)[\\/]/
                },
                view: {
                  test: /src[\\/]views[\\/](ciic-ihr-atd-service|ciic-bnf-salary-service|ciic-cdr-service|ciic-ihr-org-service|ciic-ihr-service)[\\/]/
                }
              }
            }
          }
        }
      }
    : {}),
  // 全局注入Quill 替换webpack ProvidePlugin
  optimizeDeps: {
    include: ['quill']
  }
})
