<template>
  <div class="dgo-audit" v-loading="loading" element-loading-text="拉取订单信息…">
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

    <template v-else>
      <div class="dgo-audit__sum">
        <div class="dgo-audit__row">
          <span class="dgo-audit__k">订单号</span>
          <span class="dgo-audit__v is-mono">{{ detail.orderNo }}</span>
        </div>
        <div class="dgo-audit__row">
          <span class="dgo-audit__k">客户</span>
          <span class="dgo-audit__v">{{ detail.customer }}</span>
        </div>
        <div class="dgo-audit__row">
          <span class="dgo-audit__k">金额</span>
          <span class="dgo-audit__v is-amount">¥ {{ (detail.amount || 0).toLocaleString() }}</span>
        </div>
        <div class="dgo-audit__row">
          <span class="dgo-audit__k">当前状态</span>
          <el-tag size="mini" :type="tagType">{{ detail.status }}</el-tag>
        </div>
      </div>

      <el-form ref="form" :model="form" :rules="rules" size="small" label-width="88px" @submit.native.prevent>
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

      <div v-if="selfFooter" class="dgo-audit__foot">
        <el-button size="small" @click="$emit('cancel')">取 消</el-button>
        <el-button size="small" type="primary" :loading="submitting" @click="submit">提 交</el-button>
      </div>
    </template>
  </div>
</template>

<script>
import { fetchOrderDetail, auditOrder, statusTagType } from "../../mockApi";

export default {
  name: "OrderAuditForm",

  props: {
    orderId: { type: [Number, String], default: null },
    selfFooter: { type: Boolean, default: false },
  },

  data() {
    return {
      loading: false,
      submitting: false,
      error: "",
      detail: {},
      form: { result: "pass", remark: "" },
      rules: {
        result: [{ required: true, message: "请选择审批结果", trigger: "change" }],
        remark: [
          {
            validator: (rule, v, cb) =>
              this.form.result === "reject" && !v ? cb(new Error("驳回必须填写意见")) : cb(),
            trigger: "blur",
          },
        ],
      },
    };
  },

  computed: {
    tagType() {
      return statusTagType(this.detail.status);
    },
  },

  watch: {
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
        this.detail = await fetchOrderDetail(this.orderId);
      } catch (e) {
        this.error = e.message || "加载失败";
      } finally {
        this.loading = false;
      }
    },

    async submit() {
      if (this.submitting) return false;
      const ok = await new Promise((resolve) => {
        this.$refs.form.validate((v) => resolve(!!v));
      });
      if (!ok) return false;

      this.submitting = true;
      try {
        const res = await auditOrder(this.orderId, this.form);
        this.$message.success("审批完成，订单状态：" + res.status);
        if (this.selfFooter) this.$emit("confirm", res);
        return true;
      } catch (e) {
        this.$message.error(e.message || "审批失败");
        return false;
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.dgo-audit {
  min-height: 120px;

  &__sum {
    padding: 8px 12px;
    margin-bottom: 14px;
    background: #f7f9fc;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }

  &__row {
    display: flex;
    align-items: center;
    font-size: 12px;
    line-height: 24px;
  }

  &__k {
    flex: none;
    width: 72px;
    color: #909399;
  }

  &__v {
    color: #303133;

    &.is-mono {
      font-family: Menlo, Consolas, monospace;
      color: #326fff;
    }

    &.is-amount {
      color: #ff3b3b;
      font-weight: 500;
    }
  }

  &__foot {
    padding-top: 10px;
    text-align: right;
    border-top: 1px solid #ebeef5;
  }
}
</style>
