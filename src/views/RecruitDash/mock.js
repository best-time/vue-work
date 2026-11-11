/**
 * 驾驶舱（招聘模块原型图 · class="dash-wrap"）的演示数据层
 * ------------------------------------------------------------
 * 原型是一份单文件 HTML：数据写死在 <script> 顶部，页面由 pageDashboard() 里的
 * 模板字符串拼出来。这里把「能算出来」的部分抽成纯函数，Vue 侧只负责渲染：
 *
 *   - 全部数据由固定种子确定性派生（同一个入参永远同一份结果），
 *     刷新不跳数字，截图核对才有意义；
 *   - 不依赖接口，「查询 / 重置」改的就是这几个入参。
 *
 * 口径沿用原型，并且**互相咬合**（这点原型其实没做到，这里是刻意修正的）：
 *   · KPI 走「招聘总计划」（年度计划人数 / 确认入职人数 / 缺口 / 完成率）；
 *   · 计划实施由总计划派生 → Σ实施确认入职 === Σ计划确认入职，
 *     所以漏斗末级「确认入职」与 KPI 同值，不会出现「漏斗比 KPI 还大」；
 *   · 入职人员结构按人数，合计严格等于确认入职人数；
 *   · 招聘后评价「已完成考核」≤ 同期确认入职（新入职未满试用期不列入）。
 */

/* 机构顺序严格按原型的「机构基本信息」表：联合银行置首，其后 60 家法人行 */
export const BANKS = [
  '江苏农商联合银行', '紫金农商银行', '溧水农商银行', '高淳农商银行', '无锡农商银行', '江阴农商银行', '宜兴农商银行',
  '徐州农商银行', '沛县农商银行', '丰县农商银行', '睢宁农商银行', '邳州农商银行', '新沂农商银行', '江南农商银行',
  '苏州农商银行', '张家港农商银行', '太仓农商银行', '昆山农商银行', '常熟农商银行', '南通农商银行', '海安农商银行',
  '如皋农商银行', '如东农商银行', '海门农商银行', '启东农商银行', '赣榆农商银行', '东海农商银行', '灌云农商银行',
  '灌南农商银行', '东方农商银行', '淮安农商银行', '涟水农商银行', '洪泽农商银行', '盱眙农商银行', '金湖农商银行',
  '盐城农商银行', '滨海农商银行', '阜宁农商银行', '射阳农商银行', '建湖农商银行', '大丰农商银行', '东台农商银行',
  '响水农商银行', '扬州农商银行', '高邮农商银行', '宝应农商银行', '江都农商银行', '仪征农商银行', '镇江农商银行',
  '丹阳农商银行', '句容农商银行', '扬中农商银行', '泰州农商银行', '兴化农商银行', '靖江农商银行', '泰兴农商银行',
  '姜堰农商银行', '民丰农商银行', '沭阳农商银行', '泗洪农商银行', '泗阳农商银行',
]

/** 法人行（不含联合银行）：「各农商行评价明细」只列这 60 家 */
export const LEGAL_BANKS = BANKS.slice(1)

/** 原型演示基准日：风险预警里「是否超期」都按这一天判 */
export const TODAY = '2026-11-10'

/** 全省年度计划合计：原型收敛到 1500，这里给 1800，让完成率落在 60% 上下 */
const ANNUAL_PLAN_TOTAL = 1800

export const YEARS = ['2026', '2025', '2024']
export const PERIODS = ['全年', '一季度', '二季度', '自定义起止']
export const QTYPES = ['全部', '校园招聘', '社会招聘']

/** KPI 图标（原型里是 4 个内联 SVG，按 kpis 顺序取用） */
export const KPI_ICONS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M18 8V4"/><path d="M16 6h4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 16l8-8"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="15" r="1.3"/></svg>',
]

/* ============================ 确定性随机 ============================ */

function hash32(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32：同种子同序列 */
function rngOf(seed) {
  let s = (typeof seed === 'string' ? hash32(seed) : seed) >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1)
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296
  }
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

