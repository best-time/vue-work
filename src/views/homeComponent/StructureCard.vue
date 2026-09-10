<template>
  <div class="person-analyse-card">
    <TitleHeader title="人员结构需求分析" />

    <div class="list-wrap">
      <div class="item-row" v-for="(item, index) in tableData" :key="`${item.name}${index}`">
        <!-- 左侧图标 + 岗位名称 -->
        <div class="item-left">
          <span
            class="dot-icon"
            :style="{ backgroundColor: item.iconBg }"
          >
        <img v-if="item.iconUrl" :src="item.iconUrl" /></span>
        </div>

        <div class="flex-column flex-1">
          <div class="flex-row font-16 color-0">
            <div class="label m-b-4">{{ item.name }}</div>
            <div>
              {{ item.count }}<span class="num font-14 color-6">人</span>
            </div>
          </div>
          <div class="progress-wrap">
            <div class="progress-track"></div>
            <div
              class="progress-bar"
              :style="{
                width: item.percent + '%',
                backgroundColor: item.barColor,
              }"
            ></div>
            <div
              class="progress-thumb"
              :style="{
                left: item.percent + '%',
                borderColor: item.barColor,
              }"
            ></div>
          </div>
        </div>

        <!-- 右侧：人数 + 百分比 -->
        <div class="item-right">
          <span class="percent" :style="{ color: item.barColor }"
            >{{ item.percent }}%</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from '@vue/composition-api';
import TitleHeader from "@/components/title-header/index.vue";
import { getAssetsImgByPath } from "@/utils/common.js";

export default {
  name: "PersonStructureAnalyse",
  components: {
    TitleHeader,
  },
  setup() {
    const tableData = ref([
      {
        name: "金融市场",
        count: 186,
        percent: 21.3,
        barColor: "#2B78F5",
        iconBg: "#E8F2FF",
        iconUrl: getAssetsImgByPath("icon-market.svg")
      },
      {
        name: "国际结算",
        count: 128,
        percent: 52.3,
        barColor: "#FFC548",
        iconBg: "#FFEECA",
        iconUrl: getAssetsImgByPath("icon-budget.svg")
      },
      {
        name: "对公客户经理",
        count: 274,
        percent: 24.3,
        barColor: "#56E3FC",
        iconBg: "#D8F9FF",
        iconUrl: getAssetsImgByPath("icon-client.svg")
      },
      {
        name: "理财经理",
        count: 274,
        percent: 41.3,
        barColor: "#FF3B3B",
        iconBg: "#F2E5FF",
        iconUrl: getAssetsImgByPath("icon-manager.svg")
      },
      {
        name: "法律",
        count: 274,
        percent: 11.3,
        barColor: "#B66CFF",
        iconBg: "#FFEADC",
        iconUrl: getAssetsImgByPath("icon-law.svg")
      },
      {
        name: "金融科技",
        count: 274,
        percent: 41.3,
        barColor: "#FD9C2A",
        iconBg: "#FFEADC",
        iconUrl: getAssetsImgByPath("icon-tech.svg")
      },
      {
        name: "其他",
        count: 274,
        percent: 11.3,
        barColor: "#45C672",
        iconBg: "#D8FFE6",
        iconUrl: getAssetsImgByPath("icon-other.svg")
      },
    ]);

    return {
      tableData,
    };
  },
};
</script>

<style scoped lang="scss">
.person-analyse-card {
  padding: 12px 12px 32px;
  border-radius: 12px;
  border: 1px solid;
  box-shadow: 2px 2px 10px 0px #2166ff1a;
  border-image-source: linear-gradient(180deg, #ffffff 0%, #a7d3ff 100%);
}
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
}
.title-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #67c2ff);
}
.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.dot-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-wrap {
  flex: 1;
  height: 10px;
  position: relative;
}
.progress-track {
  width: 100%;
  height: 10px;
  background-color: #eef0f6;
  border-radius: 5px;
}
.progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 10px;
  border-radius: 5px;
}
.progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background-color: #fff;
  border-width: 2px;
  border-style: solid;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.item-right {
  position: relative;
  top: 12px;
  flex-shrink: 0;
  width: 80px;
}

.percent {
  font-size: 18px;
  font-weight: 600;
}
</style>
