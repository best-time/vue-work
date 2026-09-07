<template>
  <div class="header-title bg-white">
    <div class="header-title__header">
      <div class="m-r-10 flex-box items-center">
        <img src="@/assets/imgs/icon2.svg" />
      </div>
      <div class="header-title__title">{{ title }}</div>
    </div>
    <div class="header-title__divider">
      <span class="header-title__divider--active"></span>
    </div>
  </div>
</template>

<script>
import { createStringProps } from "@/utils/generate";

export default {
  name: "title-header",
  props: {
    title: createStringProps(""),
  },
};
</script>

<style lang="scss" scoped>
@include b(header-title) {
  // min-height: 100%;
  @include e(header) {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    img {
      height: 17px;
    }
  }

  @include e(title) {
    font-size: 20px;
    font-weight: 700;
    color: $color-0;
  }

  @include e(divider) {
    position: relative;
    height: 1px;
    background: #e4e7ed;
    margin-bottom: 24px;
  }

  @include em(divider, active) {
    position: absolute;
    left: 0;
    top: -1px;
    width: 130px;
    height: 2px;
    background: $color-primary;
    border-radius: 2px;
  }
}
</style>
