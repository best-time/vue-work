<template>
  <div class="gb-demo">
    <div class="gb-demo__head">
      <div>
        <h2 class="gb-demo__title">
          GridBox 栅格布局（props 驱动 · 无响应式）
        </h2>
        <p class="gb-demo__desc">
          CSS Grid 实现的公共布局组件：<b
            >列数 / 间隔 / 单元格最小最大宽度 / 容器宽度</b
          >
          全部通过 props 传入，不带断点、不监听 resize，改 props 即改布局。
        </p>
      </div>
      <div class="gb-demo__meta">
        <div>
          <code>&lt;grid-box&gt;</code> + <code>&lt;grid-box-item&gt;</code>
        </div>
        <div>需要窗口自适应请用响应式版 <code>/grid-layout</code></div>
      </div>
    </div>

    <!-- ① 基础：固定列数 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>① 基础用法 —— 固定列数</b>
        <code>cols="3" :gap="12"</code>
      </div>
      <grid-box :cols="3" :gap="12">
        <grid-box-item v-for="n in 6" :key="n">
          <div class="gb-demo__box">item {{ n }}</div>
        </grid-box-item>
      </grid-box>

      <p class="gb-demo__tip">
        子项不用写 span，按顺序自动铺满一行再换行（和 el-col 必须指定
        <code>:span</code> 不同）。 不传 <code>cols</code> 时默认 <b>3 列</b>。
      </p>
    </el-card>



    <!-- ② props 调参 playground -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>② 调参 playground —— 看 props 怎么落到 CSS 上</b>
        <code
          >cols / gap / min-col-width / max-col-width / max-width / center</code
        >
      </div>

      <el-form :inline="true" size="mini" class="gb-demo__form">
        <el-form-item label="列数">
          <el-input-number
            v-model="play.cols"
            :min="1"
            :max="8"
            :disabled="play.auto"
          />
        </el-form-item>
        <el-form-item label="间隔 gap">
          <el-input-number v-model="play.gap" :min="0" :max="60" />
        </el-form-item>
        <el-form-item label="最小列宽">
          <el-input-number
            v-model="play.minColWidth"
            :min="0"
            :max="600"
            :step="20"
          />
        </el-form-item>
        <el-form-item label="最大列宽">
          <el-input-number
            v-model="play.maxColWidth"
            :min="0"
            :max="800"
            :step="20"
          />
        </el-form-item>
        <el-form-item label="容器 max-width">
          <el-input-number
            v-model="play.maxWidth"
            :min="0"
            :max="2000"
            :step="50"
          />
        </el-form-item>
        <el-form-item label="居中">
          <el-switch v-model="play.center" />
        </el-form-item>
        <el-form-item label="按列宽自动列数">
          <el-switch v-model="play.auto" />
        </el-form-item>
      </el-form>

      <div class="gb-demo__code">{{ playCode }}</div>

      <grid-box
        :cols="playCols"
        :gap="play.gap"
        :min-col-width="play.minColWidth || undefined"
        :max-col-width="play.maxColWidth || undefined"
        :max-width="play.maxWidth || undefined"
        :justify-content="play.maxColWidth ? 'start' : undefined"
        :center="play.center"
        class="m-t-12"
      >
        <grid-box-item v-for="n in 7" :key="n">
          <div class="gb-demo__box gb-demo__box--solid">{{ n }}</div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        <code>cols</code> 是数字时 →
        <code>repeat(n, minmax(最小列宽, 最大列宽))</code>；
        打开「按列宽自动列数」→ <code>cols="auto"</code> →
        <code>repeat(auto-fit, minmax(...))</code>。 全部是内联
        style，页面里没有任何动态生成的 CSS。
      </p>
    </el-card>




    <!-- ③ 单元格宽度约束 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>③ 最小 / 最大宽度</b>
        <code>min-col-width="240" max-col-width="320"</code>
      </div>
      <grid-box :cols="4" :gap="12" min-col-width="220">
        <grid-box-item v-for="n in 4" :key="n">
          <div class="gb-demo__box">min 220 · {{ n }}</div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        只给 <code>min-col-width</code>：列不会窄于
        220px，容器不够就横向溢出（4×220+间距 &gt; 宽度时会溢出）。
      </p>

      <grid-box
        :cols="4"
        :gap="12"
        max-col-width="180"
        justify-content="center"
        class="m-t-12"
      >
        <grid-box-item v-for="n in 4" :key="n">
          <div class="gb-demo__box">max 180 · 居中 · {{ n }}</div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        只给 <code>max-col-width</code>：列最宽 180px，容器再宽也不拉伸 —— 配合
        <code>justify-content="center"</code> 让整组列居中（start /
        space-between 同理）。
      </p>

      <grid-box
        :cols="4"
        :gap="12"
        min-col-width="120"
        max-col-width="200"
        class="m-t-12"
      >
        <grid-box-item v-for="n in 4" :key="n">
          <div class="gb-demo__box">120 ~ 200 · {{ n }}</div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        两个都给：列在 <b>120px ~ 200px</b> 之间弹性伸缩（<code
          >minmax(120px, 200px)</code
        >）。
      </p>
    </el-card>




    <!-- ④ 按列宽自动列数 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>④ 由列宽反推列数</b>
        <code>cols="auto" min-col-width="200"</code>
      </div>
      <grid-box cols="auto" :gap="12" min-col-width="200">
        <grid-box-item v-for="n in 9" :key="n">
          <div class="gb-demo__box">auto {{ n }}</div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        <code>repeat(auto-fit, minmax(200px, 1fr))</code
        >：中间那几列若为空会被折叠、剩余列拉伸铺满。 换成
        <code>cols="auto-fill"</code> 则保留空轨道（列宽固定，右边留白）。
      </p>
    </el-card>

    <!-- ⑤ 容器宽度约束 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>⑤ 容器宽度约束</b>
        <code>max-width="720" center</code> / <code>width="480"</code> /
        <code>min-width="900"</code>
      </div>
      <grid-box :cols="3" :gap="12" max-width="720" center>
        <grid-box-item v-for="n in 3" :key="n">
          <div class="gb-demo__box gb-demo__box--solid">
            max-width 720 + center · {{ n }}
          </div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        <code>center</code> 就是 <code>margin: 0 auto</code>，常和
        <code>max-width</code> 一起用做限宽居中。
      </p>

      <grid-box :cols="2" :gap="12" width="480" align="start" class="m-t-12">
        <grid-box-item v-for="n in 2" :key="n">
          <div class="gb-demo__box">固定 width 480 · {{ n }}</div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        固定 <code>width</code> / 最小
        <code>min-width</code>（内容太窄时的保底宽度）都支持，数字自动补 px。
      </p>
    </el-card>

    <!-- ⑥ 间距与对齐 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>⑥ 间距与对齐</b>
        <code>:gap="[24, 8]" align="center" dense auto-rows="72px"</code>
      </div>
      <grid-box :cols="4" :gap="[24, 8]" align="center" auto-rows="72px">
        <grid-box-item v-for="n in 8" :key="n">
          <div class="gb-demo__box gb-demo__box--short">item {{ n }}</div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        <code>gap</code> 支持单值或 <code>[行间距, 列间距]</code>，也能用
        <code>row-gap</code> / <code>col-gap</code> 单独覆盖；<code>align</code>
        = align-items，<code>justify</code> = justify-items，<code
          >auto-rows</code
        >
        统一隐式行高。
      </p>

      <grid-box :cols="4" :gap="12" align="center" class="m-t-12">
        <grid-box-item
          ><div class="gb-demo__box gb-demo__box--short">
            默认 stretch
          </div></grid-box-item
        >
        <grid-box-item align="start">
          <div class="gb-demo__box gb-demo__box--short">自身 align=start</div>
        </grid-box-item>
        <grid-box-item align="end">
          <div class="gb-demo__box gb-demo__box--short">自身 align=end</div>
        </grid-box-item>
        <grid-box-item justify="center">
          <div class="gb-demo__box gb-demo__box--short gb-demo__box--narrow">
            justify=center
          </div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        子项也能用 <code>align</code> / <code>justify</code> 单独对齐自己。
      </p>
    </el-card>

    <!-- ⑦ 跨列 / 跨行 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>⑦ 跨列 / 跨行</b>
        <code>&lt;grid-box-item span="2" row-span="2"&gt;</code>
      </div>
      <grid-box :cols="4" :gap="12" auto-rows="72px">
        <grid-box-item span="2"
          ><div class="gb-demo__box">span 2</div></grid-box-item
        >
        <grid-box-item span="2"
          ><div class="gb-demo__box">span 2</div></grid-box-item
        >
        <grid-box-item row-span="2"
          ><div class="gb-demo__box">row-span 2</div></grid-box-item
        >
        <grid-box-item span="2"
          ><div class="gb-demo__box">span 2</div></grid-box-item
        >
        <grid-box-item><div class="gb-demo__box">1</div></grid-box-item>
        <grid-box-item span="full">
          <div class="gb-demo__box gb-demo__box--solid">
            span="full" 永远占满整行
          </div>
        </grid-box-item>
      </grid-box>
      <p class="gb-demo__tip">
        <code>span</code> 支持数字、<code>"full"</code>（=
        <code>1 / -1</code>）、 <code>"2 / 4"</code>（原样透传）；另有
        <code>start</code> / <code>row-start</code> 指定起点、
        <code>order</code> 调顺序、<code>min-width</code> /
        <code>max-width</code> 单独覆盖宽度。
      </p>
    </el-card>

    <!-- ⑧ 数据驱动 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>⑧ 数据驱动 —— items + 作用域插槽</b>
        <code>&lt;grid-box :items="list" v-slot="{ item, index }"&gt;</code>
      </div>
      <grid-box :items="users" :cols="3" :gap="12">
        <template #default="{ item, index }">
          <div class="gb-demo__user">
            <el-avatar :size="32">{{ item.name.slice(0, 1) }}</el-avatar>
            <div class="gb-demo__user-info">
              <div class="gb-demo__user-name">
                <span class="gb-demo__index">{{ index + 1 }}</span
                >{{ item.name }}
              </div>
              <div class="gb-demo__user-sub">
                {{ item.dept }} · 工号 {{ item.no }}
              </div>
            </div>
            <el-tag
              size="mini"
              :type="item.online ? 'success' : 'info'"
              effect="plain"
            >
              {{ item.online ? "在线" : "离线" }}aaa
            </el-tag>
          </div>
        </template>
      </grid-box>
      <p class="gb-demo__tip">
        跨列数默认读 <code>item.span</code>（可用
        <code>span-key</code> 改字段名），key 默认读 <code>item.id</code>（可用
        <code>item-key</code> 改）。
        <el-button type="text" size="mini" @click="users = []"
          >清空看空状态</el-button
        >
        <el-button type="text" size="mini" @click="users = defaultUsers.slice()"
          >恢复</el-button
        >
      </p>
      <grid-box :items="users" :cols="3" :gap="12" class="m-t-12">
        <template #empty>
          <div class="gb-demo__box gb-demo__box--plain">
            #empty 插槽：没有匹配的用户
          </div>
        </template>
      </grid-box>
    </el-card>

    <!-- ⑨ 实战 -->
    <el-card shadow="never" class="gb-demo__card">
      <div slot="header" class="gb-demo__card-head">
        <b>⑨ 实战：固定 4 列看板 + 固定 3 列查询表单</b>
        <code>:cols="4"</code> / <code>:cols="3" :gap="[0, 16]"</code>
      </div>
      <grid-box :cols="4" :gap="12" auto-rows="1fr">
        <grid-box-item v-for="m in metrics" :key="m.label">
          <div class="gb-demo__metric">
            <div class="gb-demo__metric-label">{{ m.label }}</div>
            <div class="gb-demo__metric-value">{{ m.value }}</div>
            <div
              class="gb-demo__metric-foot"
              :class="m.up ? 'is-up' : 'is-down'"
            >
              {{ m.up ? "▲" : "▼" }} {{ m.rate }}
              <span class="gb-demo__metric-sub">较昨日</span>
            </div>
          </div>
        </grid-box-item>
        <grid-box-item span="full">
          <div class="gb-demo__box gb-demo__box--plain">
            明细区：span="full" 跨满整行
          </div>
        </grid-box-item>
      </grid-box>

      <el-form label-position="top" size="small" class="m-t-16">
        <grid-box :cols="3" :gap="[0, 16]">
          <grid-box-item
            v-for="f in formFields"
            :key="f.prop"
            :span="f.full ? 'full' : undefined"
          >
            <el-form-item :label="f.label">
              <el-input
                v-if="f.type === 'input'"
                v-model="form[f.prop]"
                clearable
              />
              <el-select v-else v-model="form[f.prop]" style="width: 100%">
                <el-option
                  v-for="o in f.options"
                  :key="o"
                  :label="o"
                  :value="o"
                />
              </el-select>
            </el-form-item>
          </grid-box-item>
          <grid-box-item span="full">
            <div class="gb-demo__form-actions">
              <span class="gb-demo__tip"
                >当前表单值：{{ JSON.stringify(form) }}</span
              >
              <div>
                <el-button size="mini" @click="resetForm">重置</el-button>
                <el-button size="mini" type="primary" @click="search"
                  >查询</el-button
                >
              </div>
            </div>
          </grid-box-item>
        </grid-box>
      </el-form>
    </el-card>
  </div>
