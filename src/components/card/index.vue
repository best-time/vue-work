<template>
  <el-row :gutter="16" type="flex">
    <el-col
      v-for="card in cards"
      :key="card.title"
      style="flex: 1; min-width: 0"
    >
      <div class="assess-card bb" :style="{...handleItemStyle(card), ...boxStyle}">
        <div class="assess-card__title">{{ card.title }}</div>
        <div class="assess-card__stats" v-if="card && card.stats && card.stats.length">
          <div
            v-for="item in card.stats"
            :key="item.label"
            class="assess-card__stat"
          >
            <span class="assess-card__label">{{ item.label }}</span>
            <span
              class="assess-card__num"
              :style="[card.type ? { color: card.type } : {}]"
              >{{ item.value }}</span
            >
            <span class="assess-card__unit">{{ card.unit || "个" }}</span>
          </div>
        </div>
        <div v-else>
          <div>
            <span
              class="assess-card__single-num"
              :style="[card.type ? { color: card.type } : {}]"
              >{{ card.value }}</span
            >
            <span class="assess-card__unit">{{ card.unit || "个" }}</span>
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script>
import { createArrayProps, createObjectProps } from "@/utils/generate";

export default {
  name: "card-item",
  props: {
    /*
      {
        name: '',
        title: '',
        value: '',
        label: '',
        unit: ''
      }
    */
    cards: createArrayProps([]),
    boxStyle: createObjectProps({})
  },
  setup(props, context) {
    console.log(props, context);
    return {};
  },
  methods: {
    handleItemStyle(card) {
      if(card.type) {
        return {'border': `.5px solid ${card.type}`, 'border-left-width': '3px'}
      }
      return {}
    }
  }
};
</script>

<style lang="scss" scoped>
@include b(assess-card) {
  background: #fff;
  border-radius: 12px;
  padding: 16px 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border-left-width: 3px;
  box-sizing: border-box;

  @include e(title) {
    font-size: 16px;
    font-weight: 700;
    color: #303133;
    margin-bottom: 28px;
  }
  @include e(stats) {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  @include e(stat) {
    display: flex;
    align-items: baseline;
  }
  @include e(label) {
    font-size: 14px;
    color: #909399;
    margin-right: 8px;
  }
  @include e(num) {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }
  @include e(single-num) {
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
  }
  @include e(unit) {
    font-size: 14px;
    color: #606266;
    margin-left: 3px;
  }
}
</style>
