<template>
  <div class="ebx">
    <el-card shadow="never">
      <div class="ebx__top">
        <h2 class="ebx__h2">openLayer 打开的弹窗，用 eventBus（new Vue()）跨组件传参</h2>
        <el-tag size="mini" type="success">4 个组件共用一条总线</el-tag>
      </div>

      <p class="ebx__lead">
        弹窗由 <code>stack.js</code> 里 <code>new (Vue.extend(DialogHost))()</code> 这个
        <b>独立根实例</b>渲染，所以 <code>provide / inject</code> 在「页面 ↔ 弹窗」这一跳是断的。
        事件总线不依赖 <code>$parent</code> 链，只要 import 同一个 <code>new Vue()</code>
        就能互相喊话 —— 这是它相对 provide 唯一不可替代的地方。
      </p>

      <div class="ebx__flow">
        <div class="ebx__box">
          <b>页面 EventBusDemo</b>
          <em>$on 全部事件 → 日志 / 体检</em>
        </div>
        <i class="ebx__arrow el-icon-right" />
        <div class="ebx__box is-dialog">
          <b>L1 OrderDialog</b>
          <em>props: order ／ $on price·coupon·early</em>
        </div>
        <i class="ebx__arrow el-icon-right" />
        <div class="ebx__box">
          <b>PricePanel</b>
          <em>$emit price ／ $on coupon</em>
        </div>
        <i class="ebx__arrow el-icon-right" />
        <div class="ebx__box is-dialog">
          <b>L2 CouponDialog</b>
          <em>$emit coupon（零 props）</em>
        </div>
        <div class="ebx__bus">
          <i class="el-icon-connection" />
          这四个之间的横线全部走同一个 bus，跟谁是谁的父组件无关
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="ebx__card">
      <div class="ebx__cols">
        <div class="ebx__col">
          <div class="ebx__hd">点一行打开 L1（<code>openLayer({ props: { order } })</code>）</div>
          <el-table :data="list" size="mini" border class="ebx__list">
            <el-table-column prop="orderNo" label="订单号" min-width="150" />
            <el-table-column prop="customer" label="客户" min-width="110" />
            <el-table-column label="金额" width="96" align="right">
              <template slot-scope="{ row }"
                >¥ {{ row.amount.toLocaleString() }}</template
              >
            </el-table-column>
            <el-table-column width="76" align="center">
              <template slot-scope="{ row }">
                <el-button type="text" size="mini" @click="open(row)">打开</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="ebx__tools">
            <el-button size="mini" @click="testEarly">打开后立刻 emit</el-button>
            <el-button size="mini" @click="testAfterReady">等 eb:ready 再 emit</el-button>
            <span class="ebx__tip">{{ tip }}</span>
          </div>

          <div class="ebx__result">
            <div class="ebx__hd">L1 确定的返回值</div>
            <pre class="ebx__pre">{{ lastResult ? JSON.stringify(lastResult, null, 2) : "还没点确定" }}</pre>
          </div>
        </div>

        <div class="ebx__col">
          <div class="ebx__hd">监听器体检（<code>bus._events</code> 实时快照）</div>
          <div class="ebx__stats">
            <div
              v-for="s in stats"
              :key="s.name"
              class="ebx__stat"
              :data-name="s.name"
              :data-count="s.count"
            >
              <span class="ebx__stat-name">{{ s.name }}</span>
              <span class="ebx__stat-bar">
                <i :style="{ width: Math.min(100, (s.count / 8) * 100) + '%' }" />
              </span>
              <span class="ebx__stat-n">{{ s.count }}</span>
            </div>
          </div>
          <p class="ebx__note">
            打开弹窗 → 数字上升；关掉 → 必须<b>回到基线</b>。不回落就是忘了
            <code>$off</code>，弹窗开几次就执行几遍。
          </p>

          <event-log :names="allEvents" title="页面日志（弹窗里 emit 的也收得到）" />
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="ebx__card">
      <div slot="header" class="ebx__hd">写法与四条注意点</div>

      <div class="ebx__codes">
        <div class="ebx__code">
          <div class="ebx__code-hd">① 总线 + 事件名常量</div>
          <pre>
