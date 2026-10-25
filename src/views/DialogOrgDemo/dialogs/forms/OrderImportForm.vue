<template>
  <div class="dgo-import">
    <el-alert type="info" :closable="false" show-icon class="dgo-import__tip">
      <template slot="title">
        选择文件后先「解析」，确认解析出的 3 条再「开始导入」；导入是分批写入，进度条是真的。
      </template>
    </el-alert>

    <div class="dgo-import__pick">
      <el-button size="small" icon="el-icon-folder-opened" @click="pick">
        {{ fileName || "选择 CSV 文件" }}
      </el-button>
      <span class="dgo-import__hint">模拟：点一下就当成选中 orders.csv</span>
    </div>

    <el-table v-if="rows.length" :data="rows" size="mini" border class="dgo-import__table">
      <el-table-column type="index" label="#" width="46" />
      <el-table-column prop="customer" label="客户" min-width="120" />
      <el-table-column prop="amount" label="金额" width="110" align="right">
        <template slot-scope="{ row }">¥ {{ row.amount }}</template>
      </el-table-column>
      <el-table-column prop="from" label="来源文件" min-width="140" />
    </el-table>

    <div v-if="progress > 0" class="dgo-import__progress">
      <el-progress :percentage="progress" :status="progress === 100 ? 'success' : ''" />
      <p class="dgo-import__ptext">已写入 {{ done }} / {{ rows.length }} 条</p>
    </div>

    <div v-if="selfFooter" class="dgo-import__foot">
      <el-button size="small" @click="$emit('cancel')">取 消</el-button>
      <el-button
        size="small"
        type="primary"
        :loading="importing"
        :disabled="!rows.length"
        @click="submit"
      >开始导入</el-button>
    </div>
  </div>
</template>

<script>
import { mockParseFile, importOrders } from "../../mockApi";

export default {
  name: "OrderImportForm",

  props: {
    selfFooter: { type: Boolean, default: false },
  },

  data() {
    return {
      fileName: "",
      rows: [],
      importing: false,
      progress: 0,
      done: 0,
    };
  },

  methods: {
    pick() {
      this.fileName = "orders.csv";
      this.rows = mockParseFile(this.fileName);
      this.progress = 0;
      this.done = 0;
    },

    async submit() {
      if (this.importing) return false;
      if (!this.rows.length) {
        this.$message.warning("先选择文件");
        return false;
      }
      this.importing = true;
      this.progress = 0;
      try {
        const res = await importOrders(this.rows, (p, n) => {
          this.progress = p;
          this.done = n;
        });
        this.$message.success("已导入 " + res.count + " 条");
        if (this.selfFooter) this.$emit("confirm", res);
        return true;
      } catch (e) {
        this.$message.error(e.message || "导入失败");
        return false;
      } finally {
        this.importing = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo-import {
  &__tip {
    margin-bottom: 12px;
  }

  &__pick {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__hint {
    font-size: 11px;
    color: #a8abb2;
  }

  &__table {
    margin-top: 12px;
  }

  &__progress {
    margin-top: 14px;
  }

  &__ptext {
    margin: 6px 0 0;
    font-size: 11px;
    color: #909399;
  }

  &__foot {
    padding-top: 10px;
    margin-top: 14px;
    text-align: right;
    border-top: 1px solid #ebeef5;
  }
}
</style>
