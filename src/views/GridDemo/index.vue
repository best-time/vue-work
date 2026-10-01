<template>
  <div class="gd">
    <h2>Grid 布局 Mixin · 速查 Demo</h2>
    <p class="gd__tip">
      源码 <code>src/styles/grid.scss</code>，已由 <code>vue.config.js</code> 的
      <code>css.loaderOptions.scss.additionalData</code> 全局注入：<br />
      <code>@use "~@/styles/grid.scss" as *;</code> —— 所以本页所有
      <code>&lt;style lang="scss"&gt;</code> 里<strong>没有任何 import</strong>，直接
      <code>@include</code> 就能用。<br />
      该文件<strong>只有 mixin / function，没有裸样式</strong>：不
      <code>@include</code> 就零 CSS 输出（唯一例外是第 ⑮ 节的
      <code>grid-utils()</code>，需手动调用一次才生成工具类）。<br />
      每节都贴了<strong>真实编译结果</strong>（scoped 下选择器实际会带
      <code>[data-v-xxx]</code>，这里省略）。
    </p>

    <!-- ================= ① 等分列 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ① 等分列 · <code>grid-cols-equal($columns, $row-gap, $col-gap)</code>
      </div>
      <div class="gd-equal">
        <div class="gd-cell">1</div>
        <div class="gd-cell">2</div>
        <div class="gd-cell">3</div>
        <div class="gd-cell">4</div>
        <div class="gd-cell">5</div>
        <div class="gd-cell">6</div>
      </div>
      <pre class="gd__code">{{ CSS.equal }}</pre>
      <p class="gd__tip gd__tip--inline">
        列数 / 间距是最常用的两个参数；<code>grid-equal()</code> 是完全等价的旧名别名。
        只有「只开 grid + gap、先不定列」时用 <code>grid-container()</code>。
      </p>
    </el-card>

    <!-- ================= ② 任意列宽 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ② 任意列宽 · <code>grid-cols($widths...)</code> —— 左固定 + 中间自适应 + 右固定
      </div>
      <div class="gd-cols">
        <div class="gd-cell gd-cell--side">120px</div>
        <div class="gd-cell gd-cell--main">minmax(0, 1fr)</div>
        <div class="gd-cell gd-cell--side">80px</div>
      </div>
      <pre class="gd__code">{{ CSS.cols }}</pre>
      <p class="gd__tip gd__tip--inline">
        想写几段写几段，<code>fr / px / % / minmax() / repeat()</code> 都行，例如
        <code>grid-cols(1fr, 2fr)</code> 就是 1:2。变参必须用
        <code>list.join((), $widths, space)</code> 拼成空格分隔 —— 直接输出会变成
        <code>200px, 1fr, 100px</code>，整条声明被浏览器丢弃（这个坑已在 mixin 内部修掉）。
      </p>
    </el-card>

    <!-- ================= ③ 越界保护 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ③ 为什么统一用 <code>minmax(0, 1fr)</code> · <code>grid-item()</code>
      </div>
      <p class="gd__tip">
        grid 子项默认 <code>min-width: auto</code>（最小宽 = 内容最小宽），长单词 / 宽表格会把
        轨道撑破。下面两个容器都是<strong>左 120px + 右自适应</strong>，虚线框宽固定 560px，
        右格内容是一个不可断行的长串（885px）。
      </p>
      <p class="gd__sub">✗ <code>grid-template-columns: 120px 1fr</code>（裸写 1fr）</p>
      <div class="gd-overflow gd-overflow--bad">
        <div class="gd-cell gd-cell--side">120px</div>
        <div class="gd-cell gd-cell--long">{{ LONG }}</div>
      </div>
      <p class="gd__sub">
        ✓ <code>@include grid-cols(120px, minmax(0, 1fr))</code> + <code>@include grid-item</code>（轨道守住 440px，文字省略号截断）
      </p>
      <div class="gd-overflow gd-overflow--good">
        <div class="gd-cell gd-cell--side">120px</div>
        <div class="gd-cell gd-cell--long gd-cell--ellipsis gd-cell--safe">{{ LONG }}</div>
      </div>
      <pre class="gd__code">{{ CSS.item }}</pre>
      <p class="gd__tip gd__tip--inline">
        所有等分/自适应 mixin 都默认输出 <code>minmax(0, 1fr)</code>（可用第 4 个参数
        <code>$min</code> 改）。子项内还要出现滚动条时双保险：
        <code>@include grid-item(0, 0)</code> → <code>min-width: 0; min-height: 0</code>。
      </p>
    </el-card>

    <!-- ================= ④ 自适应列 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ④ 自适应列 · <code>grid-auto-fit($min-width, $gap)</code> vs
        <code>grid-auto-fill(...)</code>
      </div>
      <div class="gd__row">
        <span class="gd__label">容器宽度</span>
        <el-slider v-model="wrapWidth" :min="280" :max="960" :step="20" class="gd__slider"></el-slider>
        <span class="gd__val">{{ wrapWidth }}px</span>
      </div>
      <p class="gd__sub">
        ✗ <code>grid-auto-fill</code> —— 空轨道保留，项目<strong>不会</strong>被拉宽（右侧留空）
      </p>
      <div class="gd__wrap" :style="{ width: wrapWidth + 'px' }">
        <div class="gd-autofill">
          <div v-for="i in 2" :key="'f' + i" class="gd-cell">卡片 {{ i }}</div>
        </div>
      </div>
      <p class="gd__sub">
        ✓ <code>grid-auto-fit</code> —— 空轨道被折叠，项目平分整行被拉宽（
        <code>grid-card-list</code> 就是它）
      </p>
      <div class="gd__wrap" :style="{ width: wrapWidth + 'px' }">
        <div class="gd-autofit">
          <div v-for="i in 2" :key="'t' + i" class="gd-cell">卡片 {{ i }}</div>
        </div>
      </div>
      <pre class="gd__code">{{ CSS.autoFit }}</pre>
      <p class="gd__tip gd__tip--inline">
        第三参给最大列宽可让列<strong>弹性封顶</strong>：
        <code>grid-auto-fit(200px, 16px, 320px)</code> → 列宽在 200~320px 之间伸缩，
        不写死列数、按容器宽度自动决定放几列。这是<strong>容器驱动</strong>的响应式，
        跟视口无关（拖上面的滑块看列数变化）。<br />
        两者只在「项目数少于当前能容纳的轨道数」时才有区别；项目铺满所有轨道时表现一致。
      </p>
    </el-card>

    <!-- ================= ⑤ 跨列跨行 / 定位 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑤ 子项跨越与定位 · <code>grid-span</code> / <code>grid-cross</code> /
        <code>grid-position</code> / <code>grid-full-row</code>
      </div>
      <p class="gd__sub">⑤-1 <code>grid-span(2)</code>、<code>grid-span(1, 2)</code>、<code>grid-full-row</code></p>
      <div class="gd-span">
        <div class="gd-cell gd-cell--hl">span 2 列</div>
        <div class="gd-cell">1</div>
        <div class="gd-cell gd-cell--hl">span 1 列 2 行</div>
        <div class="gd-cell">2</div>
        <div class="gd-cell">3</div>
        <div class="gd-cell">4</div>
        <div class="gd-cell gd-cell--hl">grid-full-row 通栏</div>
      </div>
      <pre class="gd__code">{{ CSS.span }}</pre>

      <p class="gd__sub">
        ⑤-2 <code>grid-cross(2, 4)</code> 起点线 → 终点线；<code>grid-position(2, 3)</code> 钉到第 2 行第 3 列
      </p>
      <div class="gd-cross">
        <div class="gd-cell">1</div>
        <div class="gd-cell gd-cell--hl gd-cell--cross">cross(2, 4)</div>
        <div class="gd-cell gd-cell--pin">position(2, 3)</div>
      </div>
      <pre class="gd__code">{{ CSS.cross }}</pre>
      <p class="gd__tip gd__tip--inline">
        <code>grid-cross</code> 内部用插值 <code>#{$start} / #{$end}</code> 拼接 ——
        写成 <code>$start / $end</code> 会被 Sass 当除法算成 <code>0.5</code>（已修）。
        通栏列同理：<code>grid-full-column</code> → <code>grid-row: 1/-1</code>。
      </p>
    </el-card>

    <!-- ================= ⑥ 对齐 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑥ 对齐 · <code>grid-center</code> / <code>grid-place</code> /
        <code>grid-self</code> / <code>grid-place-content</code>
      </div>
      <p class="gd__sub">⑥-1 <code>grid-center</code> —— 单格水平垂直居中，比 flex 双 center 省</p>
      <div class="gd-center-demo">
        <div class="gd-cell gd-cell--hl">place-items: center</div>
      </div>

      <p class="gd__sub">
        ⑥-2 <code>grid-place(start, center)</code> 容器级 + <code>grid-self(end, center)</code> 子项级覆盖
      </p>
      <div class="gd-place">
        <div class="gd-cell">顶对齐</div>
        <div class="gd-cell">顶对齐</div>
        <div class="gd-cell gd-cell--hl gd-cell--self">self: end center</div>
      </div>

      <p class="gd__sub">
        ⑥-3 <code>grid-place-content(center, center)</code> —— 轨道固定宽时，整块网格在容器里居中
      </p>
      <div class="gd-place-content">
        <div class="gd-cell">120~160px</div>
        <div class="gd-cell">120~160px</div>
        <div class="gd-cell">120~160px</div>
      </div>
      <pre class="gd__code">{{ CSS.align }}</pre>
    </el-card>

    <!-- ================= ⑦ 图层堆叠 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">⑦ 图层堆叠 · <code>grid-stack</code> —— 所有直接子项叠在同一格</div>
      <p class="gd__tip">
        背景 + 图片 + 蒙层 + 居中文字都写在同一层，不用 <code>position: absolute</code>。
        子项上再用 <code>grid-center</code> 居中即可。
      </p>
      <div class="gd-stack">
        <div class="gd-stack__bg"></div>
        <div class="gd-stack__mask"></div>
        <div class="gd-stack__text gd-stack__center">网格叠层 · stack</div>
      </div>
      <pre class="gd__code">{{ CSS.stack }}</pre>
    </el-card>

    <!-- ================= ⑧ 命名区域 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑧ 命名区域 · <code>grid-areas($areas, $cols, $rows, $gap)</code> +
        <code>grid-area-name()</code>
      </div>
      <div class="gd-areas">
        <div class="gd-cell gd-cell--hl gd-area-header">header</div>
        <div class="gd-cell gd-area-aside">aside</div>
        <div class="gd-cell gd-cell--hl gd-area-main">main</div>
        <div class="gd-cell gd-area-footer">footer</div>
      </div>
      <pre class="gd__code">{{ CSS.areas }}</pre>
      <p class="gd__tip gd__tip--inline">
        每个字符串是一行，排版即所见，可读性最高。子项用
        <code>@include grid-area-name(header)</code> 认领。
      </p>
    </el-card>

    <!-- ================= ⑨ 圣杯布局 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑨ 成品布局 · <code>grid-holy-grail($aside-left, $aside-right, $row-gap, $col-gap, $header, $footer, $min-height)</code>
      </div>
      <div class="gd-grail">
        <div class="gd-cell gd-grail__header">header</div>
        <div class="gd-cell gd-grail__aside">aside</div>
        <div class="gd-cell gd-cell--hl gd-grail__main">main</div>
        <div class="gd-cell gd-grail__aside-r">aside-r</div>
        <div class="gd-cell gd-grail__footer">footer</div>
      </div>
      <pre class="gd__code">{{ CSS.grail }}</pre>
      <p class="gd__tip gd__tip--inline">
        <code>$aside-right</code> 传 <code>null</code> 就退化成「header / aside+main / footer」三行；
        左右都传 <code>null</code> 则是上下三段。区域名固定为
        <code>header / aside / main / aside-r / footer</code>。
      </p>
    </el-card>

    <!-- ================= ⑩ 两栏侧栏 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑩ 一行两栏 · <code>grid-sidebar($aside, $gap, $col-gap, $position)</code>
      </div>
      <p class="gd__sub">⑩-1 左固定 + 右自适应（后台最常见）</p>
      <div class="gd-sidebar-l">
        <div class="gd-cell gd-cell--side">aside 200px</div>
        <div class="gd-cell gd-cell--main">main 自适应</div>
      </div>
      <p class="gd__sub">⑩-2 <code>$position: right</code> → 右固定（详情页 / 预览栏）</p>
      <div class="gd-sidebar-r">
        <div class="gd-cell gd-cell--main">main 自适应</div>
        <div class="gd-cell gd-cell--side">aside 220px</div>
      </div>
      <pre class="gd__code">{{ CSS.sidebar }}</pre>
    </el-card>

    <!-- ================= ⑪ 表单栅格 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑪ 表单栅格 · <code>grid-form($columns, $col-gap, $row-gap)</code> +
        <code>grid-full-row</code> 通栏字段
      </div>
      <div class="gd-form">
        <div class="gd-field"><span class="gd-field__label">姓名</span><el-input size="small"></el-input></div>
        <div class="gd-field"><span class="gd-field__label">手机</span><el-input size="small"></el-input></div>
        <div class="gd-field gd-field--full"><span class="gd-field__label">备注（通栏）</span><el-input size="small"></el-input></div>
        <div class="gd-field"><span class="gd-field__label">城市</span><el-input size="small"></el-input></div>
        <div class="gd-field"><span class="gd-field__label">邮编</span><el-input size="small"></el-input></div>
      </div>
      <pre class="gd__code">{{ CSS.form }}</pre>
      <p class="gd__tip gd__tip--inline">
        注意参数顺序是<strong>列距在前、行距在后</strong>（与 <code>gap: &lt;row&gt; &lt;column&gt;</code>
        相反），符合写表单时的直觉：<code>grid-form(2, 24px, 18px)</code> = 列距 24 / 行距 18。
        通栏字段用 <code>@include grid-full-row;</code>。
      </p>
    </el-card>

    <!-- ================= ⑫ 图文媒体对象 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑫ 图文媒体对象 · <code>grid-media($icon, $gap, $align)</code>
      </div>
      <div class="gd-media-list">
        <div v-for="m in MEDIA" :key="m.name" class="gd-media">
          <div class="gd-avatar">{{ m.name.charAt(0) }}</div>
          <div class="gd-media__body">
            <p class="gd-media__title">{{ m.name }}</p>
            <p class="gd-media__desc">{{ m.desc }}</p>
          </div>
        </div>
      </div>
      <pre class="gd__code">{{ CSS.media }}</pre>
      <p class="gd__tip gd__tip--inline">
        定宽图标 + 自适应文字，<code>align-items</code> 可选 <code>start / center / end</code>
        —— 多行文字时一般用 <code>start</code>。
      </p>
    </el-card>

    <!-- ================= ⑬ 行轨道 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">
        ⑬ 行轨道 · <code>grid-rows</code> / <code>grid-rows-equal</code> /
        <code>grid-auto-rows</code> / <code>grid-auto-flow</code>
      </div>
      <p class="gd__sub">
        ⑬-1 <code>grid-rows-equal(3, 12px)</code> —— 容器高 200px，3 行等分
      </p>
      <div class="gd-rows-equal">
        <div class="gd-cell">第 1 行</div>
        <div class="gd-cell">第 2 行</div>
        <div class="gd-cell">第 3 行</div>
      </div>
      <p class="gd__sub">
        ⑬-2 <code>grid-auto-rows(60px)</code> + <code>grid-auto-flow(row, true)</code>
        （dense 把空洞用后面的小项填上）
      </p>
      <div class="gd-auto-rows">
        <div class="gd-cell gd-cell--hl">宽 2</div>
        <div class="gd-cell">1</div>
        <div class="gd-cell">2</div>
        <div class="gd-cell">3</div>
        <div class="gd-cell">4</div>
      </div>
      <pre class="gd__code">{{ CSS.rows }}</pre>
    </el-card>

    <!-- ================= ⑭ 响应式 ================= -->
    <el-card shadow="never" class="gd__card gd__card--wide">
      <div slot="header">
        ⑭ 响应式 · <code>grid-cols-respond($sm, $md, $lg, $xl, $gap)</code> /
        <code>grid-respond($bp)</code> / <code>grid-span-respond(...)</code>
      </div>
      <p class="gd__tip">
        媒体查询作用于<strong>视口</strong>（不是容器），所以这里不能用滑块模拟，请
        <strong>拖动浏览器窗口宽度</strong>看列数变化。当前视口
        <code>{{ vw }}px</code>，命中：
        <el-tag size="mini" :type="bp.type" effect="dark">{{ bp.label }}</el-tag>
      </p>
      <p class="gd__sub">
        ⑭-1 <code>grid-cols-respond(1, 2, 3, 4, 12px)</code> —— 1 → 2(md≥992) → 3(lg≥1200) → 4(xl≥1920)
      </p>
      <div class="gd-respond">
        <div v-for="i in 8" :key="'r' + i" class="gd-cell">{{ i }}</div>
      </div>
      <p class="gd__sub">
        ⑭-2 <code>grid-span-respond(1, 2, 2)</code>：小屏占 1 列、md 起占 2 列
      </p>
      <div class="gd-span-respond">
        <div class="gd-cell gd-cell--hl gd-span-respond__item">响应式跨列</div>
        <div class="gd-cell">1</div>
        <div class="gd-cell">2</div>
        <div class="gd-cell">3</div>
      </div>
      <pre class="gd__code">{{ CSS.respond }}</pre>
      <p class="gd__tip gd__tip--inline">
        <code>grid-respond()</code> 是裸断点包裹器，可包任意声明：
        <code>@include grid-respond(lg) { gap: 24px; }</code>；
        也可直接传像素 <code>grid-respond(900px)</code>。断点名找不到时编译期
        <code>@error</code> 报错并列出可用值。
      </p>
    </el-card>

    <!-- ================= ⑮ 工具类 ================= -->
    <el-card shadow="never" class="gd__card gd__card--wide">
      <div slot="header">
        ⑮ 工具类 · <code>grid-utils($max, $gap, $prefix, $responsive)</code>
      </div>
      <p class="gd__tip">
        这是唯一需要手动 <code>@include</code> 一次才会产出 CSS 的 mixin，适合放进全局样式。
        本页用<strong>非 scoped</strong> 块生成了一套 <code>gd-</code> 前缀的示例：
        <code>@include grid-utils(4, 12px, 'gd-', true);</code>
        （真实项目里通常是 <code>@include grid-utils();</code>，生成
        <code>.g-cols-1 ~ .g-cols-12</code> / <code>.g-span-full</code> / <code>.g-center</code>）。
      </p>
      <p class="gd__sub">⑮-1 <code>.gd-cols-3</code> + <code>.gd-span-full</code> + <code>.gd-center</code></p>
      <div class="gd-cols-3">
        <div class="gd-cell">1</div>
        <div class="gd-cell">2</div>
        <div class="gd-cell">3</div>
        <div class="gd-cell gd-span-full">gd-span-full 通栏</div>
        <div class="gd-cell gd-center gd-cell--hl">1</div>
        <div class="gd-cell">2</div>
        <div class="gd-cell">3</div>
      </div>
      <p class="gd__sub">
        ⑮-2 断点变体：<code>.gd-cols-1.gd-md-cols-4</code>（基础 1 列，md 起 4 列，拖动窗口看变化）
      </p>
      <div class="gd-cols-1 gd-md-cols-4">
        <div v-for="i in 4" :key="'u' + i" class="gd-cell">{{ i }}</div>
      </div>
      <pre class="gd__code">{{ CSS.utils }}</pre>
      <p class="gd__tip gd__tip--inline">
        变体只改 <code>grid-template-columns</code>，<code>display: grid</code> 由基础的
        <code>.g-cols-*</code> 提供，所以必须成对使用：
        <code>class="g-cols-1 g-md-cols-2 g-lg-cols-4"</code>。
      </p>
    </el-card>

    <!-- ================= ⑯ 参数速查 ================= -->
    <el-card shadow="never" class="gd__card">
      <div slot="header">⑯ 参数速查 · 全局默认值</div>
      <pre class="gd__code">{{ CSS.vars }}</pre>
    </el-card>
  </div>
