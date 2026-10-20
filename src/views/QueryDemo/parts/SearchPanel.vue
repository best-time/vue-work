<template>
  <el-card shadow="never" class="sp">
    <div slot="header" class="sp__hd">
      <span class="sp__title">① 搜索条件子组件 · SearchPanel</span>
      <code class="sp__sig">@search="onSearch"</code>
      <span class="sp__hint">只做两件事：收集条件 → <b>$emit('search', form)</b>；它自己不调任何业务接口</span>
    </div>

    <el-form :inline="true" size="small" class="sp__form" @submit.native.prevent>
      <el-form-item label="关键字">
        <el-input
          v-model="form.keyword"
          placeholder="订单号 / 客户 / 备注"
          clearable
          class="sp__input"
          @keyup.enter.native="submit"
        />
      </el-form-item>

      <el-form-item label="状态">
        <el-select v-model="form.status" placeholder="全部" clearable class="sp__select">
          <el-option v-for="item in options.statuses" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>

      <el-form-item label="城市">
        <el-select v-model="form.city" placeholder="全部" clearable class="sp__select">
          <el-option v-for="item in options.cities" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>

      <el-form-item label="下单日期">
        <el-date-picker
          v-model="form.dateRange"
          type="daterange"
          value-format="yyyy-MM-dd"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="sp__date"
        />
      </el-form-item>

      <el-form-item label="只看异常">
        <el-switch v-model="form.onlyRisk" />
      </el-form-item>

      <el-form-item class="sp__actions">
        <el-button type="primary" size="small" icon="el-icon-search" @click="submit">查询</el-button>
        <el-button size="small" icon="el-icon-refresh-left" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="sp__foot">
      <span class="sp__foot-label">本组件最后一次 emit 出去的条件：</span>
      <code class="sp__echo">{{ echoText }}</code>
      <span class="sp__tip">注意这里还是「原始表单」：日期是数组、字段没 trim —— 规范化交给父组件做</span>
    </div>
  </el-card>
</template>

<script>
/**
 * 搜索项子组件
 *
 * 设计原则：**搜索组件不调业务接口**。
 * 它只负责「收集用户填的条件 + 提供默认值 + 校验」，然后把条件 emit 给父组件。
 * 这样总览、列表、导出、图表…… 所有下游都消费同一份条件，不需要每个组件各写一遍搜索表单。
 *
 * 两个容易踩的点：
 *   1. emit 的是**新对象**（{...this.form}），不是 this.form 本身 —— 否则父组件拿到的引用和子组件的
 *      表单数据是同一个，父组件一改 query 子组件的输入框会跟着变（反向污染）。
 *   2. 日期范围用 value-format="yyyy-MM-dd" 直接拿字符串数组，比拿 Date 对象好处理
 *      （Date 对象再序列化/比较都麻烦，父组件拆成 startDate / endDate 就行）。
 */
import { fetchOptions } from "../mockApi";

export default {
  name: "QuerySearchPanel",

  data() {
    return {
      form: this.blank(),
      options: { statuses: [], cities: [] },
      /** 最近一次 emit 的内容，页面上回显，方便对照 */
      lastEmit: null
    };
  },

  computed: {
    echoText() {
      if (!this.lastEmit) return "（还没点过查询）";
      try {
        return JSON.stringify(this.lastEmit);
      } catch (e) {
        return "（无法序列化）";
      }
    }
  },

  created() {
    // 下拉选项也是一次接口，但它是「搜索组件自己的数据」，父组件不需要知道
    this.loadOptions();
  },

  methods: {
    blank() {
      return { keyword: "", status: "", city: "", dateRange: null, onlyRisk: false };
    },

    async loadOptions() {
      try {
        this.options = await fetchOptions();
      } catch (e) {
        this.$message && this.$message.error("选项加载失败：" + e.message);
      }
    },

    /** 把当前表单交给父组件：只 emit，不做请求 */
    submit() {
      const payload = {
        keyword: this.form.keyword,
        status: this.form.status,
        city: this.form.city,
        // 复制数组，别把 el-date-picker 内部那个数组引用递出去
        dateRange: this.form.dateRange ? this.form.dateRange.slice() : null,
        onlyRisk: this.form.onlyRisk
      };
      this.lastEmit = payload;
      this.$emit("search", payload);
    },

    /** 重置 = 清空表单 + 立刻用空条件查一次（统一走 submit，行为可预期） */
    reset() {
      this.form = this.blank();
      this.submit();
    }
  }
};
</script>

<style lang="scss" scoped>
.sp {
  margin-bottom: 14px;
  border-radius: 6px;

  &__hd {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  &__sig {
    padding: 1px 6px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #326fff;
    background: #eef4ff;
    border-radius: 3px;
  }

  &__hint {
    font-size: 12px;
    color: #909399;

    b {
      color: #326fff;
    }
  }

  &__form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  &__input {
    width: 190px;
  }

  &__select {
    width: 130px;
  }

  &__date {
    width: 240px;
  }

  &__actions {
    margin-left: auto;
    margin-bottom: 18px;
  }

  &__foot {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px dashed #ebeef5;
  }

  &__foot-label {
    font-size: 12px;
    color: #909399;
  }

  &__echo {
    max-width: 520px;
    padding: 2px 6px;
    overflow: hidden;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #326fff;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: #f6f9ff;
    border-radius: 3px;
  }

  &__tip {
    font-size: 11px;
    color: #c0c4cc;
  }
}
</style>