</template>

<script>
/** 用户列表初始数据（清空演示后用来恢复） */
const DEFAULT_USERS = [
  { id: 1, name: "张三", dept: "研发部", no: "A1001", online: true },
  { id: 2, name: "李四", dept: "产品部", no: "A1002", online: false },
  { id: 3, name: "王五", dept: "设计部", no: "A1003", online: true },
  { id: 4, name: "赵六", dept: "测试部", no: "A1004", online: true, span: 2 },
];

export default {
  name: "GridBoxDemoPage",
  data() {
    return {
      /** playground 参数 */
      play: {
        cols: 4,
        gap: 12,
        minColWidth: 0,
        maxColWidth: 0,
        maxWidth: 0,
        center: false,
        auto: false,
      },
      defaultUsers: DEFAULT_USERS,
      users: DEFAULT_USERS.slice(),
      metrics: [
        { label: "今日新增用户", value: "1,284", rate: "12.4%", up: true },
        { label: "活跃用户", value: "8,921", rate: "3.1%", up: true },
        { label: "订单金额", value: "¥ 92,340", rate: "1.8%", up: false },
        { label: "转化率", value: "23.6%", rate: "0.9%", up: true },
      ],
      formFields: [
        { prop: "keyword", label: "关键字", type: "input" },
        {
          prop: "dept",
          label: "部门",
          type: "select",
          options: ["研发部", "产品部", "设计部"],
        },
        {
          prop: "status",
          label: "状态",
          type: "select",
          options: ["在职", "离职"],
        },
        { prop: "owner", label: "负责人", type: "input" },
        { prop: "city", label: "城市", type: "input" },
        { prop: "remark", label: "备注", type: "input", full: true },
      ],
      form: {},
    };
  },
  computed: {
    /** auto 打开时走 'auto'，否则走数字列数 */
    playCols() {
      return this.play.auto ? "auto" : this.play.cols;
    },
    /** 把当前 playground 参数拼成一段可直接复制的模板代码 */
    playCode() {
      const p = this.play;
      const attrs = [`cols="${this.playCols}"`];
      if (p.gap !== 16) attrs.push(`:gap="${p.gap}"`);
      if (p.minColWidth) attrs.push(`min-col-width="${p.minColWidth}"`);
      if (p.maxColWidth) attrs.push(`max-col-width="${p.maxColWidth}"`);
      if (p.maxWidth) attrs.push(`max-width="${p.maxWidth}"`);
      if (p.maxColWidth) attrs.push('justify-content="start"');
      if (p.center) attrs.push("center");
      return `<grid-box ${attrs.join(
        " "
      )}>\n  <grid-box-item>…</grid-box-item>\n</grid-box>`;
    },
  },
  created() {
    this.resetForm();
  },
  methods: {
    resetForm() {
      this.form = {
        keyword: "",
        dept: "",
        status: "在职",
        owner: "",
        city: "",
        remark: "",
      };
    },
    search() {
      this.$message.success(`查询：${JSON.stringify(this.form)}`);
      console.log(
        "[GridBox demo] 查询条件：",
        JSON.parse(JSON.stringify(this.form))
      );
    },
  },
};
</script>

