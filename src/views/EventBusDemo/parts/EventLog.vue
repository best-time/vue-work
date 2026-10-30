<template>
  <div class="eb-log">
    <div class="eb-log__hd">
      <span class="eb-log__title">{{ title }}</span>
      <span class="eb-log__cnt">收到 {{ total }} 次</span>
    </div>

    <div v-if="!logs.length" class="eb-log__empty">还没有事件</div>
    <div
      v-for="(l, i) in logs"
      :key="l.id"
      class="eb-log__row"
      :class="{ 'is-new': i === 0 }"
    >
      <span class="eb-log__name">{{ l.name }}</span>
      <span class="eb-log__payload">{{ l.payload }}</span>
      <span class="eb-log__time">{{ l.at }}</span>
    </div>
  </div>
</template>

<script>
import { bus } from "../bus";

/**
 * 通用事件日志：页面和弹窗里都用它，各自 $on / 各自 $off。
 * 好处是「谁收到了」一眼可见 —— 调 bus 全靠这个。
 */
export default {
  name: "EventLog",

  props: {
    names: { type: Array, required: true },
    title: { type: String, default: "事件日志" },
    max: { type: Number, default: 6 },
  },

  data() {
    return { logs: [], total: 0, seed: 0 };
  },

  created() {
    // 一个事件配一个自己的 handler：$off 时能精确摘掉自己那几个，不误伤别人的监听
    this.bindings = this.names.map((name) => [
      name,
      (payload) => this.push(name, payload),
    ]);
    this.bindings.forEach(([name, fn]) => bus.$on(name, fn));
  },

  beforeDestroy() {
    // 关键：不摘就在 bus 上永久驻留 —— 弹窗反复开关会从 1 条变 n 条
    this.bindings.forEach(([name, fn]) => bus.$off(name, fn));
    this.bindings = [];
  },

  methods: {
    push(name, payload) {
      this.total += 1;
      this.logs.unshift({
        id: ++this.seed,
        name,
        payload: this.fmt(payload),
        at: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      });
      if (this.logs.length > this.max) this.logs.pop();
    },

    fmt(payload) {
      if (payload === undefined) return "(无 payload)";
      if (typeof payload !== "object") return String(payload);
      try {
        const s = JSON.stringify(payload);
        return s.length > 64 ? s.slice(0, 64) + "…" : s;
      } catch (e) {
        return "(无法序列化)";
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.eb-log {
  padding: 8px 10px;
  background: #f9fbfd;
  border: 1px solid #eef1f6;
  border-radius: 6px;

  &__hd {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    font-size: 12px;
  }

  &__title {
    font-weight: 600;
    color: #1f2d3d;
  }

  &__cnt {
    margin-left: auto;
    color: #909399;
  }

  &__empty {
    padding: 4px 0;
    font-size: 12px;
    color: #c0c4cc;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    font-size: 12px;
    border-top: 1px dashed #eef1f6;

    &.is-new {
      animation: ebFlash 0.7s ease-out;
    }
  }

  &__name {
    flex: none;
    padding: 0 6px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    color: #326fff;
    background: #eef3ff;
    border-radius: 9px;
  }

  &__payload {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: #5c6b8a;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    flex: none;
    color: #c0c4cc;
  }
}

@keyframes ebFlash {
  from {
    background: #fff6d8;
  }
  to {
    background: transparent;
  }
}
</style>
