<template>
  <div class="stat-card">
    <!-- 顶部：标题 + 更多 -->
    <div class="stat-card__header">
      <div class="stat-card__title">
        <span class="stat-card__bar"></span>
        {{ title }}
      </div>
      <span class="stat-card__more" @click="handleMore">更多</span>
    </div>

    <!-- 中部：大数字 + 面积图 -->
    <div class="stat-card__body">
      <div class="stat-card__value-wrap">
        <span class="stat-card__value">{{ formatValue }}</span>
        <span class="stat-card__unit">{{ unit }}</span>
      </div>
      <div ref="chartRef" class="stat-card__chart"></div>
    </div>

    <!-- 底部：去年同期 + 同比 -->
    <div class="stat-card__footer">
      <div class="stat-card__last">
        去年同期
        <span class="stat-card__last-num">{{ formatLastValue }}</span>
        {{ unit }}
      </div>
      <div class="stat-card__change" :class="{ 'is-up': changeRate >= 0 }">
        较去年同期
        <span class="stat-card__arrow">{{ changeRate >= 0 ? '▲' : '▼' }}</span>
        <span class="stat-card__rate">{{ Math.abs(changeRate) }}%</span>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'StatCard',
  props: {
    title: { type: String, default: '全辖在岗总人数' },
    value: { type: Number, default: 54000 },
    unit: { type: String, default: '人' },
    lastYearValue: { type: Number, default: 53851 },
    changeRate: { type: Number, default: 1.58 },
    // 面积图数据，默认模拟波浪
    chartData: {
      type: Array,
      default: () => [120, 200, 150, 80, 130, 180, 140, 100, 160, 200, 170]
    }
  },
  data() {
    return {
      chartInstance: null
    }
  },
  computed: {
    formatValue() {
      return this.value.toLocaleString()
    },
    formatLastValue() {
      return this.lastYearValue.toLocaleString()
    }
  },
  mounted() {
    this.initChart()
    window.addEventListener('resize', this.resizeChart)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeChart)
    this.chartInstance && this.chartInstance.dispose()
  },
  methods: {
    initChart() {
      this.chartInstance = echarts.init(this.$refs.chartRef)
      this.chartInstance.setOption({
        grid: { left: 0, right: 0, top: 5, bottom: 0 },
        xAxis: {
          type: 'category',
          show: false,
          boundaryGap: false,
          data: this.chartData.map((_, i) => i)
        },
        yAxis: { type: 'value', show: false },
        tooltip: { show: false },
        series: [
          {
            type: 'line',
            smooth: true,
            symbol: 'none',
            data: this.chartData,
            lineStyle: { color: '#409eff', width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(64, 158, 255, 0.35)' },
                { offset: 1, color: 'rgba(64, 158, 255, 0.02)' }
              ])
            }
          }
        ]
      })
    },
    resizeChart() {
      this.chartInstance && this.chartInstance.resize()
    },
    handleMore() {
      this.$emit('more')
    }
  }
}
</script>

<style lang="scss" scoped>
.stat-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 20px 24px;
  // width: 420px;
  box-sizing: border-box;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  &__bar {
    display: inline-block;
    width: 4px;
    height: 16px;
    background: #409eff;
    border-radius: 2px;
    margin-right: 8px;
  }

  &__more {
    font-size: 14px;
    color: #409eff;
    cursor: pointer;
    &:hover { opacity: 0.8; }
  }

  &__body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
  }

  &__value-wrap {
    display: flex;
    align-items: baseline;
  }

  &__value {
    font-size: 32px;
    font-weight: 700;
    color: #409eff;
    line-height: 1;
  }

  &__unit {
    font-size: 16px;
    color: #606266;
    margin-left: 4px;
  }

  &__chart {
    width: 180px;
    height: 72px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 18px;
    font-size: 14px;
    color: #909399;
  }

  &__last-num {
    color: #303133;
    font-weight: 600;
    margin: 0 2px;
  }

  &__change {
    color: #909399;
    &.is-up {
      .stat-card__arrow,
      .stat-card__rate { color: #f56c6c; }
    }
    &:not(.is-up) {
      .stat-card__arrow,
      .stat-card__rate { color: #67c23a; }
    }
  }

  &__arrow {
    margin: 0 2px 0 6px;
    font-size: 12px;
  }

  &__rate {
    font-weight: 600;
  }
}
</style>
