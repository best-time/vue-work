/**
 * 模拟「客户远程搜索」接口
 *
 * · delay       —— 固定延迟，模拟网络
 * · raceMode    —— 关键词 ≤2 字时故意慢 1400ms，用来复现「先发的请求后返回」
 * · fail        —— 直接 reject，用于演示错误态与重试
 */
export const CUSTOMERS = [
  { id: 'C1001', name: '阿里巴巴（中国）网络技术有限公司', city: '杭州', contact: '张勇' },
  { id: 'C1002', name: '阿里云计算有限公司', city: '杭州', contact: '王坚' },
  { id: 'C1003', name: '杭州云启科技有限公司', city: '杭州', contact: '陈明' },
  { id: 'C1004', name: '杭州同花顺数据开发有限公司', city: '杭州', contact: '李娟' },
  { id: 'C1005', name: '上海临港国际贸易有限公司', city: '上海', contact: '周涛' },
  { id: 'C1006', name: '上海寻梦信息技术有限公司', city: '上海', contact: '黄峥' },
  { id: 'C1007', name: '深圳前海数据服务有限公司', city: '深圳', contact: '刘洋' },
  { id: 'C1008', name: '深圳市腾讯计算机系统有限公司', city: '深圳', contact: '马化腾' },
  { id: 'C1009', name: '北京中关村智造科技有限公司', city: '北京', contact: '赵磊' },
  { id: 'C1010', name: '北京字节跳动科技有限公司', city: '北京', contact: '张一鸣' },
  { id: 'C1011', name: '北京美团点评科技有限公司', city: '北京', contact: '王兴' },
  { id: 'C1012', name: '成都天府软件园有限公司', city: '成都', contact: '孙倩' },
  { id: 'C1013', name: '成都新易盛通信技术有限公司', city: '成都', contact: '吴迪' },
  { id: 'C1014', name: '广州视源电子科技股份有限公司', city: '广州', contact: '郑霞' },
  { id: 'C1015', name: '广州汽车集团股份有限公司', city: '广州', contact: '冯磊' },
  { id: 'C1016', name: '南京苏宁易购集团有限公司', city: '南京', contact: '侯恩龙' },
  { id: 'C1017', name: '苏州科达科技股份有限公司', city: '苏州', contact: '陈冬根' },
  { id: 'C1018', name: '武汉光迅科技股份有限公司', city: '武汉', contact: '余少华' },
  { id: 'C1019', name: '西安隆基绿能科技股份有限公司', city: '西安', contact: '李振国' },
  { id: 'C1020', name: '青岛海尔智家股份有限公司', city: '青岛', contact: '李华刚' },
  { id: 'C1021', name: '宁波均胜电子股份有限公司', city: '宁波', contact: '王剑峰' },
  { id: 'C1022', name: '厦门美图网科技有限公司', city: '厦门', contact: '吴欣鸿' },
  { id: 'C1023', name: '长沙中联重科股份有限公司', city: '长沙', contact: '詹纯新' },
  { id: 'C1024', name: '合肥京东方光电科技有限公司', city: '合肥', contact: '陈炎顺' }
]

export function searchCustomers(keyword, options = {}) {
  const { delay = 260, raceMode = false, fail = false, limit = 20 } = options
  const kw = String(keyword == null ? '' : keyword).trim()
  const wait = raceMode ? (kw.length <= 2 ? 1400 : 120) : delay

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        reject(new Error('服务端 500（模拟）'))
        return
      }
      if (!kw) {
        resolve([])
        return
      }
      const lower = kw.toLowerCase()
      const list = CUSTOMERS.filter((c) =>
        (c.name + c.id + c.city + c.contact).toLowerCase().includes(lower)
      ).slice(0, limit)
      // 每次返回新对象，避免下游改到同一份数据
      resolve(list.map((c) => ({ ...c })))
    }, wait)
  })
}

/** el-autocomplete 需要 { value } 作为显示字段 */
export function fetchSuggestions(queryString, cb) {
  searchCustomers(queryString).then((list) => {
    cb(list.map((c) => ({ value: c.name, ...c })))
  })
}

/** el-select remote 需要 { label, value } */
export function searchOptions(keyword) {
  return searchCustomers(keyword).then((list) =>
    list.map((c) => ({ label: c.name, value: c.id, city: c.city }))
  )
}
