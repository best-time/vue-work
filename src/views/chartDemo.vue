<template>
  <div class="chart-demo">
    <h2>ECharts 图表示例</h2>
    <p class="tip">拖动窗口宽度试试 resize 自适应；点击按钮模拟数据更新刷新图表。</p>

    <div class="chart-block">
      <div class="block-header">
        <span>柱状图：月度销量</span>
        <el-button size="mini" type="primary" @click="updateBarData">更新数据</el-button>
      </div>
      <e-chart :option="barOption" height="360px" />
    </div>

    <div class="chart-block">
      <div class="block-header">
        <span>折线图：访问趋势</span>
        <el-button size="mini" type="primary" @click="updateLineData">更新数据</el-button>
      </div>
      <e-chart :option="lineOption" height="360px" />
    </div>
  </div>
</template>

<script>
import EChart from '@/components/EChart/index.vue'

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月']

function randomSeries(length, min, max) {
  return Array.from({ length }, () => Math.round(min + Math.random() * (max - min)))
}

export default {
  name: 'ChartDemo',
  components: { EChart },
  data() {
    return {
      barOption: {
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 20, bottom: 30, top: 40 },
        xAxis: { type: 'category', data: MONTHS },
        yAxis: { type: 'value' },
        series: [
          {
            name: '销量',
            type: 'bar',
            data: randomSeries(6, 100, 500),
            itemStyle: { color: '#409EFF' }
          }
        ]
      },
      lineOption: {
        tooltip: { trigger: 'axis' },
        legend: { data: ['访问量', '下单量'] },
        grid: { left: 40, right: 20, bottom: 30, top: 50 },
        xAxis: { type: 'category', data: MONTHS },
        yAxis: { type: 'value' },
        series: [
          {
            name: '访问量',
            type: 'line',
            smooth: true,
            data: randomSeries(6, 500, 1500)
          },
          {
            name: '下单量',
            type: 'line',
            smooth: true,
            data: randomSeries(6, 100, 600)
          }
        ]
      }
    }
  },
  methods: {
    // 直接替换 barOption 中 series 的 data，EChart 组件 watch 到变化后自动 setOption 刷新
    updateBarData() {
      this.barOption = {
        ...this.barOption,
        series: [
          { ...this.barOption.series[0], data: randomSeries(6, 100, 500) }
        ]
      }
    },
    updateLineData() {
      this.lineOption = {
        ...this.lineOption,
        series: this.lineOption.series.map(s => ({
          ...s,
          data: randomSeries(6, 100, 1500)
        }))
      }
    }
  }
}
</script>

<style scoped>
.chart-demo {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}
.tip {
  color: #909399;
  font-size: 13px;
}
.chart-block {
  margin-top: 24px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}
.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}
</style>