</template>

<script>
/* 所有代码片段都是从 grid.scss 真实编译出来的输出（选择器里的 [data-v-xxx] 已省略） */
const CSS = {
  equal: `@include grid-cols-equal(4, 14px);

/* 编译结果 */
.gd-equal {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}`,
  cols: `@include grid-cols(120px, minmax(0, 1fr), 80px);

/* 编译结果 */
.gd-cols {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 80px;
}`,
  item: `/* ✗ 裸写 1fr：轨道最小宽 = 内容最小宽（长串撑破容器） */
.gd-overflow--bad {
  display: grid;
  grid-template-columns: 120px 1fr;
}

/* ✓ minmax(0, 1fr) + 子项 min-width: 0 */
.gd-overflow--good {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
}
.gd-cell--safe {
  min-width: 0;
}`,
  autoFit: `@include grid-auto-fit(160px, 14px);

/* 编译结果 */
.gd-autofit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

/* auto-fill 只差一个词：保留空轨道，末行不被拉宽 */
@include grid-auto-fill(160px, 14px);
/* => grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); */`,
  span: `@include grid-cols-equal(4, 12px);

.gd-span { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }

/* 子项 */
@include grid-span(2);        /* => grid-column: span 2; */
@include grid-span(1, 2);     /* => grid-column: span 1; grid-row: span 2; */
@include grid-full-row;       /* => grid-column: 1/-1; */`,
  cross: `@include grid-cross(2, 4);      /* => grid-column: 2/4; */

@include grid-position(2, 3);  /* => grid-row: 2; grid-column: 3; */`,
  align: `@include grid-center;      /* => display: grid; place-items: center; */

@include grid-place(start, center);         /* 容器：align-items + justify-items */
@include grid-self(end, center);            /* 子项：align-self + justify-self */

@include grid-place-content(center, center);/* => align-content: center; justify-content: center; */`,
  stack: `@include grid-stack;

/* 编译结果 */
.gd-stack { display: grid; gap: 0; }
.gd-stack > * { grid-area: 1/1; }   /* 子项全部叠在同一格 */`,
  areas: `@include grid-areas(
  "header header"
  "aside  main"
  "footer footer",
  160px minmax(0, 1fr),   /* 列宽 */
  auto 1fr auto,          /* 行高 */
  12px                    /* 间距 */
);

/* 子项认领 */
@include grid-area-name(main);   /* => grid-area: main; */`,
  grail: `@include grid-holy-grail(120px, 140px, 10px, null, 34px, 30px, 280px);
/* 左栏 右栏 行距 列距(同) 表头 页脚 最小高 */

/* 编译结果 */
.gd-grail {
  display: grid;
  gap: 10px;
  min-height: 280px;
  grid-template-areas: "header header header" "aside  main   aside-r" "footer footer footer";
  grid-template-columns: 120px minmax(0, 1fr) 140px;
  grid-template-rows: 34px 1fr 30px;
}`,
  sidebar: `@include grid-sidebar(200px, 14px);

/* => display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 14px; */

@include grid-sidebar(220px, 14px, null, right);

/* => grid-template-columns: minmax(0, 1fr) 220px; */

/* 第 5 参 $align 可对齐两栏高度：grid-sidebar(200px, 14px, null, left, start) */`,
  form: `@include grid-form(2, 20px, 16px);   /* 列距 20px、行距 16px */

/* 编译结果 */
.gd-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

/* 通栏字段 */
.gd-field--full { grid-column: 1/-1; }`,
  media: `@include grid-media(40px, 12px, start);

/* 编译结果 */
.gd-media {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}`,
  rows: `@include grid-rows-equal(3, 12px);
/* => grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 12px; */

@include grid-auto-rows(60px);
/* => grid-auto-rows: 60px;  隐式行统一高 60px */

@include grid-auto-flow(row, true);
/* => grid-auto-flow: row dense;  dense 会用后面的小项补齐空洞 */

/* 任意行高：@include grid-rows(auto, 1fr, 48px); */`,
  respond: `@include grid-cols-respond(1, 2, 3, 4, 12px);

/* 编译结果 */
.gd-respond {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 12px;
}
@media (min-width: 992px)  { .gd-respond { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1200px) { .gd-respond { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1920px) { .gd-respond { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

/* 子项跨列的响应式 */
@include grid-span-respond(1, 2, 2);
/* => grid-column: span 1;  @media (min-width:992px){ span 2 }  @media (min-width:1200px){ span 2 } */`,
  utils: `/* 放在全局样式里，只调用一次；第 3 参是类名前缀、第 4 参 true 生成断点变体 */
@include grid-utils(4, 12px, 'gd-', true);

/* 编译结果（节选） */
.gd-cols-1 { display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 12px; }
.gd-cols-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.gd-cols-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.gd-cols-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.gd-span-full { grid-column: 1/-1; }
.gd-center { display: grid; place-items: center; }

@media (min-width: 768px)  { .gd-sm-cols-1 { ... } .gd-sm-cols-2 { ... } ... .gd-sm-cols-4 { ... } }
@media (min-width: 992px)  { .gd-md-cols-1 { ... } ... .gd-md-cols-4 { ... } }
@media (min-width: 1200px) { .gd-lg-cols-1 { ... } ... .gd-lg-cols-4 { ... } }
@media (min-width: 1920px) { .gd-xl-cols-1 { ... } ... .gd-xl-cols-4 { ... } }

/* 断点变体只改 grid-template-columns，不含 display: grid */`,
  vars: `// src/styles/grid.scss 顶部可覆盖变量（!default）
$grid-gap: 16px;
$grid-breakpoints: (sm: 768px, md: 992px, lg: 1200px, xl: 1920px);  // 同 el-col
$grid-utils-prefix: 'g-';
$grid-line-first: 1;
$grid-line-last: -1;

// 覆盖方式
@use "~@/styles/grid.scss" as * with ($grid-gap: 20px);`,
};

