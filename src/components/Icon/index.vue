<template>
  <div class="icon flex-box gap-2 items-center">
    <span class="icon__left"></span>
    <span class="icon__center"></span>
    <span class="icon__right"></span>
  </div>
</template>

<script>
export default {
  name: "Icon",
};
</script>

<style lang="scss" scoped>
@include b(icon) {
  @include e(left, center, right) {
    display: block;
    width: 2px;
    height: 10px;
    border-radius: 20px;
    background: linear-gradient(180deg, #41B0FF 0%, #033EE6 117.86%);
  }
  @include e(center) {
    width: 2px;
    height: 16px;
  }
}
</style>
