<template>
  <div ref="chartRef" class="e-chart" :style="{ height, width }" />
</template>

<script>
import * as echarts from 'echarts'
import { debounce } from 'lodash'

export default {
  name: 'EChart',
  props: {
    // echarts 配置项，数据更新时组件会自动刷新图表
    option: {
      type: Object,
      required: true
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '360px'
    },
    // 是否监听窗口 resize 自动自适应
    autoResize: {
      type: Boolean,
      default: true
    },
    // setOption 是否使用合并模式，true 为增量合并，false 为完全覆盖
    notMerge: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      chart: null
    }
  },
  watch: {
    // 数据更新时刷新图表
    option: {
      deep: true,
      handler(val) {
        this.updateChart(val)
      }
    }
  },
  mounted() {
    this.initChart()
    if (this.autoResize) {
      // 防抖 150ms，避免 resize 高频触发导致卡顿
      this.resizeHandler = debounce(this.handleResize, 150)
      window.addEventListener('resize', this.resizeHandler)
    }
  },
  beforeDestroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler.cancel()
    }
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    initChart() {
      if (this.chart) return
      this.chart = echarts.init(this.$refs.chartRef)
      this.updateChart(this.option)
    },
    updateChart(option) {
      if (!this.chart) return
      if (option) {
        this.chart.setOption(option, { notMerge: this.notMerge })
      } else {
        this.chart.clear()
      }
    },
    handleResize() {
      if (this.chart && !this.chart.isDisposed()) {
        this.chart.resize()
      }
    },
    // 对外暴露图表实例，便于调用 showLoading、dispatchAction 等
    getInstance() {
      return this.chart
    }
  }
}
</script>

<style scoped>
.e-chart {
  width: 100%;
}
</style>