const MEDIA = [
  { name: "设计稿交付", desc: "定宽图标 + 自适应文字，多行时 align-items 用 start 更自然。" },
  { name: "接口联调", desc: "同一个 mixin 复用到列表项，不用再写 flex + min-width: 0。" },
];

export default {
  name: "GridDemo",
  data() {
    return {
      CSS,
      MEDIA,
      wrapWidth: 640,
      LONG:
        "LONGLONGLONG_LONG_LONG_LONG_LONG_LONG_LONG_LONG_LONG_LONG_LONG_LONG_LONG_CONTENT_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      vw: 0,
      bp: { label: "—", type: "info" },
    };
  },
  mounted() {
    this.readViewport();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.readViewport);
    }
  },
  beforeDestroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.readViewport);
    }
  },
  methods: {
    readViewport() {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      this.vw = w;
      if (w >= 1920) this.bp = { label: "xl ≥1920 → 4 列", type: "danger" };
      else if (w >= 1200) this.bp = { label: "lg ≥1200 → 3 列", type: "primary" };
      else if (w >= 992) this.bp = { label: "md ≥992 → 2 列", type: "success" };
      else this.bp = { label: "base <992 → 1 列", type: "info" };
    },
  },
};
</script>

<style lang="scss" scoped>
.gd {
  padding: 24px;
  background: #f5f7fa;
  color: #000;
  font-size: 24px;

  &,
  * {
    box-sizing: border-box;
  }

  h2 {
    margin: 0 0 12px;
  }
}

