<template>
  <div class="pic">
    <div class="pic__hd">
      <span class="pic__title">孙组件 BaseChild</span>
      <code class="pic__sig">inject: ["pageCtx"]</code>
      <span class="pic__deep">深度：{{ depthText }}</span>
    </div>

    <el-descriptions :column="2" size="mini" border class="pic__desc">
      <el-descriptions-item label="ctx.theme">
        <el-tag :type="pageCtx.theme === 'dark' ? 'info' : 'success'" size="mini">
          {{ pageCtx.theme }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="ctx.hits">
        {{ pageCtx.hits }}
      </el-descriptions-item>
      <el-descriptions-item label="ctx.user">
        {{ pageCtx.user.name }} / {{ pageCtx.user.role }}
      </el-descriptions-item>
      <el-descriptions-item label="最近一次">
        {{ pageCtx.lastAction || "还没人点过" }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="pic__row">
      <el-button size="mini" type="primary" @click="pageCtx.bump('孙组件调的')">
        调祖先注入进来的 pageCtx.bump()
      </el-button>
      <span class="pic__hint">
        注入的不只是数据，方法也能注 —— 后代直接调，不用 emit 一层层往上冒
      </span>
    </div>
  </div>
</template>

<script>
/**
 * 后代：只写 inject，没有 props，也不知道中间层是谁。
 *
 * 两个细节：
 *   1. 数组写法 inject: ['pageCtx'] 最省事，但取不到时的告警只说名字，不给兜底 ——
 *      实战建议写成对象写法 + default（页签③有对照）。
 *   2. inject 在 initInjections 阶段解析，早于 data / created，
 *      所以 data() 里也可以直接用 this.pageCtx。
 */
export default {
  name: "BaseChild",

  inject: ["pageCtx"],

  computed: {
    /** 只是把 $parent 链数一下，证明隔了几层（跟注入无关） */
    depthText() {
      let d = 0;
      let p = this.$parent;
      while (p && p.$options.name !== "BaseTab") {
        d += 1;
        p = p.$parent;
      }
      return d + " 层（含 el-card 等内部组件）";
    },
  },
};
</script>

<style lang="scss" scoped>
.pic {
  &__hd {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__sig {
    padding: 1px 6px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #2e9e4f;
    background: #f0faf3;
    border-radius: 3px;
  }

  &__deep {
    font-size: 11px;
    color: #c0c4cc;
  }

  &__desc {
    margin-bottom: 10px;
  }

  &__row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  &__hint {
    font-size: 11px;
    color: #909399;
  }
}
</style>
