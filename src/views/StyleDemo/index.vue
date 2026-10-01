<template>
  <div class="sty-demo">
    <h2>toStyle · 对象格式样式工具</h2>
    <p class="sty-demo__tip">
      源码：<code>src/utils/style.js</code> —— 传参 → 返回 Vue
      <code>:style</code> 需要的<strong>对象样式</strong>，顺手解决「数字补单位、空值过滤、
      简写拼字符串、kebab 转驼峰」四件麻烦事。 每节下方都打印了<strong>真实生成的对象</strong>。
    </p>

    <!-- ================= ① 基础：补单位 + 空值过滤 ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">
        ① 基础 · <code>toStyle({...})</code>：数字补 px、空值自动过滤
      </div>
      <div class="sty-demo__row">
        <div :style="basicStyle" class="sty-demo__box">我是被 toStyle 出来的盒子</div>
      </div>
      <pre class="sty-demo__code">{{ codeBasic }}</pre>
      <p class="sty-demo__tip sty-demo__tip--inline">
        <code>color: null</code> 与 <code>background: ''</code> 被丢弃；
        <code>lineHeight: 1.6</code> 属于无单位白名单，不补 px。
      </p>
    </el-card>

    <!-- ================= ② 简写数组 ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">
        ② 简写数组 · <code>margin: [12, 20]</code> → <code>'12px 20px'</code>
      </div>
      <div class="sty-demo__row">
        <div :style="shorthandStyle" class="sty-demo__box">padding / borderRadius / gap</div>
      </div>
      <pre class="sty-demo__code">{{ codeShorthand }}</pre>
      <p class="sty-demo__tip sty-demo__tip--inline">
        <code>margin / padding / inset / borderRadius / borderWidth / gap</code> 等简写属性
        的数组会拼成字符串；<strong>非简写属性</strong>的数组保留原样（Vue
        会按顺序设值做多值兜底）。
      </p>
    </el-card>

    <!-- ================= ③ kebab 键名 + CSS 变量 ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">
        ③ kebab 键名 &amp; CSS 变量 · <code>'font-size'</code> → <code>fontSize</code>，<code>--x</code> 原样保留
      </div>
      <div class="sty-demo__row">
        <div :style="kebabStyle" class="sty-demo__box sty-demo__box--var">
          CSS 变量取色 + kebab 键名
        </div>
      </div>
      <pre class="sty-demo__code">{{ codeKebab }}</pre>
    </el-card>

    <!-- ================= ④ 多组合并 · 条件样式 ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">
        ④ 多组合并 · <code>toStyle(base, cond &amp;&amp; {...})</code>：后者覆盖前者
      </div>
      <div class="sty-demo__row">
        <el-checkbox v-model="disabled">禁用</el-checkbox>
        <el-checkbox v-model="danger">危险色</el-checkbox>
        <div :style="mergedStyle" class="sty-demo__box">条件样式合并结果</div>
      </div>
      <pre class="sty-demo__code">{{ codeMerge }}</pre>
    </el-card>

    <!-- ================= ⑤ 函数形式 ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">
        ⑤ 函数形式 · <code>toStyle(props =&gt; ({...}))</code>：返回「props → 样式对象」，computed 里调用即响应
      </div>
      <div class="sty-demo__row">
        <el-radio-group v-model="theme" size="small">
          <el-radio-button label="primary">primary</el-radio-button>
          <el-radio-button label="default">default</el-radio-button>
          <el-radio-button label="danger">danger</el-radio-button>
        </el-radio-group>
        <el-slider v-model="size" :min="12" :max="24" class="sty-demo__slider"></el-slider>
        <div :style="btnStyle" class="sty-demo__box sty-demo__box--btn">按钮（{{ theme }} / {{ size }}px）</div>
      </div>
      <pre class="sty-demo__code">{{ codeFn }}</pre>
    </el-card>

    <!-- ================= ⑥ 自定义单位 / unitless ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">
        ⑥ 选项 · <code>{ unit, unitless, camelize }</code>（只在样式之外多传一个选项对象时生效）
      </div>
      <div class="sty-demo__row">
        <div :style="remStyle" class="sty-demo__box">unit: 'rem'，flexBasis 进 unitless 不补单位</div>
        <div :style="rawKeyStyle" class="sty-demo__box">camelize: false，键名保持 kebab</div>
      </div>
      <pre class="sty-demo__code">{{ codeOptions }}</pre>
    </el-card>

    <!-- ================= ⑦ 辅助函数 ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">
        ⑦ 辅助函数 · <code>toStyle.px(12)</code> / <code>toStyleValue('margin', [8, 16])</code>
      </div>
      <pre class="sty-demo__code">{{ codeHelper }}</pre>
      <p class="sty-demo__tip sty-demo__tip--inline">
        零散拼样式时可用；<code>!important</code> 写在值里（<code>'12px !important'</code>）会原样保留。
      </p>
    </el-card>

    <!-- ================= ⑧ 实时 playground ================= -->
    <el-card shadow="never" class="sty-demo__card">
      <div slot="header">⑧ 实时调参 · 改下面的参数，看盒子与生成的对象一起变</div>
      <div class="sty-demo__row sty-demo__row--form">
        <label class="sty-demo__field">
          宽度 <el-slider v-model="play.width" :min="80" :max="420" class="sty-demo__slider"></el-slider>
          <span class="sty-demo__val">{{ play.width }}px</span>
        </label>
        <label class="sty-demo__field">
          高度 <el-slider v-model="play.height" :min="40" :max="180" class="sty-demo__slider"></el-slider>
          <span class="sty-demo__val">{{ play.height }}px</span>
        </label>
        <label class="sty-demo__field">
          内边距 <el-slider v-model="play.pad" :min="0" :max="40" class="sty-demo__slider"></el-slider>
          <span class="sty-demo__val">{{ play.pad }}px</span>
        </label>
        <label class="sty-demo__field">
          圆角 <el-slider v-model="play.radius" :min="0" :max="40" class="sty-demo__slider"></el-slider>
          <span class="sty-demo__val">{{ play.radius }}px</span>
        </label>
        <label class="sty-demo__field sty-demo__field--switch">
          <el-switch v-model="play.disabled" active-text="禁用"></el-switch>
        </label>
        <label class="sty-demo__field sty-demo__field--switch">
          <el-switch v-model="play.danger" active-text="危险色"></el-switch>
        </label>
      </div>
      <div class="sty-demo__row sty-demo__row--center">
        <div :style="playStyle" class="sty-demo__box sty-demo__box--play">playground</div>
      </div>
      <pre class="sty-demo__code">{{ codePlay }}</pre>
    </el-card>
  </div>
