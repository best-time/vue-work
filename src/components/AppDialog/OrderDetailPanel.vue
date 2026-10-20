<template>
  <div class="odp">
    <!-- 接口返回中：此刻 props.detail 还是 null -->
    <div v-if="loading" class="odp__loading">
      <i class="el-icon-loading" />
      <span>接口返回中…（此刻 props.detail 仍是 null，子组件先按空态渲染）</span>
    </div>

    <!--
      空态：接口失败 / 还没回来。
      子组件绝不能在模板里直接写 detail.xxx —— null 上取属性会报 undefined，
      所以要么 v-if="detail" 包一层，要么给个兜底对象。
    -->
    <el-alert
      v-if="!detail && !loading"
      type="info"
      :closable="false"
      show-icon
      title="props.detail 是 null：这里显示空态，等父组件把接口结果塞进来"
    />

    <template v-if="detail">
      <!-- ① 顶部摘要：证明「回填」已经发生 -->
      <div class="odp__head">
        <span class="odp__no">{{ form.orderNo }}</span>
        <el-tag :type="statusType" size="mini">{{ form.status }}</el-tag>
        <span class="odp__time">下单时间 {{ form.createdAt }}</span>
        <span class="odp__amount">¥{{ amountText }}</span>
      </div>
      <div class="odp__badge">
        子组件已回填 <b>{{ filled }}</b> 次 · 由这个对象驱动：
        <code>props.detail.orderNo = {{ detail.orderNo }}</code>
      </div>

      <!-- ② 回填后的可编辑表单（编辑只写本组件的 form，不动 props） -->
      <el-form size="small" label-width="76px" class="odp__form">
        <el-form-item label="客户">
          <el-input v-model="form.customer" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="收货地址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="随便改点，点确定后父组件会把这里读回去" />
        </el-form-item>
      </el-form>

      <!-- ③ 明细：接口返回的数组直接渲染，数量还能改（改的是 copy） -->
      <el-table :data="form.items" size="mini" border class="odp__table" empty-text="接口没给明细">
        <el-table-column prop="name" label="商品" min-width="120" />
        <el-table-column label="单价" width="90">
          <template slot-scope="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template slot-scope="{ row }">
            <el-input-number v-model="row.count" size="mini" :min="1" :max="99" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="小计" width="100">
          <template slot-scope="{ row }">¥{{ (row.price * row.count).toFixed(2) }}</template>
        </el-table-column>
      </el-table>

      <p class="odp__note">
        所有可编辑内容都写在子组件自己的 <code>form</code> 上（<code>detail</code> 只当入参、只读），
        改数量不会污染父组件那份「接口返回」。
      </p>

      <!-- ④ 接口原始返回：说明传下来的只是父组件的一个对象字段 -->
      <div class="odp__raw">
        <div class="odp__raw-head" @click="rawOpen = !rawOpen">
          <i :class="rawOpen ? 'el-icon-arrow-down' : 'el-icon-arrow-right'" />
          props.detail（接口原始返回，只读）
        </div>
        <pre v-show="rawOpen" class="odp__raw-body">{{ rawText }}</pre>
      </div>
    </template>
  </div>
</template>

<script>
/**
 * OrderDetailPanel —— 「弹窗里的详情子组件」示例（demo 专用，局部注册）
 *
 * 它要解决的就是一个非常常见的时序问题：
 *   父组件 v-model 打开弹窗的**那一刻**，接口还没回来，detail 还是 null；
 *   子组件不能只在 data()/created 里读一次 props.detail —— 那时读到的是 null，
 *   之后数据到了也不会再回填。
 *   正确做法：watch(detail, { immediate: true }) → 数据什么时候到、到了什么，都能回填。
 *
 * 另外两个约定：
 *   1. 只读 props：detail 只当入参，回填到本组件的 form，编辑改 form
 *      （直接改 props 里的对象是高危操作：父组件那份数据会被悄悄改掉）
 *   2. 暴露 getForm() / reset() 给父组件，ref 里取回编辑结果 —— 弹窗里最实用的两个方法
 */
