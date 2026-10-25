<template>
  <div class="dgo-form" v-loading="loading" element-loading-text="拉取订单详情…">
    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      class="dgo-form__alert"
      :title="error"
    />

    <el-form
      v-else
      ref="form"
      :model="form"
      :rules="rules"
      size="small"
      label-width="88px"
      @submit.native.prevent
    >
      <el-form-item label="订单号">
        <span class="dgo-form__no">{{ form.orderNo || '—' }}</span>
        <el-tag v-if="form.status" size="mini" class="dgo-form__tag">{{ form.status }}</el-tag>
      </el-form-item>
      <el-form-item label="客户名称" prop="customer">
        <el-input v-model="form.customer" maxlength="20" placeholder="请输入客户名称" />
      </el-form-item>
      <el-form-item label="订单金额" prop="amount">
        <el-input-number v-model="form.amount" :min="0" :step="100" :precision="2" controls-position="right" />
        <span class="dgo-form__unit">元</span>
      </el-form-item>
      <el-form-item label="收货地址">
        <el-input v-model="form.address" placeholder="请输入地址" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="80" show-word-limit />
      </el-form-item>
    </el-form>

    <!--
      自带按钮：给「函数式容器（$_dialog）」用 —— 那种容器的默认 footer
      拿不到业务组件实例，只能由表单自己把「校验 → 请求 → 结果」走完再 emit。
      声明式 <app-dialog> 里把 self-footer 关掉、用容器 footer 驱动，按钮就有 loading。
    -->
    <div v-if="selfFooter" class="dgo-form__foot">
      <el-button size="small" @click="onCancel">取 消</el-button>
      <el-button size="small" type="primary" :loading="submitting" @click="submit">保 存</el-button>
    </div>
  </div>
</template>

<script>
import { fetchOrderDetail, saveOrder } from "../../mockApi";

const emptyForm = () => ({
  orderNo: "",
  status: "",
  customer: "",
  amount: 0,
  address: "",
  remark: "",
});

export default {
  name: "OrderEditForm",

  props: {
    /** 只接 id，不接整行数据 —— 传快照等于父组件替它缓存状态 */
    orderId: { type: [Number, String], default: null },
    /** true：按钮画在表单里（函数式容器用）；false：交给外层容器的 footer */
    selfFooter: { type: Boolean, default: false },
  },

  data() {
    return {
      loading: false,
      submitting: false,
      error: "",
      form: emptyForm(),
      rules: {
        customer: [{ required: true, message: "客户名称不能为空", trigger: "blur" }],
        amount: [
          {
            validator: (rule, v, cb) => (Number(v) > 0 ? cb() : cb(new Error("金额要大于 0"))),
            trigger: "change",
          },
        ],
      },
    };
  },

  watch: {
    /**
     * 必须 watch —— 打开弹窗的那一瞬间 orderId 才传进来（或者从一个订单切到另一个），
     * 在 data()/created 里读一次是读不到的。
     */
    orderId: {
      immediate: true,
      handler(v) {
        if (v) this.load();
      },
    },
  },

  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const d = await fetchOrderDetail(this.orderId);
        this.form = {
          orderNo: d.orderNo,
          status: d.status,
          customer: d.customer,
          amount: d.amount,
          address: d.address,
          remark: d.remark,
        };
        this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
      } catch (e) {
        this.error = e.message || "加载失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 提交：返回 Promise<boolean>
     *   校验没过 / 请求失败 → false（外层 @confirm 拿到 false 就不关弹窗）
     *   成功 → emit('confirm', data) 并返回 true
     */
    async submit() {
      if (this.submitting) return false;
      const ok = await this.validate();
      if (!ok) return false;
      this.submitting = true;
      try {
        const res = await saveOrder(this.orderId, this.form);
        this.$message.success("已保存：" + res.detail.orderNo);
        // 谁渲染按钮，谁负责把结果抛出去：
        //   自带按钮（selfFooter）→ emit 给 $_dialog 容器，它据此 resolve
        //   容器 footer 模式     → 只返回 true，由 @confirm 的返回值决定关不关
        if (this.selfFooter) this.$emit("confirm", res.detail);
        return true;
      } catch (e) {
        this.$message.error(e.message || "保存失败");
        return false;
      } finally {
        this.submitting = false;
      }
    },

    validate() {
      return new Promise((resolve) => {
        if (!this.$refs.form) return resolve(false);
        this.$refs.form.validate((ok) => resolve(!!ok));
      });
    },

    onCancel() {
      this.$emit("cancel");
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo-form {
  min-height: 120px;

  &__alert {
    margin-bottom: 10px;
  }

  &__no {
    margin-right: 8px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    color: #326fff;
  }

  &__tag {
    vertical-align: middle;
  }

  &__unit {
    margin-left: 6px;
    font-size: 12px;
    color: #909399;
  }

  &__foot {
    padding-top: 10px;
    margin-top: 4px;
    text-align: right;
    border-top: 1px solid #ebeef5;
  }
}
</style>