export const bus = new Vue();

export const EVENTS = {
  PRICE: "eb:price",
  COUPON: "eb:coupon",
  READY: "eb:ready",
};</pre>
        </div>
        <div class="ebx__code">
          <div class="ebx__code-hd">② 发：谁都可以发，不用知道谁在听</div>
          <pre>
// L2 弹窗里选券
bus.$emit(EVENTS.COUPON, { off: 2000 });</pre>
        </div>
        <div class="ebx__code">
          <div class="ebx__code-hd">③ 收：created 挂、beforeDestroy 摘</div>
          <pre>
created() {
  bus.$on(EVENTS.PRICE, this.onPrice);   // 具名方法
},
beforeDestroy() {
  bus.$off(EVENTS.PRICE, this.onPrice);  // 同一引用
},</pre>
        </div>
      </div>

      <ol class="ebx__notes">
        <li>
          <b><code>$on</code> 必须配 <code>$off</code>，且要传同一引用</b>：弹窗每开一次就是一个新实例，
          不摘监听会一直挂在 bus 上（右边那个体检表会从 1 涨到 n，改一次价执行 n 遍）。
          内联箭头函数摘不掉 —— <code>$off</code> 比的是函数引用。
        </li>
        <li>
          <b>bus 不存状态</b>：晚挂载的组件收不到历史事件。所以「打开时的初值」仍用
          <code>props</code> 传（本页 PricePanel 的 <code>:initial</code>），bus 只负责「变化」。
        </li>
        <li>
          <b>时序要靠握手，不要猜 tick</b>：<code>openLayer()</code> 之后组件要等下一帧才
          <code>created</code>，这一刻同步 <code>$emit</code> 会丢。用上面的两个按钮对比：
          「立刻 emit」→ L1 的计数恒为 0；「等 <code>eb:ready</code> 再 emit」→ 变 1。
        </li>
        <li>
          <b>bus 是全局单例，别拿它当 store，也别拿它传归属关系</b>：谁打开的谁、表单校验状态这类
          有主的
          数据用 <code>props / resolve</code>；跨组件共享的可变数据用 <code>Vue.observable</code>
          更安全（可追踪、可重放）。事件名统一加前缀（这里用 <code>eb:</code>），避免和别人的撞。
        </li>
      </ol>
    </el-card>
  </div>
</template>

<script>
import { bus, EVENTS, ALL_EVENTS, listenerStats, waitReady } from "./bus";
import { openLayer, closeAll } from "@/views/DialogNestDemo/nest/stack";
import OrderDialog from "./dialogs/OrderDialog";
import EventLog from "./parts/EventLog";

const ORDERS = [
  { id: 1001, orderNo: "SO-2026-1029-001", customer: "杭州云启科技", city: "杭州", amount: 128400 },
  { id: 1002, orderNo: "SO-2026-1029-002", customer: "上海临港贸易", city: "上海", amount: 86500 },
  { id: 1003, orderNo: "SO-2026-1029-003", customer: "深圳前海数据", city: "深圳", amount: 43200 },
  { id: 1004, orderNo: "SO-2026-1029-004", customer: "北京中关村智造", city: "北京", amount: 219000 },
];

