<template>
  <div>
    <CardPanel :cards="cards" :boxStyle="{'text-align': 'center', padding: '24px 14px'}" />
  </div>
</template>

<script>
import { ref } from '@vue/composition-api'
import CardPanel from '@/components/card/index.vue'

export default {
  name: 'core-index',
  components: {
    CardPanel
  },
  setup() {
    const cards = ref([
      {
          title: '年度计划人数',
          type: '#326FFF',
          value: '111',
          unit: '人'
        },
        {
          title: '确认入职人数',
          type: '#B56CFF',
          value: '222',
          unit: '人'
        },
        {
          title: '剩余招聘缺口',
          type: '#FB8E3A',
          value: '333',
          unit: '人'
        },

        {
          title: '招聘完成率',
          type: '#FD3C3D',
          value: '111',
          unit: '人'
        },
    ])
    return {
      cards
    }
  }
}
</script>

<style lang="scss" scoped>
</style>