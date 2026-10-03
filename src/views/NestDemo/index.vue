<template>
  <div class="nd">
    <h2>嵌套 DOM · 分层写样式</h2>
    <p class="nd__tip">
      源码 <code>src/styles/nest.scss</code>（已全局注入，直接
      <code>@include</code>）。<br />
      口诀：<strong>外层管位置、中层管外壳、内层管内容</strong> —— 一个模块三层
      DOM，每层只干一件事：<br />
      <code>外层</code>：margin / position / z-index &nbsp;·&nbsp;
      <code>中层</code>：padding / border / background / radius / shadow
      &nbsp;·&nbsp; <code>内层</code>：纯内容，不写盒子样式。
    </p>

    <!-- ================= ① 三层解剖 ================= -->
    <el-card shadow="never" class="nd__card">
      <div slot="header">① 三层解剖 · 每一层的盒模型范围</div>
      <div class="nd-anatomy">
        <ul class="nd-legend">
          <li>
            <i class="nd-dot nd-dot--outer"></i>① 外层 · margin
            区（红色虚框外的那一圈）
          </li>
          <li>
            <i class="nd-dot nd-dot--inner"></i>② 中层 · padding + 背景 +
            圆角（蓝色半透明区）
          </li>
          <li>
            <i class="nd-dot nd-dot--content"></i>③ 内层 ·
            纯内容（就是那行文字本身，零盒子样式）
          </li>
        </ul>
        <!-- 浅红底 = 舞台背景，透出外层 margin 占的那一圈 -->
        <div class="nd-anatomy__stage">
          <div class="nd-anatomy__outer">
            <div class="nd-anatomy__inner">
              <div class="nd-anatomy__content">纯内容：文字 / 图片 / 列表</div>
            </div>
          </div>
        </div>
      </div>
      <pre class="nd__code">{{ CSS.anatomy }}</pre>
      <p class="nd__tip nd__tip--inline">
        红色虚框（外层）与蓝色区域（中层）之间的空隙就是 <code>margin</code> ——
        它属于「外层」， 是<strong>模块与外界的关系</strong>；蓝框与白块之间是
        <code>padding</code> —— 属于「中层」，
        是<strong>盒子自己的厚度</strong>。两者分开写，改间距时永远不会误伤内边距。
      </p>
    </el-card>

    <!-- ================= ② 外层管 margin ================= -->
    <el-card shadow="never" class="nd__card nd__card--wide">
      <div slot="header">
        ② 外层管 margin · 同一个组件放进不同上下文，只覆盖外层
      </div>

      <p class="nd__sub">
        ✗ <code>一锅烩</code>：margin 和 padding / border / background
        写在同一个类上
      </p>
      <div class="nd-cmp">
        <div class="nd-cmp__col">
          <p class="nd-cmp__cap">列表上下文（之间要 12px）</p>
          <div class="nd-flat-list">
            <div v-for="i in 2" :key="'fb' + i" class="nd-flat">
              一锅烩卡片 {{ i }}
            </div>
          </div>
        </div>
        <div class="nd-cmp__col">
          <p class="nd-cmp__cap">
            网格上下文（间距交给 gap；这里故意没补覆盖规则）
          </p>
          <div class="nd-flat-grid">
            <div v-for="i in 3" :key="'fg' + i" class="nd-flat">
              一锅烩 {{ i }}
            </div>
          </div>
        </div>
      </div>
      <p class="nd__tip nd__tip--inline">
        网格区里每张卡下方多出一截<strong>浅红色空隙</strong> —— 那是
        <code>.nd-flat</code> 自带的
        <code>margin-bottom: 12px</code>。要消掉它，只能再写一条
        <code>.nd-flat-grid .nd-flat { margin: 0 }</code
        >：<strong>覆盖规则和原规则处在同一层</strong>，
        谁后写谁生效，组件顺序一变就翻车；而且这条覆盖<strong>顺带把外观也压住了</strong>，风险外溢。
        对比下面的三层写法 —— 那种覆盖是「结构性」的，只碰 margin。
      </p>
      <pre class="nd__code">{{ CSS.flat }}</pre>

      <p class="nd__sub">
        ✓ <code>三层</code>：间距只出现在外层，覆盖时也只动外层一个变量
      </p>
      <div class="nd-cmp">
        <div class="nd-cmp__col">
          <p class="nd-cmp__cap">同一份 DOM，列表上下文</p>
          <div class="nd-list">
            <div v-for="i in 2" :key="'nb' + i" class="nd-card">
              <div class="nd-card__inner">
                <div class="nd-card__content">分层卡片 {{ i }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="nd-cmp__col">
          <p class="nd-cmp__cap">同一份 DOM，网格上下文</p>
          <div class="nd-card-grid">
            <div v-for="i in 3" :key="'ng' + i" class="nd-card">
              <div class="nd-card__inner">
                <div class="nd-card__content">分层卡片 {{ i }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <pre class="nd__code">{{ CSS.layered }}</pre>
      <p class="nd__tip nd__tip--inline">
        两个上下文只差一条规则，而且只碰 <code>margin</code>：
        <code>.nd-list .nd-card { @include nest-outer(0 0 12px); }</code> /
        <code>.nd-card-grid .nd-card { @include nest-outer(0); }</code>。
        <code>padding / border / background / radius</code>
        全在中层，一个字都没动 —— 这就是分层的价值。
      </p>
    </el-card>

    <!-- ================= ③ 中层管外壳 ================= -->
    <el-card shadow="never" class="nd__card nd__card--wide">
      <div slot="header">
        ③ 中层管外壳 · padding / border / background / border-radius 必须同层
      </div>

      <p class="nd__sub">
        ③-1 <code>border-radius</code> 与 <code>background</code> 分层 →
        圆角失效
      </p>
      <div class="nd-cmp nd-cmp--3">
        <div>
          <p class="nd-cmp__cap">✗ radius 写外层、background 写中层</p>
          <div class="nd-radius-bad">
            <div class="nd-radius-bad__inner">看起来是直角</div>
          </div>
        </div>
        <div>
          <p class="nd-cmp__cap">✓ 两者都在中层</p>
          <div class="nd-radius-good">
            <div class="nd-radius-good__inner">圆角生效</div>
          </div>
        </div>
      </div>
      <p class="nd__tip nd__tip--inline">
        <code>border-radius</code>
        裁的是<strong>自己这一层的背景与边框</strong>。 它在外层、背景在中层 →
        中层是完整矩形，自然盖出直角。所以外壳四件套 （padding / border /
        background / radius）必须同层，本库统一放中层。
      </p>

      <p class="nd__sub">
        ③-2 <code>overflow: hidden</code> 写外层 → 把中层的
        <code>box-shadow</code> 裁掉
      </p>
      <div class="nd-cmp">
        <div>
          <p class="nd-cmp__cap">
            ✗ 外层加 <code>overflow: hidden</code>（想“保险”地裁头图）
          </p>
          <div class="nd-clip-bad">
            <div class="nd-clip-bad__inner">
              <div class="nd-clip-bad__cover">贴边头图（内容）</div>
            </div>
          </div>
          <p class="nd-cmp__note">
            头图变直角 <strong>+</strong> 中层阴影被外层裁剪框剪掉
          </p>
        </div>
        <div>
          <p class="nd-cmp__cap">
            ✓ 裁剪只放中层（<code>nest-clip</code>），外层保持 visible
          </p>
          <div class="nd-clip-good">
            <div class="nd-clip-good__inner">
              <div class="nd-clip-good__cover">贴边头图（内容）</div>
            </div>
          </div>
          <p class="nd-cmp__note">头图被圆角裁掉 <strong>+</strong> 阴影完整</p>
        </div>
      </div>
      <pre class="nd__code">{{ CSS.clip }}</pre>
      <p class="nd__tip nd__tip--inline">
        <code>overflow</code> 裁的是<strong>子孙元素</strong>。中层挂
        <code>box-shadow</code>、 外层加
        <code>overflow: hidden</code>
        时，中层的阴影绘制在外层裁剪框之外的部分被剪掉 ——
        圆角卡片的阴影常常就是这样消失的。<br />
        规则：<strong
          >要裁头图，就在中层写 <code>@include nest-clip(8px)</code></strong
        >； 外层保持默认（<code>visible</code>），专门留给
        <code>box-shadow</code> 和 <code>transform</code>。
      </p>
    </el-card>

    <!-- ================= ④ 内层纯内容 ================= -->
    <el-card shadow="never" class="nd__card nd__card--wide">
      <div slot="header">
        ④ 内层纯内容 · 同一段内容换 4 种外壳，内容层类名不变
      </div>
      <div class="nd-skins">
        <div
          v-for="s in SKINS"
          :key="s.key"
          class="nd-skin"
          :class="'nd-skin--' + s.key"
        >
          <div class="nd-skin__inner">
            <!-- 内层始终是同一个类，且不写任何盒子样式 -->
            <div class="nd-skin__content">{{ s.title }}</div>
          </div>
        </div>
      </div>
      <pre class="nd__code">{{ CSS.skins }}</pre>
      <p class="nd__tip nd__tip--inline">
        4 种皮肤的中层各写各的
        <code>padding / background / radius / shadow</code>， 内层
        <code>.nd-skin__content</code> <strong>一行样式都没有</strong>（只有
        <code>min-width: 0</code>
        防越界）。所以同一段内容能塞进任何外壳，换皮只换中层的类名。
      </p>
    </el-card>

    <!-- ================= ⑤ z-index 在外层 ================= -->
    <el-card shadow="never" class="nd__card">
      <div slot="header">
        ⑤ 定位与 z-index 放外层 · z-index 挂中层抬不动层级
      </div>
      <div class="nd__row">
        <el-switch
          v-model="raised"
          active-text="抬升叠在下面的那张卡"
        ></el-switch>
        <span class="nd__hint">（也可以直接用鼠标 hover 左侧卡片）</span>
      </div>
      <div class="nd-cmp">
        <div>
          <p class="nd-cmp__cap">✓ z-index 在外层 —— 整张卡抬到最上层</p>
          <div class="nd-ov-correct" :class="{ 'is-up': raised }">
            <div class="nd-ov-correct__a">
              <div class="nd-ov-correct__inner">
                <div class="nd-ov-correct__content">
                  卡片 A（外层 z-index: 5）
                </div>
              </div>
            </div>
            <div class="nd-ov-correct__b">
              <div class="nd-ov-correct__inner">
                <div class="nd-ov-correct__content">卡片 B</div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <p class="nd-cmp__cap">✗ z-index 挂中层 —— 一直被 B 压着</p>
          <div class="nd-ov-wrong" :class="{ 'is-up': raised }">
            <div class="nd-ov-wrong__a">
              <div class="nd-ov-wrong__inner">
                <div class="nd-ov-wrong__content">
                  卡片 A（内层 z-index: 9）
                </div>
              </div>
            </div>
            <div class="nd-ov-wrong__b">
              <div class="nd-ov-wrong__inner">
                <div class="nd-ov-wrong__content">卡片 B</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <pre class="nd__code">{{ CSS.zindex }}</pre>
      <p class="nd__tip nd__tip--inline">
        <code>z-index</code>
        只在<strong>同一个层叠上下文</strong>里比较。右侧卡片 A 的外层
        <code>z-index: 1</code> 已经建立了自己的上下文，中层再写
        <code>z-index: 9</code> 也只是 「在 A 内部排第一」，跨不过 B 的外层
        <code>z-index: 2</code>。所以
        <code>position + z-index</code> 必须成对写在外层，它描述的是
        「<strong>整个模块在第几层</strong>」。
      </p>
    </el-card>

    <!-- ================= ⑥ hover 抬升：内容不抖 ================= -->
    <el-card shadow="never" class="nd__card">
      <div slot="header">⑥ 三层分层后的收益 · hover 抬升时内容不跳动</div>
      <div class="nd__row">
        <el-switch v-model="lifted" active-text="触发 hover 态"></el-switch>
        <span class="nd__hint">观察两卡里文字的纵向位置</span>
      </div>
      <div class="nd-cmp">
        <div>
          <p class="nd-cmp__cap">✓ 位移写外层、阴影写中层 → 内容纹丝不动</p>
          <div class="nd-lift nd-lift--good" :class="{ 'is-up': lifted }">
            <div class="nd-lift__inner">
              <div class="nd-lift__content">标题：分层卡片</div>
            </div>
          </div>
        </div>
        <div>
          <p class="nd-cmp__cap">
            ✗ hover 时改中层 padding → 内容跳一下、卡片变大
          </p>
          <div class="nd-lift nd-lift--bad" :class="{ 'is-up': lifted }">
            <div class="nd-lift__inner">
              <div class="nd-lift__content">标题：分层卡片</div>
            </div>
          </div>
        </div>
      </div>
      <pre class="nd__code">{{ CSS.lift }}</pre>
      <p class="nd__tip nd__tip--inline">
        左侧：外层 <code>transform + transition</code>，中层只换
        <code>box-shadow</code> ——
        <code>padding</code> 不变，文字相对卡片的位置恒定。 右侧：hover
        直接改中层的 <code>padding</code>，文字会被推着走，卡片尺寸也变了，
        整行布局跟着抖。
      </p>
    </el-card>

    <!-- ================= ⑦ 速查表 ================= -->
    <el-card shadow="never" class="nd__card nd__card--wide">
      <div slot="header">⑦ 速查表 · 每层写什么、绝不写什么</div>
      <table class="nd-table">
        <thead>
          <tr>
            <th>层 / 类名</th>
            <th>只写</th>
            <th>绝不写</th>
            <th>一句话职责</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>.card</code><br /><span class="nd-table__m">外层</span>
            </td>
            <td>margin、position、top/left、z-index、width、align-self</td>
            <td>padding、border、background、border-radius、overflow</td>
            <td>我在外面占多少位置、在第几层</td>
          </tr>
          <tr>
            <td>
              <code>.card__inner</code><br /><span class="nd-table__m"
                >中层</span
              >
            </td>
            <td>
              padding、border、background、border-radius、box-shadow、overflow
            </td>
            <td>margin、position、z-index、top/left</td>
            <td>盒子外壳长什么样</td>
          </tr>
          <tr>
            <td>
              <code>.card__content</code><br /><span class="nd-table__m"
                >内层</span
              >
            </td>
            <td>什么都不写（最多 <code>min-width: 0</code>）</td>
            <td>一切盒子样式</td>
            <td>里面装的东西</td>
          </tr>
        </tbody>
      </table>
      <p class="nd__tip nd__tip--inline">
        判断口诀：<strong
          >「离外界多远」→ 外层；「自己的厚度与皮肤」→ 中层；「装了什么」→
          内层。</strong
        >
      </p>
    </el-card>

    <!-- ================= ⑧ 常见错误清单 ================= -->
    <el-card shadow="never" class="nd__card">
      <div slot="header">⑧ 常见错误对照</div>
      <ul class="nd-list-check">
        <li v-for="(c, i) in CHECKS" :key="i">
          <span class="nd-list-check__bad">✗</span>
          <code>{{ c.bad }}</code>
          <span class="nd-list-check__arrow">→</span>
          <span class="nd-list-check__good">✓</span>
          <code>{{ c.good }}</code>
          <p class="nd-list-check__why">{{ c.why }}</p>
        </li>
      </ul>
    </el-card>
  </div>
</template>

<script>
const CSS = {
  anatomy: `<!-- DOM：三层，一层只干一件事 -->
<div class="card">
  <div class="card__inner">
    <div class="card__content">纯内容</div>
  </div>
</div>

/* SCSS：@include 各管各的层 */
.card {
  @include nest-outer(0 0 16px);                        /* ① 外层：margin / 定位 / 层级 */
  &__inner { @include nest-inner(18px, 8px, #eef3ff); } /* ② 中层：padding / 背景 / 圆角 */
  &__content { @include nest-content; }                 /* ③ 内层：只补 min-width: 0 */
}

/* 编译结果 */
.card {
  position: relative;
  margin: 0 0 16px;
}
.card__inner {
  box-sizing: border-box;
  padding: 18px;
  border-radius: 8px;
  background: #eef3ff;
}
.card__content {
  min-width: 0;
}`,

  flat: `/* ✗ 一锅烩：间距和外观写在同一个类上，改动必然牵连 */
.nd-flat {
  margin-bottom: 12px;      /* 间距 */
  padding: 14px;            /* 外观 */
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

/* 换上下文时只能「在同一层里覆盖」，两条规则互相打架：
   权重相同 → 靠书写顺序决胜；忘了补就多出 12px 空隙（见左侧 ✗ 区域） */
.nd-flat-list .nd-flat { margin-bottom: 12px; }  /* 列表：保留 */
.nd-flat-grid .nd-flat { margin: 0; }            /* 网格：必须补，否则漏空隙 */
/*  ↑ 这条覆盖选择器权重更高，一旦写歪，会顺带压掉组件自己的外观声明 */`,

  layered: `/* ✓ 三层：间距只在外层，上下文只覆盖外层 */
.nd-card {
  @include nest-outer(0 0 12px);
  &__inner {
    @include nest-inner(14px, 8px, #fff, 1px solid #ebeef5);
  }
  &__content {
    @include nest-content;
  }
}

/* 列表上下文：间距 12px（外层默认值即此，可省略） */
.nd-list .nd-card { @include nest-outer(0 0 12px); }

/* 网格上下文：间距交给 gap，卡片外层 margin 归零 */
.nd-card-grid .nd-card { @include nest-outer(0); }
/*  ↑ 只碰 margin 一个变量；中层的 padding / 外观零改动 */`,

  clip: `/* ✗ 外层加 overflow：中层的阴影被外层裁剪框剪掉，
      同时中层只有 radius 没有 overflow，贴边头图盖出直角 */
.nd-clip-bad {
  @include nest-outer(0, relative);
  overflow: hidden;                                  /* ← 错在这 */
  &__inner { @include nest-inner(null, 8px, #fff, null, $nest-shadow); }
}

/* ✓ 外层不裁，裁剪一律交给中层 */
.nd-clip-good {
  @include nest-outer(0, relative);                  /* overflow 保持 visible */
  &__inner {
    @include nest-inner(null, null, #fff, null, $nest-shadow);
    @include nest-clip(8px);                         /* overflow: hidden + radius */
  }
  &__cover { /* 同一块贴边头图，靠中层的圆角被裁掉 */ }
}`,

  skins: `/* 一份内容：内层零样式 */
.nd-skin__content { @include nest-content; }

/* 四套壳：只改中层 */
.nd-skin--card    .nd-skin__inner { @include nest-inner(16px, 8px, #fff, 1px solid #ebeef5, $nest-shadow); }
.nd-skin--outline .nd-skin__inner { @include nest-inner(16px, 8px, transparent, 1px solid $color-primary); }
.nd-skin--brand   .nd-skin__inner { @include nest-inner(16px, 8px, $color-primary); }
.nd-skin--dark    .nd-skin__inner { @include nest-inner(16px, 8px, #1f3a8a); }`,

  zindex: `/* ✓ z-index 在外层：整个模块抬起来 */
.nd-ov-correct__a {
  @include nest-outer(null, absolute, 1);   /* position + z-index 同层 */
  transition: transform 0.2s;
}
.nd-ov-correct.is-up .nd-ov-correct__a {
  @include nest-outer(null, absolute, 5);   /* 抬到 B 之上 */
  transform: translateY(-8px);
}

/* ✗ z-index 挂中层：外层已经在 z-index: 1 建立了层叠上下文，
   中层的 z-index: 9 只能在 A 内部排第一，跨不过 B 的外层 z-index: 2 */
.nd-ov-wrong.is-up .nd-ov-wrong__a { z-index: 1; }
.nd-ov-wrong.is-up .nd-ov-wrong__a .nd-ov-wrong__inner {
  position: relative;
  z-index: 9;                                /* 白写 */
}`,

  lift: `/* ✓ 位移写外层、阴影写中层 */
.nd-lift--good {
  @include nest-outer(null, relative, 1);
  transition: transform 0.2s ease;
  &__inner { @include nest-inner(16px, 8px, #fff, $nest-border); transition: box-shadow 0.2s ease; }  /* 中层：padding 恒为 16px */
}
.nd-lift--good.is-up {
  transform: translateY(-6px);                       /* 外层位移 */
}
.nd-lift--good.is-up .nd-lift__inner {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);       /* 只换阴影，不动 padding */
}

/* ✗ hover 改中层 padding：内容被推着走 */
.nd-lift--bad.is-up .nd-lift__inner {
  padding: 26px;                                     /* 16px → 26px */
}`,
};

const SKINS = [
  { key: "card", title: "白底卡片" },
  { key: "outline", title: "描边风格" },
  { key: "brand", title: "主色实底" },
  { key: "dark", title: "深色底" },
];

const CHECKS = [
  {
    bad: ".card { margin: 0 0 16px; padding: 16px; background: #fff; }",
    good: ".card { @include nest-outer(0 0 16px); } + &__inner { @include nest-inner(16px, 8px, #fff); }",
    why: "间距与外观同层 → 换上下文改间距时会连带改外观，覆盖规则互相打架。",
  },
  {
    bad: ".card__inner { margin-bottom: 12px; }",
    good: "margin 全部收口到外层 .card",
    why: "margin 出现在中层，等于把「与外界的关系」藏进外壳，外层再也管不住间距。",
  },
  {
    bad: ".card__content { padding: 8px; font-size: 14px; color: #333; }",
    good: ".card__content { @include nest-content; }",
    why: "内容层一旦有 padding，换个外壳就要重算内边距；文案样式应交给外层容器或语义标签（h3/p）。",
  },
  {
    bad: ".card { overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.1); }",
    good: "@include nest-clip(8px) 放中层，外层保持 visible",
    why: "外层自己同时裁剪 + 挂阴影，阴影被自己的裁剪框剪掉（或圆角处露白）。",
  },
  {
    bad: ".card__inner { position: relative; z-index: 9; }",
    good: "@include nest-outer(null, relative, 9);",
    why: "z-index 挂中层抬不动层级：外层若已是定位元素，中层的 z-index 只在模块内部竞争。",
  },
  {
    bad: ".card:last-child { margin-bottom: 0; }",
    good: "用 gap（grid/flex）或 :not(:last-child) 显式表达",
    why: "给「最后一个」打补丁说明间距写错了层：间距该由父容器的 gap / 外层 margin 决定，不该由子元素互相抵消。",
  },
];

export default {
  name: "NestDemo",
  data() {
    return { CSS, SKINS, CHECKS, raised: false, lifted: false };
  },
};
</script>

<style lang="scss" scoped>
.nd {
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
    font-size: 24px;
  }
}

.nd__tip {
  color: #000;
  font-size: 15px;
  line-height: 1.7;
  margin: 8px 0 16px;

  &--inline {
    margin: 12px 0 0;
    font-size: 14px;
  }
}
.nd__tip code,
.nd__card code {
  background: #eef2f8;
  padding: 2px 6px;
  border-radius: 3px;
  color: #000;
}
.nd__card {
  max-width: 980px;
  margin-bottom: 20px;

  &--wide {
    max-width: none;
  }
}
.nd__sub {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #000;

  &:first-of-type {
    margin-top: 4px;
  }
  code {
    font-weight: 400;
  }
}
.nd__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.nd__hint {
  font-size: 13px;
  color: #606266;
}
.nd__code {
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

/* ---------- 对比区骨架 ---------- */
.nd-cmp {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  &__note {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: #606266;

    strong {
      color: #326fff;
    }
  }

  > div {
    min-width: 300px;
    flex: 1 1 300px;
  }

  &--3 {
    margin-bottom: 4px;
  }
  &__cap {
    margin: 0 0 8px;
    font-size: 13px;
    color: #000;
  }
}
.nd-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;

  &--outer {
    background: #ff3b3b;
  }
  &--inner {
    background: #326fff;
  }
  &--content {
    background: #52c41a;
  }
}

/* ================= ① 三层解剖 ================= */
.nd-anatomy {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;

  &__stage {
    /* 舞台底色 = 透出外层 margin 的那一圈 */
    background: #fff1f0;
    padding: 0;
    border-radius: 6px;
    flex: 1 1 320px;
    min-width: 280px;
  }
  &__outer {
    // ① 外层：只管 margin / position / z-index
    @include nest-outer(16px, relative, 1);
    outline: 1px dashed #ff3b3b; // 示意用，真实层里不写
  }
  &__inner {
    // ② 中层：padding / background / radius
    @include nest-inner(18px, 6px, rgba(50, 111, 255, 0.12));
    outline: 1px dashed #326fff; // 示意用
  }
  &__content {
    // ③ 内层：纯内容 —— 真正的写法里这里只有文字，
    //    一行盒子样式都不写（只补 min-width: 0 防越界）
    @include nest-content;
    font-size: 13px;
    color: #000;
  }
}
.nd-legend {
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 0 0 300px;
  min-width: 260px;

  li {
    font-size: 13px;
    line-height: 1.5;
    color: #000;
    margin-bottom: 10px;
  }
  code {
    font-size: 12px;
  }
}

/* ================= ② 外层管 margin ================= */
/* ✗ 一锅烩：间距 + 外观写在同一个类上 */
.nd-flat {
  margin-bottom: 12px; // 间距和外观同层
  padding: 14px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  font-size: 13px;
  color: #000;
}
.nd-flat-list,
.nd-flat-grid {
  padding: 8px;
  border-radius: 6px;
  background: #fff1f0; // 浅红底：露出多出来的空隙
  outline: 1px dashed #ff3b3b;
}
.nd-flat-grid {
  // 网格上下文：卡片不该再带 margin，但要靠「同层覆盖」才消得掉
  @include grid-cols-equal(3, 12px);
}
.nd-flat-list .nd-flat {
  margin-bottom: 12px;
}
/* 这里故意【不写】覆盖规则：浅红空隙就是 .nd-flat 自带的 margin-bottom: 12px。
   要消掉它，只能再补一条 .nd-flat-grid .nd-flat { margin: 0 }（见下方代码块）——
   那条规则和 .nd-flat 在同一层，且会连带压掉外观。 */

/* ✓ 三层写法 */
.nd-card {
  // ① 外层：只写间距 + 定位
  @include nest-outer(0 0 12px, relative);

  // ② 中层：外壳
  &__inner {
    @include nest-inner(14px, 8px, #fff, 1px solid #ebeef5, $nest-shadow);
  }

  // ③ 内层：纯内容
  &__content {
    @include nest-content;
    font-size: 13px;
    color: #000;
  }
}
.nd-list {
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  outline: 1px dashed #52c41a;

  // 列表上下文：间隔 12px（外层默认值即此，这里显式写出来做对照）
  .nd-card {
    @include nest-outer(0 0 12px);
  }
}
.nd-card-grid {
  @include grid-cols-equal(3, 12px);
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  outline: 1px dashed #52c41a;

  // 网格上下文：间距交给 gap，外层 margin 归零 —— 只碰一个变量
  .nd-card {
    @include nest-outer(0);
  }
}

/* ================= ③ 中层管外壳 ================= */
/* ③-1 圆角与背景分层 → 直角 */
.nd-radius-bad {
  // 错：radius 在外层（外层没有背景，圆角无处生效）
  @include nest-outer(null, relative);
  border-radius: 8px;

  &__inner {
    // 背景在中层，中层自己是矩形
    @include nest-inner(14px, null, #326fff);
    color: #fff;
    font-size: 13px;
    text-align: center;
  }
}
.nd-radius-good {
  @include nest-outer(null, relative);

  &__inner {
    // 对：radius 与 background 同在中层
    @include nest-inner(14px, 8px, #326fff);
    color: #fff;
    font-size: 13px;
    text-align: center;
  }
}

/* ③-2 外层 overflow → 裁掉中层阴影 + 头图失圆角 */
.nd-clip-bad {
  // 错：外层加了 overflow: hidden
  @include nest-outer(0, relative);
  overflow: hidden;

  &__inner {
    // 中层只有 radius，没有 overflow —— 头图盖不到圆角，自己变直角
    @include nest-inner(null, 8px, #fff, null, $nest-shadow);
  }
  &__cover {
    // 内容：一块贴边头图（色块代替图片本身）
    height: 90px;
    background: linear-gradient(135deg, #326fff 0%, #6b9bff 100%);
    color: #fff;
    font-size: 13px;
    text-align: center;
    line-height: 90px;
  }
}
.nd-clip-good {
  // 对：外层不裁，交给中层
  @include nest-outer(0, relative);

  &__inner {
    @include nest-inner(null, null, #fff, null, $nest-shadow);
    @include nest-clip(8px); // overflow: hidden + radius，都只在中间这层
  }
  &__cover {
    // 同一块内容，一字未改
    height: 90px;
    background: linear-gradient(135deg, #326fff 0%, #6b9bff 100%);
    color: #fff;
    font-size: 13px;
    text-align: center;
    line-height: 90px;
  }
}

/* ================= ④ 内层纯内容 ================= */
.nd-skins {
  @include grid-auto-fit(200px, 14px);
}
.nd-skin {
  @include nest-outer(0, relative);

  // 内层：四种皮肤共用，零盒子样式
  &__content {
    @include nest-content;
    font-size: 13px;
  }
  &--card &__inner {
    @include nest-inner(16px, 8px, #fff, 1px solid #ebeef5, $nest-shadow);
  }
  &--outline &__inner {
    @include nest-inner(16px, 8px, transparent, 1px solid #326fff);
    color: #326fff;
  }
  &--brand &__inner {
    @include nest-inner(16px, 8px, #326fff);
    color: #fff;
  }
  &--dark &__inner {
    @include nest-inner(16px, 8px, #1f3a8a);
    color: #fff;
  }
}

/* ================= ⑤ z-index 在外层 ================= */
.nd-ov-correct,
.nd-ov-wrong {
  position: relative;
  height: 140px;
  border-radius: 6px;
  background: #fff;
  outline: 1px dashed #c0c4cc;
}
.nd-ov-correct {
  &__a {
    @include nest-outer(null, absolute, 1);
    top: 12px;
    left: 12px;
    width: 220px;
    transition: transform 0.2s ease;

    // hover 也走同一套逻辑（真实交互，不只靠开关）
    &:hover {
      @include nest-outer(null, absolute, 5);
      transform: translateY(-8px);
    }
  }
  // 错误示范：z-index 挂在中层
  &.is-up &__a {
    @include nest-outer(null, absolute, 5);
    transform: translateY(-8px);
  }
  &__b {
    @include nest-outer(null, absolute, 2);
    top: 42px;
    left: 150px;
    width: 220px;
  }
}
.nd-ov-wrong {
  &__a {
    @include nest-outer(null, absolute, 1);
    top: 12px;
    left: 12px;
    width: 220px;
  }
  &__b {
    @include nest-outer(null, absolute, 2);
    top: 42px;
    left: 150px;
    width: 220px;
  }
  &.is-up &__a &__inner {
    position: relative;
    z-index: 9; // 白写：跨不过 B 的外层 z-index: 2
  }
}
.nd-ov-correct__inner,
.nd-ov-wrong__inner {
  @include nest-inner(14px, 8px, #fff, 1px solid #326fff, $nest-shadow);
}
.nd-ov-correct__content,
.nd-ov-wrong__content {
  @include nest-content;
  font-size: 13px;
  color: #000;
  font-weight: 600;
}

/* ================= ⑥ hover 抬升 ================= */
.nd-lift {
  @include nest-outer(null, relative, 1);
  transition: transform 0.2s ease;

  &__inner {
    @include nest-inner(16px, 8px, #fff, 1px solid #ebeef5, $nest-shadow);
    transition: box-shadow 0.2s ease;
  }
  &__content {
    @include nest-content;
    font-size: 13px;
    color: #000;
  }
  // ✓ 位移写外层、阴影写中层，padding 恒定
  &--good:hover,
  &--good.is-up {
    transform: translateY(-6px);
  }
  &--good:hover .nd-lift__inner,
  &--good.is-up .nd-lift__inner {
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  }
  // ✗ hover 时改中层 padding → 内容被推着走
  &--bad:hover .nd-lift__inner,
  &--bad.is-up .nd-lift__inner {
    padding: 26px;
  }
}

/* ================= ⑦ 速查表 ================= */
.nd-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #000;

  th,
  td {
    border: 1px solid #ebeef5;
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    line-height: 1.6;
  }
  th {
    background: #eef3ff;
    font-weight: 600;
  }
  &__m {
    font-size: 12px;
    color: #909399;
  }
  code {
    font-size: 12px;
  }
}

/* ================= ⑧ 错误清单 ================= */
.nd-list-check {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    padding: 10px 0;
    border-bottom: 1px dashed #ebeef5;

    &:last-child {
      border-bottom: 0;
    }
  }
  &__bad {
    color: #ff3b3b;
    font-weight: 700;
    margin-right: 6px;
  }
  &__arrow {
    margin: 0 6px;
    color: #909399;
  }
  &__good {
    color: #52c41a;
    font-weight: 700;
    margin-right: 6px;
  }
  &__why {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: #606266;
  }
}
</style>
