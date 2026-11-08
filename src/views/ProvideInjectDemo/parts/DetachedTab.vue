<template>
  <div class="pidt">
    <el-alert type="warning" :closable="false" show-icon class="pidt__alert">
      <template slot="title">
        inject 查找只沿 <code>$parent</code> 链往上走。所以「自己 new 出来的实例」——
        函数式弹窗宿主、<code>new Vue()</code> 挂到 body 的浮层、图表库内部 new 的组件——
        全都<b>拿不到</b>祖先 provide 的东西。<code>append-to-body</code> 只搬 DOM，不接组件树。
      </template>
    </el-alert>

    <div class="pidt__bar">
      <el-button size="mini" type="primary" @click="mount('bare')">
        自己 new，不传 parent（会失败）
      </el-button>
      <el-button size="mini" @click="mount('parent')">
        传 parent: this
      </el-button>
      <el-button size="mini" @click="mount('provider')">
        包一层 provider 再挂
      </el-button>
      <el-button size="mini" :disabled="!mounted.length" @click="clear">
        清掉这些实例（{{ mounted.length }}）
      </el-button>
    </div>

    <div class="pidt__live">
      <div class="pidt__live-hd">
        在组件树里（正常）：<code>&lt;detached-child /&gt;</code>
      </div>
      <detached-child label="在组件树里" />
    </div>

    <div ref="dock" class="pidt__dock">
      <div class="pidt__dock-hd" :class="{ 'is-empty': !mounted.length }">
        {{ mounted.length ? "手动挂载的实例（在页面上，但不在组件树上）" : "手动挂载的实例会出现在这里" }}
      </div>
    </div>

    <el-table :data="rows" size="mini" border class="pidt__table" empty-text="还没试过">
      <el-table-column prop="at" label="时间" width="86" />
      <el-table-column prop="modeText" label="挂载方式" min-width="180" />
      <el-table-column label="inject 到的 ctx" min-width="140">
        <template slot-scope="{ row }">
          <el-tag size="mini" :type="row.ok ? 'success' : 'danger'">
            {{ row.ctx }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="$parent" width="90" align="center">
        <template slot-scope="{ row }">
          {{ row.hasParent ? "有" : "空" }}
        </template>
      </el-table-column>
      <el-table-column prop="verdict" label="结论" min-width="130" />
    </el-table>

    <p class="pidt__why">
      <code>inject</code> 是<b>一次性</b>解析的：解析时链断了就永远拿不到。
      实战里三条修法按推荐度排：<b>①</b> 模块单例（<code>import ctx from '@/xxx'</code>，最稳）；
      <b>②</b> 给宿主实例 <code>parent: this</code>（本项目 openLayer 修 <code>$store</code> 就是这条路）；
      <b>③</b> 让宿主自己当 provider，给它的子树提供。
      <br />
      ⚠️ 但<b>不能</b>给同一个实例传 <code>provide</code> 就指望它自己 inject 到 ——
      Vue 的顺序是 <code>initInjections → initState → initProvide</code>，注入在 provide 之前，
      自己提供的东西自己取不到。所以第三个按钮是「包一层 provider」而不是「自己带 provide」。
    </p>
  </div>
</template>

<script>
/**
 * 页签④：脱离组件树的实例为什么 inject 不到
 *
 * 404 的现场就是这条：openLayer 里 `new (Vue.extend(DialogHost))()` 是独立根实例，
 * $parent 为空 → 祖先 chain 断在这里 → 弹窗里的组件 inject 不到页面的 provide，
 * $store 也是一样（Vuex 的 beforeCreate mixin 走的就是 parent.$store）。
 */
import Vue from "vue";
import DetachedChild from "./DetachedChild.vue";

export default {
  name: "DetachedTab",

  components: { DetachedChild },

  data() {
    return {
      ctx: { owner: "DetachedTab", createdAt: "" },
      rows: [],
      /** 手动挂载、需要自己销毁的实例 */
      mounted: [],
      seq: 0,
    };
  },

  provide() {
    return { ctx: this.ctx };
  },

  created() {
    this.ctx.createdAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  },

  beforeDestroy() {
    this.clear();
  },

  methods: {
    mount(mode) {
      const Ctor = Vue.extend(DetachedChild);
      const label =
        mode === "bare"
          ? "裸 new 出来的"
          : mode === "parent"
          ? "认了父的"
          : "包在 provider 里的";

      /** 挂到页面上的实例（要自己销毁） */
      let hostVm;
      /** 真正执行 inject 的那个组件 */
      let probeVm;
      let modeText;

      if (mode === "provider") {
        /**
         * 注意：不能「给自己的实例传 provide，指望它自己 inject 到」。
         * Vue 的初始化顺序是 initInjections → initState → initProvide，
         * 注入发生在 provide 之前，自己提供的东西自己取不到。
         * 正确姿势：让它当 provider，给**它下面的子树**提供。
         */
        hostVm = new Vue({
          provide: { ctx: this.ctx },
          render: (h) => h(Ctor, { props: { label } }),
        });
        hostVm.$mount();
        probeVm = hostVm.$children[0];
        modeText = "new Vue({ provide, render: h => h(Child) })";
      } else {
        const opts = { propsData: { label } };
        if (mode === "parent") {
          // 关键：把宿主实例挂到页面 vm 下，inject / $store 才有链可走
          opts.parent = this;
        }
        hostVm = new Ctor(opts);
        hostVm.$mount(); // 不带 el：渲染成游离节点
        probeVm = hostVm;
        modeText =
          mode === "bare"
            ? "new Ctor() 无 parent / 无 provide"
            : "new Ctor({ parent: this })";
      }

      this.$refs.dock.appendChild(hostVm.$el);
      this.mounted.push(hostVm);

      const ok = !!(probeVm && probeVm.ctx);
      this.rows.unshift({
        at: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
        modeText,
        ok,
        ctx: ok ? probeVm.ctx.owner : "undefined",
        hasParent: !!(probeVm && probeVm.$parent),
        verdict: ok ? "拿到了（链通了）" : "拿不到（链断了）",
      });
    },

    clear() {
      this.mounted.forEach((vm) => {
        const el = vm.$el;
        vm.$destroy();
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      this.mounted = [];
      this.rows = [];
    },
  },
};
</script>

<style lang="scss" scoped>
.pidt {
  padding: 14px 16px;

  &__alert {
    margin-bottom: 12px;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      background: #fdf6ec;
      border-radius: 3px;
    }
  }

  &__bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__live {
    margin-bottom: 10px;
    padding: 10px 12px;
    background: #f7f9fc;
    border: 1px dashed #c6d4f2;
    border-radius: 6px;

    code {
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      color: #2e9e4f;
    }
  }

  &__live-hd {
    margin-bottom: 8px;
    font-size: 11px;
    color: #5c6b8a;
  }

  &__dock {
    min-height: 54px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fffdf7;
    border: 1px dashed #f0d9a8;
    border-radius: 6px;

    &:empty {
      display: none;
    }
  }

  &__dock-hd {
    margin-bottom: 6px;
    font-size: 11px;
    color: #b88230;

    &.is-empty {
      margin-bottom: 0;
      color: #c0c4cc;
    }
  }

  &__table {
    font-size: 12px;
  }

  &__why {
    margin: 10px 0 0;
    font-size: 11px;
    line-height: 19px;
    color: #909399;

    b {
      color: #606266;
    }

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      color: #5c6b8a;
      background: #f4f6fb;
      border-radius: 3px;
    }
  }
}
</style>