<style lang="scss" scoped>
.gb-demo {
  padding: 16px;
  background: #f7fafd;
  min-height: 100%;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  &__title {
    margin: 0 0 6px;
    font-size: 20px;
    color: #333;
  }

  &__desc {
    margin: 0;
    max-width: 720px;
    font-size: 13px;
    line-height: 20px;
    color: #666;
  }

  &__meta {
    flex: none;
    font-size: 12px;
    line-height: 20px;
    color: #909399;
    text-align: right;

    code {
      padding: 0 4px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 2px;
    }
  }

  &__card {
    margin-bottom: 16px;
  }

  &__card-head {
    display: flex;
    align-items: center;
    gap: 10px;

    b {
      color: #333;
    }

    code {
      padding: 1px 6px;
      font-size: 12px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__form {
    margin-bottom: 4px;

    ::v-deep .el-form-item {
      margin-bottom: 8px;
    }
  }

  &__code {
    margin-bottom: 4px;
    padding: 8px 10px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 18px;
    color: #326fff;
    white-space: pre-wrap;
    background: #f5f7fa;
    border-left: 3px solid #326fff;
    border-radius: 3px;
  }

  &__tip {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 20px;
    color: #333;

    code {
      padding: 0 4px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 2px;
    }
  }

  &__box {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    height: 100%;
    padding: 8px;
    font-size: 12px;
    color: #326fff;
    text-align: center;
    background: #f0f5ff;
    border: 1px dashed #adc6ff;
    border-radius: 4px;
    box-sizing: border-box;

    &--solid {
      color: #fff;
      background: #326fff;
      border-style: solid;
      border-color: #326fff;
    }

    &--short {
      min-height: 32px;
    }

    &--narrow {
      width: 60%;
    }

    &--plain {
      color: #666;
      background: #fafafa;
      border-color: #e4e7ed;
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }

  &__user-info {
    flex: 1;
    min-width: 0;
  }

  &__user-name {
    font-size: 13px;
    color: #333;
  }

  &__user-sub {
    margin-top: 2px;
    font-size: 12px;
    color: #909399;
  }

  &__index {
    display: inline-block;
    min-width: 16px;
    margin-right: 6px;
    font-size: 11px;
    color: #fff;
    text-align: center;
    background: #c0c4cc;
    border-radius: 8px;
  }

  &__metric {
    padding: 14px 16px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }

  &__metric-label {
    font-size: 12px;
    color: #909399;
  }

  &__metric-value {
    margin: 6px 0 4px;
    font-size: 22px;
    font-weight: 600;
    color: #333;
  }

  &__metric-foot {
    font-size: 12px;

    &.is-up {
      color: #ff3b3b; // 涨用红（国内习惯）
    }

    &.is-down {
      color: #52c41a;
    }
  }

  &__metric-sub {
    margin-left: 4px;
    color: #c0c4cc;
  }

  &__form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 4px;
  }
}
</style>