/* ============================ 年度招聘总计划 ============================ */

const PLAN_CACHE = {}

/**
 * 各机构年度总计划。原型按机构序号派生校招/社招，再把合计收敛到固定总量，
 * 避免 60 家累加出几万的体量。这里同样处理：
 *   1) 派生原始校招/社招 → 2) 合计等比缩放到 target（最大余数法补差）
 *   3) 按原占比拆回校招/社招 → 4) 派生确认入职（34%~85%，每 7 家一档）
 */
export function plansOf(year) {
  if (PLAN_CACHE[year]) return PLAN_CACHE[year]

  const y = Number(year)
  const yScale = y === 2026 ? 1 : y === 2025 ? 0.86 : 0.7
  const target = Math.round(ANNUAL_PLAN_TOTAL * yScale)

  const raw = BANKS.map((org, i) => {
    const union = i === 0
    const campus = union ? 120 : 15 + ((i * 7) % 60)
    const social = union ? 60 : 8 + ((i * 5) % 30)
    return { org, union, campus, social }
  })

  const rawTotals = raw.map((p) => p.campus + p.social)
  const rawSum = sum(rawTotals)
  const exact = rawTotals.map((v) => (v / rawSum) * target)
  const scaled = exact.map(Math.floor)
  let rest = target - sum(scaled)
  const order = exact.map((v, i) => [v - scaled[i], i]).sort((a, b) => b[0] - a[0])
  for (let k = 0; rest > 0; k++, rest--) scaled[order[k % order.length][1]]++

  const plans = raw.map((p, i) => {
    const total = scaled[i]
    const origin = p.campus + p.social
    const campus = Math.round((total * p.campus) / origin)
    const social = total - campus
    const onboard = Math.round(total * (0.34 + (i % 7) * 0.085))
    return { org: p.org, union: p.union, campus, social, total, onboard }
  })

  PLAN_CACHE[year] = plans
  return plans
}

/** 指定机构范围（'ALL' = 全省）的计划口径汇总；qtype 决定只算校招 / 只算社招 */
export function planStat(scope, year, qtype) {
  const rows = plansOf(year).filter((p) => scope === 'ALL' || p.org === scope)
  const hcAll = sum(rows.map((p) => p.total))
  const onbAll = sum(rows.map((p) => p.onboard))
  const hc = qtype === '校园招聘'
    ? sum(rows.map((p) => p.campus))
    : qtype === '社会招聘'
      ? sum(rows.map((p) => p.social))
      : hcAll
  const onboard = hcAll > 0 ? Math.round((onbAll * hc) / hcAll) : 0
  return {
    hc,
    onboard,
    gap: Math.max(0, hc - onboard),
    rate: hc > 0 ? ((onboard / hc) * 100).toFixed(1) : '0.0',
  }
}

/* ============================ 计划实施 ============================ */

const IMPL_CACHE = {}
const FINISHED = ['招聘完成', '已下架', '已关闭', '已结束', '已录用']

/**
 * 计划实施由总计划派生（2 条：校招 + 社招），保证：
 *   Σ 实施确认入职 === 机构计划的确认入职 → 漏斗末级与 KPI 同值。
 *
 * 日期/状态按机构序号铺开，制造出「超期 / 预警 / 正常 / 已结束」四种形态：
 *   i%7===0 → 结束日期在基准日之前且仍在招聘中 → 超期
 *   i%11===0 → 已结束（不再判超期）
 *   其余     → 跨年度的在办实施
 * 进度按 55%~95% 铺开，低于 60% 的在办实施算「预警」。
 */
