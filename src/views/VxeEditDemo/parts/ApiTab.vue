<template>
  <div class="vet vet--api">
    <p class="vet__tip">
      行内编辑真正麻烦的是两件事：<b>哪些行 / 列允许改</b>（已锁定、无权限、状态不允许），
      以及<b>怎么用代码控制编辑</b>（弹窗打开后自动聚焦某格、校验失败跳回出错的格子）。
      这个页签两件事都做成了可点的。
    </p>

    <div class="vet__bar">
      <el-button size="small" @click="editCell(0, 'name')">
        代码打开第 1 行「姓名」
      </el-button>
      <el-button size="small" @click="editCell(2, 'salary')">
        代码打开第 3 行「月薪」
      </el-button>
      <el-button size="small" @click="clearEdit">结束编辑</el-button>
      <el-button size="small" @click="checkAll">校验全表</el-button>
      <span class="vet__bar-tip">
        第 2 行（李四）是锁定行，点它的格子会触发
        <code>edit-disabled</code>，不会进入编辑。另外
        <code>validate()</code> 校验失败是 <b>resolve</b> 错误对象、不是 reject，
        别写成 <code>.catch()</code>
      </span>
    </div>

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
      @edit-closed="onClosed"
      @edit-disabled="onDisabled"
      @valid-error="onValidError"
    >
      <vxe-column type="seq" width="56" title="#" />
      <vxe-column
        field="name"
        title="姓名"
        min-width="120"
        :edit-render="{
          name: '$input',
          props: { placeholder: '请输入姓名' }
        }"
      />
      <vxe-column
        field="dept"
        title="部门"
        width="120"
        :edit-render="{ name: '$select', options: deptOptions }"
      />
      <vxe-column
        field="salary"
        title="月薪"
        width="130"
        align="right"
        :edit-render="{ name: '$input', props: { type: 'integer', min: 1000 } }"
      >
        <template #default="{ row }">{{ money(row.salary) }}</template>
      </vxe-column>
      <vxe-column field="remark" title="备注（没配 edit-render，点不进编辑）" min-width="190" />
      <vxe-column field="locked" title="锁定" width="96" align="center">
        <template #default="{ row }">
          <!-- .stop：点开关只切换锁定，别把点击冒泡成「进入单元格编辑」 -->
          <el-switch v-model="row.locked" @click.native.stop />
        </template>
      </vxe-column>
    </vxe-table>

    <div class="vet__panel">
      <p class="vet__panel-hd">
        当前编辑目标：<b>{{ activeText }}</b>
      </p>
      <p class="vet__panel-hd vet__legend">
        状态标记：
        <span class="vet__mark vet__mark--dirty">红三角</span> 值已改动（keep-source 比对出来的）
        <span class="vet__mark vet__mark--active">蓝框</span> 正在编辑
        <span class="vet__mark vet__mark--error">红框</span> 校验不通过
      </p>
      <ul class="vet__log">
        <li v-for="(item, i) in logs" :key="i">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { createStaff, money, DEPT_OPTIONS } from "../mock";
import { pickValidError } from "../validateResult";
import logMixin from "./logMixin";

export default {
  name: "EditApiTab",
  mixins: [logMixin],

  data() {
    return {
      rows: createStaff(),
      deptOptions: DEPT_OPTIONS,
      activeText: "无",

      editConfig: {
        trigger: "click",
        mode: "cell",
        showStatus: true,
        /**
         * beforeEditMethod（3.6 之前叫 activeMethod，两个名字都认）
         * 返回 false 就不进入编辑，并抛出 edit-disabled 事件。
         * 参数：{ row, rowIndex, column, columnIndex, cell, $table }
         */
        beforeEditMethod: ({ row }) => !row.locked
      },

      rules: {
        name: [{ required: true, message: "姓名不能为空" }],
        salary: [
          {
            validator: ({ cellValue }) =>
              Number(cellValue) < 1000 ? new Error("月薪不能低于 1000") : null
          }
        ]
      }
    };
  },

  methods: {
    money,

    /** 代码打开某一格：setEditCell(row, field)，内部会先滚到可视区再聚焦 */
    editCell(rowIndex, field) {
      const row = this.rows[rowIndex];
      if (!row) return;
      if (row.locked) {
        this.push(`第 ${rowIndex + 1} 行是锁定的，代码也进不去`);
        return;
      }
      this.$refs.table.setEditCell(row, field);
    },

    clearEdit() {
      this.$refs.table.clearEdit();
      this.push("clearEdit()：退出编辑态");
    },

    /**
     * validate() 只校验改动行；传 true 才是整表校验。
     * 3.6 里校验失败是 resolve(按字段分组的错误对象)，不是 reject —— 见 ../validateResult.js
     */
    checkAll() {
      this.$refs.table.validate(true).then((errMap) => {
        const err = pickValidError(errMap);
        if (err) {
          this.push(`全表校验不通过：${err.message}`);
          return;
        }
        this.push("全表校验通过");
        this.$message.success("全表校验通过");
      });
    },

    onActived({ row, column }) {
      this.activeText = `${row.name || "(空)"} · ${column.title}`;
      this.push(`edit-actived：${this.activeText}`);
    },

    onClosed() {
      this.activeText = "无";
      this.push("edit-closed：退出编辑");
    },

    onDisabled({ row, column }) {
      this.push(
        `edit-disabled：${row.name || "(空)"} · ${column.title} 被拦下（锁定行）`
      );
    },

    onValidError({ column, rule }) {
      this.push(
        `valid-error：${column.title} → ${(rule && rule.message) || "规则不通过"}`
      );
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
.vet__bar-tip code {
  background: #f2f5ff;
  color: #326fff;
  padding: 1px 6px;
  border-radius: 3px;
}
.vet__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.vet__bar-tip {
  font-size: 12px;
  color: #909399;
}
.vet__bar ::v-deep .el-button + .el-button {
  margin-left: 0;
}
.vet__panel {
  margin-top: 14px;
  padding: 12px 14px;
  background: #fafbff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.vet__panel-hd {
  margin: 0 0 6px;
  font-size: 13px;
  color: #606266;
}
.vet__panel-hd b {
  color: #326fff;
}
.vet__legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #909399;
}
.vet__mark {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid currentColor;
}
.vet__mark--dirty {
  color: #f56c6c;
}
.vet__mark--active {
  color: #409eff;
}
.vet__mark--error {
  color: #e6a23c;
}
.vet__log {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  line-height: 20px;
  color: #909399;
}
</style>
