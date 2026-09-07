<template>
  <div class="delivery-card">
    <div class="p-t-10">
      <TitleHeader title="在途投递2" />
    </div>
    <div class="inner-wrap">
      <!-- 左侧图标 -->
      <div class="icon-box">
        <img :src="mailIcon" alt="信箱图标" class="mail-img" />
      </div>

      <!-- 中间文字 -->
      <div class="info-box">
        <div class="label-text">职位投递总数</div>
        <div class="num-text">{{ totalCount }}</div>
      </div>

      <!-- 右侧按钮 -->
      <div class="btn-box">
        <el-button type="primary" class="detail-btn" @click="handleViewDetail">
          查看详情
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import TitleHeader from "@/components/title-header/index.vue";

export default {
  name: "OnWayDeliveryCard",
  components: {
    TitleHeader,
  },
  data() {
    return {
      // 替换为你的3D信箱图标实际地址
      mailIcon: require("@/assets/imgs/email.svg"),
      totalCount: 215
    };
  },
  methods: {
    handleViewDetail() {
      console.log("点击查看详情");
      // 路由跳转 / 弹窗逻辑写这里
      // this.$router.push('/xxx/detail')
    }
  }
};
</script>

<style scoped lang="scss">
.delivery-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid;
  box-shadow: 2px 2px 10px 0px #2166ff1a;
  border-image-source: linear-gradient(180deg, #ffffff 0%, #a7d3ff 100%);
}
.card-header {
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
  font-size: 16px;
  font-weight: 600;
}

.inner-wrap {
  display: flex;
  align-items: center;
  border: .5px solid $color-primary;
  border-radius: 16px;
  padding: 10px 20px;
  gap: 40px;
}

.icon-box {
  flex-shrink: 0;
}
.mail-img {
  height: 114px;
  object-fit: contain;
}

.info-box {
  flex-shrink: 0;
}
.label-text {
  font-size: 16px;
  color: $color-0;
  margin-bottom: 12px;
  font-weight: 500;
}
.num-text {
  font-size: 32px;
  font-weight: bold;
  color: $color-primary;
  position: relative;
  top: 8px;
}

.btn-box {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}
.detail-btn {
  width: 120px;
  height: 36px;
  border-radius: 20px;
  font-size: 14px;
  border-color: #407bff;
  background: linear-gradient(90deg, #3265F5 0%, #4B7EFE 100%);
}
</style>