export function implsOf(year) {
  if (IMPL_CACHE[year]) return IMPL_CACHE[year]

  const y = Number(year)
  const list = []

  plansOf(year).forEach((p, i) => {
    if (p.total <= 0) return
    const campusOnb = Math.round((p.onboard * p.campus) / p.total)
    const socialOnb = p.onboard - campusOnb
    const ratio = 0.55 + ((i * 3) % 41) / 100 // 55% ~ 95%
    const overdue = i % 7 === 0
    const closed = i % 11 === 0

    const mk = (type, hc, onb, seq) => {
      if (hc <= 0) return null
      const planned = Math.max(onb, Math.round(hc * ratio))
      const apply = Math.round(hc * (26 + (i * 5 + seq * 13) % 20))
      let start, end, status
      if (closed) {
        start = `${y}-02-20`
        end = `${y}-06-15`
        status = '已结束'
      } else if (overdue) {
        start = `${y}-03-01`
        end = `${y}-06-30`
        status = '招聘中'
      } else {
        start = seq === 0 ? `${y}-09-01` : `${y}-08-15`
        end = seq === 0 ? `${y}-12-31` : `${y + 1}-01-31`
        status = '招聘中'
      }
      const inflight = Math.max(0, Math.round(hc * 0.12))
      const title = type === '校园招聘'
        ? `${p.org}${i % 3 === 0 ? `${y + 1}届校园招聘（秋招）` : `${y}春季校园招聘`}`
        : `${p.org}${y}社会招聘${i % 4 === 0 ? '（紧缺专业）' : ''}`
      return {
        id: `${type === '校园招聘' ? 'SS' : 'SH'}-${year}-${String(i + 1).padStart(2, '0')}${seq ? 'b' : ''}`,
        name: title,
        org: p.org,
        type,
        year: y,
        status,
        flow: type === '校园招聘'
          ? ['简历筛选', '笔试', '面试', '背调/体检', '拟录用']
          : ['简历筛选', '面试', '背调/体检', '拟录用'],
        start,
        end,
        headcount: hc,
        progress: { apply, planned, inflight, onboard: onb },
      }
    }

    const a = mk('校园招聘', p.campus, campusOnb, 0)
    const b = mk('社会招聘', p.social, socialOnb, 1)
    if (a) list.push(a)
    if (b) list.push(b)
  })

  IMPL_CACHE[year] = list
  return list
}

/** 风险基准日：当年（含以后）用今天，往年度用该年 12-31，保证往年也有正常的超期/预警分布 */
export function anchorOf(year) {
  return Number(year) >= 2026 ? TODAY : `${year}-12-31`
}

/**
 * 计划风险评分：超期 > 预警 > 正常；同档内缺口越大、完成率越低越靠前。
 * rate = 拟录用 ÷ 编制（原型写的是 (确认入职 + 拟录用) ÷ 编制，会把同一批人算两遍，
 * 所以这里修正为拟录用口径 —— 进度条读起来才符合「完成率」三个字）。
 */
export function planRisk(im, year) {
  const anchor = new Date(`${anchorOf(year)}T00:00:00`).getTime()
  const end = new Date(`${im.end}T00:00:00`).getTime()
  const overdue = anchor > end && !FINISHED.includes(im.status)
  const rate = im.headcount ? Math.round((im.progress.planned / im.headcount) * 100) : 0
  const gap = Math.max(0, (im.headcount || 0) - (im.progress.onboard || 0))
  const active = ['招聘中', '待发布', '已暂停'].includes(im.status)
  const warn = !overdue && active && rate < 60
  const sev = overdue ? 3 : warn ? 2 : 1
  const score = sev * 1000 + (100 - rate) * 5 + (im.headcount ? (gap / im.headcount) * 100 : 0)
  return {
    im,
    rate,
    gap,
    overdue,
    warn,
    sev,
    score,
    t: overdue ? '超期' : warn ? '预警' : '正常',
    tone: overdue ? 'red' : warn ? 'orange' : 'green',
  }
}

/* ============================ 漏斗 / 结构 ============================ */

