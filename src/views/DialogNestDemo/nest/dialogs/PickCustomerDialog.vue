<template>
  <div class="dnl">
    <div class="dnl__hd">
      <span class="dnl__depth">第 {{ depth }} 层</span>
      <span
        >PickCustomerDialog · 新建客户会再开第 4 层，拿回结果后自动选中</span
      >
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 10px">
      <el-select>
        <el-option label="12323"></el-option>
      </el-select>
      <el-input
        v-model="keyword"
        size="small"
        placeholder="按客户名称 / 编号搜索"
        clearable
        @keyup.enter.native="load"
        @clear="load"
      />
      <el-button size="small" type="primary" :loading="loading" @click="load"
        >查 询</el-button
      >
      <el-button size="small" icon="el-icon-plus" @click="createOne"
        >新建客户</el-button
      >
    </div>

    <el-table
      ref="table"
      v-loading="loading"
      :data="list"
      size="mini"
      border
      max-height="250"
      highlight-current-row
      :row-key="rowKey"
      @current-change="onPick"
    >
      <el-table-column width="46" align="center">
        <template slot-scope="{ row }">
          <i
            v-if="selected && selected.id === row.id"
            class="el-icon-success"
            style="color: #326fff"
          />
        </template>
      </el-table-column>
      <el-table-column prop="id" label="编号" width="90" />
      <el-table-column prop="name" label="客户名称" min-width="170" />
      <el-table-column prop="city" label="城市" width="80" />
      <el-table-column prop="level" label="等级" width="66" align="center" />
      <el-table-column label="标记" width="90">
        <template slot-scope="{ row }">
          <el-tag v-if="row.fresh" size="mini" type="success">本次新建</el-tag>
          <span v-else class="dnl__v is-muted">—</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="dnl__foot">
      <el-button size="small" @click="$emit('dismiss')">取 消</el-button>
      <span class="dnl__v is-muted" style="margin-left: 8px">
        已选：{{
          selected ? selected.name + "（" + selected.id + "）" : "未选择"
        }}
      </span>
      <span class="dnl__foot-right" />
      <el-button
        size="small"
        type="primary"
        :disabled="!selected"
        @click="confirm"
        >确 定</el-button
      >
    </div>
  </div>
</template>

<script>
import { searchCustomers } from "../../mockApi";
import { openLayer } from "../stack";
import CreateCustomerDialog from "./CreateCustomerDialog";

export default {
  name: "PickCustomerDialog",

  props: {
    customerId: { type: String, default: "" },
    depth: { type: Number, default: 3 },
  },

  data() {
    return {
      keyword: "",
      list: [],
      loading: false,
      selected: null,
    };
  },

  created() {
    this.load();
  },

  methods: {
    rowKey(row) {
      return row.id;
    },

    async load() {
      this.loading = true;
      try {
        this.list = await searchCustomers(this.keyword);
        // 保持选中态：列表换了，按 id 重新对一次
        const id = this.selected ? this.selected.id : this.customerId;
        this.selected = this.list.find((c) => c.id === id) || null;
        this.$nextTick(() => {
          if (this.selected && this.$refs.table) {
            this.$refs.table.setCurrentRow(this.selected);
          }
        });
      } catch (e) {
        this.$message.error(e.message || "查询失败");
      } finally {
        this.loading = false;
      }
    },

    onPick(row) {
      if (row) this.selected = row;
    },

    /** 第 4 层：新建客户 */
    async createOne() {
      const created = await openLayer({
        title: "新建客户",
        width: "460px",
        role: "CreateCustomerDialog",
        component: CreateCustomerDialog,
      });
      if (!created) return;
      // 真实项目这里会重新拉列表；mock 里 createCustomer 已经写进数据源
      this.keyword = "";
      await this.load();
      const hit = this.list.find((c) => c.id === created.id);
      if (hit) {
        hit.fresh = true;
        this.selected = hit;
        this.$nextTick(
          () => this.$refs.table && this.$refs.table.setCurrentRow(hit)
        );
      }
      this.$message.success("已新建并选中：" + created.name);
    },

    confirm() {
      if (!this.selected) {
        return;
      }
      this.$emit("resolve", { ...this.selected });
    },
  },
};
</script>
