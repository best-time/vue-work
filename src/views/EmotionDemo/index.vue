<template>
  <div class="cij-demo" style="color: #000; font-size: 24px;">
    <h2>css-in-js 简易实现（参考 emotion）</h2>
    <p class="cij-demo__tip">
      零依赖实现：<code>src/utils/css-in-js/</code>，样式写在 JS 里 → 运行时注入
      <code>&lt;style data-css-in-js&gt;</code> → 返回哈希类名绑给
      <code>:class</code>。 页面上可直接看到注入的规则：<code
        >css.getCssText()</code
      >
    </p>

    <!-- ================= ① 对象写法 ================= -->
    <el-card shadow="never" class="cij-demo__card">
      <div slot="header">
        ① 对象写法 · <code>css({ ... })</code>：驼峰属性 / 数字补 px / 嵌套
        <code>&amp;</code> / <code>@media</code>
      </div>
      <div class="cij-demo__row">
        <div :class="[cardClass]" class="cij-demo__box">
          <p :class="titleClass">卡片标题</p>
          <p :class="descClass">
            hover 看阴影变化，窗口缩到 768px 以下 padding 变小。
          </p>
        </div>
      </div>
      <pre class="cij-demo__code">{{ codeObject }}</pre>
    </el-card>

    <!-- ================= ② 模板写法 ================= -->
    <el-card shadow="never" class="cij-demo__card">
      <div slot="header">
        ② 标签模板写法 · <code>css`...`</code>：直接写 CSS，可插变量
      </div>
      <div class="cij-demo__row">
        <div :class="rowClass">
          <span :class="chipClass">chip A</span>
          <span :class="chipClass">chip B</span>
          <span :class="chipClass">chip C</span>
        </div>
      </div>
      <pre class="cij-demo__code">{{ codeTemplate }}</pre>
    </el-card>

    <!-- ================= ③ 动态写法 ================= -->
    <el-card shadow="never" class="cij-demo__card">
      <div slot="header">
        ③ 动态写法 · <code>css(props =&gt; ({...}))</code>：样式跟随 props，
        computed 里调用即自动响应
      </div>
      <div class="cij-demo__row">
        <el-radio-group v-model="theme" size="small">
          <el-radio-button label="primary">primary</el-radio-button>
          <el-radio-button label="default">default</el-radio-button>
          <el-radio-button label="danger">danger</el-radio-button>
        </el-radio-group>
        <el-slider
          v-model="size"
          :min="12"
          :max="22"
          style="width: 160px; margin: 0 12px"
        ></el-slider>
        <button :class="btnClass">按钮（{{ theme }} / {{ size }}px）</button>
      </div>
      <pre class="cij-demo__code">{{ codeDynamic }}</pre>
      <p class="cij-demo__tip">
        换个主题/字号会生成新的哈希类名；同一组 props
        只注入一次（当前注入规则数：{{ ruleCount }}）
      </p>
    </el-card>

    <!-- ================= ④ 动画 keyframes ================= -->
    <el-card shadow="never" class="cij-demo__card">
      <div slot="header">④ 动画 · <code>keyframes({...})</code> 生成动画名</div>
      <div class="cij-demo__row">
        <div :class="spinnerClass"></div>
        <span :class="pulseTextClass">pulse 文字</span>
      </div>
      <pre class="cij-demo__code">{{ codeKeyframes }}</pre>
    </el-card>

    <!-- ================= ⑤ 条件类名 cx ================= -->
    <el-card shadow="never" class="cij-demo__card">
      <div slot="header">
        ⑤ 条件类名 · <code>cx(...)</code>：字符串 / 数组 /
        <code>{ cls: bool }</code>
      </div>
      <div class="cij-demo__row">
        <el-checkbox v-model="checked">选中状态</el-checkbox>
        <el-checkbox v-model="disabled">禁用状态</el-checkbox>
        <button
          :class="
            cx('cij-demo__btn', checked && checkedClass, {
              'is-disabled': disabled,
            })
          "
        >
          合并后的按钮
        </button>
      </div>
      <pre class="cij-demo__code">{{ codeCx }}</pre>
    </el-card>

    <!-- ================= ⑥ 注入结果 ================= -->
    <el-card shadow="never" class="cij-demo__card">
      <div slot="header">
        ⑥ 注入结果 · 页面上真实的 <code>&lt;style data-css-in-js&gt;</code>（前
        12 条）
      </div>
      <pre class="cij-demo__code cij-demo__code--scroll">{{ injectedCss }}</pre>
    </el-card>
  </div>
</template>

<script>
import { css, cx, keyframes } from "@/utils/css-in-js";
console.log(111)
/* ---------- ① 对象写法（模块作用域定义，只算一次） ---------- */
const cardClass = css({
  padding: 20,
  background: "#fff",
  borderRadius: 8,
  border: "1px solid #ebeef5",
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
  transition: "box-shadow .2s",
  "&:hover": {
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.14)",
  },
  "@media (max-width: 768px)": {
    padding: 12,
  },
});
const titleClass = css({
  fontSize: 16,
  fontWeight: 600,
  color: "#303133",
  margin: "0 0 8px",
});
const descClass = css({
  fontSize: 13,
  lineHeight: 1.6,
  color: "#333",
  margin: 0,
});

