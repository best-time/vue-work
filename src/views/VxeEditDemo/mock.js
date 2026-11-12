/**
 * vxe-table 行内编辑 demo 用的假数据
 *
 * 真实项目里这些来自接口；这里只保证「字段名 / 选项 value」和表格列配置对得上。
 */

/** 部门下拉：value 是提交给后端的编码，label 是显示文本 */
export const DEPT_OPTIONS = [
  { label: '研发部', value: 'rd' },
  { label: '产品部', value: 'pd' },
  { label: '设计部', value: 'dd' },
  { label: '市场部', value: 'mk' }
]

/** 状态下拉：故意用数字 value，说明 $select 的 value 类型不受限（内部用 == 比对） */
export const STATUS_OPTIONS = [
  { label: '在职', value: 1, color: 'success' },
  { label: '试用', value: 2, color: 'warning' },
  { label: '离职', value: 0, color: 'info' }
]

export const deptLabel = (value) => {
  const hit = DEPT_OPTIONS.find((o) => o.value === value)
  return hit ? hit.label : value || ''
}

export const statusMeta = (value) => {
  return STATUS_OPTIONS.find((o) => o.value === value) || { label: value, color: 'info' }
}

/** 自增 id：新增行时用，避免和已有行撞 key */
let seed = 1000
export const nextId = () => (seed += 1)

/** 深拷贝：表格保存后要把数据整体换成一份新引用，才能重置脏标记 */
export const clone = (val) => JSON.parse(JSON.stringify(val))

/** 金额显示（表格默认态用，编辑态由 $input 自己渲染） */
export const money = (val) => {
  if (val === null || val === undefined || val === '') return ''
  return `¥${Number(val).toLocaleString('zh-CN')}`
}

/** 今天 yyyy-MM-dd（新增行默认入职日期，省得每次都要选日期） */
export const today = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 一份员工数据 */
export function createStaff() {
  return [
    {
      id: 1,
      name: '张三',
      dept: 'rd',
      salary: 18000,
      onboard: '2021-03-15',
      status: 1,
      locked: false,
      remark: '基础组件维护'
    },
    {
      id: 2,
      name: '李四',
      dept: 'pd',
      salary: 22000,
      onboard: '2020-07-01',
      status: 1,
      locked: true,
      remark: '需求评审人'
    },
    {
      id: 3,
      name: '王五',
      dept: 'dd',
      salary: 15500,
      onboard: '2022-11-09',
      status: 2,
      locked: false,
      remark: '视觉设计'
    },
    {
      id: 4,
      name: '赵六',
      dept: 'mk',
      salary: 13000,
      onboard: '2019-05-20',
      status: 0,
      locked: false,
      remark: ''
    }
  ]
}

/**
 * 模拟「保存备注」接口：PUT /api/staff/:id/remark
 *
 * 真实项目里这里是 fetch / axios，demo 用 setTimeout 假装走了一趟网络。
 * 顺便做两件真实接口常干的事，用来验证「写回表格的是接口返回值，不是本地草稿」：
 *   - trim + 把连续空格压成一个（服务端做规整，回包可能和入参不同）
 *   - 返回一个客户端算不出来的 updatedAt
 *
 * @param {{ id: number, remark: string }} payload
 * @param {{ fail?: boolean }} [opts] fail = true 时返回 504，用来演示失败分支
 */
export function saveRemark(payload, opts = {}) {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (opts.fail) {
        reject(new Error('请求超时（504）：备注保存失败，请重试'))
        return
      }
      resolve({
        code: 0,
        message: 'ok',
        data: {
          id: payload.id,
          remark: String(payload.remark).trim().replace(/\s+/g, ' '),
          updatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
        },
        cost: Date.now() - startedAt
      })
    }, 620)
  })
}
