<template>
  <div class="home-container">
    <div style="background: #f5f7fa" v-if="false">
      <el-row :gutter="16">
        <el-col :span="6">
          <StatCard />
        </el-col>
        <el-col :span="6">
          <StatCard />
        </el-col>
        <el-col :span="6">
          <StatCard />
        </el-col>
        <el-col :span="6">
          <StatCard />
        </el-col>
      </el-row>
    </div>
    <!-- 综合考核 -->
    <AssessIndex />

    <!-- 招聘管理 -->
    <RecruitCard />
  </div>
</template>

<script>
import StatCard from "./homeComponent/StatCard.vue";
import AssessIndex from "./homeComponent/AssessIndex.vue";
import RecruitCard from "./homeComponent/RecruitCard.vue";
export default {
  components: { StatCard, RecruitCard, AssessIndex },
};
</script>
