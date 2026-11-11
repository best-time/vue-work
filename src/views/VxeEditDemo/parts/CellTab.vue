<template>
  <div class="vet vet--cell">
    <p class="vet__tip">
      单击任意格子进入编辑，改完点别处自动退出。<code>mode: 'cell'</code>
      一次只激活一个格子；只有同时加了
      <code>keep-source</code> + <code>edit-config.show-status</code>，
      改动过的格子左上角才会出现红色小三角。
    </p>

    <div class="vet__bar">
      <el-button type="primary" size="small" icon="el-icon-check" @click="save">
        保存
      </el-button>
      <el-button size="small" icon="el-icon-refresh-left" @click="revertAll">
        撤销修改
      </el-button>
      <el-button size="small" icon="el-icon-plus" @click="addRow">
        新增一行
      </el-button>
      <span class="vet__bar-tip">
        试试点「姓名」清空，或把月薪改成 500 —— 校验会拦下并保持编辑态
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
      max-height="320"
      @edit-actived="onActived"
      @edit-closed="onClosed"
      @valid-error="onValidError"
    >
      <vxe-column type="seq" width="56" title="#" />
      <vxe-column
        field="name"
        title="姓名"
        min-width="120"
        :edit-render="{
          name: '$input',
          props: { placeholder: '请输入姓名', maxlength: 12 }
        }"
      />
      <vxe-column
        field="dept"
        title="部门"
        width="120"
        :edit-render="{
          name: '$select',
          options: deptOptions,
          props: { clearable: true, placeholder: '请选择' }
        }"
      />
      <vxe-column
        field="salary"
        title="月薪"
        width="130"
        align="right"
        :edit-render="{
          name: '$input',
          props: { type: 'integer', min: 1000 }
        }"
      >
        <!-- 非编辑态走这个插槽；进入编辑后 vxe 会自动换成 edit-render 的输入框 -->
        <template #default="{ row }">{{ money(row.salary) }}</template>
      </vxe-column>
      <vxe-column
        field="onboard"
        title="入职日期"
        width="140"
        :edit-render="{
          name: '$input',
          props: {
            type: 'date',
            valueFormat: 'yyyy-MM-dd',
            placeholder: '选择日期'
          }
        }"
      />
      <vxe-column field="status" title="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="mini" :type="statusMeta(row.status).color">
            {{ statusMeta(row.status).label }}
          </el-tag>
        </template>
      </vxe-column>
      <vxe-column title="操作" width="80" align="center">
        <template #default="{ row }">
          <el-button type="text" size="mini" @click.stop="removeRow(row)">
            删除
          </el-button>
        </template>
      </vxe-column>
    </vxe-table>

    <!-- ============ 变更面板：getRecordset() 的三个列表 ============ -->
    <div class="vet__panel">
      <div class="vet__stats">
        <span class="vet__stat vet__stat--update">
          修改 <b>{{ stats.update }}</b>
        </span>
        <span class="vet__stat vet__stat--insert">
          新增 <b>{{ stats.insert }}</b>
        </span>
        <span class="vet__stat vet__stat--remove">
          删除 <b>{{ stats.remove }}</b>
        </span>
        <el-button type="text" size="mini" @click="showJson = !showJson">
          {{ showJson ? "收起" : "查看" }} getRecordset() 原始返回
        </el-button>
      </div>

      <pre v-if="showJson" class="vet__json">{{ recordsetJson }}</pre>

      <p v-if="lastSubmit" class="vet__submitted">
        上一次提交：{{ lastSubmit }}
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
  clone,
  money,
  nextId,
  statusMeta,
  today,
  DEPT_OPTIONS
} from "../mock";
import { pickValidError } from "../validateResult";
import logMixin from "./logMixin";

