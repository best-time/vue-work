<template>
  <div class="vet vet--row">
    <p class="vet__tip">
      <code>mode: 'row'</code> + <code>trigger: 'dblclick'</code>：双击任意一格，
      这一行所有可编辑列一起进入编辑态，适合「一次改一整条记录」的表单型表格。
      这里故意配了 <code>autoClear: false</code> —— 点页面其它地方不会退出编辑，
      必须用行尾的「保存 / 取消」收尾，不然填一半点错地方就白填了。
      <br />
      注意：整行模式下 <code>$input</code> 是<b>缓冲</b>的（值先进
      <code>column.model</code>，退出编辑才写进 row），所以保存 / 取消 /
      校验都必须先 <code>clearEdit()</code> 再动作，顺序反了会「改了没生效」。
    </p>

    <div class="vet__bar">
      <el-button type="primary" size="small" icon="el-icon-plus" @click="addRow">
        新增一行
      </el-button>
      <el-button size="small" icon="el-icon-check" @click="saveAll">
        校验并全部保存
      </el-button>
      <el-button size="small" icon="el-icon-refresh-left" @click="revertAll">
        全部撤销
      </el-button>
      <span class="vet__bar-tip">双击行进入编辑；编辑中该行会显示蓝框</span>
    </div>

    <vxe-table
      ref="table"
      :data="rows"
      :edit-config="editConfig"
      :edit-rules="rules"
      keep-source
      border
      show-overflow
      max-height="320"
      @edit-actived="onActived"
      @edit-closed="onClosed"
      @valid-error="onValidError"
    >
      <vxe-column type="seq" width="56" title="#" />
      <vxe-column
        field="name"
        title="姓名"
        min-width="110"
        :edit-render="{
          name: '$input',
          props: { placeholder: '请输入姓名', maxlength: 12 }
        }"
      />
      <vxe-column
        field="dept"
        title="部门"
        width="118"
        :edit-render="{
          name: '$select',
          options: deptOptions,
          props: { clearable: true, placeholder: '请选择' }
        }"
      />
      <vxe-column
        field="salary"
        title="月薪"
        width="128"
        align="right"
        :edit-render="{ name: '$input', props: { type: 'integer', min: 1000 } }"
      >
        <template #default="{ row }">{{ money(row.salary) }}</template>
      </vxe-column>
      <vxe-column
        field="onboard"
        title="入职日期"
        width="138"
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
        field="status"
        title="状态"
        width="108"
        :edit-render="{ name: '$select', options: statusOptions }"
      >
        <template #default="{ row }">
          <el-tag size="mini" :type="statusMeta(row.status).color">
            {{ statusMeta(row.status).label }}
          </el-tag>
        </template>
      </vxe-column>
      <vxe-column title="操作" width="132" align="center" fixed="right">
        <template #default="{ row }">
          <template v-if="isEditing(row)">
            <el-button type="text" size="mini" @click.stop="saveRow(row)">
              保存
            </el-button>
            <el-button type="text" size="mini" @click.stop="cancelRow(row)">
              取消
            </el-button>
          </template>
          <template v-else>
            <el-button type="text" size="mini" @click.stop="editRow(row)">
              编辑
            </el-button>
            <el-button type="text" size="mini" @click.stop="removeRow(row)">
              删除
            </el-button>
          </template>
        </template>
      </vxe-column>
    </vxe-table>

    <div class="vet__panel">
      <p class="vet__panel-hd">
        变更：
        <span class="vet__stat vet__stat--update">修改 {{ stats.update }}</span>
        <span class="vet__stat vet__stat--insert">新增 {{ stats.insert }}</span>
        <span class="vet__stat vet__stat--remove">删除 {{ stats.remove }}</span>
        <em class="vet__hint">
          整行编辑下，同一行的多列改动只算「1 条 updateRecords」
        </em>
      </p>
      <ul class="vet__log">
        <li v-for="(item, i) in logs" :key="i">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import {
  createStaff,
  money,
  nextId,
  statusMeta,
  today,
  DEPT_OPTIONS,
  STATUS_OPTIONS
} from "../mock";
import { pickValidError } from "../validateResult";
import logMixin from "./logMixin";

