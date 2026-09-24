# GridBox 栅格布局（props 驱动 · 无响应式）

基于 **CSS Grid** 的公共布局组件。和同目录下的 `GridLayout`（响应式版）是**两套独立的实现**：

|          | **GridBox**（本组件）            | GridLayout（`components/GridLayout`）  |
| -------- | -------------------------------- | -------------------------------------- |
| 列数     | props 写死：`cols="4"`           | 支持 `{ xs, sm, md, lg, xl }` 断点对象 |
| 实现方式 | 全部算成**内联 style**           | 按需生成带 `@media` 的 CSS 规则        |
| 窗口缩放 | **完全不变**，不监听 resize      | 自动重排                               |
| 额外文件 | 无（不需要样式表）               | `styles.js` 动态样式表                 |
| 标签     | `<grid-box>` / `<grid-box-item>` | `<grid>` / `<grid-item>`               |

需要「窗口变窄自动换列」用 GridLayout；需要「列数由业务 props 精确控制、行为完全可预期」用 GridBox。

## 目录

| 文件                  | 说明                                                       |
| --------------------- | ---------------------------------------------------------- |
| `index.js`            | 入口：注册全局 `<grid-box>` / `<grid-box-item>`            |
| `GridBox.vue`         | 容器组件                                                   |
| `GridBoxItem.vue`     | 子项组件                                                   |
| `utils.js`            | 值归一化 + `grid-template-columns` 拼装（纯函数，可单测）  |
| `GridBoxDemoPage.vue` | 示例页（路由 `/grid-box`），9 个场景 + 实时调参 playground |

## 快速上手

`main.js` 里已注册（`import '@/components/GridBox'`），模板直接用：

```html
<grid-box :cols="3" :gap="12" min-col-width="240" max-col-width="360">
  <grid-box-item>卡片 1</grid-box-item>
  <grid-box-item>卡片 2</grid-box-item>
  <grid-box-item span="2">占两列</grid-box-item>
</grid-box>
```

## GridBox 属性

| 属性                        | 类型                    | 默认                   | 说明                                                                                                                                                                       |
| --------------------------- | ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cols`                      | Number / String         | `3`                    | 列数。数字＝固定列数；`'auto'`＝`auto-fit`（由列宽反推列数，空轨道折叠）；`'auto-fill'`＝保留空轨道；其它字符串＝直接当 `grid-template-columns` 用（如 `'200px 1fr 1fr'`） |
| `min-col-width`             | Number / String         | —                      | 每列**最小**宽度 → `minmax(min, …)`，不传 = `0`（列可被压扁，不溢出）                                                                                                      |
| `max-col-width`             | Number / String         | —                      | 每列**最大**宽度 → `minmax(…, max)`，不传 = `1fr`（平分剩余宽度）。给了它列就不再拉伸，可配 `justify-content`                                                              |
| `gap`                       | Number / String / Array | `16`                   | 间距，支持 `[行间距, 列间距]`                                                                                                                                              |
| `row-gap` / `col-gap`       | Number / String         | —                      | 单独指定，优先级高于 `gap`                                                                                                                                                 |
| `width`                     | Number / String         | —                      | 容器固定宽度                                                                                                                                                               |
| `min-width`                 | Number / String         | —                      | 容器最小宽度                                                                                                                                                               |
| `max-width`                 | Number / String         | —                      | 容器最大宽度（常配 `center` 做限宽居中）                                                                                                                                   |
| `center`                    | Boolean                 | `false`                | 容器水平居中（`margin: 0 auto`）                                                                                                                                           |
| `align`                     | String                  | `'stretch'`            | `align-items`（子项纵向对齐，默认拉伸等高）                                                                                                                                |
| `justify`                   | String                  | `'stretch'`            | `justify-items`（子项横向对齐）                                                                                                                                            |
| `align-content`             | String                  | —                      | `align-content`（多行整体纵向分布）                                                                                                                                        |
| `justify-content`           | String                  | —                      | `justify-content`（多列整体横向分布，配 `max-col-width` 用）                                                                                                               |
| `auto-rows`                 | Number / String         | —                      | `grid-auto-rows`，如 `72` / `'1fr'`                                                                                                                                        |
| `dense`                     | Boolean                 | `false`                | `grid-auto-flow: row dense`，小格子回填空洞                                                                                                                                |
| `tag`                       | String                  | `'div'`                | 渲染标签                                                                                                                                                                   |
| `items`                     | Array                   | —                      | **数据模式**：给数组即自动铺子项（配默认作用域插槽 `{ item, index }`）                                                                                                     |
| `span-key` / `row-span-key` | String                  | `'span'` / `'rowSpan'` | 数据模式下取跨列/跨行数的字段名                                                                                                                                            |
| `item-key`                  | String / Function       | `'id'`                 | 数据模式的 key，字段名或 `(item, index) => key`                                                                                                                            |
| `empty-text`                | String                  | `'暂无数据'`           | 数据模式为空时的文案，也可用 `#empty` 插槽自定义                                                                                                                           |

