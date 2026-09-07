<template>
  <div class="assess-container">
    <AssessPanel />
    <AssessJoint />
  </div>
</template>

<script>
import AssessPanel from "./AssessPanel.vue";
import AssessJoint from "./AssessJoint.vue";
export default {
  name: "AssessIndex",
  components: {
    AssessPanel,
    AssessJoint
  }
};
</script>

<style lang="scss" scoped>
.assess-container {
box-shadow: 2px 2px 10px 0px #2166FF1A;
border: 1px solid;

border-image-source: linear-gradient(180deg, #F4F9FF 0%, #C4DFFF 100%);


}

.a {
  background: #FFFFFF;
border: 1px solid;

border-image-source: linear-gradient(180deg, #F4F9FF 0%, #C4DFFF 100%);

box-shadow: 2px 2px 10px 0px #2166FF1A;

}
</style>