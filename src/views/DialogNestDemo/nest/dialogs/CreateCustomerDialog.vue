<template>
  <div class="dnl">
    <div class="dnl__hd">
      <span class="dnl__depth">第 {{ depth }} 层</span>
      <span
        >CreateCustomerDialog · 最里层，它只负责把结果 resolve 给第 3 层</span
      >
    </div>

    <el-form
      ref="form"
      :model="form"
      :rules="rules"
      size="small"
      label-width="80px"
      @submit.native.prevent
    >
      <el-form-item label="客户名称" prop="name">
        <el-input
          v-model="form.name"
          placeholder="例如：苏州工业园智造"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="所在城市" prop="city">
        <el-select v-model="form.city" placeholder="请选择" style="width: 100%">
          <el-option v-for="c in cities" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="error"
    />

    <div class="dnl__foot">
      <el-button size="small" @click="$emit('dismiss')">取 消</el-button>
      <span class="dnl__foot-right" />
      <el-button size="small" type="primary" :loading="saving" @click="submit"
        >创 建</el-button
      >
    </div>
  </div>
</template>

<script>
import { createCustomer } from "../../mockApi";

export default {
  name: "CreateCustomerDialog",

  props: {
    depth: { type: Number, default: 4 },
  },

  data() {
    return {
      cities: ["北京", "上海", "杭州", "深圳", "广州", "成都", "苏州"],
      form: { name: "", city: "苏州" },
      error: "",
      saving: false,
      rules: {
        name: [{ required: true, message: "请输入客户名称", trigger: "blur" }],
        city: [{ required: true, message: "请选择城市", trigger: "change" }],
      },
    };
  },

  methods: {
    async submit() {
      if (this.saving) return;
      const ok = await new Promise((resolve) => {
        this.$refs.form.validate((valid) => resolve(!!valid));
      });
      if (!ok) return;

      this.saving = true;
      this.error = "";
      try {
        const item = await createCustomer(this.form);
        this.$emit("resolve", item); // 只回传数据，谁打开我谁决定下一步
      } catch (e) {
        this.error = e.message || "创建失败";
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
