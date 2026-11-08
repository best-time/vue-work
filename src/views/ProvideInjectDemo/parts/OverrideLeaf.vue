<template>
  <div class="piol">
    <div class="piol__item">
      <span class="piol__k">themeLabel</span>
      <b class="piol__v is-near">{{ themeLabel }}</b>
      <em>取到的是中间层那份（就近覆盖）</em>
    </div>
    <div class="piol__item">
      <span class="piol__k">cfg.apiBase</span>
      <b class="piol__v">{{ cfg.apiBase }}</b>
      <em>中间层没提供，继续往上找到页面；改它这里会变</em>
    </div>
    <div class="piol__item">
      <span class="piol__k">cfg.retry</span>
      <b class="piol__v">{{ cfg.retry }}</b>
    </div>
  </div>
</template>

<script>
/**
 * 孙组件：同时注入「被覆盖的 key」和「只有根提供的 key」。
 *
 * 每次读取都是独立的向上查找，不会因为中间层提供过一次
 * 就把祖先的 provide 整体挡掉。
 */
export default {
  name: "OverrideLeaf",

  inject: {
    themeLabel: { default: "（谁都没提供）" },
    cfg: { default: () => ({ apiBase: "—", retry: "—" }) },
  },
};
</script>

<style lang="scss" scoped>
.piol {
  padding: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;

  &__item {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 3px 0;
    font-size: 12px;

    em {
      font-size: 11px;
      font-style: normal;
      color: #c0c4cc;
    }
  }

  &__k {
    width: 92px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #5c6b8a;
  }

  &__v {
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    color: #326fff;

    &.is-near {
      color: #e6a23c;
    }
  }
}
</style>