/** 招聘流程转化：前五级按投递记录数等比衰减，末两级取实施上的拟录用 / 确认入职 */
export function funnelOf(impls) {
  const applyN = sum(impls.map((i) => i.progress.apply || 0))
  const planned = sum(impls.map((i) => i.progress.planned || 0))
  const onboard = sum(impls.map((i) => i.progress.onboard || 0))
  if (applyN <= 0) {
    return ['投递', '简历筛选', '笔试', '面试', '背调/体检', '拟录用', '确认入职'].map((n) => ({ n, v: 0 }))
  }
  return [
    { n: '投递', v: applyN },
    { n: '简历筛选', v: Math.round(applyN * 0.7) },
    { n: '笔试', v: Math.round(applyN * 0.43) },
    { n: '面试', v: Math.round(applyN * 0.29) },
    { n: '背调/体检', v: Math.round(applyN * 0.19) },
    { n: '拟录用', v: planned },
    { n: '确认入职', v: onboard },
  ]
}

/** 较大余数法：把占比等比放大到 total，保证合计严格等于 total */
function scaleTo(counts, total) {
  if (total <= 0) return counts.map(() => 0)
  const s = sum(counts)
  if (!s) return null
  const exact = counts.map((v) => (v * total) / s)
  const base = exact.map(Math.floor)
  let rem = total - sum(base)
  exact
    .map((v, i) => [v - base[i], i])
    .sort((a, b) => b[0] - a[0])
    .forEach((p) => {
      if (rem > 0) {
        base[p[1]]++
        rem--
      }
    })
  return base
}

export const DIM_COLOR = {
  博士: '#7c3aed', 硕士: '#409efe', 本科: '#8ec5ff', 其他: '#bcdcff',
  经济金融: '#409efe', '计算机/科技': '#13c2c2', 财务会计: '#7c3aed',
  男: '#409efe', 女: '#f472b6',
}

const DIM_DEF = {
  学历: { cats: ['博士', '硕士', '本科', '其他'], ratios: [5, 30, 55, 10] },
  专业: { cats: ['经济金融', '计算机/科技', '财务会计', '其他'], ratios: [45, 25, 15, 15] },
  性别: { cats: ['男', '女'], ratios: [52, 48] },
}

/**
 * 入职人员结构：合计严格等于 KPI「确认入职人数」。
 * 原型优先用候选人样本算占比、样本为空再退回固定占比；这里直接固定占比 + 年度种子抖动，
 * 效果等价且不需要候选人样本。
 */
export function dimsOf(onboardTotal, year) {
  const out = {}
  Object.keys(DIM_DEF).forEach((dim) => {
    const { cats, ratios } = DIM_DEF[dim]
    const rnd = rngOf(`dim|${dim}|${year}`)
    const jittered = ratios.map((r) => Math.max(1, Math.round(r * (0.94 + rnd() * 0.12))))
    const vals = scaleTo(jittered, onboardTotal) || cats.map(() => 0)
    out[dim] = cats.map((c, i) => ({ n: c, v: vals[i], c: DIM_COLOR[c] || '#bcdcff' }))
  })
  return out
}

/** conic-gradient 字符串（环形图）；数据全 0 时给一圈灰底，不留空白 */
export function conicOf(rows) {
  const total = sum(rows.map((r) => r.v))
  if (!total) return 'conic-gradient(#eef2f9 0deg 360deg)'
  let acc = 0
  return `conic-gradient(${rows
    .map((r) => {
      const s = (acc / total) * 360
      acc += r.v
      const e = (acc / total) * 360
      return `${r.c} ${s}deg ${e}deg`
    })
    .join(',')})`
}

/* ============================ 风险预警 / 待办 ============================ */

export const TONE_DOT = { 高: 'var(--danger)', 中: 'var(--warning)', 低: 'var(--success)' }

