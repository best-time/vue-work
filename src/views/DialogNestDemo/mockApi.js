/**
 * 弹窗嵌套 demo 的假接口。
 * 只有这里碰 setTimeout，业务弹窗组件一律 await，跟真实接口写法一致。
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ORDERS = [
  {
    id: 1001,
    orderNo: "SO-2026-1028-001",
    customer: "杭州云启科技",
    customerId: "C1003",
    amount: 128400,
    status: "待审核",
    city: "杭州",
  },
  {
    id: 1002,
    orderNo: "SO-2026-1028-002",
    customer: "上海临港贸易",
    customerId: "C1002",
    amount: 86500,
    status: "待审核",
    city: "上海",
  },
  {
    id: 1003,
    orderNo: "SO-2026-1028-003",
    customer: "深圳前海数据",
    customerId: "C1005",
    amount: 43200,
    status: "已发货",
    city: "深圳",
  },
  {
    id: 1004,
    orderNo: "SO-2026-1028-004",
    customer: "北京中关村智造",
    customerId: "C1001",
    amount: 219000,
    status: "待审核",
    city: "北京",
  },
];

const ITEMS = {
  1001: [
    { sku: "SKU-8801", name: "工业网关 G200", qty: 12, price: 6800 },
    { sku: "SKU-8802", name: "边缘计算盒 E5", qty: 6, price: 5200 },
    { sku: "SKU-9021", name: "安装服务（现场）", qty: 1, price: 12000 },
  ],
  1002: [
    { sku: "SKU-7710", name: "温湿度传感器 TH-3", qty: 200, price: 320 },
    { sku: "SKU-7711", name: "集中器 C1", qty: 5, price: 4200 },
  ],
  1003: [{ sku: "SKU-6602", name: "数据采集卡 DAQ-8", qty: 30, price: 1440 }],
  1004: [
    { sku: "SKU-8801", name: "工业网关 G200", qty: 25, price: 6800 },
    { sku: "SKU-5510", name: "机柜 42U", qty: 2, price: 23000 },
  ],
};

const CUSTOMERS = [
  { id: "C1001", name: "北京中关村智造", city: "北京", level: "A" },
  { id: "C1002", name: "上海临港贸易", city: "上海", level: "B" },
  { id: "C1003", name: "杭州云启科技", city: "杭州", level: "A" },
  { id: "C1004", name: "广州南方物联", city: "广州", level: "C" },
  { id: "C1005", name: "深圳前海数据", city: "深圳", level: "A" },
  { id: "C1006", name: "成都天府软件", city: "成都", level: "B" },
  { id: "C1007", name: "武汉光谷智能", city: "武汉", level: "C" },
  { id: "C1008", name: "南京江北新区", city: "南京", level: "B" },
];

let seq = 0;

export async function fetchOrders() {
  await delay(180);
  return ORDERS.map((o) => ({ ...o }));
}

export async function fetchOrderDetail(id) {
  await delay(260);
  const order = ORDERS.find((o) => o.id === Number(id));
  if (!order) throw new Error("订单不存在：" + id);
  return { ...order, items: (ITEMS[order.id] || []).map((i) => ({ ...i })) };
}

export async function searchCustomers(keyword) {
  await delay(320);
  const kw = String(keyword || "").trim();
  if (!kw) return CUSTOMERS.map((c) => ({ ...c }));
  return CUSTOMERS.filter(
    (c) => c.name.indexOf(kw) !== -1 || c.id.indexOf(kw.toUpperCase()) !== -1
  ).map((c) => ({ ...c }));
}

export async function createCustomer({ name, city }) {
  await delay(420);
  const n = String(name || "").trim();
  if (!n) throw new Error("客户名称不能为空");
  if (CUSTOMERS.some((c) => c.name === n))
    throw new Error("客户「" + n + "」已存在");
  const item = {
    id: "C" + (1100 + ++seq),
    name: n,
    city: city || "未填",
    level: "C",
  };
  CUSTOMERS.unshift(item);
  return { ...item };
}

export async function auditOrder(id, payload) {
  await delay(360);
  const order = ORDERS.find((o) => o.id === Number(id));
  if (!order) throw new Error("订单不存在");
  order.status = payload.result === "pass" ? "已发货" : "已取消";
  return { ...order };
}
