# css-in-js（简易实现，参考 emotion）

零依赖的迷你 CSS-in-JS：样式写在 JS 里，运行时注入到页面唯一的 `<style data-css-in-js>` 标签，
返回可直接绑给 `:class` 的类名。类名由 CSS 内容哈希生成（`cij-xxxx`），不会冲突、天然可缓存。

```
src/utils/css-in-js/
├── index.js      # 公共 API：css / cx / keyframes / injectGlobal
├── serialize.js  # 对象 / 模板 → CSS 文本（嵌套 &、@media、数值补 px）
├── sheet.js      # 样式标签注入与去重
└── README.md
```

## 快速开始

```js
import { css, cx, keyframes, injectGlobal } from "@/utils/css-in-js";
```

### ① 对象写法（推荐）

```js
const card = css({
  padding: 20, // 数字自动补 px
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 2px 12px rgba(0,0,0,.08)",
  "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,.12)" }, // 伪类
  "&.is-active": { borderColor: "#326fff" }, // 组合类
  ".title": { fontWeight: 600 }, // 后代选择器
  "@media (max-width: 768px)": { padding: 12 }, // 媒体查询
});
```

```html
<div :class="card">
  <p class="title">标题</p>
</div>
```

### ② 标签模板写法

```js
const gap = 8;
const row = css`
  display: flex;
  align-items: center;
  gap: ${gap}px;
  color: ${"#333"};
`;
```

### ③ 动态写法（样式跟随 props）

```js
// 整个是函数：返回 props => 类名
const btn = css((props) => ({
  padding: "6px 16px",
  border: "none",
  borderRadius: 4,
  background: props.primary ? "#326fff" : "#f5f7fa",
  color: props.primary ? "#fff" : "#333",
}));

// 插值是函数
const text = css`
  color: ${(p) => p.color};
  font-size: ${(p) => p.size}px;
`;
```

```js
// Vue 里配合 computed 自动响应式重算
computed: {
  btnClass() { return btn({ primary: this.type === 'primary' }) }
}
```

```html
<button :class="btnClass">确定</button>
```

> 同一组 props 只会注入一次样式；props 变化时算出新类名并复用已有规则。

### ④ 条件类名 cx

```js
const cls = cx(
  "base",
  css`
    margin-top: 8px;
  `,
  isActive &&
    css`
      color: #326fff;
    `,
  { "is-disabled": disabled }
);
```

### ⑤ 动画 keyframes

```js
const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});
const box = css({ animation: `${spin} 1s linear infinite` });
```

### ⑥ 全局样式 injectGlobal

```js
injectGlobal({
  ":root": { "--brand": "#326fff" },
  body: { margin: 0, fontFamily: "-apple-system, sans-serif" },
});
// 也支持模板：injectGlobal`*, *::before { box-sizing: border-box }`
```

## API

| API                 | 说明                                                         |
| ------------------- | ------------------------------------------------------------ |
| `css(...)`          | 生成类名；对象 / 模板 / 函数三种入参，可用逗号传多个对象合并 |
| `cx(...)`           | 合并类名，支持字符串、数组、`{ cls: bool }`                  |
| `keyframes(...)`    | 声明 `@keyframes`，返回动画名                                |
| `injectGlobal(...)` | 注入全局样式（键为选择器，或标签模板）                       |
| `css.reset()`       | 清空已注入样式（单测 / 换肤）                                |
| `css.getCssText()`  | 当前注入的全部 CSS（调试）                                   |
| `css.ruleCount()`   | 已注入规则条数                                               |

## 实现要点

- **类名 = 内容哈希**：`蓝图中选择器用占位符 @@self@@ → 算出类名 → 回填`，避免「类名依赖 CSS、CSS 又依赖类名」的循环；相同样式永远同一个类名。
- **单一 `<style>` 标签**：按 id 去重，用 `appendChild(Text)` 追加而不是重写 `textContent`，避免每次插入重新解析整张样式表。
- **插入顺序即优先级**：后注入的规则靠后，优先级更高（与 emotion 一致）。
- **数值补 px**：`zIndex / opacity / lineHeight / fontWeight / flex / order` 等无单位属性在白名单里，不补。
- **值数组**：`display: ['-webkit-box', 'flex']` 展开成多条同名声明，后者生效、前面作兜底（渐进增强）。
- **SSR / 单测安全**：`document` 不存在时只算类名不注入。

## 与 emotion 的差异

| 能力                                                  | 本实现                                     | emotion                 |
| ----------------------------------------------------- | ------------------------------------------ | ----------------------- |
| 对象 / 模板 / 函数三态                                | ✅                                         | ✅                      |
| 嵌套 `&`、`@media`、后代选择器                        | ✅                                         | ✅                      |
| 内容哈希去重类名                                      | ✅（djb2 短哈希）                          | ✅（murmur + 更长前缀） |
| `keyframes` / `injectGlobal` / `cx`                   | ✅                                         | ✅                      |
| 模板里写嵌套块（`&:hover{}`）                         | ❌ 模板仅支持声明 + 插值，嵌套请用对象写法 | ✅                      |
| `styled` 组件工厂、`css` prop、SSR 提取、前缀自动补全 | ❌                                         | ✅                      |

本项目已有 `@emotion/css` 依赖，两者可共存；本实现适合想少一个依赖、只需要「对象/函数 → 类名」这套核心能力的场景。

## 验证

- `npx eslint src/utils/css-in-js`
- 示例页：路由 `/emotion`（`src/views/EmotionDemo/index.vue`）
