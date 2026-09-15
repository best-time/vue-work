import { ref, reactive } from 'vue-demi'

// 全局缓存池
const queryCache = new Map()

/**
 * @param {Array} queryKey 唯一标识，类似 ['user', infoId]
 * @param {Function} queryFn 返回promise的请求函数
 * @param {Object} options { enabled:true, staleTime:0 }
 */
export function useQuery(queryKey, queryFn, options = {}) {
  const { enabled = true, staleTime = 0 } = options

  const cacheKey = JSON.stringify(queryKey)
  const cacheItem = queryCache.get(cacheKey)

  const data = ref(cacheItem?.data ?? null)
  const loading = ref(false)
  const error = ref(null)

  // 真正请求逻辑
  async function fetch() {
    // 判断缓存是否有效
    if (cacheItem) {
      const now = Date.now()
      if (staleTime > 0 && now - cacheItem.timestamp < staleTime) {
        // 缓存未过期，直接返回，不发请求
        return Promise.resolve(cacheItem.data)
      }
    }

    loading.value = true
    error.value = null
    try {
      const res = await queryFn()
      data.value = res
      // 更新缓存
      queryCache.set(cacheKey, {
        data: res,
        timestamp: Date.now()
      })
      return res
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // enabled=true 自动执行
  if (enabled) {
    fetch()
  }

  const refetch = () => fetch()

  return {
    data,
    loading,
    error,
    refetch
  }
}
