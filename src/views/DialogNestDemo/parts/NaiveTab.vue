<template>
  <div class="nvt">
    <el-row :gutter="14">
      <el-col :span="12">
        <el-card shadow="never" class="nvt__card">
          <div slot="header" class="nvt__head">
            <code>反例：4 层都写在这一个文件里</code>
            <span class="nvt__tip">4 个布尔值，16 种组合</span>
          </div>

          <div class="nvt__bools">
            <el-tag
              v-for="b in bools"
              :key="b.k"
              size="small"
              :type="b.v ? 'success' : 'info'"
              class="nvt__bool"
            >
              {{ b.k }} = {{ b.v }}
            </el-tag>
          </div>

          <div class="nvt__acts">
            <el-button size="small" type="primary" @click="openAll"
              >连开 4 层</el-button
            >
            <el-button size="small" @click="v2 = false">只关第 2 层</el-button>
            <el-button size="small" @click="v1 = false">只关第 1 层</el-button>
            <el-button size="small" @click="reset">全部重置</el-button>
          </div>

          <p class="nvt__hint">
            试着点「只关第 2 层」：第 3、4 层还在屏幕上，因为它们的
            <code>v3 / v4</code> 没人改。
            真实项目里这就是用户说的「我点了取消，弹窗还在」。
          </p>

          <el-alert
            v-if="orphan"
            type="warning"
            :closable="false"
            show-icon
            :title="'当前有 ' + orphan + ' 层「父级已经关了」的弹窗还浮着'"
          />

          <div class="nvt__code">{{ naiveCode }}</div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never" class="nvt__card">
          <div slot="header" class="nvt__head">
            <code>为什么 3 层以上不要这么写</code>
          </div>

          <div class="nvt__item" v-for="(p, i) in problems" :key="i">
            <span class="nvt__no">{{ i + 1 }}</span>
            <div class="nvt__item-body">
              <div class="nvt__item-title">{{ p.t }}</div>
              <div class="nvt__item-desc">{{ p.d }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ============ 反例本体：4 层 el-dialog 挤在一个组件里 ============ -->
    <el-dialog
      title="第 1 层 · 订单详情"
      width="620px"
      :visible.sync="v1"
      append-to-body
      custom-class="nvt__box"
    >
      <p class="nvt__body-tip">
        这一层要把 <code>customer</code> 传给下一层，还要接收下面三层的改动。
      </p>
      <el-form size="small" label-width="76px">
        <el-form-item label="客户">
          <el-input v-model="customer.name" />
        </el-form-item>
      </el-form>
      <div class="nvt__foot">
        <el-button size="small" @click="v1 = false">关本层</el-button>
        <el-button size="small" type="primary" @click="v2 = true"
          >审核 →</el-button
        >
      </div>
    </el-dialog>

    <el-dialog
      title="第 2 层 · 审核"
      width="580px"
      :visible.sync="v2"
      append-to-body
      custom-class="nvt__box"
    >
      <p class="nvt__body-tip">
        要改客户，得开第 3 层；第 3 层还要开第 4 层。改动怎么回到第 1 层？
      </p>
      <el-form size="small" label-width="76px">
        <el-form-item label="客户">
          <el-input v-model="customer.name" />
        </el-form-item>
        <el-form-item label="意见">
          <el-input v-model="remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <div class="nvt__foot">
        <el-button size="small" @click="v2 = false">关本层</el-button>
        <el-button size="small" @click="v3 = true">更换客户 →</el-button>
        <el-button size="small" type="primary" @click="submitNaive"
          >提交</el-button
        >
      </div>
    </el-dialog>

    <el-dialog
      title="第 3 层 · 选择客户"
      width="540px"
      :visible.sync="v3"
      append-to-body
      custom-class="nvt__box"
    >
      <el-radio-group v-model="customer.id">
        <el-radio
          v-for="c in customers"
          :key="c.id"
          :label="c.id"
          class="nvt__radio"
        >
          {{ c.name }}（{{ c.id }}）
        </el-radio>
      </el-radio-group>
      <div class="nvt__foot">
        <el-button size="small" @click="v3 = false">关本层</el-button>
        <el-button size="small" @click="v4 = true">新建客户 →</el-button>
        <el-button size="small" type="primary" @click="v3 = false"
          >确定</el-button
        >
      </div>
    </el-dialog>

    <el-dialog
      title="第 4 层 · 新建客户"
      width="460px"
      :visible.sync="v4"
      append-to-body
      custom-class="nvt__box"
    >
      <el-form size="small" label-width="76px">
        <el-form-item label="名称">
          <el-input v-model="newName" placeholder="新建后要手动塞回第 3 层" />
        </el-form-item>
      </el-form>
      <div class="nvt__foot">
        <el-button size="small" @click="v4 = false">关本层</el-button>
        <el-button size="small" type="primary" @click="createNaive"
          >创建并关闭</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { searchCustomers } from "../mockApi";

export default {
  name: "NaiveTab",

  data() {
    return {
      v1: false,
      v2: false,
      v3: false,
      v4: false,
      remark: "",
      newName: "",
      customer: { id: "C1003", name: "杭州云启科技" },
      customers: [],
      problems: [
        {
          t: "可见性没有父子关系",
          d: "4 个独立布尔值，只改其中一个，另外三个不知道。关第 1 层不会关第 2~4 层，屏幕上就留下无主弹窗。",
        },
        {
          t: "关闭顺序要手写",
          d: "「关全部」得写 v4=false; v3=false; v2=false; v1=false，还要等动画，否则遮罩闪烁。",
        },
        {
          t: "数据要钻透 4 层",
          d: "第 4 层新建的客户要回到第 1 层，得 $emit 三次、每层再 $emit 一次，中间任何一层写错就丢。",
        },
        {
          t: "转场没有中间态",
          d: "「关掉第 2 层后重新打开」这种需求，无法表达「第 3 层还没关完」，只能靠 setTimeout 猜 300ms。",
        },
        {
          t: "组件没法拆",
          d: "所有层都在一个文件里，模板 600 行、data 20 个字段，改一层要看整个文件；也无法给别的页面复用。",
        },
      ],
      naiveCode: [
        "data() {",
        "  return { v1: false, v2: false, v3: false, v4: false }",
        "}",
        "",
        "// 关第 1 层时，还得记得手写：",
        "closeAll() {",
        "  this.v4 = false",
        "  setTimeout(() => {",
        "    this.v3 = false",
        "    this.v2 = false",
        "    this.v1 = false",
        "  }, 300)   // 300 是动画时长，改主题就废",
        "}",
      ].join("\n"),
    };
  },

  computed: {
    bools() {
      return [
        { k: "v1", v: this.v1 },
        { k: "v2", v: this.v2 },
        { k: "v3", v: this.v3 },
        { k: "v4", v: this.v4 },
      ];
    },
    /** 有下层开着、但它的上层已经关了 —— 就是无主弹窗 */
    orphan() {
      if (!this.v1 && (this.v2 || this.v3 || this.v4))
        return [this.v2, this.v3, this.v4].filter(Boolean).length;
      if (!this.v2 && (this.v3 || this.v4))
        return [this.v3, this.v4].filter(Boolean).length;
      if (!this.v3 && this.v4) return 1;
      return 0;
    },
  },

  created() {
    searchCustomers("").then((list) => {
      this.customers = list;
    });
  },

  methods: {
    openAll() {
      this.v1 = true;
      this.$nextTick(() => {
        this.v2 = true;
        this.$nextTick(() => {
          this.v3 = true;
          this.$nextTick(() => {
            this.v4 = true;
          });
        });
      });
    },

    reset() {
      this.v1 = this.v2 = this.v3 = this.v4 = false;
    },

    submitNaive() {
      // 真实项目里这里还要把第 4 层的客户名一路带回去
      this.$message.success("提交（客户=" + this.customer.name + "）");
      this.v2 = false;
    },

    createNaive() {
      if (!this.newName) {
        this.$message.warning("请输入名称");
        return;
      }
      this.customer = {
        id: "C" + Math.floor(9000 + Math.random() * 999),
        name: this.newName,
      };
      this.newName = "";
      this.v4 = false;
      // 还要手动把 v3 的列表补上 —— 这一步最容易漏
      this.customers = [this.customer, ...this.customers];
      this.$message.success("已创建并塞回第 3 层，但第 1 层的显示没变");
    },
  },
};
</script>

<style lang="scss" scoped>
.nvt {
  &__card {
    height: 100%;
    border-radius: 6px;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    code {
      font-size: 13px;
      color: #326fff;
    }
  }

  &__tip {
    font-size: 12px;
    color: #909399;
  }

  &__bools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__bool {
    font-family: Menlo, Consolas, monospace;
  }

  &__acts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__hint {
    margin: 12px 0;
    font-size: 12px;
    line-height: 1.8;
    color: #909399;

    code {
      padding: 0 3px;
      color: #5c6b8a;
      background: #f2f4f8;
      border-radius: 2px;
    }
  }

  &__code {
    max-height: 210px;
    overflow: auto;
    padding: 10px 12px;
    margin-top: 12px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.75;
    color: #2c3e50;
    white-space: pre;
    background: #f6f8fa;
    border: 1px solid #eaeef2;
    border-radius: 4px;
  }

  &__item {
    display: flex;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px dashed #f0f2f5;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__no {
    flex: none;
    width: 18px;
    height: 18px;
    margin-top: 1px;
    font-size: 11px;
    line-height: 18px;
    color: #fff;
    text-align: center;
    background: #f56c6c;
    border-radius: 50%;
  }

  &__item-title {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  &__item-desc {
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.75;
    color: #909399;
  }

  &__body-tip {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.8;
    color: #909399;
  }

  &__foot {
    display: flex;
    gap: 8px;
    padding-top: 10px;
    text-align: right;
    border-top: 1px solid #ebeef5;

    .el-button + .el-button {
      margin-left: 0;
    }

    .el-button:first-child {
      margin-right: auto;
    }
  }

  &__radio {
    display: block;
    margin: 6px 0;
  }
}
</style>