.gd__tip {
  color: #000;
  font-size: 15px;
  line-height: 1.7;
  margin: 8px 0 16px;
}
.gd__tip--inline {
  margin: 12px 0 0;
  font-size: 14px;
}
.gd__tip code,
.gd__card code {
  background: #eef2f8;
  padding: 2px 6px;
  border-radius: 3px;
  color: #000;
}
.gd__card {
  max-width: 980px;
  margin-bottom: 20px;
}
.gd__card--wide {
  max-width: none;
}
.gd__sub {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #000;
}
.gd__sub:first-of-type {
  margin-top: 4px;
}
.gd__sub code {
  font-weight: 400;
}
.gd__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.gd__label {
  font-size: 14px;
  color: #000;
}
.gd__slider {
  width: 200px;
}
.gd__val {
  width: 56px;
  font-size: 14px;
  color: #000;
}
.gd__wrap {
  max-width: 100%;
  padding: 6px;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}
.gd__code {
  margin: 12px 0 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: #000;
  white-space: pre-wrap;
  word-break: break-all;
}

/* ---------- 单元格 ---------- */
.gd-cell {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #1f3a8a;
  background: #eef3ff;
  border: 1px solid #c7d8ff;
  border-radius: 4px;
  padding: 6px 8px;
  text-align: center;
}
.gd-cell--hl {
  background: #326fff;
  border-color: #326fff;
  color: #fff;
}
.gd-cell--side {
  background: #f0f2f5;
  border-color: #dcdfe6;
  color: #303133;
}
.gd-cell--main {
  background: #eef3ff;
}

