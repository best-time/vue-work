<template>
  <div class="ppt">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="结论：openLayer 只能用 props 递参数；进了弹窗以后，provide 就正常了"
    >
      <template slot="default">
        弹窗由 <code>stack.js</code> 里的 <code>new (Vue.extend(DialogHost))()</code>
        这个<b>独立根实例</b>渲染，所以页面级 provide 传不进去（下面 L1 里有一行实测）。
        传参因此只有两个动作：<b>跨宿主边界 = props</b>，<b>边界内部 = provide</b>。
      </template>
    </el-alert>

    <div class="ppt__flow">
      <div class="ppt__box">
        <b>页面 PassTab</b>
        <em>持有接口返回的 order 对象</em>
      </div>
      <i class="ppt__arrow el-icon-right" />
      <div class="ppt__box is-dialog">
        <b>L1 PassDialog</b>
        <em>props: order ／ provide: orderCtx</em>
      </div>
      <i class="ppt__arrow el-icon-right" />
      <div class="ppt__box">
        <b>PassMid</b>
        <em>0 props / 0 inject</em>
      </div>
      <i class="ppt__arrow el-icon-right" />
      <div class="ppt__box">
        <b>PassDeep</b>
        <em>inject: orderCtx</em>
      </div>
      <div class="ppt__back">
        L1 再开 L2 时：<code>props: { ctx }</code> —— 又跨了一次边界，provide 帮不上
      </div>
    </div>

    <div class="ppt__cols">
      <div class="ppt__col">
        <div class="ppt__hd">
          点一行打开 L1（<code>openLayer({ props: { order: row } })</code>）
        </div>
        <el-table
          ref="table"
          :data="list"
          size="mini"
          border
          highlight-current-row
          class="ppt__list"
        >
          <el-table-column prop="orderNo" label="订单号" min-width="150" />
          <el-table-column prop="customer" label="客户" min-width="120" />
          <el-table-column label="金额" width="100" align="right">
            <template slot-scope="{ row }"
              >¥ {{ row.amount.toLocaleString() }}</template
            >
          </el-table-column>
          <el-table-column width="90" align="center">
            <template slot-scope="{ row }">
              <el-button type="text" size="mini" @click="open(row)">打开</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="ppt__col">
        <div class="ppt__hd">L1 确定后的返回值（<code>resolve</code>）</div>
        <pre class="ppt__pre">{{ lastResult ? JSON.stringify(lastResult, null, 2) : "还没点确定" }}</pre>
      </div>
    </div>

    <div class="ppt__codes">
      <div class="ppt__code">
        <div class="ppt__code-hd">① 边界：props 递进去</div>
        <pre>
const res = await openLayer({
  component: PassDialog,
  props: { order: row },        // 接口返回的对象
});
if (!res) return;              // 取消</pre>
      </div>
      <div class="ppt__code">
        <div class="ppt__code-hd">② 内部：自己 provide 给子孙</div>
        <pre>
data() {
  return { ctx: Vue.observable({ order: this.order, discount: 0.95, coupon: 0 }) };
},
provide() {
  return { orderCtx: this.ctx };   // 一行，任意深度可 inject
},</pre>
      </div>
    </div>

    <ol class="ppt__notes">
      <li>
        <b><code>ctx</code> 必须放 <code>data()</code></b
        >：Vue 2 的初始化顺序是 <code>data → provide → created</code>，
        建在 <code>created</code> 里的话 <code>provide()</code> 早就取过值，永远是 <code>undefined</code>。
      </li>
      <li>
        <b>provide 本身不响应式</b>：传普通对象，深层改了只会改数据、不会重渲染；
        所以这里用 <code>Vue.observable</code> 包一层，并且<b>传引用不传拷贝</b>。
      </li>
      <li>
        <b>每跨一次弹窗边界要重传一次</b>：L1 开 L2 时 <code>props: { ctx: this.ctx }</code>，
        引用不变所以改的还是同一份。想省这一步，只能改宿主（上次那版 <code>LayerProvider</code>，不值得）。
      </li>
      <li>
        <b>改谁的数据分两种</b>：同一棵树内，深层 <code>inject</code> 到 <code>ctx</code>
        后直接改（本页的折扣就是，改完 L1 立刻重算）；<b>跨弹窗边界</b>则走
        <code>resolve</code> 返回值，由上层自己落到 <code>ctx</code> ——
        别在 L2 里直接改 <code>this.ctx.xxx</code>，数据流会说不清。
      </li>
    </ol>
  </div>
</template>

<script>
import { fetchOrders } from "../mockApi";
import { openLayer } from "../nest/stack";
import PassDialog from "../nest/dialogs/PassDialog";

export default {
  name: "PassTab",

  // 故意在页面 provide 一个标记：L1 里 inject 会显示「没拿到」，因为宿主是独立根实例
  provide() {
    return { pageCtx: "页面的 provide（进不来）" };
  },

  data() {
    return { list: [], lastResult: null };
  },

  async created() {
    this.list = await fetchOrders();
  },

  methods: {
    async open(row) {
      const res = await openLayer({
        title: "订单 " + row.orderNo,
        width: "620px",
        role: "PassDialog",
        component: PassDialog,
        props: { order: row },
      });
      if (!res) return;
      this.lastResult = res;
    },
  },
};
</script>

<style lang="scss" scoped>
.ppt {
  font-size: 13px;

  &__flow {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 20px;
    margin: 12px 0;
    background: #f9fbff;
    border: 1px solid #e3edff;
    border-radius: 6px;
  }

  &__box {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: #fff;
    border: 1px solid #dbe6ff;
    border-radius: 4px;

    b {
      font-size: 12px;
      color: #1f2d3d;
    }

    em {
      font-size: 11px;
      font-style: normal;
      color: #909399;
    }

    &.is-dialog {
      border-color: #326fff;
      box-shadow: 0 0 0 2px #eef3ff inset;
    }
  }

  &__arrow {
    flex: none;
    color: #a9c0ea;
  }

  &__back {
    position: absolute;
    right: 14px;
    bottom: 3px;
    font-size: 11px;
    color: #909399;
  }

  &__cols {
    display: flex;
    gap: 12px;

    > .ppt__col {
      flex: 1;
      min-width: 0;
    }
  }

  &__hd {
    margin-bottom: 6px;
    font-size: 12px;
    color: #5c6b8a;
  }

  &__pre {
    height: 136px;
    padding: 8px 10px;
    margin: 0;
    overflow: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #1f2d3d;
    background: #f7f9fc;
    border: 1px solid #eef1f6;
    border-radius: 4px;
    box-sizing: border-box;
  }

  &__codes {
    display: flex;
    gap: 12px;
    margin: 12px 0;
  }

  &__code {
    flex: 1;
    min-width: 0;

    pre {
      padding: 8px 10px;
      margin: 0;
      overflow: auto;
      font-family: Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.7;
      color: #2c3e50;
      background: #f7f9fc;
      border: 1px solid #eef1f6;
      border-radius: 4px;
    }
  }

  &__code-hd {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 600;
    color: #326fff;
  }

  &__notes {
    padding-left: 20px;
    margin: 0;
    font-size: 12px;
    line-height: 2;
    color: #5c6b8a;

    b {
      color: #1f2d3d;
    }
  }

  code {
    padding: 1px 4px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    color: #c7254e;
    background: #f7f4f5;
    border-radius: 2px;
  }
}
</style>
