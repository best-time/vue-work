<template>
  <div class="entry-person-card">
    <div class="card-header relative">
      <TitleHeader title="入职人员结构" />

      <!-- 右上角tab切换 -->
      <div class="header-tabs absolute">
        <div
          class="tab-item"
          :class="{ active: activeTab === item.value }"
          v-for="item in tabList"
          :key="item.value"
          @click="handleTabChange(item.value)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>

    <div class="card-body">
      <!-- echarts环形图容器 -->
      <div ref="chartRef" class="chart-dom"></div>
      <!-- 右侧图例文本区域 -->
      <div class="legend-wrap">
        <div class="legend-row" v-for="(item, idx) in chartData" :key="idx">
          <span
            class="legend-color-block"
            :style="{ backgroundColor: item.color }"
          ></span>
          <span class="legend-label">{{ item.name }}：{{ item.percent }}%</span>
          <span class="legend-count">{{ item.count }}人</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from "echarts";
import TitleHeader from "@/components/title-header/index.vue";

export default {
  name: "EntryPersonStructure",
  components: {
    TitleHeader,
  },
  data() {
    return {
      activeTab: "school",
      tabList: [
        { label: "院校层次", value: "school" },
        { label: "专业", value: "major" },
        { label: "性别", value: "gender" },
        { label: "社招来源", value: "social" },
      ],
      // 院校层次数据（截图原始数据）
      chartData: [
        { name: "C9", value: 328, percent: 38, color: "#ff9421", count: 328 },
        {
          name: "其他211",
          value: 163,
          percent: 19,
          color: "#39bc6c",
          count: 163,
        },
        {
          name: "其他985",
          value: 232,
          percent: 27,
          color: "#4289f5",
          count: 232,
        },
        {
          name: "QS前100院校",
          value: 137,
          percent: 16,
          color: "#f55858",
          count: 137,
        },
      ],
      chartInstance: null,
    };
  },
  mounted() {
    this.initChart();
  },
  beforeDestroy() {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  },
  methods: {
    initChart() {
      this.chartInstance = echarts.init(this.$refs.chartRef)
      // 默认取第一条数据，不要依赖formatter入参params！
      const defaultItem = this.chartData[0]
      const option = {
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: ['62%', '84%'],
            center: ['50%', '50%'],
            // padAngle:3, // ❌5.2.2不支持，注释删除！
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 0,
              borderColor: '#ffffff', // ✅白色边框模拟扇区间缝隙
              borderWidth: 1 // 调整这个值控制缝隙大小，3~4接近截图
            },
            label: {
              show: true,
              position: 'center',
              formatter: `{per|${defaultItem.percent}%}\n{name|${defaultItem.name}}`,
              rich: {
                per: {
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: '#2b78e4',
                  lineHeight: 36
                },
                name: {
                  fontSize: 12,
                  color: '#000000'
                }
              }
            },
            labelLine: { show: false },
            data: this.chartData.map(d => ({
              name: d.name,
              value: d.value,
              itemStyle: { color: d.color }
            }))
          }
        ]
      }
      this.chartInstance.setOption(option)
      window.addEventListener('resize', this.resizeHandler)

      // 鼠标悬浮扇区更新中心文字
      this.chartInstance.on('mouseover', (params) => {
        this.chartInstance.setOption({
          series: [{
            label: {
              formatter: `{per|${params.percent}%}\n{name|${params.name}}`
            }
          }]
        })
      })
    },
    handleTabChange(val) {
      this.activeTab = val;
      // 这里根据tab值，替换 chartData，重新setOption即可切换不同维度数据
      console.log("切换维度", val);
      // 示例：切换不同tab，赋值新chartData，再 this.chartInstance.setOption({series:[{data: newData}]})

      /*
      this.chartData = [...新数组]
      const defaultItem = this.chartData[0]
      this.chartInstance.setOption({
        series:[{
          label:{ formatter:`{per|${defaultItem.percent}%}\n{name|${defaultItem.name}}` },
          data: this.chartData.map(d=>({name:d.name,value:d.value,itemStyle:{color:d.color}}))
        }]
      })
      */
    },
  },
};
</script>

<style scoped lang="scss">
.entry-person-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid;
  box-shadow: 2px 2px 10px 0px #2166ff1a;
  border-image-source: linear-gradient(180deg, #ffffff 0%, #a7d3ff 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #70c4ff);
}
.title-text {
  font-size: 20px;
  font-weight: 600;
}
.header-tabs {
  display: flex;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  right: 12px;
  top: 4px;
}
.tab-item {
  padding: 4px 6px;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
}
.tab-item.active {
  background-color: $color-primary;
  color: #fff;
}
.card-body {
  display: flex;
  align-items: center;
  gap: 60px;
}
.chart-dom {
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}
.legend-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px 16px;
  flex: 1;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}
.legend-color-block {
  width: 6px;
  height: 6px;
}

.legend-count {
  margin-left: 12px;
}
</style>
