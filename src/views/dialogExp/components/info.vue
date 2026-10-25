<template>
  <div class="cc">
    <div class="flex-row">
      <div class="item">名称: 123123</div>
      <div class="item">类型: 123123</div>
      <div class="item">地点: 南京</div>
    </div>
  </div>
</template>
<script lang="ts">

export default {
  name: 'Info',
  props: {
    params: Object,
  },
  data() {
    return {}
  },
  watch: {
    params: {
      handler(newVal) {
        if(newVal) {
          this.getData()
        }
      },
      deep: true
    },
  },
  methods: {
    getData() {
      console.log('info组件重新获取数据')
    }
  }
}
</script>

<style lang="scss">
.cc {
  margin-bottom: 20px;
}
.flex-row {
  display: flex;
}
.flex-row > .item {
  margin-right: 16px;
  border: 1px solid #DCDFE6;
  flex: 1
}
.flex-row > .item:last-child {
  margin-right: 0;
}

</style>
