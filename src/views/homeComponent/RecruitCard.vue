<template>
  <div class="recruit gap-full">
    <div class="recruit__title flex-row items-center gap-16 m-b-12">
      <Icon />
      <img class="recruit__title-img" src="@/assets/imgs/title1.svg" />
      <Icon />
    </div>
    <div class="recruit__header radius-16">
      <HeaderTitle title="核心指标" />
      <CoreIndex />
    </div>
    <div class="flex-row gap-16 gap-full">
        <div class="flex-1">
          <StructureCard />
        </div>
        <div class="flex-1 flex-column gap-16">
          <StructurePerson />
          <JobApp />
        </div>
      </div>
  </div>
</template>

<script>
import Icon from "@/components/Icon/index.vue";
import HeaderTitle from "@/components/title-header/index.vue";
import CoreIndex from "./CoreIndex.vue";
import StructureCard from "./StructureCard.vue";
import StructurePerson from "./StructurePerson.vue";
import JobApp from "./JobApp.vue";

export default {
  name: "RecruitCard",
  components: {
    Icon,
    HeaderTitle,
    CoreIndex,
    StructureCard,
    StructurePerson,
    JobApp
  },
  setup() {},
};
</script>

<style lang="scss" scoped>
@include b(recruit) {
  @include e(title-img) {
    height: 28px;
  }
  @include e(title) {
    line-height: 42px;
    height: 42px;
  }
  @include e(header) {
    padding: 12px 16px;
    background: linear-gradient(
      180deg,
      rgba(228, 242, 255, 0.8) 0%,
      #ffffff 47.6%
    );
    border: 1px solid;
    border-image-source: linear-gradient(180deg, #ffffff 0%, #a7d3ff 100%);
  }
}
</style>