</template>

<script>
import toStyle, { px, toStyleValue } from "@/utils/style";

const BRAND = "#326fff";

/* ---------- ⑤ 函数形式：模块作用域定义，computed 里调用 ---------- */
const TONES = {
  primary: { bg: BRAND, color: "#fff", border: BRAND },
  default: { bg: "#f5f7fa", color: "#606266", border: "#dcdfe6" },
  danger: { bg: "#ff3b3b", color: "#fff", border: "#ff3b3b" },
};
const btnStyleFn = toStyle((props) => {
  const tone = TONES[props.theme] || TONES.default;
  return {
    padding: [props.size / 2, props.size],
    fontSize: props.size,
    borderRadius: 4,
    border: "1px solid " + tone.border,
    background: tone.bg,
    color: tone.color,
    transition: "all .2s",
  };
});

const pretty = (obj) => JSON.stringify(obj, null, 2);

export default {
  name: "StyleDemo",
  data() {
    return {
      disabled: false,
      danger: false,
      theme: "primary",
      size: 16,
      play: {
        width: 260,
        height: 100,
        pad: 16,
        radius: 8,
        disabled: false,
        danger: false,
      },
    };
  },
  computed: {
    /* ---------- ① 基础 ---------- */
    basicStyle() {
      return toStyle({
        width: 260,
        height: 80,
        marginTop: 8,
        padding: 16,
        fontSize: 14,
        lineHeight: 1.6, // 无单位白名单，不补 px
        color: null, // 被过滤
        background: "", // 被过滤
      });
    },
    codeBasic() {
      return pretty(this.basicStyle);
    },

    /* ---------- ② 简写数组 ---------- */
    shorthandStyle() {
      return toStyle({
        padding: [8, 12, 8, 12],
        margin: [12, 20],
        borderRadius: 6,
        borderWidth: [1, 4],
        borderStyle: "solid",
        borderColor: "#436fff",
        lineHeight: 1.5,
      });
    },
    codeShorthand() {
      return pretty(this.shorthandStyle);
    },

    /* ---------- ③ kebab + CSS 变量 ---------- */
    kebabStyle() {
      return toStyle({
        "--sty-brand": BRAND,
        "--sty-bg": "#eef3ff",
        "font-size": 14,
        "font-weight": 600,
        background: "var(--sty-bg)",
        color: "var(--sty-brand)",
        borderRadius: 6,
        padding: "12px 16px",
      });
    },
    codeKebab() {
      return pretty(this.kebabStyle);
    },

    /* ---------- ④ 多组合并 ---------- */
    mergedStyle() {
      const base = {
        width: 260,
        height: 80,
        padding: 16,
        borderRadius: 6,
        border: "1px solid #ebeef5",
        background: "#fff",
        transition: "all .2s",
      };
      return toStyle(
        base,
        this.disabled && { opacity: 0.45, cursor: "not-allowed", background: "#f5f7fa" },
        this.danger && { borderColor: "#ff3b3b", color: "#ff3b3b" }
      );
    },
    codeMerge() {
      return (
        "toStyle(\n  base,\n  disabled && { opacity: .45, cursor: 'not-allowed' },\n  danger && { borderColor: '#ff3b3b', color: '#ff3b3b' }\n)\n\n// =>\n" +
        pretty(this.mergedStyle)
      );
    },

    /* ---------- ⑤ 函数形式（响应式） ---------- */
    btnStyle() {
      return btnStyleFn({ theme: this.theme, size: this.size });
    },
    codeFn() {
      return (
        "const btnStyleFn = toStyle(props => ({\n  padding: [props.size / 2, props.size],\n  fontSize: props.size,\n  background: props.theme === 'primary' ? '#326fff' : '#f5f7fa'\n}))\n\n// computed 里调用 → props 变化自动重算\nbtnStyle() { return btnStyleFn({ theme: this.theme, size: this.size }) }\n\n// => 当前\n" +
        pretty(this.btnStyle)
      );
    },

    /* ---------- ⑥ 选项 ---------- */
    remStyle() {
      return toStyle(
        { width: 14, height: 3, padding: 0.5, fontSize: 0.875, flexBasis: 2, zIndex: 10 },
        { unit: "rem", unitless: ["flexBasis"] }
      );
    },
    rawKeyStyle() {
      return toStyle(
        { "font-size": 14, "border-radius": 6, "font-weight": "600" },
        { camelize: false }
      );
    },
    codeOptions() {
      return (
        "// 数字补 rem；zIndex 在白名单里不补；flexBasis 追加进 unitless 也不补\ntoStyle({ width: 14, height: 3, fontSize: .875, flexBasis: 2, zIndex: 10 },\n  { unit: 'rem', unitless: ['flexBasis'] })\n=> " +
        JSON.stringify(this.remStyle) +
        "\n\n// camelize: false → 键名保持 kebab（Vue 同样支持）\ntoStyle({ 'font-size': 14, 'border-radius': 6 }, { camelize: false })\n=> " +
        JSON.stringify(this.rawKeyStyle)
      );
    },

    /* ---------- ⑦ 辅助函数 ---------- */
    codeHelper() {
      return (
        "toStyle.px(12)                 // => " +
        JSON.stringify(px(12)) +
        "\ntoStyle.px(0)                  // => " +
        JSON.stringify(px(0)) +
        "（0 不补单位）\ntoStyle.px(2, 'rem')           // => " +
        JSON.stringify(px(2, "rem")) +
        "\ntoStyleValue('margin', [8, 16])       // => " +
        JSON.stringify(toStyleValue("margin", [8, 16])) +
        "\ntoStyleValue('transition', ['a', 'b']) // => " +
        JSON.stringify(toStyleValue("transition", ["a", "b"])) +
        "（非简写保留数组）"
      );
    },

    /* ---------- ⑧ playground ---------- */
    playStyle() {
      const p = this.play;
      return toStyle(
        {
          width: p.width,
          height: p.height,
          margin: "0 auto",
          padding: [p.pad / 2, p.pad], // ← 数组 → '8px 16px'
          borderRadius: p.radius,
          border: "1px solid #ebeef5",
          background: "#fff",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
          transition: "all .2s",
          lineHeight: 1.5, // 白名单，不补 px
        },
        p.disabled && { opacity: 0.45, cursor: "not-allowed", background: "#f5f7fa" },
        p.danger && { borderColor: "#ff3b3b", color: "#ff3b3b" }
      );
    },
    codePlay() {
      const p = this.play;
      return (
        "toStyle(\n  {\n    width: " +
        p.width +
        ",\n    height: " +
        p.height +
        ",\n    padding: [" +
        p.pad / 2 +
        ", " +
        p.pad +
        "],\n    borderRadius: " +
        p.radius +
        ",\n    lineHeight: 1.5\n  },\n  disabled && { opacity: .45, cursor: 'not-allowed' },\n  danger && { borderColor: '#ff3b3b', color: '#ff3b3b' }\n)\n\n// => " +
        JSON.stringify(this.playStyle)
      );
    },
  },
};
</script>