/* ① 等分列 */
.gd-equal {
  @include grid-cols-equal(4, 14px);
}

/* ② 任意列宽 */
.gd-cols {
  @include grid-cols(120px, minmax(0, 1fr), 80px);
}

/* ③ 越界保护 */
.gd-overflow {
  width: 560px;
  max-width: 100%;
  padding: 6px;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  background: #fff;
  margin-bottom: 4px;
}
.gd-overflow--bad {
  display: grid;
  grid-template-columns: 120px 1fr; /* 裸写 1fr：会被长内容撑破 */
  border-color: #ff3b3b;
}
.gd-overflow--good {
  @include grid-cols(120px, minmax(0, 1fr));
  border-color: #52c41a;
}

/* 长串本身：不可断行，撑破轨道才看得见问题 */
.gd-cell--long {
  display: block;
  white-space: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
  text-align: left;
  font-weight: 400;
  font-size: 12px;
  line-height: 32px;
}
/* 加 overflow: hidden 就顺带获得了 text-overflow: ellipsis；
   注意：overflow 不是 visible 时，grid 子项的「自动最小尺寸」会变成 0 ——
   这本身就是另一层保护，所以这里才必须配 minmax(0, 1fr) 一起讲 */
.gd-cell--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
}
.gd-cell--safe {
  @include grid-item; /* min-width: 0 */
}

