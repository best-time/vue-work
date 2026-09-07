<template>
  <div class="assessment-panel">
    <!-- 标题区 -->
    <TitleHeader :title="title" />

    <!-- 卡片区 -->
    <CardPanel :cards="cards"  />

  </div>
</template>

<script>
import TitleHeader from "@/components/title-header/index.vue";
import CardPanel from '@/components/card/index.vue'

export default {
  name: 'AssessmentPanel',
  components: {
    TitleHeader,
    CardPanel
  },
  props: {
    title: {
      type: String,
      default: '农商行综合考核'
    },
    cards: {
      type: Array,
      default: () => [
        {
          title: '单位考核',
          type: 'blue',
          unit: '个',
          stats: [
            { label: '第一等次', value: 13 },
            { label: '第二等次', value: 45 }
          ]
        },
        {
          title: '班子考核',
          type: '#28CD7D',
          unit: '个',
          stats: [
            { label: '优秀等次', value: 11 },
            { label: '一般等次', value: 16 }
          ]
        },
        {
          title: '董事长考核',
          type: '#FB8E3A',
          unit: '个',
          stats: [
            { label: '优秀等次', value: 11 },
            { label: '一般等次', value: 16 }
          ]
        },
        {
          title: '行长考核',
          type: '#FB8E3A',
          unit: '个',
          stats: [
            { label: '优秀等次', value: 11 },
            { label: '一般等次', value: 16 }
          ]
        },
        {
          title: '副职领导人员考核',
          type: '#FB8E3A',
          unit: '个',
          stats: [
            { label: '优秀等次', value: 11 },
            { label: '一般等次', value: 16 }
          ]
        }
      ]
    }
  },
  methods: {
    handleItemStyle(card) {
      if(card.type) {
        return {'border': `.5px solid ${card.type}`, 'border-left-width': '3px'}
      }
      return {}
    }
  }
}
</script>

<style lang="scss" scoped>
.assessment-panel {
  padding: 24px;
  background: #f5f7fa;
  &__cards {
    margin: 0;
  }
}

.assess-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border-left-width: 3px;
  box-sizing: border-box;
  margin-bottom: 20px;

  &__title {
    font-size: 16px;
    font-weight: 700;
    color: #303133;
    margin-bottom: 28px;
  }
  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  &__stat {
    display: flex;
    align-items: baseline;
  }
  &__label {
    font-size: 14px;
    color: $color-0;
    margin-right: 8px;
  }
  &__num {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }
  &__unit {
    font-size: 14px;
    color: $color-0;
    margin-left: 3px;
  }
}

</style>
