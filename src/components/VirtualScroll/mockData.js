/**
 * 虚拟滚动演示数据
 *
 * 为什么要一条「伪随机但可复现」的生成器：
 *   同一份数据要同时喂给 4 种渲染方案做对照，如果每次刷新数据都变，
 *   指标数字就没法横向比。这里用固定种子的 LCG，只要 seed 和 n 不变，
 *   生成结果完全一致。
 *
 * 关于 estHeight：
 *   动态行高列表绕不开一个问题 —— 没渲染出来的行有多高？
 *   真实项目里通常两条路：
 *     1) 服务端/端上前置估算（按字数、图片数之类给个大概）；
 *     2) 给一个统一预估值，靠实测慢慢校正。
 *   这里把「估算值」当数据字段一起带下来，并且故意留了 ±6% 的误差，
 *   用来演示「估算 → 实测校正」这一步是必要的。
 */

export const ROW_HEIGHT = 48

const SURNAMES = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨']
const GIVENS = ['晓明', '子涵', '雨欣', '家豪', '思远', '若彤', '文轩', '嘉怡', '宇辰', '梦琪', '一鸣', '书瑶']
const DEPTS = ['技术中台', '增长产品', '数据平台', '客户成功', '人力行政', '财务共享', '风控合规']
const TITLES = ['接口联调', '需求评审', '线上告警', '版本发布', '数据回补', '安全扫描', '容量评估', '链路压测']
const TAGS = ['P0', 'P1', 'P2', '阻塞', '待确认', '已排期', '跨团队', '回归']

const SENTENCES = [
  '接口字段口径和上游对不齐，需要拉一次对齐会。',
  '灰度 10% 后错误率从 0.3% 抬到 1.2%，已回滚待排查。',
  '历史数据要按新的分片规则回补，预计影响 3 张核心表。',
  '缓存击穿集中在整点，建议给过期时间加随机抖动。',
  '移动端首屏 2.4s，图片占 62%，先走 CDN 压缩。',
  '权限模型从 RBAC 迁到 ABAC，需要评估存量策略改造量。',
  '对账任务昨日延迟 42 分钟，根因是源表锁等待。',
  '消息队列积压 8 万条，消费端已扩容到 12 个实例。',
  '搜索召回率下降 5 个点，疑似分词词典没跟着发版。',
  '导出任务一次拉 20 万行，改成异步下载 + 邮件通知。',
  '新老两套 ID 映射表对不上，缺 3000 条历史映射。',
  '慢查询 TOP3 都落在同一张宽表上，考虑拆冷热。'
]

/** 线性同余，只求「可复现」，不追求统计质量 */
function lcg(seed) {
  let s = seed >>> 0
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

/**
 * @param {number} n 条数
 * @param {number} seed 种子，换一个就是另一批数据
 * @returns {Array} [{ id, name, dept, title, content, tags, time, estHeight }]
 */
export function makeRows(n, seed) {
  const rnd = lcg(seed || 20261119)
  const pick = function (arr) {
    return arr[Math.floor(rnd() * arr.length)]
  }
  const rows = new Array(n)

  for (let i = 0; i < n; i++) {
    // 1~4 句拼成描述，长度差异正是动态行高的来源
    const sentCount = 1 + Math.floor(rnd() * 4)
    let content = ''
    for (let s = 0; s < sentCount; s++) content += pick(SENTENCES)

    const tagCount = Math.floor(rnd() * 3)
    const tags = []
    for (let t = 0; t < tagCount; t++) {
      const tag = pick(TAGS)
      if (tags.indexOf(tag) === -1) tags.push(tag)
    }

    const month = 1 + Math.floor(rnd() * 12)
    const day = 1 + Math.floor(rnd() * 28)
    const hour = Math.floor(rnd() * 24)
    const minute = Math.floor(rnd() * 60)

    // 按字数估行数：卡片内容区约 34 字一行，最多 4 行
    const lines = Math.max(1, Math.min(4, Math.ceil(content.length / 34)))
    const base = 86 + (lines - 1) * 20
    // ±6% 的估算误差，模拟「前置估算不可能准」
    const estHeight = Math.round(base * (0.94 + rnd() * 0.12))

    rows[i] = {
      id: 'r' + i,
      name: pick(SURNAMES) + pick(GIVENS),
      dept: pick(DEPTS),
      title: pick(TITLES),
      content: content,
      tags: tags,
      time: '2026-' + pad(month) + '-' + pad(day) + ' ' + pad(hour) + ':' + pad(minute),
      estHeight: estHeight
    }
  }

  return rows
}

export default makeRows
