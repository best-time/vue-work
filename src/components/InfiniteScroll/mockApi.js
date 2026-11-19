/**
 * 模拟「分页列表」接口 —— 供 /infinite-scroll 演示页使用
 *
 * 返回结构取后端最常见的那一种：{ list: [...], total: 168 }
 * 参数：
 *   page / pageSize —— 分页（page 从 1 开始）
 *   keyword         —— 服务端搜索（匹配标题 / 作者 / 部门）
 *   delay           —— 延迟毫秒，模拟网络
 *   fail            —— 直接 reject，用来演示错误态 + 点击重试
 *
 * 数据量故意取 168（不是 5/10/20 的整数倍），这样每页用不同 pageSize 时
 * 都能看到「最后一页不满」的处理。
 */

const TITLES = [
  '三季度校园招聘复盘：offer 接受率提升到 82%',
  '研发序列职级评审完成，共 34 人通过',
  '新员工 30 天融入访谈数据汇总',
  '内推奖励规则调整通知（11 月生效）',
  '技术中心 Q4 编制盘点结果',
  '面试官认证培训第 6 期报名开启',
  '候选人体验调研：平均等待时长降到 3.2 天',
  '雇主品牌短视频拍摄排期确认',
  '校招宣讲会（华东线）行程与物料清单',
  '试用期转正评估模板更新说明',
  '关键岗位继任者盘点启动会纪要',
  '招聘渠道效果对比：内推 ROI 最高',
  '远程面试设备与网络要求（新版）',
  '实习生转正名额分配方案',
  '人才库标签体系迁移说明',
  '背景调查供应商切换公告',
  '年度培训学时统计口径说明',
  '绩效面谈记录填写规范',
  '岗位说明书评审：12 个岗位待修订',
  '离职面谈问题库更新（含 20 个追问）',
  '招聘系统字段精简，上线时间待定',
  '校园大使招募结果公示',
  '技术分享会：如何做结构化面试',
  '编制冻结期间的例外审批流程',
]

const AUTHORS = ['张伟', '李娜', '王强', '刘洋', '陈静', '赵磊', '孙婷', '周涛']
const DEPTS = ['人力资源部', '技术中心', '市场部', '财务部', '供应链', '客户成功部']
const TAGS = ['招聘', '组织', '培训', '制度', '数据']

const TOTAL = 168
const BASE_TIME = new Date('2026-11-17T15:00:00')

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function fmtTime(offsetHours) {
  const d = new Date(BASE_TIME.getTime() - offsetHours * 3600 * 1000)
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 168 条固定数据（同样的 i 永远得到同一条，方便肉眼核对分页边界） */
export const FEED = (() => {
  const list = []
  for (let i = 0; i < TOTAL; i++) {
    const base = TITLES[i % TITLES.length]
    const round = Math.floor(i / TITLES.length) + 1
    list.push({
      id: 20260100 + i,
      title: round > 1 ? `${base}（第 ${round} 批）` : base,
      author: AUTHORS[i % AUTHORS.length],
      dept: DEPTS[(i * 3) % DEPTS.length],
      tag: TAGS[i % TAGS.length],
      read: ((i * 7) % 40) + 3,
      time: fmtTime(i * 5),
    })
  }
  return list
})()

export const TOTAL_COUNT = TOTAL

export function fetchFeed({
  page = 1,
  pageSize = 10,
  keyword = '',
  delay = 280,
  fail = false,
} = {}) {
  const kw = String(keyword == null ? '' : keyword).trim().toLowerCase()

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        // 用一句像样的服务端错误文案，错误态展示才真实
        reject(new Error('请求超时，请稍后重试'))
        return
      }

      const matched = kw
        ? FEED.filter((it) =>
            (it.title + it.author + it.dept).toLowerCase().includes(kw)
          )
        : FEED

      const start = (page - 1) * pageSize
      resolve({
        list: matched.slice(start, start + pageSize).map((it) => ({ ...it })),
        total: matched.length,
      })
    }, delay)
  })
}
