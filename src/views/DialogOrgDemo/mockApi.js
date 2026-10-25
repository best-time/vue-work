/**
 * DialogOrgDemo 用的模拟接口
 *
 * 约定（和真实后端对齐的三点）：
 *   1. 每次返回都是**新对象**（深拷贝），父组件赋新引用才能触发子组件 watch
 *   2. 有网络延迟，弹窗里的 loading 才有意义
 *   3. 列表接口支持 keyword / status / page，弹窗只传 id，详情由弹窗自己拉
 */

const CUSTOMERS = ['陈嘉禾', '李沐', '王梓涵', '赵子墨', '周砚', '孙黎', '吴桐', '郑衍']
const CITIES = ['杭州', '成都', '深圳', '北京', '上海', '南京']
const STATUSES = ['待付款', '待发货', '已发货', '已完成', '已取消']
const PRODUCTS = ['云服务器 ECS', '对象存储 OSS', 'CDN 流量包', '数据库 RDS', '短信包']

const clone = (v) => JSON.parse(JSON.stringify(v))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const DB = Array.from({ length: 26 }, (_, i) => {
  const id = 1001 + i
  return {
    id,
    orderNo: 'SO2026' + id,
    customer: CUSTOMERS[i % CUSTOMERS.length],
    city: CITIES[Math.floor(i / 4) % CITIES.length],
    // 状态和城市不能用同一套取模，否则「城市 + 状态」组合只剩 5 种，看着像 bug
    status: STATUSES[(i * 3) % STATUSES.length],
    product: PRODUCTS[i % PRODUCTS.length],
    amount: 1200 + i * 137,
    createdAt:
      '2026-10-' + String((i % 28) + 1).padStart(2, '0') + ' ' +
      String(9 + (i % 9)).padStart(2, '0') + ':' + String((i * 7) % 60).padStart(2, '0'),
    remark: i % 4 === 0 ? '客户要求月底前开票' : '',
  }
})

/** 只读详情：列表字段 + 弹窗里才需要的字段（地址/联系人/明细） */
function detailOf(row) {
  return {
    ...row,
    phone: '138' + String(10000000 + row.id * 37).slice(0, 8),
    address: row.city + '市西湖区文三路 ' + (100 + (row.id % 60)) + ' 号 ' + (row.id % 9 + 1) + ' 幢',
    contact: row.customer,
    items: [
      { name: row.product, qty: (row.id % 3) + 1, price: row.amount },
      { name: '技术支持服务包', qty: 1, price: 300 },
    ],
    timeline: [
      { t: row.createdAt, text: '创建订单' },
      { t: row.createdAt, text: '客户已付款' },
    ],
  }
}

/** 列表：keyword 匹配订单号/客户/商品；status 精确匹配 */
export async function fetchOrders({ keyword = '', status = '', page = 1, pageSize = 8 } = {}) {
  await delay(320)
  const kw = String(keyword).trim().toLowerCase()
  const rows = DB.filter((r) => {
    const okStatus = !status || r.status === status
    const okKw =
      !kw ||
      r.orderNo.toLowerCase().includes(kw) ||
      r.customer.includes(kw) ||
      r.product.toLowerCase().includes(kw)
    return okStatus && okKw
  })
  const start = (page - 1) * pageSize
  return {
    total: rows.length,
    list: clone(rows.slice(start, start + pageSize)),
  }
}

/** 详情：弹窗传 id 进来，自己拉 */
export async function fetchOrderDetail(id) {
  await delay(380)
  const row = DB.find((r) => r.id === Number(id))
  if (!row) throw new Error('订单不存在：' + id)
  return clone(detailOf(row))
}

/** 保存：只回 ok + 新的一份详情，不返回整张列表 */
export async function saveOrder(id, form) {
  await delay(520)
  const row = DB.find((r) => r.id === Number(id))
  if (!row) throw new Error('订单不存在：' + id)
  Object.assign(row, {
    customer: form.customer,
    amount: Number(form.amount),
    remark: form.remark,
  })
  return { ok: true, detail: clone(detailOf(row)) }
}

/** 审批：通过 → 已发货；驳回 → 已取消 */
export async function auditOrder(id, { result, remark }) {
  await delay(460)
  const row = DB.find((r) => r.id === Number(id))
  if (!row) throw new Error('订单不存在：' + id)
  row.status = result === 'pass' ? '已发货' : '已取消'
  row.remark = remark || row.remark
  return { ok: true, status: row.status }
}

/** 批量导入：分批推进度，模拟解析 + 写入 */
export async function importOrders(rows, onProgress) {
  const total = rows.length
  for (let i = 0; i < total; i++) {
    await delay(220)
    DB.push({
      id: 2001 + DB.length,
      orderNo: 'SO2026' + (2001 + DB.length),
      customer: rows[i].customer,
      city: '杭州',
      status: '待付款',
      product: '批量导入',
      amount: Number(rows[i].amount) || 0,
      createdAt: '2026-10-23 12:00',
      remark: '导入',
    })
    if (typeof onProgress === 'function') onProgress(Math.round(((i + 1) / total) * 100), i + 1)
  }
  return { ok: true, count: total }
}

/** 导入弹窗里「解析文件」的假结果 */
export function mockParseFile(name) {
  return [
    { customer: '导入客户A', amount: 2600, from: name },
    { customer: '导入客户B', amount: 1580, from: name },
    { customer: '导入客户C', amount: 980, from: name },
  ]
}

export const STATUS_OPTIONS = STATUSES.map((s) => ({ label: s, value: s }))

export function statusTagType(status) {
  return (
    {
      待付款: 'warning',
      待发货: '',
      已发货: 'success',
      已完成: 'info',
      已取消: 'danger',
    }[status] || 'info'
  )
}
