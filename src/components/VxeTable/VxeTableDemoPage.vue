<template>
  <div class="vxe-demo">
    <h2>vxe-table 公共组件示例</h2>
    <p class="vxe-demo__tip">
      公共封装：<code>components/VxeTable/CommonTable.vue</code>（本地 / 远程两种模式，插槽全透传）。
      版本：<code>vxe-table 3.6.17</code>（Vue 2.6 兼容；4.x 是 Vue3 专用）。
    </p>

    <!-- ================= 例1：本地数据 + 表头自定义 ================= -->
    <el-card shadow="never" class="vxe-demo__card">
      <div slot="header">例1 · 本地数据 + 表头自定义（插槽表头 / 前后缀提示 / 对齐）</div>
      <CommonTable
        ref="localTable"
        :data="localRows"
        :columns="localColumns"
        border
        stripe
        show-overflow
        :seq-config="{ startIndex: 0 }"
      >
        <!-- 表头自定义：插槽名 = 列配置 slots.header 的值 -->
        <template #nameHeader="{ column }">
          <span class="vxe-demo__header">
            <i class="el-icon-user-solid"></i>
            {{ column.title }}
            <el-tooltip content="表头由调用方插槽渲染：可放图标、提示、必填星号等" placement="top">
              <i class="el-icon-question vxe-demo__help"></i>
            </el-tooltip>
          </span>
        </template>
        <!-- 单元格自定义：状态列 -->
        <template #status_default="{ row }">
          <el-tag size="mini" :type="row.status === 1 ? 'success' : row.status === 0 ? 'warning' : 'danger'">
            {{ { 1: '在职', 0: '休假', 2: '离职' }[row.status] }}
          </el-tag>
        </template>
        <!-- 操作列 -->
        <template #action_default="{ row }">
          <el-button type="text" size="mini" @click="say(row, '查看')">查看</el-button>
          <el-button type="text" size="mini" @click="say(row, '编辑')">编辑</el-button>
        </template>
      </CommonTable>
    </el-card>

    <!-- ================= 例2：远程筛选 / 远程排序 / 远程分页 ================= -->
    <el-card shadow="never" class="vxe-demo__card">
      <div slot="header">例2 · 远程模式：表头筛选 / 排序 / 分页（proxy 自动触发 query）</div>
      <div class="vxe-demo__toolbar">
        <el-tag v-if="lastQuery.city.length" size="mini" closable @close="clearFilter('city')">
          城市：{{ lastQuery.city.join(' / ') }}
        </el-tag>
        <el-tag v-if="lastQuery.age != null" size="mini" closable @close="clearFilter('age')">
          年龄 ≥ {{ lastQuery.age }}
        </el-tag>
        <el-tag v-if="lastQuery.sort" size="mini" type="info">
          排序：{{ lastQuery.sort.field }} · {{ lastQuery.sort.order === 'desc' ? '降序' : '升序' }}
        </el-tag>
        <span class="vxe-demo__summary">最近一次请求参数见控制台</span>
      </div>

      <CommonTable
        ref="remoteTable"
        :query="fetchUsers"
        :columns="remoteColumns"
        :page-size="10"
        border
        stripe
        show-overflow
        height="420"
        @filter-change="onFilterChange"
        @sort-change="onSortChange"
      >
        <!-- 表头自定义：姓名列 -->
        <template #nameHeader2="{ column }">
          <span class="vxe-demo__header">{{ column.title }}（自定义表头）</span>
        </template>
        <template #action_default="{ row }">
          <el-button type="text" size="mini" @click="say(row, '详情')">详情</el-button>
        </template>
      </CommonTable>
    </el-card>
  </div>
</template>

<script>
/**
 * vxe-table 常用示例页
 *  例1：本地 data + 表头自定义（插槽表头、titlePrefix/titleSuffix 提示、对齐）+ 单元格/操作列插槽 + 全局 formatter
 *  例2：远程模式 —— 表头筛选（输入筛选 + 多选筛选）、远程排序、远程分页，
 *       CommonTable 的 proxy 会把 { page, sorts, filters } 自动传给 query 函数
 */

/* ---------- mock 数据与远程接口（真实项目换成 axios 请求） ---------- */
const CITIES = ['北京', '上海', '广州', '深圳']
const ALL_USERS = Array.from({ length: 46 }, (_, i) => ({
  id: i + 1,
  name: `用户${String(i + 1).padStart(2, '0')}`,
  age: 18 + ((i * 7) % 30),
  city: CITIES[i % 4],
  salary: 8000 + ((i * 137) % 17000),
  joinDate: `202${i % 4}-0${(i % 9) + 1}-1${i % 9}`
}))

function fetchUsersApi({ page, sorts = [], filters = [] }) {
  console.log('[mock api] 收到查询条件:', JSON.parse(JSON.stringify({ page, sorts, filters })))
  return new Promise(resolve => {
    setTimeout(() => {
      let rows = ALL_USERS.slice()
      // ① 远程筛选：city 多选 / age 最小值
      filters.forEach(({ field, values }) => {
        if (!values || !values.length) return
        if (field === 'city') rows = rows.filter(r => values.includes(r.city))
        if (field === 'age') rows = rows.filter(r => r.age >= Number(values[0]))
      })
      // ② 远程排序
      sorts.forEach(({ field, order }) => {
        if (!order) return
        rows = rows.slice().sort((a, b) => order === 'desc' ? b[field] - a[field] : a[field] - b[field])
      })
      // ③ 远程分页
      const total = rows.length
      const start = (page.currentPage - 1) * page.pageSize
      resolve({ rows: rows.slice(start, start + page.pageSize), total })
    }, 300)
  })
}

