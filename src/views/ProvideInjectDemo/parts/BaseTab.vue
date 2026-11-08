<template>
  <div class="pib">
    <div class="pib__bar">
      <el-alert type="info" :closable="false" show-icon class="pib__alert">
        <template slot="title">
          祖先的 <code>provide()</code> 只能调一次，所以它给的是
          <code>this.ctx</code> 这个<b>引用</b>；后面所有变化都发生在
          <code>ctx</code> 内部，后代读到的自然是新值。
        </template>
      </el-alert>
    </div>

    <el-card shadow="never" class="pib__box">
      <div slot="header" class="pib__hd">
        <span class="pib__title">祖先（本页）</span>
        <code class="pib__sig">provide() { return { pageCtx: this.ctx } }</code>
      </div>

      <div class="pib__row">
        <el-button size="mini" type="primary" @click="bump('祖先自己点的')"
          >祖先 +1</el-button
        >
        <el-button size="mini" @click="switchTheme"
          >切换主题（{{ ctx.theme }}）</el-button
        >
        <el-input v-model="ctx.count" style="width: 300px;" />
        <span class="pib__state">
          ctx.hits = <b>{{ ctx.hits }}</b> · ctx.theme =
          <b>{{ ctx.theme }}</b>
          <i style="margin-left: 12px;">{{ ctx.count }}</i>
        </span>
      </div>

      <!-- 中间层：不声明 props、不 inject、也不透传 $attrs -->
      <base-mid-layer>
        <base-child />
      </base-mid-layer>
    </el-card>
  </div>
</template>

<script>
/**
 * 页签①：最朴素的跨层注入
 *
 * 链路：本页 provide(pageCtx) → BaseMidLayer（什么都不做）→ BaseChild inject(pageCtx)
 * 关键点：中间层既没有 props 也没有 provide，但它照样不参与、也不阻塞注入。
 */
import BaseMidLayer from "./BaseMidLayer.vue";
import BaseChild from "./BaseChild.vue";

export default {
  name: "BaseTab",

  components: { BaseMidLayer, BaseChild },

  data() {
    return {
      /** 提供给后代的上下文容器：引用不变，只改里面的字段 */
      ctx: {
        theme: "light",
        user: { name: "李雷", role: "运营" },
        hits: 0,
        /** 后代也能调，等于把「祖先的方法」一起注入了 */
        bump: this.bump,
        count: ''
      },
    };
  },

  provide() {
    // ⚠️ 这里只返回引用。想成「注册了一个名字」，而不是「把值传下去」
    return { pageCtx: this.ctx };
  },

  methods: {
    bump(who) {
      this.ctx.hits += 1;
      this.ctx.lastAction = who;
    },

    switchTheme() {
      this.ctx.theme = this.ctx.theme === "light" ? "dark" : "light";
    },
  },
};
</script>

<style lang="scss" scoped>
.pib {
  padding: 14px 16px;

  &__alert {
    margin-bottom: 12px;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      background: #eef3ff;
      border-radius: 3px;
    }
  }

  &__box {
    border-radius: 6px;
  }

  &__hd {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  &__sig {
    padding: 1px 6px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #2e9e4f;
    background: #f0faf3;
    border-radius: 3px;
  }

  &__row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__state {
    font-size: 12px;
    color: #909399;

    b {
      color: #326fff;
    }
  }
}
</style>
