<template>
  <div class="piov">
    <div class="piov__me">
      我自己的 <code>props.theme</code> =
      <b class="piov__now">{{ theme }}</b>
      <span class="piov__note">（它会跟着祖先变，但下面子组件的值是 initProvide 时的快照）</span>
    </div>
    <slot />
  </div>
</template>

<script>
/**
 * B 写法：provide 写成函数，但返回的是「值」。
 *
 * 这里是全篇最容易踩的坑：
 *   initProvide 在组件 created 之前执行，**只执行一次**。
 *   之后 props.theme 更新再多次，provide 也不会重跑，
 *   后代身上那份值就永久停在首次的快照上。
 */
export default {
  name: "ProviderValueForm",

  props: {
    theme: { type: String, default: "light" },
  },

  provide() {
    return { themeValue: this.theme };
  },
};
</script>

<style lang="scss" scoped>
.piov {
  &__me {
    margin-bottom: 8px;
    font-size: 11px;
    line-height: 18px;
    color: #909399;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      color: #5c6b8a;
      background: #f4f6fb;
      border-radius: 3px;
    }

    b {
      color: #606266;
    }
  }

  &__now {
    color: #326fff !important;
  }

  &__note {
    color: #c0c4cc;
  }
}
</style>
