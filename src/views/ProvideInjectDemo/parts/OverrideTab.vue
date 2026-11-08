<template>
  <div class="pio">
    <el-row :gutter="12">
      <el-col :span="13">
        <el-card shadow="never" class="pio__card">
          <div slot="header" class="pio__hd">
            <span class="pio__title">就近原则 + 逐 key 覆盖</span>
            <code class="pio__sig">中间层只覆盖 themeLabel</code>
          </div>

          <div class="pio__bar">
            <el-button size="mini" @click="rootLabel = rootLabel + '·'">
              改根的 themeLabel（{{ rootLabel }}，没效果）
            </el-button>
            <el-button size="mini" type="primary" @click="cfg.apiBase = cfg.apiBase === '/api/v1' ? '/api/v2' : '/api/v1'">
              改根 cfg.apiBase（{{ cfg.apiBase }}）
            </el-button>
          </div>

          <override-mid>
            <override-leaf />
          </override-mid>

          <p class="pio__why">
            <b>themeLabel</b>：两层都提供了，后代取<b>最近的一层</b>，所以根上怎么改都看不到 ——
            覆盖是「离得近的赢」（另外 <code>provide()</code> 只算一次，给的是快照，
            两个原因叠在一起，这个按钮注定无效）。<br />
            <b>cfg</b>：中间层没提供这个 key，于是继续往上找到根；
            根上改 <code>cfg.apiBase</code> 后代立刻跟着变（容器引用没变）。<br />
            结论：解析是<b>逐个 key、逐层往上找</b>的，不是「整包替换」。
          </p>
        </el-card>
      </el-col>

      <el-col :span="11">
        <el-card shadow="never" class="pio__card">
          <div slot="header" class="pio__hd">
            <span class="pio__title">default 的两个坑</span>
            <code class="pio__sig">对象默认值必须写成工厂</code>
          </div>

          <div class="pio__block">
            <div class="pio__block-hd">
              <b>① 对象默认值</b>
              <el-tag size="mini" :type="literalShared ? 'danger' : 'success'">
                {{ literalShared ? "两个实例共用同一对象" : "各拿各的" }}
              </el-tag>
            </div>
            <div class="pio__pair">
              <default-shared label="对象默认值 A" @instance="onLiteral" />
              <default-shared label="对象默认值 B" @instance="onLiteral" />
            </div>
            <pre class="pio__code">inject: { opts: { default: { tags: [] } } }   // 共享
inject: { opts: { default: () => ({ tags: [] }) } } // 独立</pre>
          </div>

          <div class="pio__block">
            <div class="pio__block-hd">
              <b>② 工厂默认值（正确写法）</b>
              <el-tag size="mini" :type="factoryShared ? 'danger' : 'success'">
                {{ factoryShared ? "两个实例共用同一对象" : "各拿各的" }}
              </el-tag>
            </div>
            <div class="pio__pair">
              <default-ok label="工厂默认值 A" @instance="onFactory" />
              <default-ok label="工厂默认值 B" @instance="onFactory" />
            </div>
          </div>

          <div class="pio__block">
            <div class="pio__block-hd">
              <b>③ 不写 default 且找不到 provider</b>
              <el-switch v-model="showMissing" active-text="挂上" />
            </div>
            <missing-inject v-if="showMissing" />
            <p v-else class="pio__why">
              点右上开关挂上去，DevTools console 会出一条
              <code>[Vue warn] injection "notExists" not found</code>，
              组件里拿到的值是 <code>undefined</code>。生产构建里这条 warn 会消失，
              但值一样是 undefined —— 所以 default 不能省。
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
/**
 * 页签③：覆盖规则 + inject default 的两个坑
 *
 * 三个都是「代码看着没问题、上线才炸」的类型：
 *   1. 以为中间层提供了就会整体替换（其实是逐 key 就近）
 *   2. 对象默认值不写成工厂 → 所有实例共用一个对象（改一个全变）
 *   3. 不写 default → 组件被复用到别处，静默 undefined
 */
import OverrideMid from "./OverrideMid.vue";
import OverrideLeaf from "./OverrideLeaf.vue";
import DefaultOk from "./DefaultOk.vue";
import DefaultShared from "./DefaultShared.vue";
import MissingInject from "./MissingInject.vue";

export default {
  name: "OverrideTab",

  components: {
    OverrideMid,
    OverrideLeaf,
    DefaultOk,
    DefaultShared,
    MissingInject,
  },

  data() {
    return {
      rootLabel: "根 provider",
      cfg: { apiBase: "/api/v1", retry: 2 },
      showMissing: false,
      /** 两两比较：同一个 default 对象被两个实例拿到 → 共享 */
      literalRefs: [],
      factoryRefs: [],
    };
  },

  provide() {
    return {
      themeLabel: this.rootLabel,
      cfg: this.cfg,
    };
  },

  computed: {
    literalShared() {
      return this.literalRefs.length === 2 && this.literalRefs[0] === this.literalRefs[1];
    },
    factoryShared() {
      return this.factoryRefs.length === 2 && this.factoryRefs[0] === this.factoryRefs[1];
    },
  },

  methods: {
    onLiteral(opts) {
      // 不去重！两个实例若拿到同一个引用，这个数组里就是同一个对象的两份引用，
      // 用 length === 2 && [0] === [1] 才能判出「共享」。
      this.literalRefs.push(opts);
    },
    onFactory(opts) {
      this.factoryRefs.push(opts);
    },
  },
};
</script>

<style lang="scss" scoped>
.pio {
  padding: 14px 16px;

  &__card {
    height: calc(100% - 2px);
    border-radius: 6px;
  }

  &__hd {
    display: flex;
    align-items: baseline;
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

  &__bar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;

    .el-button + .el-button {
      margin-left: 0;
    }
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

  &__block {
    margin-bottom: 14px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__block-hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #303133;
  }

  &__pair {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__code {
    margin: 8px 0 0;
    padding: 6px 9px;
    overflow: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 10px;
    line-height: 16px;
    color: #4a5568;
    background: #f4f6fb;
    border-radius: 4px;
  }
}
</style>
