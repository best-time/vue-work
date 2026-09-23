<template>
  <vxe-grid
    ref="xGrid"
    v-bind="$attrs"
    :columns="columns"
    :data="data"
    :proxy-config="proxyConfig"
    :pager-config="pagerConfig"
    :sort-config="sortConfig"
    :filter-config="filterConfig"
    v-on="$listeners"
    @sort-change="handleSortChange"
    @filter-change="handleFilterChange"
  >
    <!-- 透传调用方所有插槽：表头自定义(#xx_header / 配置 slots.header)、单元格(#xx_default)等 -->
    <template v-for="(_, name) in $scopedSlots" v-slot:[name]="scope">
      <slot :name="name" v-bind="scope"></slot>
    </template>
  </vxe-grid>
</template>

<script>
/**
 * CommonTable —— vxe-grid 公共封装
 *
 * 两种模式：
 *   1. 本地模式：传 data 数组，排序/筛选/分页由 vxe 内部处理（或监听事件自己处理）
 *   2. 远程模式：传 query 函数，组件自动组装 proxyConfig + pagerConfig，
 *      翻页 / 排序（sortable: 'custom'）/ 表头筛选都会自动触发 query 并带上条件
 *
 * query 签名（远程模式）：
 *   query({ page, sorts, filters }) => Promise
 *     page    { currentPage, pageSize }
 *     sorts   [{ field, order: 'asc' | 'desc' | null }]
 *     filters [{ field, values: [] }]
 *   返回值约定：{ rows: [], total: n }（list / result 字段名也可，内部做了归一化）
 *
 * 插槽透传：页面里写 <template #列名_header="{ column }">、
 *           <template #列名_default="{ row }">，配合 columns 里对应列的
 *           slots: { header: '列名_header', default: '列名_default' } 即可。
 *           （列配置 slots 值也可以直接写插槽名，如 slots: { header: 'nameHeader' }）
 *
 * 透传：$attrs -> vxe-grid 属性（height/border/show-overflow/seq-config...）
 *        $listeners -> vxe-grid 事件（filter-change/sort-change/cell-click...）
 * 方法：this.$refs.table.getGrid() 拿 vxe-grid 实例；reload(params) / refresh()
 */
export default {
  name: 'CommonTable',
  props: {
    // 列配置（直接用 vxe-table 的列配置，支持 filters / sortable / formatter / slots 等）
    columns: { type: Array, default: () => [] },
    // 本地模式数据
    data: { type: Array, default: null },
    // 远程模式数据源：({ page, sorts, filters }) => Promise<{ rows, total }>
    query: { type: Function, default: null },
    pageSize: { type: Number, default: 10 },
    pageSizes: { type: Array, default: () => [10, 20, 50] },
    // 分页器布局（vxe-pager 3.6 为 PascalCase 命名；小写别名自动映射）
    pagerLayout: { type: String, default: 'total, prev, pager, jump, next, sizes' }
  },
  computed: {
    /** 是否远程模式：传了 query 就走 proxy */
    isRemote() {
      return typeof this.query === 'function'
    },
    /**
     * 远程代理配置：翻页/排序/筛选变化时 vxe-grid 会自动调 ajax.query，
     * 并把 page / sorts / filters 打包传进来，业务侧不用手动监听这些事件。
     */
    proxyConfig() {
      if (!this.isRemote) return null
      return {
        // 排序/筛选变化时自动触发 ajax.query（3.6 需显式开启）
        sort: true,
        filter: true,
        props: { result: 'result', total: 'page.total' },
        ajax: {
          query: async ({ page, sorts, filters }) => {
            const res = await this.query({
              page: { currentPage: page.currentPage, pageSize: page.pageSize },
              sorts: (sorts || [])
                .filter(s => s.order)
                .map(s => ({ field: s.property, order: s.order })),
              filters: (filters || [])
                .filter(f => f.values && f.values.length)
                .map(f => ({ field: f.property, values: f.values }))
            })
            // 归一化返回值，容错 rows/list/result 三种字段名
            const rows = res.rows || res.list || res.result || []
            return { result: rows, page: { total: res.total != null ? res.total : rows.length } }
          }
        }
      }
    },
    pagerConfig() {
      if (!this.isRemote) return null
      // vxe-pager 3.6 的 layouts 是 PascalCase（Total/PrevPage/Number/Jump/NextPage/Sizes...），
      // 这里兼容 4.x 风格的小写别名
      const alias = { total: 'Total', count: 'Total', home: 'PrevJump', prev: 'PrevPage', pager: 'Number', number: 'Number', jump: 'Jump', jumper: 'Jump', next: 'NextPage', end: 'NextJump', sizes: 'Sizes' }
      const toName = s => alias[s.trim().toLowerCase()] || s.trim().charAt(0).toUpperCase() + s.trim().slice(1)
      return {
        pageSize: this.pageSize,
        pageSizes: this.pageSizes,
        layouts: this.pagerLayout.split(',').map(toName)
      }
    },
    /** 远程模式下排序交给服务端 */
    sortConfig() {
      if (!this.isRemote) return undefined
      return { remote: true, ...(this.$attrs.sortConfig || this.$attrs['sort-config'] || {}) }
    },
    /** 远程模式下筛选交给服务端 */
    filterConfig() {
      if (!this.isRemote) return undefined
      return { remote: true, ...(this.$attrs.filterConfig || this.$attrs['filter-config'] || {}) }
    }
  },
  methods: {
    /**
     * 排序/筛选变化后自动带条件重新查询。
     * （grid 自带的联动在部分编程式调用下不触发，这里统一自己处理；
     *   父级通过 @sort-change / @filter-change 仍能正常收到事件）
     */
    handleSortChange() {
      if (this.isRemote) this.getGrid().commitProxy('query')
    },
    handleFilterChange() {
      if (this.isRemote) this.getGrid().commitProxy('query')
    },
    /** 拿到 vxe-grid 实例（可调用其全部 API：setFilter/sort/getCheckboxRecords...） */
    getGrid() {
      return this.$refs.xGrid
    },
    /** 重置到第一页重新请求，并清空筛选/排序条件（vxe 3.6 reload = clearAll + query） */
    reload(params) {
      return this.getGrid().commitProxy('reload', params)
    },
    /** 保持当前条件与页码刷新 */
    refresh() {
      return this.getGrid().commitProxy('query')
    }
  }
}
</script>