<style scoped>
.sty-demo {
  padding: 24px;
  background: #f5f7fa;
  color: #000;
  font-size: 24px;
}
.sty-demo h2 {
  margin: 0 0 12px;
}
.sty-demo__tip {
  color: #000;
  font-size: 15px;
  margin: 8px 0 16px;
  line-height: 1.7;
}
.sty-demo__tip--inline {
  margin: 12px 0 0;
  font-size: 14px;
}
.sty-demo__tip code,
.sty-demo__card code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  color: #000;
}
.sty-demo__card {
  max-width: 980px;
  margin-bottom: 20px;
}
.sty-demo__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.sty-demo__row--form {
  align-items: stretch;
}
.sty-demo__row--center {
  justify-content: center;
}
.sty-demo__box {
  font-size: 14px;
  line-height: 1.5;
  color: #000;
  background: #fff;
  border: 1px dashed #c0c4cc;
  box-sizing: border-box;
}
.sty-demo__box--var {
  font-weight: 600;
}
.sty-demo__box--play {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sty-demo__field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #000;
  min-width: 230px;
}
.sty-demo__field--switch {
  min-width: 0;
}
.sty-demo__slider {
  width: 140px;
}
.sty-demo__val {
  width: 52px;
  color: #000;
}
.sty-demo__code {
  margin: 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: #000;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
