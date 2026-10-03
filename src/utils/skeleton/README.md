# 简易骨架屏（skeleton）

零依赖骨架屏方案：**运行时注入的微光样式** + **`v-skeleton` 指令** + **占位块辅助函数**。
不依赖 `vue.config.js` 的 `additionalData`，任何文件里 `import` 就能用。

```js
// main.js（已加）
import '@/utils/skeleton'
```

---

## 一、`v-skeleton` 指令 —— 给已有真实节点套骨架态

```html
<h3 v-skeleton="loading">真实标题</h3>
<p  v-skeleton="loading">真实正文……</p>

<!-- 带参数 -->
<div v-skeleton="{ loading, radius: 8, width: 200, tone: 'dark', animated: false }" />
```

开启时元素获得属性 `data-sk="on"`，效果：

| 处理 | 说明 |
| --- | --- |
| `color: transparent` | 文字变透明但**仍在文档流**，所以元素尺寸不变 → 不抖动 |
| `> * { visibility: hidden }` | 子元素（图标、图片、按钮）整体隐藏 |
| 灰底 + `::after` 微光 | 元素盒子变成骨架块 |
| `pointer-events: none` | 加载中不会误点里面的按钮 |

关闭时移除属性并还原内联样式。**一份 DOM 两态**，不用 v-if 维护两套结构。

指令值：

| 写法 | 含义 |
| --- | --- |
| `v-skeleton="loading"` | 布尔开关 |
| `v-skeleton="{ loading, ... }"` | 带参数；`loading: false` 即关闭 |
| `v-skeleton="false"` | 一直关闭（占位用） |

参数：`width` / `height` / `radius` / `animated`（默认 `true`）/ `tone: 'dark'` / `class`。

> ⚠️ 绑在**容器元素**上。绑到 `<img>`/`<video>` 这类「自身就是内容」的元素上无效（没有文字可以变透明），图片请用占位块 + `v-if/v-else`，或把指令绑到图片父容器上。

---

## 二、占位块原子 —— 手摆骨架结构

```js
import { sk, skLine, skCircle, skRect, skLines } from '@/utils/skeleton'
```

都返回 `{ class, style }`，直接 `v-bind` 即可（`v-bind="obj"` 会合并 class、绑定 style）：

```html
<div v-bind="skRect(120, 16)" />      <!-- 矩形：宽 120 高 16 -->
<div v-bind="skCircle(40)" />         <!-- 圆形：40×40，圆角 50% -->
<div v-bind="skLine('60%')" />        <!-- 一行文字：高 14、宽 60%、圆角 4 -->
<div v-bind="sk({ w: 88, h: 88, radius: 8, tone: 'dark' })" />

<!-- 段落：默认 3 行，末行自动收窄到 60% -->
<div v-for="(it, i) in skLines(3)" :key="i" v-bind="it" />
<div v-for="(it, i) in skLines(4, { gap: 10, height: 12, lastRatio: 0.4 })" :key="i" v-bind="it" />
```

`sk(options)` 全部选项：

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `w` / `width` | — | 宽，数字补 `px`（`0` 不补） |
| `h` / `height` | — | 高 |
| `radius` | 继承 `--sk-radius` | 圆角 |
| `circle` | `false` | 圆形（`border-radius: 50%`） |
| `animated` | `true` | 微光动画 |
| `tone` | — | `'dark'` 局部暗色 |
| `class` | — | 追加类名 |
| `style` | — | 追加内联样式（同 `toStyle` 规则，单位自动补） |

`skLines(count, options)` 额外支持 `gap`（行距，默认 12）、`lastRatio`（末行宽度比例，默认 0.6）。

---

## 三、预设结构 —— render 函数一把出整块骨架

`card` / `list` / `article` 三个预设，配合 `render` 或函数式组件：

```js
import { renderSkeleton } from '@/utils/skeleton'

export default {
  functional: true,
  props: { name: String, options: Object },
  render: (h, ctx) => renderSkeleton(h, ctx.props.name, ctx.props.options || {}),
}
```

```html
<skeleton-preset name="card" :options="{ lines: 2 }" />
<skeleton-preset name="list" :options="{ count: 3, avatarSize: 40 }" />
<skeleton-preset name="article" :options="{ lines: 6 }" />
```

| 预设 | 参数 |
| --- | --- |
| `card` | `coverHeight`(120) / `radius`(8) / `titleWidth`('55%') / `lines`(2) |
| `list` | `count`(3) / `avatarSize`(40) |
| `article` | `lines`(5) |

---

## 四、换肤

```js
import { setSkeletonTheme, clearSkeletonTheme } from '@/utils/skeleton'

setSkeletonTheme({ base: '#e6e8eb', highlight: '#fafbfc', duration: '1.2s' })
clearSkeletonTheme()
```

主题字段：`base`（底色）、`highlight`（微光高光）、`radius`、`duration`（微光周期）、`fadeDuration`（真实内容淡入时长）。

局部暗色不用改主题 —— 给任意祖先加 `class="sk--dark"`，靠 CSS 变量继承生效：

```html
<div class="sk--dark">
  <div v-bind="skLine('80%')" />
</div>
```

---

## 五、真实内容淡入

```html
<transition name="sk-fade" mode="out-in">
  <div v-if="loading" v-bind="skRect('100%', 120)" />
  <div v-else>真实内容</div>
</transition>
```

`.sk-fade-enter-active / .sk-fade-enter / .sk-fade-leave-active / .sk-fade-leave-to` 已随基础样式一起注入。

---

## 六、其它 API

| API | 说明 |
| --- | --- |
| `injectSkeletonStyle(theme?)` | 幂等注入基础样式（`sk*` 函数内部已自动调用） |
| `skeletonStyles(theme?)` | 纯函数，返回完整 CSS 文本（SSR / 单测） |
| `getSkeletonCss()` | 当前注入的 CSS 文本（调试） |
| `removeSkeletonStyle()` | 移除注入的 `<style>`（单测清理） |
| `getSkeletonStyleElement()` | 取注入的 `<style>` 元素 |
| `vSkeleton` | 指令定义对象（局部注册用） |
| `install` / 默认导出 | Vue 插件，`Vue.use(skeleton, { theme })` |
| `this.$skeleton` | 上述函数集合（安装后可用） |

---

## 七、注意

1. **无障碍**：样式内置 `@media (prefers-reduced-motion: reduce)`，系统开了「减少动态效果」时自动关掉微光。
2. **样式是运行时注入的**：`<style data-skeleton>`，首次用到时注入一次；类名与项目原有 CSS 无耦合（前缀 `sk`）。
3. **指令不要绑在 `img` 上**（见第一节注意事项）。
4. **入口约定**：`index.js` 在模块作用域直接 `install(Vue)`（与项目里公共组件入口一致），所以 `import '@/utils/skeleton'` 之后就全局可用 `v-skeleton`，不依赖 `window.Vue`。

---

示例页：`src/views/SkeletonDemo/index.vue`，路由 `/skeleton-demo`。