export default {
  name: "EventBusDemoPage",

  components: { EventLog },

  data() {
    return {
      list: ORDERS.map((o) => ({ ...o })),
      stats: [],
      tip: "",
      lastResult: null,
      allEvents: ALL_EVENTS,
      timer: null,
    };
  },

  created() {
    this.refresh();
    // 体检表每 800ms 刷一次（demo 用；真实项目不需要轮询，按需打日志即可）
    this.timer = setInterval(this.refresh, 800);
  },

  mounted() {
    // created 时子组件的 $on 还没执行（子晚于父 created），这时刷出来全是 0，
    // 所以 mounted 再刷一次 —— 此时 EventLog 都已经挂上了
    this.refresh();
  },

  beforeDestroy() {
    clearInterval(this.timer);
    closeAll();
  },

  methods: {
    refresh() {
      this.stats = listenerStats();
    },

    async open(row) {
      const res = await openLayer({
        title: "订单 " + row.orderNo,
        width: "640px",
        role: "OrderDialog",
        component: OrderDialog,
        props: { order: row },
      });
      if (!res) return;
      this.lastResult = res;
    },

    /**
     * 反例：openLayer 只是往栈里 push 一层，组件要等下一帧才 created，
     * 这里同步 emit，L1 的 $on 还没挂上 → 事件直接丢（页面的日志能收到，L1 收不到）。
     */
    async testEarly() {
      await this.reset();
      openLayer({
        title: "时序测试 · 立刻 emit",
        width: "640px",
        role: "OrderDialog",
        component: OrderDialog,
        props: { order: this.list[0] },
      });
      bus.$emit(EVENTS.EARLY, { at: Date.now(), note: "同步 emit（挂载前）" });
      this.tip = "已同步 emit → L1 里「收到 eb:early」应为 0 次";
    },

    /** 正例：等 L1 mounted 广播的 eb:ready，再发 */
    async testAfterReady() {
      await this.reset();
      openLayer({
        title: "时序测试 · 等 ready 再 emit",
        width: "640px",
        role: "OrderDialog",
        component: OrderDialog,
        props: { order: this.list[0] },
      });
      const r = await waitReady();
      bus.$emit(EVENTS.EARLY, { at: Date.now(), note: "eb:ready 之后 emit" });
      this.tip = r ? "等到 eb:ready 再发 → L1 里应为 1 次" : "等 eb:ready 超时（2s）";
    },

    async reset() {
      this.tip = "";
      closeAll();
      await this.$nextTick();
    },
  },
};
</script>

<style lang="scss" scoped>
.ebx {
  min-height: 100vh;
  padding: 16px;
  font-size: 13px;
  background: #f5f6f8;
  box-sizing: border-box;

  &__top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__lead {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.9;
    color: #5c6b8a;

    b {
      color: #326fff;
    }
  }

  &__flow {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 22px;
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
      box-shadow: inset 0 0 0 2px #eef3ff;
    }
  }

  &__arrow {
    flex: none;
    color: #a9c0ea;
  }

  &__bus {
    position: absolute;
    right: 14px;
    bottom: 3px;
    font-size: 11px;
    color: #909399;

    i {
      margin-right: 4px;
      color: #326fff;
    }
  }

  &__card {
    margin-top: 14px;
  }

  &__cols {
    display: flex;
    gap: 16px;

    > .ebx__col {
      flex: 1;
      min-width: 0;
    }
  }

  &__hd {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__tools {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  &__tip {
    font-size: 12px;
    color: #e6a23c;
  }

  &__result {
    margin-top: 12px;
  }

  &__pre {
    height: 112px;
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

  &__stats {
    padding: 6px 10px;
    background: #f9fbfd;
    border: 1px solid #eef1f6;
    border-radius: 6px;
  }

  &__stat {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 12px;
  }

  &__stat-name {
    width: 92px;
    font-family: Menlo, Consolas, monospace;
    color: #326fff;
  }

  &__stat-bar {
    flex: 1;
    height: 6px;
    overflow: hidden;
    background: #eef1f6;
    border-radius: 3px;

    i {
      display: block;
      height: 100%;
      background: #326fff;
      border-radius: 3px;
      transition: width 0.25s;
    }
  }

  &__stat-n {
    width: 22px;
    font-weight: 600;
    color: #1f2d3d;
    text-align: right;
  }

  &__note {
    margin: 8px 0;
    font-size: 12px;
    line-height: 1.7;
    color: #909399;

    b {
      color: #1f2d3d;
    }
  }

  &__codes {
    display: flex;
    gap: 12px;
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
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 1.9;
    color: #5c6b8a;
    // 项目 reset.css 清了 list-style，这里要显式恢复序号
    list-style: decimal;

    li {
      margin-bottom: 6px;
      list-style: decimal;
    }

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
