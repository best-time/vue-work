<template>
  <div class="dgo-inline">
    <el-alert type="warning" :closable="false" show-icon class="dgo-inline__tip">
      <template slot="title">
        只有 1~2 个弹窗时，最省事的写法就是把它<b>直接写在页面里</b>：
        一个 <code>visible</code> 布尔 + 一份表单 data + 一个 <code>@confirm</code>。
        本页签就是这种写法，注意下面「页面被迫持有的状态」——弹窗多起来会成倍复制。
      </template>
    </el-alert>

    <el-table ref="table" :data="rows" size="mini" border class="dgo-inline__table">
      <el-table-column prop="orderNo" label="订单号" width="130">
        <template slot-scope="{ row }">
          <span class="dgo-inline__mono">{{ row.orderNo }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="customer" label="客户" width="110" />
      <el-table-column prop="remark" label="备注" min-width="200">
        <template slot-scope="{ row }">{{ row.remark || "—" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110" align="center">
        <template slot-scope="{ row }">
          <el-button type="text" size="mini" @click="openRemark(row)">改备注</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 页面被迫持有的状态（弹窗多起来就是 dialogVisible1..15 + form1..15） -->
    <div class="dgo-inline__state">
      <span class="dgo-inline__state-k">页面持有的弹窗状态</span>
      <code>remarkVisible = {{ remarkVisible }}</code>
      <code>remarkForm.remark = "{{ form.remark }}"</code>
      <code>当前行 = {{ current ? current.orderNo : "null" }}</code>
    </div>

    <pre class="dgo-inline__code">{{ snippet }}</pre>

    <!-- ============ 就地弹窗：1~2 个时可以接受 ============ -->
    <!-- 注意：el-dialog 只有 visible 属性、没有 value，所以只能用 :visible.sync，
         写 v-model 是无效的（el-dialog 不会报错，只是永远不打开） -->
    <el-dialog
      ref="remarkDlg"
      :visible.sync="remarkVisible"
      title="修改备注"
      width="480px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onClosed"
    >
      <el-form size="small" label-width="72px" @submit.native.prevent>
        <el-form-item label="订单号">
          <span class="dgo-inline__mono">{{ current ? current.orderNo : "" }}</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="60" show-word-limit />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="remarkVisible = false">取 消</el-button>
        <el-button size="small" type="primary" @click="save">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { fetchOrders, saveOrder } from "../mockApi";

export default {
  name: "PlanInline",

  data() {
    return {
      rows: [],
      // ① 一个布尔
      remarkVisible: false,
      // ② 当前行（因为弹窗里要显示"改的是哪一条"）
      current: null,
      // ③ 一份表单
      form: { remark: "" },
      snippet: `<!-- el-dialog 只有 visible，没有 value：v-model 是无效的，必须 .sync -->
<el-dialog :visible.sync="remarkVisible" title="修改备注" width="480px">
  <el-input v-model="form.remark" type="textarea" />
</el-dialog>

// 页面里还要多两样东西
data() {
  return { remarkVisible: false, current: null, form: { remark: '' } }
}`,
    };
  },

  created() {
    this.load();
  },

  methods: {
    async load() {
      const res = await fetchOrders({ page: 1, pageSize: 3 });
      this.rows = res.list;
    },

    openRemark(row) {
      this.current = row;
      this.form = { remark: row.remark };
      this.remarkVisible = true;
    },

    async save() {
      await saveOrder(this.current.id, {
        customer: this.current.customer,
        amount: this.current.amount,
        remark: this.form.remark,
      });
      this.current.remark = this.form.remark;
      this.remarkVisible = false;
      this.$message.success("备注已保存");
      this.$emit("changed");
    },

    /** 关掉后 el-dialog 的 body 仍然留在 DOM 里（rendered 只增不减），这里只是清理页面自己的引用 */
    onClosed() {
      this.current = null;
      this.form = { remark: "" };
      this.$emit("changed");
    },

    /** 懒挂载页签后表格列宽会塌，外层切页签时调一次 */
    doLayout() {
      if (this.$refs.table) this.$refs.table.doLayout();
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo-inline {
  &__tip {
    margin-bottom: 12px;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__table {
    margin-bottom: 12px;
  }

  &__mono {
    font-family: Menlo, Consolas, monospace;
    color: #326fff;
  }

  &__state {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    background: #fffaf2;
    border: 1px dashed #f5dab1;
    border-radius: 4px;

    code {
      padding: 1px 5px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      color: #b8791a;
      background: #fff;
      border: 1px solid #f7e3c4;
      border-radius: 3px;
    }
  }

  &__state-k {
    font-size: 11px;
    color: #909399;
  }

  &__code {
    padding: 10px 12px;
    margin: 12px 0 0;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 18px;
    color: #4a5568;
    background: #fafbfc;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    white-space: pre-wrap;
  }
}
</style>
