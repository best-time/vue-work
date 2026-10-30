<template>
  <div class="root-container">
    <header class="root-container__hd">
      <h1 class="root-container__title">路由索引</h1>
      <p class="root-container__tip">
        列表里的名称来自 <code>route.meta.title</code>，按 <code>meta.group</code>
        分组；<code>route.name</code> 只是路由标识（
        <code>$router.push({ name: 'Xxx' })</code> 用），不参与展示。
        切页时浏览器标签页标题同样由 <code>meta.title</code> 驱动。
      </p>
      <p class="root-container__current">
        当前路由：<strong>{{ currentTitle }}</strong>
      </p>
    </header>

    <section
      v-for="group in groups"
      :key="group.name"
      class="root-container__group"
    >
      <h2 class="root-container__group-title">
        {{ group.name }}
        <span class="root-container__group-count">{{ group.items.length }}</span>
      </h2>

      <el-row :gutter="12">
        <el-col
          v-for="route in group.items"
          :key="route.path"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <router-link class="route-card" :to="route.path">
            <span class="route-card__title">{{ titleOf(route) }}</span>
            <span class="route-card__meta">
              <code class="route-card__name">{{ route.name }}</code>
              <em class="route-card__path">{{ route.path }}</em>
            </span>
          </router-link>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<script>
import { routes } from "@/router";

const FALLBACK_GROUP = "未分组";

export default {
  name: "Root",

  data() {
    return { routes };
  },

  computed: {
    /**
     * 按 meta.group 分组（保持 routes 里的原始顺序）。
     * 不写 meta.group 的路由会自动落到「未分组」，新增路由时不会因为漏写而消失。
     */
    groups() {
      const map = new Map();
      this.routes.forEach((route) => {
        const name = (route.meta && route.meta.group) || FALLBACK_GROUP;
        if (!map.has(name)) map.set(name, []);
        map.get(name).push(route);
      });
      return Array.from(map, ([name, items]) => ({ name, items }));
    },

    /** 当前页标题：读的是当前路由的 meta.title（AppDialog 等页面内部不受影响） */
    currentTitle() {
      return this.titleOf(this.$route);
    },
  },

  methods: {
    /** 统一兜底：meta.title → name → path，任何路由都保证有可读文案 */
    titleOf(route) {
      return (route.meta && route.meta.title) || route.name || route.path;
    },
  },
};
</script>

<style lang="scss" scoped>
.root-container {
  min-height: 100vh;
  padding: 24px;
  background-color: #f7fafd;

  &__hd {
    margin-bottom: 24px;
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    color: $color-3;
  }

  &__tip {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.7;
    color: $color-6;

    code {
      padding: 1px 5px;
      border-radius: 3px;
      background-color: rgba($color-primary, 0.08);
      color: $color-primary;
      font-size: 12px;
    }
  }

  &__current {
    margin-top: 8px;
    font-size: 13px;
    color: $color-9;

    strong {
      color: $color-primary;
      font-weight: 600;
    }
  }

  &__group {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__group-title {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    font-size: 15px;
    font-weight: 600;
    color: $color-3;
  }

  &__group-count {
    margin-left: 8px;
    padding: 0 7px;
    border-radius: 9px;
    background-color: rgba($color-primary, 0.1);
    color: $color-primary;
    font-size: 12px;
    font-weight: 400;
    line-height: 18px;
  }
}

.route-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 76px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #e6ebf2;
  border-radius: 8px;
  background-color: $white;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 6px 16px rgba($color-primary, 0.14);
    transform: translateY(-1px);
  }

  &__title {
    overflow: hidden;
    color: $color-3;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: $color-9;
  }

  &__name {
    overflow: hidden;
    padding: 1px 5px;
    border-radius: 3px;
    background-color: #f2f4f8;
    color: $color-6;
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__path {
    flex: none;
    font-style: normal;
  }
}
</style>
