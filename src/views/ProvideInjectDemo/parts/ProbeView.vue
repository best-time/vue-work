<template>
  <div class="piv">
    <div class="piv__row">
      <span class="piv__name">{{ name }}</span>
      <code class="piv__key">inject: {{ injectKey }}</code>
      <!-- 渲染次数不走 data：在 updated 里改响应式数据会再触发一次渲染 → 无限循环 -->
      <span ref="renders" class="piv__renders">渲染 1 次</span>
    </div>
    <div class="piv__val">
      <span class="piv__label">看到的值</span>
      <b :class="ok ? 'is-good' : 'is-bad'">{{ display }}</b>
    </div>
    <p v-if="tip" class="piv__tip">{{ tip }}</p>
  </div>
</template>

<script>
/**
 * 纯展示组件，四个 ShowXxx 共用 —— 只为把「看到的值 + 渲染次数」摆出来。
 * 注入逻辑都在各自的 ShowXxx 里，这里不碰 provide/inject。
 *
 * ⚠️ 渲染次数是**手动写 DOM** 的，不是响应式数据：
 *    如果写成 data.renders++ 放在 updated 里，改数据 → 再渲染 → updated 又跑 → 死循环
 *    （Vue 会报 "You may have an infinite update loop in a component render function"）。
 *    这里本来的目的就是「数真实渲染次数」，写 DOM 反而最贴题：改 DOM 不会触发重渲染。
 */
export default {
  name: "ProbeView",

  props: {
    name: { type: String, default: "" },
    injectKey: { type: String, default: "" },
    value: { type: [String, Number, Object], default: null },
    ok: { type: Boolean, default: true },
    tip: { type: String, default: "" },
  },

  computed: {
    display() {
      const v = this.value;
      if (v === null || v === undefined) {
        return "undefined（没注入到）";
      }
      if (typeof v === "object") {
        return v.value !== undefined ? v.value : JSON.stringify(v);
      }
      return String(v);
    },
  },

  mounted() {
    this._renders = 1;
  },

  updated() {
    // updated 只在「本组件真的重渲染」时触发，所以这就是渲染次数
    this._renders = (this._renders || 1) + 1;
    this.$nextTick(() => {
      const el = this.$refs.renders;
      if (!el) return;
      el.textContent = "渲染 " + this._renders + " 次";
      if (this._renders > 1) el.classList.add("is-hot");
    });
  },
};
</script>

<style lang="scss" scoped>
.piv {
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;

  &__row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 6px;
  }

  &__name {
    font-size: 11px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__key {
    padding: 1px 5px;
    font-family: Menlo, Consolas, monospace;
    font-size: 10px;
    color: #2e9e4f;
    background: #f0faf3;
    border-radius: 3px;
  }

  &__renders {
    margin-left: auto;
    font-size: 10px;
    color: #c0c4cc;

    &.is-hot {
      color: #326fff;
      font-weight: 600;
    }
  }

  &__val {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;

    b {
      font-family: Menlo, Consolas, monospace;
      font-size: 12px;

      &.is-good {
        color: #2e9e4f;
      }

      &.is-bad {
        color: #f56c6c;
      }
    }
  }

  &__label {
    font-size: 11px;
    color: #909399;
  }

  &__tip {
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 17px;
    color: #c0c4cc;
  }
}
</style>
