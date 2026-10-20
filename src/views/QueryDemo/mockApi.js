/**
 * 模拟接口层（搜索条件用例专用）
 *
 * 三个接口对应页面上的三个子组件：
 *   ① fetchOptions()               搜索项子组件挂载时拉下拉选项
 *   ② fetchOverview(query)         总览子组件：用搜索参数算汇总（订单数/金额/待发货/异常）
 *   ③ fetchOrderList(query, page)  表格子组件：用同一份搜索参数拉分页列表
 *
 * 数据是**确定性生成**的（不用 Math.random），所以同一个条件每次返回都一样，
 * 方便肉眼核对「总览的 total」和「列表的 total」是否一致。
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pad = (n) => (n < 10 ? "0" + n : String(n));

const STATUSES = ["待付款", "待发货", "已发货", "已完成", "已取消"];
const CITIES = ["杭州", "成都", "深圳", "北京", "上海"];
/** 城市池（杭州出现两次 → 分布有梯度，总览的 TOP3 才不会三家并列） */
const CITY_POOL = ["杭州", "杭州", "成都", "深圳", "上海", "北京"];
const NAMES = ["张伟", "李娜", "王强", "刘洋", "陈静", "赵磊", "周敏"];

/** 68 条固定数据 */
const ALL = Array.from({ length: 68 }).map((_, i) => {
  const day = 1 + (i % 28);
  const date = "2026-10-" + pad(day);
  return {
    id: i + 1,
    orderNo: "SO-" + (20261000 + i + 1),
    customer: NAMES[i % NAMES.length] + (i >= NAMES.length ? i : ""),
    customerId: "C-" + (100 + i + 1),
    city: CITY_POOL[i % CITY_POOL.length],
    status: STATUSES[i % STATUSES.length],
    amount: 120 + i * 37,
    items: 1 + (i % 4),
    risk: i % 9 === 0,
    date,
    createdAt: date + " " + pad(8 + (i % 12)) + ":" + pad(i % 60) + ":" + pad(i % 60),
    // 让关键字搜索有点内容：备注里带「加急」的会被搜到
    remark: i % 7 === 0 ? "加急发货" : i % 11 === 0 ? "客户要求开票" : ""
  };
});

/** 前端也要能自己过滤 —— 真实项目里这活通常在后端，这里为了模拟「返回已过滤的数据」 */
function filterRows(query) {
  const q = query || {};
  const kw = String(q.keyword || "").trim().toLowerCase();
  return ALL.filter((row) => {
    if (kw) {
      const hay = (row.orderNo + " " + row.customer + " " + row.remark).toLowerCase();
      if (hay.indexOf(kw) < 0) return false;
    }
    if (q.status && row.status !== q.status) return false;
    if (q.city && row.city !== q.city) return false;
    if (q.startDate && row.date < q.startDate) return false;
    if (q.endDate && row.date > q.endDate) return false;
    if (q.onlyRisk && !row.risk) return false;
    return true;
  });
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const nowText = () => {
  const d = new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
};

/** ① 搜索项的下拉选项（搜索子组件自己调，父组件不管） */
export async function fetchOptions() {
  await sleep(260);
  return clone({ statuses: STATUSES, cities: CITIES });
}

/** ② 总览：入参就是父组件手里那份 query */
export async function fetchOverview(query = {}) {
  await sleep(420 + Math.round(Math.random() * 120));
  const rows = filterRows(query);
  const amount = rows.reduce((sum, r) => sum + r.amount, 0);

  const cityMap = {};
  rows.forEach((r) => {
    cityMap[r.city] = (cityMap[r.city] || 0) + 1;
  });
  const cities = Object.keys(cityMap)
    .map((name) => ({ name, count: cityMap[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    total: rows.length,
    amount,
    avg: rows.length ? Math.round(amount / rows.length) : 0,
    pending: rows.filter((r) => r.status === "待发货").length,
    risk: rows.filter((r) => r.risk).length,
    cities,
    updatedAt: nowText(),
    // 回显这次统计用的参数，页面上直接展示，证明「总览吃的是同一份 query」
    params: clone(query)
  };
}

/** ③ 列表：入参是同一份 query + 分页 */
export async function fetchOrderList(query = {}, pageInfo = {}) {
  await sleep(520 + Math.round(Math.random() * 120));
  const page = Math.max(1, pageInfo.page || 1);
  const pageSize = Math.max(1, pageInfo.pageSize || 10);
  const rows = filterRows(query);
  const start = (page - 1) * pageSize;

  return {
    list: clone(rows.slice(start, start + pageSize)),
    total: rows.length,
    page,
    pageSize,
    params: clone(query),
    serverTime: nowText()
  };
}
