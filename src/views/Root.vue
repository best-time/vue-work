<template>
  <div class="root-container">
    <el-row v-for="route in routes" :key="route.path">
      <el-col :span="24">
        <a :href="route.path">{{ route.name }}</a>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { routes } from "@/router";

export default {
  beforeCreate() {
    this.routes = routes;
  },
};
</script>

<style lang="scss" scoped>
.root-container {
  padding: 20px;
}
.el-row {
  margin-bottom: 20px;
  background-color: #f0f0f0;
  &:last-child {
    margin-bottom: 0;
  }
}
</style>
