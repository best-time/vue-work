<template>
  <el-row :gutter="20">
    <el-col :span="6">
      <el-input v-model="searchData.name" placeholder="请输入" />
    </el-col>
    <el-col :span="6">
      <el-input v-model="searchData.age" placeholder="请输入" />
    </el-col>
    <el-col :span="6">
      <el-input v-model="searchData.org" placeholder="请输入" />
    </el-col>
    <el-button @click="resetSearch">重置</el-button>
    <el-button type="primary" @click="search">搜索</el-button>
  </el-row>
</template>

<script >

export default {
  name: 'Info',
  props: {
    params: Object,
  },
  data() {
    return {
      searchData: {
        // name: '',
        // age: '',
        // org: '',
      }
    }
  },
  watch: {
    params: {
      handler(newVal) {
        console.log(newVal, 'search-watch')
        if(newVal) {
          this.searchData = JSON.parse(JSON.stringify(newVal))
        }
      },
      deep: true,
      // immediate: true
    },
    orgId: {
      handler(newVal) {
        if(newVal) {
          this.getData()
        }
      },
      deep: true
    }
  },
  methods: {
    resetSearch() {
      this.searchData = {}
      this.$emit('reset')
    },
    search() {
      this.$emit('search', this.searchData)
    },
  }
}
</script>