/** 风险记录：全省 7 条，机构下钻时按 org 过滤（演示「筛选后为空」也用得上） */
export function risksOf(scope) {
  const all = [
    { id: 'R1', lv: '高', name: '计划未按时启动', org: '张家港农商银行', content: '计划开始日期已到（09-01），超 7 天仍未发布职位', status: '待处理', time: '2026-09-08' },
    { id: 'R2', lv: '高', name: '流程长时间停留', org: '常熟农商银行', content: '简历筛选环节 3 名候选人停留超 7 天未办理', status: '处理中', time: '2026-10-22' },
    { id: 'R3', lv: '中', name: '招聘缺口', org: '常熟农商银行', content: '距计划结束不足 20 天，拟录用人数仍低于招聘编制', status: '待处理', time: '2026-10-25' },
    { id: 'R4', lv: '中', name: '通知反馈超时', org: '昆山农商银行', content: '5 份笔试通知超 3 天反馈期限未确认', status: '待处理', time: '2026-10-26' },
    { id: 'R5', lv: '低', name: '材料或结果缺失', org: '苏州农商银行', content: '笔试环节考试安排材料未上传（暂未影响办理）', status: '已解除', time: '2026-10-20' },
    { id: 'R6', lv: '高', name: '成绩超期未录入', org: '太仓农商银行', content: '面试环节 6 名候选人「待录入成绩」超 5 天未录入', status: '待处理', time: '2026-10-26' },
    { id: 'R7', lv: '中', name: '材料超期未补齐', org: '江阴农商银行', content: '4 名候选人「待补充材料」超 5 天未补齐', status: '待处理', time: '2026-10-26' },
  ]
  return scope === 'ALL' ? all : all.filter((r) => r.org === scope)
}

/**
 * 风险类型 → 环节 / 归口岗位 / 触发规则 / 建议处置
 * 原型每条风险只有一句 content，详情弹窗要说清「按什么规则报出来的、该怎么处理」，
 * 所以这里按类型补一层元信息（类型名本身就是原型里的一级分类）。
 */
const RISK_META = {
  计划未按时启动: {
    stage: '计划启动',
    dept: '招聘计划管理岗',
    rule: '计划开始日期已到、机构仍未发布任何职位；超期 ≥ 3 天升级为高风险',
    advice: '督促机构立即发布职位；确需延后的，提交计划开始日期变更申请并说明原因',
  },
  流程长时间停留: {
    stage: '简历筛选',
    dept: '招聘流程管理岗',
    rule: '同一候选人在同一环节停留 > 7 天仍未办理，按人数累计触发',
    advice: '逐个处理停留候选人；原处理人休假或离职的，改派处理人后重新计时',
  },
  招聘缺口: {
    stage: '拟录用',
    dept: '招聘计划管理岗',
    rule: '距计划结束 < 20 天，拟录用人数仍低于该计划招聘编制',
    advice: '补充简历来源或申请延长计划结束日期，并在计划实施里调整招聘渠道',
  },
  通知反馈超时: {
    stage: '笔试通知',
    dept: '招聘流程管理岗',
    rule: '通知发出后 > 3 天未收到候选人确认反馈',
    advice: '电话复核候选人意愿；确认放弃的，在系统里登记放弃原因',
  },
  材料或结果缺失: {
    stage: '材料归档',
    dept: '招聘材料管理岗',
    rule: '流程要求的考试安排 / 成绩材料未上传，且流程已流转到下一环节',
    advice: '补齐材料后重新提交审核；该环节确实无需材料的，在流程配置里关掉该节点',
  },
  成绩超期未录入: {
    stage: '面试评分',
    dept: '招聘流程管理岗',
    rule: '环节结束后 > 5 天仍有候选人处于「待录入成绩」',
    advice: '通知面试官尽快录入；面试官无法录入的，由招聘管理员代录并备注原因',
  },
  材料超期未补齐: {
    stage: '拟录用',
    dept: '招聘材料管理岗',
    rule: '候选人「待补充材料」状态 > 5 天未补齐',
    advice: '短信提醒候选人一次性补齐清单；逾期未补齐的按放弃处理并留痕',
  },
}

