<template>
  <div class="pir">
    <div class="pir__bar">
      <el-alert type="warning" :closable="false" show-icon class="pir__alert">
        <template slot="title">
          祖先的 <code>theme</code> 改成什么，只有<b>“拿到引用”或“拿到函数”</b>的那两个子组件会跟着变。
          点下面的按钮，看四张卡片里「渲染次数」谁在涨。
        </template>
      </el-alert>

      <div class="pir__acts">
        <el-button size="small" type="primary" @click="toggle">
          切主题：{{ theme }} → {{ theme === "light" ? "dark" : "light" }}
        </el-button>
        <span class="pir__state">
          祖先 theme = <b>{{ theme }}</b> · themeCtx.value =
          <b>{{ themeCtx.value }}</b>
        </span>
      </div>
    </div>

    <el-row :gutter="12">
      <el-col :span="24">
        <div class="pir__card">
          <div class="pir__card-hd">
            <span class="pir__tag pir__tag--bad">不更新</span>
            <b>A. 对象写法 + 常量</b>
          </div>
          <pre class="pir__code">{{ codeA }}</pre>
          <provider-object-form>
            <show-static />
          </provider-object-form>
          <p class="pir__why">
            对象字面量形式的 <code>provide</code> 在<b>模块作用域</b>求值，拿不到
            <code>this</code>，所以只能放常量 —— 天然不可能跟祖先的状态联动。
          </p>
        </div>
      </el-col>

      <el-col :span="24">
        <div class="pir__card">
          <div class="pir__card-hd">
            <span class="pir__tag pir__tag--bad">不更新</span>
            <b>B. 函数写法，但返回的是「值」</b>
          </div>
          <pre class="pir__code">{{ codeB }}</pre>
          <provider-value-form :theme="theme">
            <show-value />
          </provider-value-form>
          <p class="pir__why">
            最常见的坑。<code>provide()</code> 只在
            <b>initProvide 时调一次</b>，之后组件再刷新也不会重跑，
            后代拿到的是那一刻的<b>快照</b>。祖先自己的
            <code>props.theme</code> 已经是新值，子组件却还停在旧值。
          </p>
        </div>
      </el-col>

      <el-col :span="24">
        <div class="pir__card">
          <div class="pir__card-hd">
            <span class="pir__tag pir__tag--good">会更新</span>
            <b>C. provide 一个 data 里的容器对象</b>
          </div>
          <pre class="pir__code">{{ codeC }}</pre>
          <show-ctx />
          <p class="pir__why">
            容器 <code>themeCtx</code> 在 <code>data</code> 里 → 被 Vue 递归
            observe；后代模板读 <code>themeCtx.value</code> 时收集到的是
            <b>子组件自己的</b>渲染依赖，改字段就会重渲染。
            <b>推荐做法。</b>
          </p>
        </div>
      </el-col>

      <el-col :span="24">
        <div class="pir__card">
          <div class="pir__card-hd">
            <span class="pir__tag pir__tag--good">会更新</span>
            <b>D. provide 一个取值函数</b>
          </div>
          <pre class="pir__code">{{ codeD }}</pre>
          <show-getter />
          <p class="pir__why">
            注入的是函数本身（引用不变），真正的读取发生在后代的
            <code>computed</code> / 模板里 —— 依赖记在后代身上，所以响应。
            容器不好拆时用这招，代价是每次读都要调用一次。
          </p>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
/**
 * 页签②：provide 的响应式到底靠什么
 *
 * 四种写法并排跑，一眼看出「谁在更新、谁只是快照」。
 * 结论：provide 本身不建立响应式联系，靠的是「注入的引用指向被观察的对象」。
 */
import ProviderObjectForm from "./ProviderObjectForm.vue";
import ProviderValueForm from "./ProviderValueForm.vue";
import ShowStatic from "./ShowStatic.vue";
import ShowValue from "./ShowValue.vue";
import ShowCtx from "./ShowCtx.vue";
import ShowGetter from "./ShowGetter.vue";

export default {
  name: "ReactiveTab",

  components: {
    ProviderObjectForm,
    ProviderValueForm,
    ShowStatic,
    ShowValue,
    ShowCtx,
    ShowGetter,
  },

  data() {
    return {
      theme: "light",
      /** 给后代注入的容器：引用不变，改 value */
      themeCtx: { value: "light" },
      codeA: `// ProviderObjectForm.vue\nexport default {\n  provide: { themeStatic: "light" }\n  // 这里不能写 this —— 模块作用域\n}`,
      codeB: `// ProviderValueForm.vue\nexport default {\n  props: ["theme"],\n  provide() {\n    return { themeValue: this.theme }  // 只算一次\n  }\n}`,
      codeC: `// ReactiveTab.vue\nexport default {\n  data() { return { themeCtx: { value: "light" } } },\n  provide() {\n    return { themeCtx: this.themeCtx }  // 引用\n  }\n}`,
      codeD: `// ReactiveTab.vue\nexport default {\n  data() { return { theme: "light" } },\n  provide() {\n    return {\n      getTheme: () => this.theme  // 函数\n    }\n  }\n}`,
    };
  },

  provide() {
    // C、D 两种写法：一个给容器，一个给取值函数
    return {
      themeCtx: this.themeCtx,
      getTheme: () => this.theme,
    };
  },

  methods: {
    toggle() {
      this.theme = this.theme === "light" ? "dark" : "light";
      // C 用容器，所以要显式改字段；D 直接读 this.theme，已经变了
      this.themeCtx.value = this.theme;
    },
  },
};
</script>

<style lang="scss" scoped>
.pir {
  padding: 14px 16px;

  &__alert {
    margin-bottom: 10px;

    code {
      padding: 1px 4px;
      font-family: Menlo, Consolas, monospace;
      font-size: 11px;
      background: #fdf6ec;
      border-radius: 3px;
    }
  }

  &__acts {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  &__state {
    font-size: 12px;
    color: #909399;

    b {
      color: #326fff;
    }
  }

  &__card {
    height: calc(100% - 12px);
    margin-bottom: 12px;
    padding: 10px 12px;
    background: #fbfcff;
    border: 1px solid #ebeef5;
    border-radius: 6px;
  }

  &__card-hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #1f2d3d;
  }

  &__tag {
    padding: 1px 6px;
    font-size: 10px;
    border-radius: 3px;

    &--bad {
      color: #f56c6c;
      background: #fef0f0;
    }

    &--good {
      color: #2e9e4f;
      background: #f0faf3;
    }
  }

  &__code {
    margin: 0 0 8px;
    padding: 8px 10px;
    overflow: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 16px;
    color: #4a5568;
    background: #f4f6fb;
    border-radius: 4px;
  }

  &__why {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 19px;
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
