/**
 * 模拟「分页下拉选项」接口 —— 供 /load-more-select 演示页使用
 *
 * 返回结构故意写成后端最常见的形状：
 *   { list: [...], total: 58 }
 *
 * 参数：
 *   page / pageSize  —— 分页
 *   keyword          —— 服务端搜索（匹配 name / code）
 *   delay            —— 延迟毫秒，模拟网络；不同页给不同延迟可以复现竞态
 *   fail             —— 直接 reject，用来演示错误态 / 点击重试
 */

const CATEGORIES = ['原料', '包材', '半成品', '成品', '辅料']

const BASE_NAMES = [
  '铝合金板',
  '不锈钢管',
  '冷轧钢卷',
  '玻璃纤维布',
  '环氧树脂',
  '硅胶密封圈',
  '铜排',
  '绝缘纸',
  '瓦楞纸箱',
  '珍珠棉',
  '缠绕膜',
  '打包带',
  '标签纸',
  '说明书',
  '轴承座',
  '齿轮箱',
  '伺服电机',
  '控制器',
  '低压线束',
  '端子',
  '调速阀',
  '气压缸',
  '传送带',
  '滚筒',
  '紧固件',
  '垫片',
  '弹簧',
  '销轴',
  '防护罩',
]

/** 58 条固定数据（数量故意不是 pageSize 的整数倍，方便看「最后一页」） */
export const OPTIONS = (() => {
  const list = []
  for (let i = 0; i < 58; i++) {
    const base = BASE_NAMES[i % BASE_NAMES.length]
    const round = Math.floor(i / BASE_NAMES.length) + 1
    list.push({
      id: 1000 + i,
      code: `SKU-${1000 + i}`,
      name: round > 1 ? `${base}（${round} 号仓）` : base,
      category: CATEGORIES[i % CATEGORIES.length],
      stock: ((i * 37) % 500) + 12,
    })
  }
  return list
})()

/** 可注入的「网络开关」：演示页用它让下一次请求必失败 */
export const netState = {
  fail: false,
}

export function fetchOptions({ page = 1, pageSize = 10, keyword = '', delay = 220, fail = false } = {}) {
  const kw = String(keyword == null ? '' : keyword).trim().toLowerCase()
  // 「第 2 页故意慢一点」：用 reload/搜索打断在途请求时，能看出旧响应被丢掉
  const wait = page === 2 ? delay + 260 : delay

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail || netState.fail) {
        reject(new Error('请求超时（模拟）'))
        return
      }

      const matched = kw
        ? OPTIONS.filter((o) =>
            (o.name + o.code + o.category).toLowerCase().includes(kw)
          )
        : OPTIONS

      const start = (page - 1) * pageSize
      const list = matched.slice(start, start + pageSize).map((o) => ({ ...o }))
      resolve({ list, total: matched.length })
    }, wait)
  })
}
