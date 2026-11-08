import Vue from "vue";

/**
 * 全局事件总线：一个 new Vue() 就够了（Vue 自带 $on / $once / $off / $emit）。
 *
 * 为什么单独一个文件 export，而不是挂 Vue.prototype.$bus：
 *   1. 显式 import，谁在用看得见，不靠全局隐式约定；
 *   2. 事件名收成常量，避免两边字符串写错 —— 事件名写错**不报错**，
 *      只是永远收不到，是最难查的一类 bug；
 *   3. 单测里可以整块替换掉。
 *
 * 要记住它不是状态容器：晚挂载的组件收不到历史事件，
 * 「打开时的初值」仍然要用 props 传，bus 只负责「变化」。
 */
export const bus = new Vue();

export const EVENTS = {
  /** 改价：PricePanel → L1 摘要 / 页面日志 */
  PRICE: "eb:price",
  /** 选券：L2 弹窗 → L1 摘要 / PricePanel / 页面日志（跨了根实例） */
  COUPON: "eb:coupon",
  /** 时序测试：故意在 L1 挂载之前发 */
  EARLY: "eb:early",
  /** L1 mounted 时广播「我好了」，打开方等它再发 */
  READY: "eb:ready",
};

export const ALL_EVENTS = [
  EVENTS.PRICE,
  EVENTS.COUPON,
  EVENTS.EARLY,
  EVENTS.READY,
];

/**
 * 监听器体检：看每个事件上现在挂了多少个 handler。
 * demo 专用（_events 是 Vue 内部字段）：弹窗反复开关却忘了 $off，
 * 这里就会一直涨 —— 数字比任何解释都直观。
 */
export function listenerStats() {
  const map = bus._events || {};
  return ALL_EVENTS.map((name) => {
    const v = map[name];
    return { name, count: !v ? 0 : Array.isArray(v) ? v.length : 1 };
  });
}

/**
 * 等某一层弹窗挂载好 —— 用 READY 事件握手，别靠猜「几个 $nextTick」。
 * 超时返回 null。
 */
export function waitReady(timeout = 2000) {
  return new Promise((resolve) => {
    const done = (val) => {
      clearTimeout(timer);
      bus.$off(EVENTS.READY, onReady);
      resolve(val);
    };
    const onReady = (payload) => done(payload);
    const timer = setTimeout(() => done(null), timeout);
    bus.$on(EVENTS.READY, onReady);
  });
}

export default bus;
