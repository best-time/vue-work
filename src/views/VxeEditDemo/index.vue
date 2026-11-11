<template>
  <div class="ved">
    <header class="ved__hd">
      <h1 class="ved__title">vxe-table 行内编辑</h1>
      <p class="ved__desc">
        基于项目里的 <code>vxe-table 3.6.17</code>（Vue 2 兼容版）。
        四个页签分别演示：单格编辑、整行编辑、各类编辑器、条件编辑与代码控制。
        表格数据都是本地的，「保存」只做模拟提交，不发请求。
      </p>

      <div class="ved__facts">
        <span class="ved__fact">
          <b>1</b>
          <span class="ved__fact-txt">
            表格上必须有 <code>edit-config</code>，列上必须有
            <code>edit-render</code> —— 少任意一个都进不了编辑态
          </span>
        </span>
        <span class="ved__fact">
          <b>2</b>
          <span class="ved__fact-txt">
            要「脏标记 / 撤销 / 变更集」就得加 <code>keep-source</code>，
            它会把原始数据克隆一份留底
          </span>
        </span>
        <span class="ved__fact">
          <b>3</b>
          <span class="ved__fact-txt">
            校验规则写在表格的 <code>edit-rules</code> 上，按字段名分组，
            不是写在列上
          </span>
        </span>
      </div>
    </header>

    <el-tabs v-model="active" @tab-click="onTabClick">
      <el-tab-pane label="① 单元格编辑" name="cell" lazy>
        <cell-tab />
      </el-tab-pane>
      <el-tab-pane label="② 整行编辑" name="row" lazy>
        <row-tab />
      </el-tab-pane>
      <el-tab-pane label="③ 编辑器类型" name="editor" lazy>
        <editor-tab />
      </el-tab-pane>
      <el-tab-pane label="④ 条件编辑 & 代码控制" name="api" lazy>
        <api-tab />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import CellTab from "./parts/CellTab.vue";
import RowTab from "./parts/RowTab.vue";
import EditorTab from "./parts/EditorTab.vue";
import ApiTab from "./parts/ApiTab.vue";

const TABS = ["cell", "row", "editor", "api"];

export default {
  name: "VxeEditDemo",
  components: { CellTab, RowTab, EditorTab, ApiTab },

  data() {
    const tab = this.$route.query.tab;
    return {
      // ?tab= 同步，刷新后还停在同一个页签
      active: TABS.includes(tab) ? tab : "cell"
    };
  },

  watch: {
    "$route.query.tab"(val) {
      if (val && TABS.includes(val) && val !== this.active) this.active = val;
    }
  },

  methods: {
    onTabClick(tab) {
      if (this.$route.query.tab === tab.name) {
        return;
      }
      this.$router.replace({
        query: { ...this.$route.query, tab: tab.name }
      });
    }
  }
};
</script>

<style scoped>
.ved {
  max-width: 1180px;
  padding: 24px;
}
.ved__title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.ved__desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 22px;
  color: #606266;
}
.ved__desc code,
.ved__fact code {
  background: #f2f5ff;
  color: #326fff;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
}
.ved__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
  margin-bottom: 6px;
}
.ved__fact {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #f5f8ff;
  border: 1px solid #e2ebff;
  border-radius: 8px;
  font-size: 12px;
  line-height: 20px;
  color: #606266;
}
/* 文字必须包一层：.ved__fact 是 flex 容器，
   散着的文本节点 + <code> 会各成一个 flex item，被排成好几列 */
.ved__fact-txt {
  flex: 1;
  min-width: 0;
}
.ved__fact b {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 50%;
  background: #326fff;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  text-align: center;
}
</style>