/** 督办可选的反馈时限 / 通知方式 */
export const URGE_DEADLINES = ['24 小时', '3 个工作日', '5 个工作日', '7 个工作日']
export const URGE_WAYS = ['站内消息', '短信', '邮件']

const pad2 = (n) => String(n).padStart(2, '0')
/** 'YYYY-MM-DD' → UTC 毫秒（用 UTC 存算，避免本地时区把日期推前/后一天） */
const dateMs = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const msDate = (ms) => {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}
/** 相差天数（b - a） */
export const daysBetween = (a, b) => Math.round((dateMs(b) - dateMs(a)) / 86400000)
/** 日期加减天数 */
export const addDays = (s, n) => msDate(dateMs(s) + n * 86400000)

/**
 * 风险详情（详情弹窗 + 督办弹窗共用）
 * @param {object} r     risksOf() 的一条
 * @param {object} [urge] 父级留痕的督办记录 { time, deadline, ways, note }
 * 责任人是按风险 id 派生的（同一台机器刷新结果不变），不人为随机构变。
 */
export function riskDetail(r, urge) {
  const meta = RISK_META[r.name] || {}
  const rnd = rngOf(`risk|${r.id}`)
  const owner = SURNAMES[Math.floor(rnd() * SURNAMES.length)] + GIVEN[Math.floor(rnd() * GIVEN.length)]
  const resolved = r.status === '已解除'
  const steps = [
    { t: r.time, l: '风险产生', d: `规则引擎命中：${r.name}`, st: 'done' },
    { t: addDays(r.time, 1), l: '通知机构', d: `站内消息已发送给「${r.org}」${owner}`, st: 'done' },
    urge
      ? { t: urge.time, l: '发起督办', d: `${urge.ways.join('、')} · 要求 ${urge.deadline}内反馈`, st: 'done' }
      : { t: '', l: '发起督办', d: resolved ? '未发起（风险已解除）' : '尚未督办', st: 'wait' },
    resolved
      ? { t: addDays(r.time, 2), l: '风险解除', d: '机构整改完成，系统校验通过后自动关闭', st: 'done' }
      : { t: '', l: '风险解除', d: '待机构整改完成、系统校验通过后自动解除', st: 'wait' },
  ]
  return {
    ...r,
    stage: meta.stage || '招聘实施',
    dept: meta.dept || '招聘管理岗',
    rule: meta.rule || '按风险预警参数配置的阈值判定',
    advice: meta.advice || '请联系机构招聘管理员核实并处理',
    owner,
    days: daysBetween(r.time, TODAY),
    steps,
  }
}

export const TODOS = [
  { id: 'D1', type: '需求审核', title: '张家港农商银行·2026春季校园招聘需求待审批', org: '张家港农商银行', time: '2026-10-05 10:02' },
  { id: 'D2', type: '职位发布审批', title: '数据分析师职位发布审批（社招）', org: '常熟农商银行', time: '2026-10-13 09:00' },
  { id: 'D3', type: '招聘流程办理', title: '面试环节 6 名候选人待评分确认', org: '常熟农商银行', time: '2026-10-27 08:30' },
  { id: 'D4', type: '名单或成绩确认', title: '笔试成绩合格名单待确认（校招第一批）', org: '常熟农商银行', time: '2026-10-26 17:00' },
  { id: 'D5', type: '材料审核', title: '3 名候选人补充材料待审核', org: '昆山农商银行', time: '2026-10-26 10:40' },
  { id: 'D6', type: '总计划审批', title: '昆山农商银行·2026年度招聘总计划待审批', org: '昆山农商银行', time: '2026-10-02 14:44' },
]

export const TODO_TONE = {
  需求审核: 'blue', 职位发布审批: 'cyan', 招聘流程办理: 'purple',
  名单或成绩确认: 'green', 材料审核: 'orange', 总计划审批: 'gray',
}

/* ============================ 招聘后评价 ============================ */