export default {
  name: 'VxeTableDemoPage',
  data() {
    return {
      /* ---------- 例1：本地数据 ---------- */
      localRows: [
        { id: 1, name: '张三', age: 28, city: '北京', salary: 18000, status: 1 },
        { id: 2, name: '李四', age: 35, city: '上海', salary: 25000, status: 0 },
        { id: 3, name: '王五', age: 24, city: '广州', salary: 12000, status: 1 },
        { id: 4, name: '赵六', age: 41, city: '深圳', salary: 30000, status: 2 }
      ],
      localColumns: [
        { type: 'seq', width: 50, title: '#' },
        // 表头自定义：slots.header 指向页面插槽 #nameHeader
        { field: 'name', title: '姓名', slots: { header: 'nameHeader' }, minWidth: 120 },
        // 内置表头提示：titlePrefix 前缀问号（hover 出 tooltip），headerAlign 表头对齐
        { field: 'age', title: '年龄', titlePrefix: { content: '以身份证年龄为准' }, headerAlign: 'center', width: 120 },
        { field: 'city', title: '城市', width: 100 },
        // 全局 formatter（见 VxeTable/index.js 里 VXETable.formats.add）
        { field: 'salary', title: '工资', formatter: 'formatMoney', align: 'right', width: 120 },
        // 表头后缀提示 + 单元格插槽
        { field: 'status', title: '状态', titleSuffix: { content: '由单元格插槽渲染', icon: 'vxe-icon--question-circle' }, slots: { default: 'status_default' }, width: 100 },
        { title: '操作', slots: { default: 'action_default' }, width: 120 }
      ],

      /* ---------- 例2：远程筛选/排序/分页 ---------- */
      remoteColumns: [
        { type: 'seq', width: 50, title: '#' },
        { field: 'name', title: '姓名', slots: { header: 'nameHeader2' }, minWidth: 140 },
        // ③ 表头远程筛选（输入式）：filterRender 用 VxeInput，确认后 values=[输入值]
        {
          field: 'age',
          title: '年龄（输入筛选）',
          sortable: 'custom',            // 远程排序：点表头排序图标时由 query 处理
          headerAlign: 'center',
          filters: [{ data: '' }],
          filterRender: { name: 'VxeInput', props: { type: 'integer', placeholder: '最小年龄', clearable: true } }
        },
        // ④ 表头远程筛选（多选式）：checkbox 列表，确认后 values=[勾选值]
        {
          field: 'city',
          title: '城市（多选筛选）',
          sortable: 'custom',
          headerAlign: 'center',
          filters: CITIES.map(c => ({ label: c, value: c }))
        },
        { field: 'salary', title: '工资', formatter: 'formatMoney', align: 'right', sortable: 'custom', width: 120 },
        { field: 'joinDate', title: '入职日期', formatter: 'formatDate', width: 110 },
        { title: '操作', slots: { default: 'action_default' }, width: 100, fixed: 'right' }
      ],
      // 展示当前筛选/排序条件
      lastQuery: { city: [], age: null, sort: null }
    }
  },
  methods: {
    /** 远程数据源：CommonTable 会传 { page, sorts, filters } */
    fetchUsers({ page, sorts, filters }) {
      return fetchUsersApi({ page, sorts, filters }).then(res => {
        console.log(`[mock api] 返回 ${res.rows.length}/${res.total} 条`)
        return res
      })
    },
    /** 筛选变化（远程模式下 proxy 自动带条件重新 query，这里只同步展示） */
    onFilterChange({ filters }) {
      const get = field => {
        const f = filters.find(f => f.property === field)
        return f && f.values ? f.values : []
      }
      this.lastQuery.city = get('city')
      this.lastQuery.age = get('age')[0] ?? null
    },
    onSortChange({ property, order }) {
      this.lastQuery.sort = order ? { field: property, order } : null
    },
    /** 清除某列表头筛选并带条件重新请求（refresh 保持其它条件） */
    clearFilter(field) {
      this.$refs.remoteTable.getGrid().setFilter(field, null)
      this.$refs.remoteTable.refresh()
      if (field === 'city') this.lastQuery.city = []
      else this.lastQuery.age = null
    },
    say(row, action) {
      this.$message.info(`${action}：${row.name}（${row.city}）`)
    }
  }
}
</script>

<style scoped>
.vxe-demo { padding: 24px; }
.vxe-demo__tip { color: #909399; font-size: 13px; margin: 8px 0 16px; }
.vxe-demo__tip code, .vxe-demo__card code { background: #f5f7fa; padding: 2px 6px; border-radius: 3px; }
.vxe-demo__card { max-width: 980px; margin-bottom: 20px; }
.vxe-demo__header { display: inline-flex; align-items: center; gap: 4px; color: #409eff; }
.vxe-demo__help { color: #c0c4cc; cursor: help; }
.vxe-demo__toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.vxe-demo__summary { color: #c0c4cc; font-size: 12px; }
</style>
