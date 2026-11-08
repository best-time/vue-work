<template>
  <div class="piof">
    <div class="piof__me">
      ProviderObjectForm 的 <code>provide</code> 是一个<b>对象字面量</b>，里面没有
      <code>this</code>，也没有任何响应式来源
    </div>
    <slot />
  </div>
</template>

<script>
/**
 * A 写法：把 provide 写成对象。
 *
 * 这个对象在**组件选项定义时**就求值完了（模块作用域），所以：
 *   · 写不了 this.xxx —— 这里 this 不是组件实例
 *   · 也就天然不可能跟着祖先状态变
 * 好处是「一眼看出是常量」，适合注入 VERSION、默认配置这类真不会变的东西。
 */
export default {
  name: "ProviderObjectForm",

  provide: {
    themeStatic: "light",
  },
};
</script>

<style lang="scss" scoped>
.piof {
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
}
</style>