/* ④ 自适应列 */
.gd-autofit {
  @include grid-auto-fit(160px, 14px);
}
.gd-autofill {
  @include grid-auto-fill(160px, 14px);
}

/* ⑤ 跨越 */
.gd-span {
  @include grid-cols-equal(4, 12px);
  grid-auto-rows: 44px;

  .gd-cell--hl:first-child {
    @include grid-span(2);
  }
  .gd-cell--hl:nth-child(3) {
    @include grid-span(1, 2);
  }
  .gd-cell--hl:last-child {
    @include grid-full-row;
  }
}
.gd-cross {
  @include grid-cols-equal(4, 12px);
  grid-auto-rows: 44px;

  .gd-cell--cross {
    @include grid-cross(2, 4);
  }
  .gd-cell--pin {
    @include grid-position(2, 3);
  }
}

/* ⑥ 对齐 */
.gd-center-demo {
  @include grid-center;
  height: 120px;
  padding: 6px;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  background: #fff;

  .gd-cell {
    min-width: 220px;
  }
}
.gd-place {
  @include grid-cols-equal(3, 12px);
  @include grid-place(start, center);
  height: 120px;
  padding: 6px;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  background: #fff;

  .gd-cell {
    width: 100%;
    min-height: 36px;
  }
  .gd-cell--self {
    @include grid-self(end, center);
  }
}
.gd-place-content {
  @include grid-cols-clamp(3, 120px, 160px, 12px);
  @include grid-place-content(center, center);
  height: 120px;
  padding: 6px;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  background: #fff;

  .gd-cell {
    width: 100%;
  }
}