export const GRADES = ['A', 'B', 'C', 'D']
export const GRADE_COLOR = { A: '#67c23a', B: '#409efe', C: '#e6a23c', D: '#f56c6c' }
export const GRADE_NOTE = {
  A: '考核优秀', B: '考核良好',
  C: '考核合格（偏弱），列入重点关注',
  D: '试用期考核未通过，按规定延长考察',
}
const EVAL_DEPTS = ['信息科技部', '公司业务部', '乡镇支行一部', '乡镇支行二部', '风险管理部', '运营管理部', '普惠金融部']

const EVAL_CACHE = {}

/**
 * 评价核心：先把「已完成考核」定成同期确认入职的 70%~92%（新入职未满试用期不列入），
 * 再按部门权重切分（累计切分，保证 Σ部门 = 总数），部门内按 A/B/C/D 累计比例切分。
 * 规模 ≥4 时兜底至少 1 名 D（未通过），部门级与机构级同步转移，保证两处合计一致。
 */
export function evalCore(seedKey, bound) {
  if (EVAL_CACHE[seedKey]) return EVAL_CACHE[seedKey]
  const rnd = rngOf(seedKey)
  const total = bound > 0 ? Math.max(1, Math.round(bound * (0.7 + rnd() * 0.22))) : 0
  const m = EVAL_DEPTS.map((dept, i) => ({ dept, w: Math.max(0.2, 1.5 - i * 0.18), A: 0, B: 0, C: 0, D: 0 }))
  const wSum = sum(m.map((r) => r.w))
  let accW = 0
  m.forEach((r) => {
    const target = Math.round((total * (accW + r.w)) / wSum) - Math.round((total * accW) / wSum)
    accW += r.w
    if (target <= 0) return
    const cum = [0.3 + rnd() * 0.07, 0.62 + rnd() * 0.06, 0.88 + rnd() * 0.05, 1]
    let prev = 0
    const cells = cum.map((c) => {
      const v = Math.round(target * c) - Math.round(target * prev)
      prev = c
      return Math.max(0, v)
    })
    r.A = cells[0]
    r.B = cells[1]
    r.C = cells[2]
    r.D = cells[3]
  })
  const cnt = GRADES.reduce((o, g) => {
    o[g] = sum(m.map((r) => r[g]))
    return o
  }, {})
  if (total >= 4 && cnt.D === 0) {
    const best = m.filter((r) => r.C > 0).sort((a, b) => b.C - a.C)[0]
    if (best) {
      best.C--
      best.D++
      cnt.C--
      cnt.D++
    }
  }
  EVAL_CACHE[seedKey] = {
    m,
    cnt,
    total,
    onboard: bound,
    seed: seedKey,
    pass: total - cnt.D,
    rate: total ? Math.round(((total - cnt.D) / total) * 1000) / 10 : 0,
  }
  return EVAL_CACHE[seedKey]
}

export const evalSumOf = (row) => sum(GRADES.map((g) => row[g]))

/** 机构 × 年度 的评价汇总（bound = 该范围同期确认入职；全省只算 60 家法人行） */
export function evalStats(scope, year) {
  const bound = scope === 'ALL'
    ? sum(plansOf(year).filter((p) => !p.union).map((p) => p.onboard))
    : plansOf(year).filter((p) => p.org === scope).reduce((a, p) => a + p.onboard, 0)
  return evalCore(`ev|${scope}|${year}`, bound)
}

/** 单条计划实施的评价汇总（bound = 该实施确认入职） */
export function evalStatsImpl(im) {
  return evalCore(`evi|${im.id}`, im.progress ? im.progress.onboard : 0)
}

/* ---------------- 考核人员明细（弹窗用） ----------------
 * 不是另造一份数据，而是把 evalCore() 算出来的「部门 × 等级」格子逐格展开成人：
 * 每个格子有几个就生成几个人 → 弹窗里按等级筛选的人数与卡片、表格上的数字天然一致，
 * 不需要再对一遍口径（这类「明细和汇总对不上」是原型最容易翻车的地方）。
 */
