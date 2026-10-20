/**
 * 模拟接口层（demo 专用）
 *
 * 两个接口正好构成「串行依赖」：
 *   ① fetchOrderList()            父组件调，返回订单列表（父组件的参数来源）
 *   ② fetchOrderShipment(params)  子组件调，**params 全部来自父组件传下来的对象**
 *
 * 三个刻意的实现细节，都是为了贴近真实后端：
 *   1. 有延迟（500~900ms）：能看到 loading 和「参数还没到」的空态；
 *   2. 每次返回**全新对象**（clone 深拷贝）：父子组件不共享引用，也才能触发子组件的非 deep watch；
 *   3. 支持 opts.fail 模拟失败，方便演示子组件的错误态与重试。
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 深拷贝：模拟「网络传输后拿到的是新对象」 */
export const clone = (value) => JSON.parse(JSON.stringify(value));

const SEED = [
  {
    orderNo: "A-1001",
    customerId: "C-88",
    customer: "张伟",
    city: "杭州",
    amount: 1280,
    status: "待发货",
    createdAt: "2026-10-19 10:24:11",
  },
  {
    orderNo: "A-1002",
    customerId: "C-91",
    customer: "李娜",
    city: "成都",
    amount: 640,
    status: "已发货",
    createdAt: "2026-10-19 14:02:38",
  },
  {
    orderNo: "A-1003",
    customerId: "C-77",
    customer: "王强",
    city: "深圳",
    amount: 2360,
    status: "已完成",
    createdAt: "2026-10-18 09:11:05",
  },
];

const CARRIERS = ["顺丰速运", "京东物流", "中通快递"];
const SKUS = [
  { sku: "SKU-9001", name: "人体工学椅 · 灰", qty: 1 },
  { sku: "SKU-9008", name: "升降桌 1.4m", qty: 1 },
  { sku: "SKU-9012", name: "显示器支架", qty: 2 },
];

const pad = (n) => (n < 10 ? "0" + n : String(n));
const nowText = () => {
  const d = new Date();
  return (
    pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())
  );
};

/**
 * ① 订单列表
 * @param {{ round?: number }} opts round 每加一次，金额就变一点 —— 用来演示
 *        「父组件重新拉列表 → 选中的那条换了新对象 → 子组件自动重新请求」
 */
export async function fetchOrderList(opts = {}) {
  const round = opts.round || 0;
  await sleep(520);
  return clone(
    SEED.map((order) => ({
      ...order,
      amount: order.amount + round * 100,
      version: round,
      updatedAt: nowText(),
    }))
  );
}

/**
 * ② 发货 / 物流明细（子组件调用）
 * @param {{ orderNo?: string, customerId?: string, round?: number }} params
 *        **全部字段都由父组件那个接口对象提供**
 * @param {{ fail?: boolean }} opts 模拟失败
 */
export async function fetchOrderShipment(params = {}, opts = {}) {
  const { orderNo, customerId, round = 0 } = params;
  await sleep(620 + Math.round(Math.random() * 280));

  if (!orderNo) throw new Error("缺少 orderNo：父组件的参数还没到");
  if (opts.fail) throw new Error("500 服务端异常（模拟失败）");
  if (!customerId) throw new Error("缺少 customerId：父组件的参数不完整");

  const idx = Math.max(
    0,
    SEED.findIndex((o) => o.orderNo === orderNo)
  );
  const base = SEED[idx];
  const count = 1 + (idx % 3);

  return {
    orderNo,
    customerId,
    // 回显本次查询用的参数，页面上直接展示「子组件拿父组件的参数去换了什么」
    query: { orderNo, customerId, round },
    summary: {
      carrier: CARRIERS[idx % CARRIERS.length],
      trackingNo: "SF" + (7300000000 + idx * 137 + round * 11),
      packages: count,
      eta: idx === 0 ? "2026-10-22 前送达" : "已签收",
    },
    // 服务端顺手带的客户信息，用来证明请求真的带着 customerId 过去的
    customer: { id: customerId, name: base.customer, city: base.city },
    shipments: SKUS.slice(0, count).map((sku, i) => ({
      ...sku,
      qty: i === 0 ? sku.qty : sku.qty,
      status: idx === 0 ? "待揽收" : "运输中",
      trackingNo: "SF" + (7300000000 + idx * 137 + round * 11) + "-" + (i + 1),
    })),
    serverTime: nowText(),
  };
}