数字型 props 自动补 `px`（`gap="16"` / `gap="12px"` / `gap="1rem"` 都行）。`class` / `style` / `$attrs` / `$listeners` 会合并/透传到容器根元素。

## GridBoxItem 属性

| 属性                      | 类型            | 说明                                                                                     |
| ------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `span`                    | Number / String | 跨列：`2` → `grid-column: span 2`；`'full'` → `1 / -1`（占满整行）；`'2 / 4'` → 原样透传 |
| `row-span`                | Number / String | 跨行：`2` → `grid-row: span 2`；`'2 / 4'` 原样透传                                       |
| `start` / `row-start`     | Number / String | 起始列 / 起始行，比 span 的隐式起点优先级更高                                            |
| `align` / `justify`       | String          | `align-self` / `justify-self`，覆盖容器设置                                              |
| `order`                   | Number / String | CSS `order`，数值越小越靠前                                                              |
| `min-width` / `max-width` | Number / String | 单独覆盖这一格的宽度约束（默认 `min-width: 0`）                                          |
| `tag`                     | String          | 渲染标签，默认 `'div'`                                                                   |

> 子项默认 `min-width: 0`：CSS Grid 子项默认 `min-width: auto`，会被长英文 / 表格 / 长数字撑破列宽，归零后才能老实按列宽收缩。

## 常见写法

```html
<!-- 固定列数 -->
<grid-box :cols="4" :gap="12"> … </grid-box>

<!-- 列宽 120~200 之间弹性伸缩 -->
<grid-box :cols="4" gap="12" min-col-width="120" max-col-width="200">
  …
</grid-box>

<!-- 列宽固定 180，整组居中；容器不够时换行由 auto-fit 决定 -->
<grid-box
  cols="auto"
  gap="12"
  min-col-width="180"
  max-col-width="180"
  justify-content="center"
>
  …
</grid-box>

<!-- 限宽居中 -->
<grid-box :cols="3" gap="12" max-width="720" center> … </grid-box>

<!-- 表单（行间距 0、列间距 16） -->
<grid-box :cols="3" :gap="[0, 16]"> … </grid-box>

<!-- 数据驱动 -->
<grid-box :items="list" :cols="3" :gap="12">
  <template #default="{ item }"> <div>{{ item.name }}</div> </template>
  <template #empty> 没有数据 </template>
</grid-box>
```

## 实现说明

- 布局全靠 CSS Grid，尺寸/间距/对齐**全部写在内联 style 上**（`utils.js` 的纯函数算出值），运行时零 DOM 操作、零 resize 监听、零全局 CSS 注入。
- `cols` 数字 → `repeat(n, minmax(minColWidth || 0, maxColWidth || 1fr))`；`'auto'` → `repeat(auto-fit, …)`。
- 想单独调试取值，可直接用工具函数：

```js
import {
  buildTemplateColumns,
  spanValue,
  toUnit,
} from "@/components/GridBox/utils";

buildTemplateColumns(4, 120, 200, 3); // 'repeat(4, minmax(120px, 200px))'
buildTemplateColumns("auto", 240, null, 3); // 'repeat(auto-fit, minmax(240px, 1fr))'
spanValue("full"); // '1 / -1'
toUnit("16"); // '16px'
```

## 验证

- `npx eslint src/components/GridBox` 通过。
- jsdom 真实挂载断言（列数/最小最大列宽/passthrough/容器宽度/间距/子项定位/数据模式，以及「不注入动态样式表、不监听 resize」两个承诺）：13/13 通过。
- 无头 Chrome（CDP）实测真实布局像素（轨道宽度、minmax 上下限、justify-content 居中偏移、span=2/full、row-span、auto-fit 列数、超长内容防撑破）：31/31 通过。
- 示例页桌面（1280px）/ 移动（414px）截图目检通过。