export default {
  name: "RowEditTab",
  mixins: [logMixin],

  data() {
    return {
      rows: createStaff(),
      deptOptions: DEPT_OPTIONS,
      statusOptions: STATUS_OPTIONS,

      editConfig: {
        trigger: "dblclick", // 双击进入编辑
        mode: "row", // 整行一起编辑
        showIcon: true,
        showStatus: true,
        autoClear: false // 点空白不退出，必须显式保存/取消
      },

      rules: {
        name: [{ required: true, message: "姓名不能为空" }],
        salary: [
          { required: true, message: "月薪不能为空" },
          {
            validator: ({ cellValue }) =>
              Number(cellValue) < 1000 ? new Error("月薪不能低于 1000") : null
          }
        ]
      },

      stats: { update: 0, insert: 0, remove: 0 }
    };
  },

  methods: {
    money,
    statusMeta,

    /**
     * 当前行是否处于编辑态。
     * isEditByRow 读的是 vxe 内部 editStore.actived（响应式），所以行内按钮能跟着切换。
     */
    isEditing(row) {
      const table = this.$refs.table;
      return table ? table.isEditByRow(row) : false;
    },

    refresh() {
      const table = this.$refs.table;
      if (!table) return;
      const { insertRecords, removeRecords, updateRecords } = table.getRecordset();
      this.stats = {
        update: updateRecords.length,
        insert: insertRecords.length,
        remove: removeRecords.length
      };
    },

    onActived({ row, column }) {
      this.push(`进入整行编辑：${row.name || "(空)"} ← ${column.title}`);
    },

    onClosed({ row }) {
      this.push(`退出整行编辑：${row.name || "(空)"}`);
      this.refresh();
    },

    onValidError({ column, rule }) {
      this.push(
        `校验不通过：${column.title} → ${(rule && rule.message) || "规则不通过"}`
      );
    },

    editRow(row) {
      this.$refs.table.setEditCell(row, "name");
    },

    /**
     * 保存单行
     *
     * 两个顺序/语义上的坑：
     * 1. 必须先 clearEdit() 再 validate(row)：整行模式下 $input 是「缓冲模式」
     *    （immediate: false），敲进去的值先存在 column.model 里，退出编辑才写进 row；
     *    直接 validate(row) 校验的是 row 上的旧值。
     * 2. 3.6 的 validate() 校验失败是 resolve(错误对象)，不是 reject，
     *    所以只能看返回值，不能靠 catch（见 ../validateResult.js）。
     */
    saveRow(row) {
      const table = this.$refs.table;
      const name = row.name || "(空)";
      table
        .clearEdit()
        .then(() => table.validate(row))
        .then((errMap) => {
          const err = pickValidError(errMap);
          if (err) {
            this.push(`「${name}」校验不通过：${err.message}`);
            // vxe 默认已经会滚到出错格并重新激活（validConfig.autoPos），这里再点一次更稳
            if (err.field) table.setEditCell(row, err.field);
            return;
          }
          this.refresh();
          this.push(`保存「${name}」这一行`);
          this.$message.success("已保存该行（模拟接口）");
        });
    },

    /**
     * 取消单行
     * - 已有行 → clearEdit 落盘后 revertData 用 keep-source 快照还原
     * - 新增行 → 没有快照，直接 remove
     *
     * 同样必须先 clearEdit：反过来的话，退出编辑时会把「编辑中的临时值」
     * 再写回 row，把刚还原的值又盖掉（看着像点了没反应）。
     */
    cancelRow(row) {
      const table = this.$refs.table;
      const isNew = table.isInsertByRow(row);
      const name = row.name || row.id;
      table.clearEdit().then(() => {
        if (isNew) {
          table.remove(row);
          this.push("取消新增行（已移除）");
        } else {
          table.revertData(row);
          this.push(`取消「${name}」的修改`);
        }
        this.refresh();
      });
    },

    removeRow(row) {
      this.$refs.table.remove(row).then(() => {
        this.push(`删除「${row.name || row.id}」`);
        this.refresh();
      });
    },

    addRow() {
      const row = {
        id: nextId(),
        name: "",
        dept: "",
        salary: null,
        onboard: today(),
        status: 2
      };
      this.$refs.table.insert(row).then(({ row: inserted }) => {
        this.push(`新增一行，id=${inserted.id}`);
        this.refresh();
        this.$refs.table.setEditCell(inserted, "name");
      });
    },

    /**
     * 全部保存：validate() 默认只校验「变动过的行 + 新增行」，
     * 传 true 才是校验全表（4 行数据无所谓，几千行时差别很大）。
     * 同样要先 clearEdit 把缓冲值落盘，并且靠返回值判断校验结果（不是 catch）。
     */
    saveAll() {
      const table = this.$refs.table;
      table
        .clearEdit()
        .then(() => table.validate())
        .then((errMap) => {
          const err = pickValidError(errMap);
          if (err) {
            this.push(`全表校验不通过：${err.message}`);
            return;
          }
          const { insertRecords, updateRecords, removeRecords } =
            table.getRecordset();
          const total =
            insertRecords.length + updateRecords.length + removeRecords.length;
          this.push(
            `全部保存：新增 ${insertRecords.length} / 修改 ${updateRecords.length} / 删除 ${removeRecords.length}`
          );
          this.$message.success(
            total ? `已提交 ${total} 条变更（模拟接口）` : "没有变更"
          );
        });
    },

    revertAll() {
      const table = this.$refs.table;
      const inserts = table.getRecordset().insertRecords.slice();
      table.clearEdit().then(() => {
        table.revertData();
        // 新增行没有原始快照，revertData 管不了，得单独删
        if (inserts.length) table.remove(inserts);
        this.$nextTick(() => {
          this.refresh();
          this.push("已撤销全部改动");
        });
      });
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
.vet__tip code {
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
  margin: 0;
  font-size: 13px;
  color: #606266;
}
.vet__stat {
  margin: 0 6px;
}
.vet__stat--update {
  color: #e6a23c;
}
.vet__stat--insert {
  color: #67c23a;
}
.vet__stat--remove {
  color: #f56c6c;
}
.vet__hint {
  font-size: 12px;
  color: #a8abb2;
  font-style: normal;
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