export default {
  name: "OrderDetailPanel",

  props: {
    /** 接口返回的详情对象；接口没回来 / 失败时是 null */
    detail: { type: Object, default: null },
    /** 父组件的请求是否在进行中（只影响提示，不影响回填） */
    loading: { type: Boolean, default: false }
  },

  data() {
    return {
      /** 回填后的本地副本，模板全部读它，不直接读 detail */
      form: this.emptyForm(),
      /** 回填发生了几次，用来肉眼确认 watch 有没有生效 */
      filled: 0,
      rawOpen: false
    };
  },

  computed: {
    amountText() {
      const sum = (this.form.items || []).reduce((s, it) => s + (it.price || 0) * (it.count || 0), 0);
      return sum.toFixed(2);
    },
    statusType() {
      const map = { 待发货: "warning", 已发货: "primary", 已完成: "success", 已取消: "info" };
      return map[this.form.status] || "info";
    },
    rawText() {
      try {
        return JSON.stringify(this.detail, null, 2);
      } catch (e) {
        return "（detail 无法序列化：" + e.message + "）";
      }
    }
  },

  watch: {
    /**
     * 核心：immediate 保证「挂载时若已有数据」也回填，
     * 之后父组件每次「换一个新对象」（接口 resolve、或切了另一条订单）都会再触发。
     */
    detail: {
      immediate: true,
      handler(val) {
        this.fill(val);
        // nextTick 再 emit：避免在父组件模板 patch 途中直接改父组件的 state
        this.$nextTick(() => this.$emit("fill", val));
      }
    }
  },

  methods: {
    emptyForm() {
      return { orderNo: "", status: "", createdAt: "", customer: "", phone: "", address: "", remark: "", items: [] };
    },

    /** 把接口对象「回填」成本组件的可编辑状态（深拷贝数组，别和 props 共享引用） */
    fill(detail) {
      if (!detail) {
        this.form = this.emptyForm();
        return;
      }
      this.form = {
        orderNo: detail.orderNo || "",
        status: detail.status || "",
        createdAt: detail.createdAt || "",
        customer: detail.customer || "",
        phone: detail.phone || "",
        address: detail.address || "",
        remark: detail.remark || "",
        items: (detail.items || []).map((it) => Object.assign({}, it))
      };
      this.filled++;
    },

    /** 父组件点确定时 ref 里读回编辑结果 */
    getForm() {
      return Object.assign({}, this.form, {
        items: (this.form.items || []).map((it) => Object.assign({}, it))
      });
    },

    /** 放弃编辑：按当前 props.detail 重新回填一次 */
    reset() {
      this.fill(this.detail);
    }
  }
};
</script>

<style lang="scss" scoped>
.odp {
  font-size: 13px;
  color: #303133;

  &__loading {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    margin-bottom: 10px;
    font-size: 12px;
    color: #909399;
    background: #fafafa;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
  }

  &__head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__no {
    font-size: 15px;
    font-weight: 600;
    color: #326fff;
  }

  &__time {
    font-size: 12px;
    color: #909399;
  }

  &__amount {
    margin-left: auto;
    font-size: 15px;
    font-weight: 600;
    color: #ff3b3b; // 国内习惯：金额/涨用红
  }

  &__badge {
    margin-bottom: 10px;
    font-size: 12px;
    color: #909399;

    b {
      color: #326fff;
    }

    code {
      padding: 1px 5px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__form {
    padding-top: 4px;
  }

  &__table {
    font-size: 12px;
  }

  &__note {
    margin: 10px 0 0;
    padding-left: 10px;
    font-size: 12px;
    line-height: 19px;
    color: #909399;
    border-left: 3px solid #d9e6ff;

    code {
      padding: 1px 5px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__raw {
    margin-top: 12px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background: #fbfcff;
  }

  &__raw-head {
    padding: 7px 10px;
    font-size: 12px;
    color: #606266;
    cursor: pointer;

    i {
      margin-right: 4px;
      color: #909399;
    }
  }

  &__raw-body {
    max-height: 160px;
    margin: 0;
    padding: 8px 10px;
    overflow: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 17px;
    color: #4a5568;
    border-top: 1px dashed #e4e7ed;
  }
}
</style>
