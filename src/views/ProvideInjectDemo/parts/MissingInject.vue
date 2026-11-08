<template>
  <div class="pimi">
    <span class="pimi__bad">inject: ["notExists"]（没有 default）</span>
    <span class="pimi__v">
      拿到的值 = <b>{{ text }}</b>
    </span>
    <span class="pimi__warn">
      console 里应该有 <code>injection "notExists" not found</code>
    </span>
  </div>
</template>

<script>
/**
 * 反例：数组写法 + 不写 default，且整棵祖先链上没人提供这个 key。
 *
 * 后果：
 *   · dev 环境下 Vue 会 warn（injection "notExists" not found）
 *   · 拿到的值是 undefined，模板里读它不报错、但渲染出来是空的
 *   · 生产构建里 warn 消失 —— 于是「本地看着没问题、线上空白」
 *
 * 所以 inject 一律写成对象形式 + default，取不到时自己判空。
 */
export default {
  name: "MissingInject",

  inject: ["notExists"],

  computed: {
    text() {
      return this.notExists === undefined ? "undefined" : String(this.notExists);
    },
  },
};
</script>

<style lang="scss" scoped>
.pimi {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 9px;
  font-size: 11px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;

  &__bad {
    font-family: Menlo, Consolas, monospace;
    color: #f56c6c;
  }

  &__v {
    color: #606266;

    b {
      font-family: Menlo, Consolas, monospace;
      color: #f56c6c;
    }
  }

  &__warn {
    color: #c0c4cc;

    code {
      font-family: Menlo, Consolas, monospace;
      font-size: 10px;
    }
  }
}
</style>