export default {
  name: "CellEditTab",
  mixins: [logMixin],

  data() {
    return {
      rows: createStaff(),
      deptOptions: DEPT_OPTIONS,

      /**
       * 编辑配置（必须！）
       * 只给列写 edit-render 是不够的，没有 edit-config 表格根本不会进入编辑态。
       *   trigger   'click' | 'dblclick' | 'manual'（manual = 只能代码调 setEditCell）
       *   mode      'cell' 单格 | 'row' 整行
       *   showIcon  表头/单元格右侧显示编辑小图标
       *   showStatus 显示脏标记（要求 keep-source）
       *   autoClear 点空白处是否自动退出编辑，默认 true
       */
      editConfig: {
        trigger: "click",
        mode: "cell",
        showIcon: true,
        showStatus: true,
        autoClear: true
      },

      /**
       * 校验规则：写在表格上、按「字段名」分组（不是写在列上）
       * 规则对象支持 required / min / max / pattern / validator / message / trigger
       */
      rules: {
        name: [
          { required: true, message: "姓名不能为空" },
          { min: 2, max: 12, message: "姓名长度 2~12 个字" }
        ],
        salary: [
          { required: true, message: "月薪不能为空" },
          {
            validator: ({ cellValue }) =>
              Number(cellValue) < 1000 ? new Error("月薪不能低于 1000") : null
          }
        ],
        onboard: [{ required: true, message: "请选择入职日期" }]
      },

      stats: { update: 0, insert: 0, remove: 0 },
      recordsetJson: "{}",
      showJson: false,
      lastSubmit: ""
    };
  },

  methods: {
    money,
    statusMeta,

    /** 重新统计变更（getRecordset 不是响应式的，得手动刷新） */
    refresh() {
      const table = this.$refs.table;
      if (!table) return;
      const { insertRecords, removeRecords, updateRecords } = table.getRecordset();
      this.stats = {
        update: updateRecords.length,
        insert: insertRecords.length,
        remove: removeRecords.length
      };
      this.recordsetJson = JSON.stringify(
        { insertRecords, updateRecords, removeRecords },
        null,
        2
      );
    },

    onActived({ row, column }) {
      this.push(`开始编辑：${row.name || "(空)"} · ${column.title}`);
    },

    onClosed({ row, column }) {
      this.push(`结束编辑：${row.name || "(空)"} · ${column.title}`);
      this.refresh();
    },

    onValidError({ row, column, rule }) {
      this.push(
        `校验不通过：${column.title} = 「${row[column.field]}」 → ${
          (rule && rule.message) || "规则不通过"
        }`
      );
    },

    /** 新增：走 table.insert()，这样才会被记进 getRecordset().insertRecords */
    addRow() {
      const row = {
        id: nextId(),
        name: "",
        dept: "",
        salary: null,
        onboard: today(), // 入职日期默认今天
        status: 2,
        remark: ""
      };
      this.$refs.table.insert(row).then(({ row: inserted }) => {
        this.push(`新增一行，id=${inserted.id}`);
        this.refresh();
        // 新增后直接进入编辑，省一次点击
        this.$refs.table.setEditCell(inserted, "name");
      });
    },

    removeRow(row) {
      this.$refs.table.remove(row).then(() => {
        this.push(`删除「${row.name || row.id}」`);
        this.refresh();
      });
    },

    /** 只回滚被改过的行（keep-source 才有原始快照可比） */
    revertAll() {
      const table = this.$refs.table;
      const count = table.getRecordset().updateRecords.length;
      // 先退出编辑（把编辑中的临时值落盘），再按快照还原，顺序反了会撤不掉
      table.clearEdit().then(() => {
        table.revertData().then(() => {
          this.refresh();
          if (count) this.$message.info(`已撤销 ${count} 行的修改`);
        });
      });
    },

    /**
     * 保存
     * - 提交前先 clearEdit()（退出编辑，把当前格子的值落盘）+ validate() 校验；
     *   3.6 的 validate() 校验失败是 resolve 错误对象，不是 reject（见 validateResult.js）
     * - getRecordset() 拿三个列表交给后端（新增 / 修改 / 删除）
     * - 成功后用当前数据重载一次：原始快照被重置，脏标记和变更列表一起清空
     */
    save() {
      const table = this.$refs.table;
      table
        .clearEdit()
        .then(() => table.validate())
        .then((errMap) => {
          const err = pickValidError(errMap);
          if (err) {
            this.push(`保存前校验不通过：${err.message}`);
            this.$message.warning(`还有没填好的地方：${err.message}`);
            return;
          }

          const { insertRecords, removeRecords, updateRecords } =
            table.getRecordset();
          const total =
            insertRecords.length + removeRecords.length + updateRecords.length;
          if (!total) {
            this.$message.info("没有改动需要提交");
            return;
          }

          this.lastSubmit = `新增 ${insertRecords.length} / 修改 ${updateRecords.length} / 删除 ${removeRecords.length}`;
          this.push(`提交：${this.lastSubmit}`);

          // 模拟「提交成功」：换成一份新数组，vxe 会重新克隆原始快照
          this.rows = clone(table.getTableData().fullData);
          this.$nextTick(this.refresh);
          this.$message.success("已保存（模拟接口）");
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
/* ElementUI 自带 .el-button + .el-button { margin-left: 10px }，
   再叠 gap 会变成 18px，这里清零只留 gap */
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
.vet__stats {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: #606266;
}
.vet__stat b {
  font-size: 15px;
  margin-left: 2px;
}
.vet__stat--update b {
  color: #e6a23c;
}
.vet__stat--insert b {
  color: #67c23a;
}
.vet__stat--remove b {
  color: #f56c6c;
}
.vet__json {
  max-height: 190px;
  overflow: auto;
  margin: 10px 0 0;
  padding: 10px 12px;
  background: #1f2430;
  color: #c8d3f5;
  border-radius: 6px;
  font-size: 12px;
  line-height: 18px;
}
.vet__submitted {
  margin: 10px 0 0;
  font-size: 12px;
  color: #67c23a;
}
.vet__log {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  line-height: 20px;
  color: #909399;
}
</style>
