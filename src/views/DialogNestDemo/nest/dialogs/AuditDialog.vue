<template>
  <div class="dnl">
    <div class="dnl__hd">
      <span class="dnl__depth">第 {{ depth }} 层</span>
      <span>AuditDialog · 它在等一个「选客户」的结果，但那层还没打开</span>
    </div>

    <div class="dnl__sum">
      <div class="dnl__row">
        <span class="dnl__k">订单</span>
        <span class="dnl__v is-mono">{{ order.orderNo }}</span>
      </div>
      <div class="dnl__row">
        <span class="dnl__k">收货客户</span>
        <span class="dnl__v">{{ picked.name }}</span>
        <span class="dnl__link" @click="changeCustomer"
          >更换（会开出第 3、4 层）</span
        >
      </div>
      <div class="dnl__row">
        <span class="dnl__k">金额</span>
        <span class="dnl__v is-amount"
          >¥ {{ order.amount.toLocaleString() }}</span
        >
      </div>
    </div>

    <el-form
      ref="form"
      :model="form"
      :rules="rules"
      size="small"
      label-width="88px"
      @submit.native.prevent
    >
      <el-form-item label="审批结果" prop="result">
        <el-radio-group v-model="form.result">
          <el-radio label="pass">通过（转为已发货）</el-radio>
          <el-radio label="reject">驳回（取消订单）</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="审批意见" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          maxlength="60"
          show-word-limit
          :placeholder="form.result === 'reject' ? '驳回时必填' : '选填'"
        />
      </el-form-item>
    </el-form>

    <div class="dnl__foot">
      <el-button size="small" @click="$emit('dismiss')">取 消</el-button>
      <span class="dnl__foot-right" />
      <el-button size="small" :loading="submitting" @click="submit"
        >提 交</el-button
      >
    </div>
  </div>
</template>

<script>
import { auditOrder } from "../../mockApi";
import { openLayer } from "../stack";
import PickCustomerDialog from "./PickCustomerDialog";

export default {
  name: "AuditDialog",

  props: {
    order: { type: Object, required: true },
    customer: { type: Object, required: true },
    depth: { type: Number, default: 2 },
  },

  data() {
    return {
      submitting: false,
      form: { result: "pass", remark: "" },
      picked: { ...this.customer },
      rules: {
        remark: [
          {
            validator: (rule, v, cb) =>
              this.form.result === "reject" && !v
                ? cb(new Error("驳回必须填写意见"))
                : cb(),
            trigger: "blur",
          },
        ],
      },
    };
  },

  methods: {
    /** 第 3 层：选客户（该层内部还能再开第 4 层「新建客户」） */
    async changeCustomer() {
      const picked = await openLayer({
        title: "选择收货客户",
        width: "700px",
        role: "PickCustomerDialog",
        component: PickCustomerDialog,
        props: { customerId: this.picked.id },
      });
      if (!picked) return;
      this.picked = picked;
    },

    async submit() {
      if (this.submitting) return;
      const ok = await new Promise((resolve) => {
        this.$refs.form.validate((valid) => resolve(!!valid));
      });
      if (!ok) return;

      this.submitting = true;
      try {
        const res = await auditOrder(this.order.id, this.form);
        this.$emit("resolve", {
          status: res.status,
          remark: this.form.remark,
          customer: this.picked,
        });
      } catch (e) {
        this.$message.error(e.message || "审批失败");
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>