/* ---------- ② 标签模板写法 ---------- */
const GAP = 8;
const BRAND = "#326fff";
const rowClass = css`
  display: flex;
  align-items: center;
  gap: ${GAP}px;
`;
const chipClass = css`
  padding: 4px 12px;
  border-radius: 999px;
  background: ${BRAND}1a;
  color: ${BRAND};
  font-size: 16px;
`;

/* ---------- ③ 动态写法：props → 类名 ---------- */
const BTN_COLORS = {
  primary: { bg: BRAND, color: "#fff", border: BRAND },
  default: { bg: "#f5f7fa", color: "#606266", border: "#dcdfe6" },
  danger: { bg: "#ff3b3b", color: "#fff", border: "#ff3b3b" },
};

const btnClassFn = css((props) => {
  const tone = BTN_COLORS[props.theme] || BTN_COLORS.default;
  return {
    padding: `${props.size / 2}px ${props.size}px`,
    fontSize: props.size,
    borderRadius: 4,
    border: `1px solid ${tone.border}`,
    background: tone.bg,
    color: tone.color,
    cursor: "pointer",
    transition: "all .2s",
    "&:hover": { opacity: 0.86 },
  };
});

/* ---------- ④ keyframes ---------- */
const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});
const pulse = keyframes`
  0% { opacity: .35 }
  50% { opacity: 1 }
  100% { opacity: .35 }
`;
const spinnerClass = css({
  width: 28,
  height: 28,
  border: "3px solid #e4e7ed",
  borderTopColor: BRAND,
  borderRadius: "50%",
  animation: `${spin} 1s linear infinite`,
});

const pulseTextClass = css({
  fontSize: 14,
  fontWeight: 600,
  color: BRAND,
  animation: `${pulse} 1.6s ease-in-out infinite`,
});

/* ---------- ⑤ cx ---------- */
const checkedClass = css({ outline: "2px solid #326fff", outlineOffset: 1 });

export default {
  name: "EmotionDemo",
  data() {
    return {
      theme: "primary",
      size: 16,
      checked: true,
      disabled: false,
      ruleCount: 0,
    };
  },
  computed: {
    cardClass: () => cardClass,
    titleClass: () => titleClass,
    descClass: () => descClass,
    rowClass: () => rowClass,
    chipClass: () => chipClass,
    spinnerClass: () => spinnerClass,
    pulseTextClass: () => pulseTextClass,
    checkedClass: () => checkedClass,
    /** 动态样式在 computed 里调用 → 主题/字号变化自动重算类名 */
    btnClass() {
      return btnClassFn({ theme: this.theme, size: this.size });
    },
    injectedCss() {
      const rules = css.getCssText().split("\n").filter(Boolean);
      return rules.slice(0, 12).join("\n") + (rules.length > 12 ? "\n…" : "");
    },
    codeObject() {
      return `const card = css({
  padding: 20,                    // 数字自动补 px
  borderRadius: 8,
  '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,.14)' },
  '@media (max-width: 768px)': { padding: 12 }
})
<div :class="card">`;
    },
    codeTemplate() {
      return (
        "const row = css`\n  display: flex;\n  gap: " +
        GAP +
        "px;\n`\nconst chip = css`\n  color: " +
        BRAND +
        ";\n`"
      );
    },
    codeDynamic() {
      return `const btn = css(props => ({
  background: props.theme === 'primary' ? '#326fff' : '#f5f7fa',
  fontSize: props.size
}))

// computed 里调用 → 响应式重算
btnClass() { return btn({ theme: this.theme, size: this.size }) }`;
    },
    codeKeyframes() {
      return `const spin = keyframes({ from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } })
const spinner = css({ animation: \`\${spin} 1s linear infinite\` })`;
    },
    codeCx() {
      return "cx('cij-demo__btn', checked && checkedClass, { 'is-disabled': disabled })";
    },
  },
  mounted() {
    this.ruleCount = css.ruleCount();
  },
  updated() {
    this.ruleCount = css.ruleCount();
  },
  methods: {
    /** 模板里使用 cx（导入的绑定在模板中不可见） */
    cx
  },
};
</script>

<style scoped>
.cij-demo {
  padding: 24px;
  background: #f5f7fa;
}
.cij-demo__tip {
  color: #909399;
  font-size: 16px;
  margin: 8px 0 16px;
}
.cij-demo__tip code,
.cij-demo__card code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
}
.cij-demo__card {
  max-width: 980px;
  margin-bottom: 20px;
}
.cij-demo__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.cij-demo__box {
  width: 100%;
}
.cij-demo__code {
  margin: 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
}
.cij-demo__code--scroll {
  max-height: 220px;
  overflow: auto;
}
.cij-demo__btn {
  padding: 6px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.cij-demo__btn.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
