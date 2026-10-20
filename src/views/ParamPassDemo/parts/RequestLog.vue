<template>
  <div class="rlog">
    <div class="rlog__head">
      <span class="rlog__title">{{ title }}</span>
      <span class="rlog__count">{{ logs.length }} 条</span>
      <el-button
        type="text"
        size="mini"
        class="rlog__clear"
        @click="$emit('clear')"
        >清空</el-button
      >
    </div>
    <div ref="body" class="rlog__body">
      <div v-if="!logs.length" class="rlog__empty">
        还没有请求，点上面的按钮试试
      </div>
      <div
        v-for="(item, i) in logs"
        :key="i"
        class="rlog__row"
        :class="'is-' + item.kind"
      >
        <span class="rlog__t">{{ item.t }}</span>
        <span class="rlog__text">{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 请求时序日志（两个样例页共用）
 * 只负责展示，日志本身由页面收集（父组件 + 子组件都往这里写）。
 */
export default {
  name: "RequestLog",

  props: {
    title: { type: String, default: "请求时序" },
    logs: { type: Array, default: () => [] },
  },

  watch: {
    "logs.length"() {
      this.$nextTick(() => {
        const el = this.$refs.body;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.rlog {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #fafbfe;
    border-bottom: 1px solid #ebeef5;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  &__count {
    font-size: 12px;
    color: #909399;
  }

  &__clear {
    margin-left: auto;
    padding: 0;
  }

  &__body {
    max-height: 210px;
    padding: 6px 0;
    overflow: auto;
    background: #fcfcfd;
  }

  &__empty {
    padding: 12px;
    font-size: 12px;
    color: #c0c4cc;
    text-align: center;
  }

  &__row {
    display: flex;
    gap: 8px;
    padding: 2px 10px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 18px;
    color: #606266;

    &.is-parent .rlog__text {
      color: #326fff;
    }

    &.is-child .rlog__text {
      color: #7a5cff;
    }

    &.is-ok .rlog__text {
      color: #2e9e4f;
    }

    &.is-error .rlog__text {
      color: #ff3b3b;
    }

    &.is-muted .rlog__text {
      color: #a8abb2;
    }
  }

  &__t {
    flex: none;
    width: 52px;
    color: #c0c4cc;
  }

  &__text {
    word-break: break-all;
  }
}
</style>
