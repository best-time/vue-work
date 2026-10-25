<template>
  <div class="dialog-container">
    <info-com :params="listQuery" :orgId="orgId"></info-com>
    <search-com
      :params="listQuery.condition"
      :orgId="orgId"
      @search="getTableData"
      @reset="resetSearch"
    ></search-com>

    {{ listQuery }}
  </div>
</template>

<script>
import SearchCom from "./components/search.vue";
import InfoCom from "./components/info.vue";

function initSearchParam() {
  return {
    name: "",
    age: "",
    org: "",
  };
}
export default {
  name: "DialogExp",
  components: {
    SearchCom,
    InfoCom,
  },
  data() {
    return {
      listQuery: {
        page: 1,
        size: 10,
        condition: {
          type: 1,
          ...initSearchParam(),
        },
        filter: [],
      },
      orgId: "",
    };
  },
  created() {
    this.init();
  },
  methods: {
    init() {
      setTimeout(() => {
        this.orgId = "1001";
      }, 500);
    },
    getTableData(searchParams) {
      Object.assign(this.listQuery.condition, searchParams);
      console.log("列表更新数据");
    },
    resetSearch() {
      Object.assign(this.listQuery.condition, initSearchParam());
    },
  },
};
</script>
<style lang="scss">
.dialog-container {
  padding: 20px;
}
</style>
