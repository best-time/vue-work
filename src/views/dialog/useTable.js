import { ref, reactive } from '@vue/composition-api'

/**
 * 通用表格Hook
 * @param {Function} apiFn 请求列表接口函数，接收(params)，返回Promise
 * @param {Object} initQuery 初始查询条件
 */
export function useTable(apiFn, initQuery = {}) {
  // loading状态
  const loading = ref(false)
  // 表格数据
  const tableData = ref([])

  // 分页
  const pagination = reactive({
    pageNum: 1,
    pageSize: 10,
    total: 0
  })

  // 查询条件
  const query = reactive({
    ...initQuery
  })

  /** 获取列表 */
  async function getList() {
    loading.value = true
    try {
      const params = {
        pageNum: pagination.pageNum,
        pageSize: pagination.pageSize,
        ...query
      }
      // 调用后端接口
      const res = await apiFn(params)
      // 根据你后端返回结构适配，举例：{ code:200, data:{ records:[], total:0 } }
      tableData.value = res?.data?.records ?? []
      pagination.total = res?.data?.total ?? 0
    } catch (err) {
      console.error('表格请求异常', err)
      tableData.value = []
      pagination.total = 0
    } finally {
      loading.value = false
    }
  }

  /** 查询：回到第一页 */
  function handleSearch() {
    pagination.pageNum = 1
    getList()
  }

  /** 重置查询条件 */
  function handleReset() {
    // 重置为初始值
    Object.assign(query, initQuery)
    pagination.pageNum = 1
    getList()
  }

  /** 分页改变 */
  function handlePageChange({ pageNum, pageSize }) {
    pagination.pageNum = pageNum
    pagination.pageSize = pageSize
    getList()
  }

  return {
    loading,
    tableData,
    pagination,
    query,
    getList,
    handleSearch,
    handleReset,
    handlePageChange
  }
}


/*
const {
      loading,
      tableData,
      pagination,
      query,
      getList,
      handleSearch,
      handleReset,
      handlePageChange
    } = useTable(getTableListApi, { name: '' })
*/