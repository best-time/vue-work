<template>
  <div class="vet vet--editor">
    <p class="vet__tip">
      列的 <code>edit-render</code> 决定「进入编辑后渲染什么控件」。
      vxe-table 3.6 内置的渲染器名就这些：
      <code>$input</code>（type 可设 text / password / number / integer / float /
      date / week / month / year）、<code>$select</code>、<code>$switch</code>、
      <code>$radio</code>、<code>$checkbox</code>、<code>$button</code>；
      不够用就写 <code>#edit</code> 插槽自己塞控件（最后一列）。
    </p>

    <el-card shadow="never" class="vet__card">
      <div slot="header">各类内置编辑器 + 自定义插槽编辑器</div>
      <vxe-table
        ref="table"
        :data="rows"
        :edit-config="editConfig"
        :edit-rules="rules"
        keep-source
        border
        show-overflow
        max-height="280"
        @edit-actived="onActived"
      >
        <vxe-column type="seq" width="56" title="#" />
        <vxe-column
          field="name"
          title="文本 $input"
          min-width="120"
          :edit-render="{
            name: '$input',
            props: { placeholder: '请输入', maxlength: 12 }
          }"
        />
        <vxe-column
          field="salary"
          title="数字 integer"
          width="150"
          align="right"
          :edit-render="{
            name: '$input',
            props: { type: 'integer', min: 1000, max: 99999 }
          }"
        >
          <template #default="{ row }">{{ money(row.salary) }}</template>
        </vxe-column>
        <vxe-column
          field="onboard"
          title="日期 date"
          width="150"
          :edit-render="{
            name: '$input',
            props: {
              type: 'date',
              valueFormat: 'yyyy-MM-dd',
              placeholder: '选择日期'
            }
          }"
        />
        <vxe-column
          field="dept"
          title="下拉 $select"
          width="130"
          :edit-render="{
            name: '$select',
            options: deptOptions,
            props: { clearable: true }
          }"
        />
        <vxe-column
          field="status"
          title="开关 $switch"
          width="120"
          align="center"
          :edit-render="{ name: '$switch' }"
        >
          <!-- $switch 的显示态没有内置格式化，用默认插槽换成 tag -->
          <template #default="{ row }">
            <el-tag size="mini" :type="statusMeta(row.status).color">
              {{ statusMeta(row.status).label }}
            </el-tag>
          </template>
        </vxe-column>
        <vxe-column
          field="remark"
          title="自定义 #edit"
          min-width="190"
          :edit-render="{}"
        >
          <template #default="{ row }">
            <span :class="{ 'vet__empty': !row.remark }">
              {{ row.remark || "（点击填写）" }}
            </span>
          </template>
          <!-- 编辑态：自己塞控件。v-model 直接写 row，回车 / 失焦退出 -->
          <template #edit="{ row, column }">
            <el-input
              v-model="row[column.field]"
              size="mini"
              placeholder="输入备注后回车"
              @keyup.enter.native="closeEdit"
            />
          </template>
        </vxe-column>
      </vxe-table>
      <p class="vet__note">
        自定义插槽里把值写回 <code>row</code> 就够了（脏标记按字段值比对）；
        但如果这个字段有校验规则，还要手动调
        <code>table.updateStatus({ row, column }, 值)</code> 才会触发校验。
      </p>
    </el-card>

    <el-card shadow="never" class="vet__card">
      <div slot="header">
        一个常见坑：渲染器名字写错，编辑时整格变空白（且不报错）
      </div>
      <vxe-table
        ref="typoTable"
        :data="typoRows"
        :edit-config="{ trigger: 'click', mode: 'cell' }"
        border
        max-height="180"
      >
        <vxe-column
          field="right"
          title="正确：name: '$input'"
          min-width="200"
          :edit-render="{ name: '$input' }"
        />
        <vxe-column
          field="wrong"
          title="写错：name: 'VxeInput'"
          min-width="200"
          :edit-render="{ name: 'VxeInput' }"
        />
      </vxe-table>
      <p class="vet__note">
        点右边两格对比：左边出输入框，右边直接空白。原因是
        <code>editRender.name</code> 会去 <code>VXETable.renderer.get(name)</code>
        里查，查不到就 <code>return []</code> —— 既不报错也不降级。
        <code>VxeInput</code> 是组件名，不是渲染器名，别混。
      </p>
    </el-card>

    <ul class="vet__log">
      <li v-for="(item, i) in logs" :key="i">{{ item }}</li>
    </ul>
  </div>
</template>

<script>
import {
  createStaff,
  money,
  statusMeta,
  DEPT_OPTIONS
} from "../mock";
import logMixin from "./logMixin";

export default {
  name: "EditorTypeTab",
  mixins: [logMixin],

  data() {
    return {
      rows: createStaff(),
      deptOptions: DEPT_OPTIONS,
      editConfig: { trigger: "click", mode: "cell", showStatus: true },
      rules: {
        name: [{ required: true, message: "姓名不能为空" }]
      },
      typoRows: [{ id: 1, right: "左格能编辑", wrong: "右格也点得动" }]
    };
  },

  methods: {
    money,
    statusMeta,

    closeEdit() {
      this.$refs.table.clearEdit();
    },

    onActived({ row, column }) {
      this.push(`编辑「${row.name}」的 ${column.title}`);
    }
  }
};
</script>

<style scoped>
.vet {
  padding: 4px 2px 12px;
}
.vet__tip {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 22px;
  color: #606266;
}
.vet__tip code,
.vet__note code {
  background: #f2f5ff;
  color: #326fff;
  padding: 1px 6px;
  border-radius: 3px;
}
.vet__card {
  max-width: 1080px;
  margin-bottom: 16px;
  border-radius: 8px;
}
.vet__card ::v-deep .el-card__header {
  padding: 12px 16px;
  font-size: 13px;
  color: #303133;
}
.vet__note {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 20px;
  color: #909399;
}
.vet__empty {
  color: #c0c4cc;
}
.vet__log {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  line-height: 20px;
  color: #909399;
}
</style>
