import { ref, watch } from '@vue/composition-api'
// import request from './request'

export function useQuery(apiFn, queryParams) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchData = async (...args) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiFn(...args)
      data.value = res
      return res
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // 立即执行
  fetchData(...(Array.isArray(queryParams) ? queryParams : [queryParams]))

  // 参数变化重新请求（可选）
  if (typeof queryParams === 'object') {
    watch(queryParams, ()=>{
      fetchData(...(Array.isArray(queryParams) ? queryParams : [queryParams]))
    }, { deep:true })
  }

  return { data, loading, error, refetch: fetchData }
}