const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '林', '何', '高', '罗']
const GIVEN = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '霞', '平', '刚', '鹏', '浩', '宇', '晨', '悦', '鑫', '婷', '雪', '健', '琳', '旭', '倩', '博', '楠', '嘉']

const DEPT_POST = {
  信息科技部: '软件开发岗',
  公司业务部: '客户经理',
  乡镇支行一部: '综合柜员',
  乡镇支行二部: '综合柜员',
  风险管理部: '风险经理',
  运营管理部: '运营专员',
  普惠金融部: '信贷调查岗',
}

/** 每个等级的成绩区间（同一个等级内也不会千篇一律） */
const GRADE_SCORE = { A: 93, B: 84, C: 74, D: 58 }

const GRADE_CONCLUSION = {
  A: '通过 · 考核优秀',
  B: '通过 · 考核良好',
  C: '通过 · 重点关注',
  D: '未通过 · 延长考察',
}

const PEOPLE_CACHE = {}

/**
 * 把一个评价汇总 es 展开成人员明细。
 * @param {object} es    evalCore() 的结果（m / cnt / total / seed）
 * @param {string} year  用于生成入职日期
 */
export function evalPeople(es, year) {
  if (!es || !es.m || !es.m.length) return []
  const key = `ppl|${es.seed}|${year}`
  if (PEOPLE_CACHE[key]) return PEOPLE_CACHE[key]
  const rnd = rngOf(key)
  const used = {}
  const out = []
  // 姓 20 × 名（单字 35 + 双字 1225）≈ 2.5 万种，重名率足够低
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
  const makeName = () => {
    const surname = pick(SURNAMES)
    return rnd() < 0.62 ? surname + pick(GIVEN) + pick(GIVEN) : surname + pick(GIVEN)
  }
  es.m.forEach((row) => {
    GRADES.forEach((g) => {
      for (let i = 0; i < row[g]; i += 1) {
        // 重名就再抽一次（最多 8 次），让名单看起来像真的
        let name = ''
        for (let k = 0; k < 8; k += 1) {
          name = makeName()
          if (!used[name]) break
        }
        used[name] = 1
        const base = GRADE_SCORE[g]
        out.push({
          id: `P${String(out.length + 1).padStart(3, '0')}`,
          name,
          dept: row.dept,
          post: DEPT_POST[row.dept] || '综合管理岗',
          // 入职日期落在 01~08 月：按 3 个月试用期，到 11-10 都已满，才可能「已完成考核」
          onboard: `${year}-${String(1 + Math.floor(rnd() * 8)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
          grade: g,
          score: Math.round((base + (rnd() * 6 - 3)) * 10) / 10,
          conclusion: GRADE_CONCLUSION[g],
          focus: g === 'C' || g === 'D',
        })
      }
    })
  })
  PEOPLE_CACHE[key] = out
  return out
}

/** 排序：越需要关注越靠前（D → C → B → A），同级按成绩升序 */
const PEOPLE_ORDER = { D: 0, C: 1, B: 2, A: 3 }
export const sortPeople = (list) =>
  list
    .slice()
    .sort((a, b) => PEOPLE_ORDER[a.grade] - PEOPLE_ORDER[b.grade] || a.score - b.score || (a.name < b.name ? -1 : 1))


/* ============================ 杂项 ============================ */

export const STATUS_TONE = {
  招聘中: 'green', 已结束: 'green', 待发布: 'orange', 已暂停: 'orange', 已关闭: 'gray',
  已退回: 'red', 审批中: 'blue', 草稿: 'gray', 已解除: 'gray', 待处理: 'orange', 处理中: 'blue',
}

export const toneOf = (s) => STATUS_TONE[s] || 'gray'

/** 百分比（b 为 0 时返回 0，避免模板里出现 Infinity / NaN） */
export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