/* ⑦ 图层堆叠 */
/* 注意：grid-stack 会输出嵌套规则 `> *`，所以 @include 要放在本块所有声明之后，
   否则触发 Sass 的 mixed-decls 弃用告警（声明出现在嵌套规则之后） */
.gd-stack {
  width: 320px;
  max-width: 100%;
  height: 140px;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  overflow: hidden;
  @include grid-stack;

  &__bg {
    background: linear-gradient(135deg, #326fff 0%, #6b9bff 100%);
  }
  &__mask {
    background: rgba(19, 34, 74, 0.32);
  }
  &__text {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    z-index: 2;
  }
  &__center {
    @include grid-center; /* 叠层里再居中 */
  }
}

/* ⑧ 命名区域 */
.gd-areas {
  @include grid-areas(
    "header header"
    "aside  main"
    "footer footer",
    160px minmax(0, 1fr),
    auto 1fr auto,
    12px
  );
  min-height: 240px;

  .gd-area-header {
    @include grid-area-name(header);
  }
  .gd-area-aside {
    @include grid-area-name(aside);
  }
  .gd-area-main {
    @include grid-area-name(main);
  }
  .gd-area-footer {
    @include grid-area-name(footer);
  }
}

/* ⑨ 圣杯 */
.gd-grail {
  @include grid-holy-grail(120px, 140px, 10px, null, 34px, 30px, 280px);

  &__header {
    @include grid-area-name(header);
  }
  &__aside {
    @include grid-area-name(aside);
    background: #f0f2f5;
    border-color: #dcdfe6;
    color: #303133;
  }
  &__main {
    @include grid-area-name(main);
  }
  &__aside-r {
    @include grid-area-name(aside-r);
    background: #f0f2f5;
    border-color: #dcdfe6;
    color: #303133;
  }
  &__footer {
    @include grid-area-name(footer);
    background: #f0f2f5;
    border-color: #dcdfe6;
    color: #303133;
  }
}

/* ⑩ 两栏 */
.gd-sidebar-l {
  @include grid-sidebar(200px, 14px);
}
.gd-sidebar-r {
  @include grid-sidebar(220px, 14px, null, right);
}

/* ⑪ 表单栅格 */
.gd-form {
  @include grid-form(2, 20px, 16px);

  .gd-field {
    @include grid-item(0, 0);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .gd-field--full {
    @include grid-full-row;
  }
  .gd-field__label {
    flex: 0 0 88px;
    font-size: 13px;
    color: #000;
    text-align: right;
  }
}

/* ⑫ 图文媒体对象 */
.gd-media-list {
  display: grid;
  gap: 12px;
  max-width: 460px;
}
.gd-media {
  @include grid-media(40px, 12px, start);
  padding: 10px;
  background: #fff;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;

  &__body {
    @include grid-item; /* min-width: 0 */
  }
  &__title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #000;
  }
  &__desc {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #606266;
  }
}
.gd-avatar {
  @include grid-center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #326fff;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

/* ⑬ 行轨道 */
.gd-rows-equal {
  @include grid-rows-equal(3, 12px);
  height: 200px;
}
.gd-auto-rows {
  @include grid-cols-equal(4, 12px);
  @include grid-auto-rows(60px);
  @include grid-auto-flow(row, true);

  .gd-cell--hl {
    @include grid-span(2);
  }
}

/* ⑭ 响应式 */
.gd-respond {
  @include grid-cols-respond(1, 2, 3, 4, 14px);
}
.gd-span-respond {
  @include grid-cols-equal(4, 12px);
  grid-auto-rows: 44px;

  &__item {
    @include grid-span-respond(1, 2, 2);
  }
}
</style>

<!-- ⑮ 工具类必须【非 scoped】生成（工具类就是要全局复用）。
     这里用 gd- 前缀做演示，避免污染真实项目里的 .g-* 命名空间 -->
<style lang="scss">
@include grid-utils(4, 12px, "gd-", true);
</style>
