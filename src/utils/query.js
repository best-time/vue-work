import { ref, computed } from '@vue/composition-api'

/*
1. **`useQuery`**：普通查询，
`staleTime` 数据新鲜期；`cacheTime` 缓存驻留时间，
内部定时 GC 自动清理过期缓存，避免内存泄漏。

2. **`useMutation`**：用于新增、修改、删除；执行完调用 
`invalidateQueries` 让旧缓存失效，再 `refetch` 获取最新数据。

3. **`useInfiniteQuery`**：无限分页，
`flatData` 把多页数据拍平直接循环渲染；`getNextPageParam` 由业务定义何时还有下一页。
*/

// 全局查询缓存
const queryCache = new Map()

/**
 * 清除过期缓存，定时执行
 * @param {number} cacheTime 缓存驻留时间 ms，超时直接丢弃缓存
 */
function gcCache(cacheTime = 5 * 60 * 1000) {
  const now = Date.now()
  for (const [key, item] of queryCache.entries()) {
    if (now - item.timestamp > cacheTime) {
      queryCache.delete(key)
    }
  }
}

// 每 3 分钟执行一次垃圾回收
setInterval(() => gcCache(), 3 * 60 * 1000)

/**
 * 使指定 queryKey 缓存失效
 * @param {Array} queryKey
 */
export function invalidateQueries(queryKey) {
  const cacheKey = JSON.stringify(queryKey)
  queryCache.delete(cacheKey)
}

/**
 * useQuery 查询
 * @param {Array} queryKey 唯一key
 * @param {Function} queryFn 请求函数
 * @param {Object} options {enabled:true, staleTime:0, cacheTime:300000}
 */
export function useQuery(queryKey, queryFn, options = {}) {
  const { enabled = true, staleTime = 0, cacheTime = 5 * 60 * 1000 } = options
  const cacheKey = JSON.stringify(queryKey)
  const cacheItem = queryCache.get(cacheKey)

  const data = ref(cacheItem?.data ?? null)
  const loading = ref(false)
  const error = ref(null)

  async function fetch() {
    gcCache(cacheTime)
    if (cacheItem) {
      const now = Date.now()
      // 未过期直接使用缓存，不发请求
      if (staleTime > 0 && now - cacheItem.timestamp < staleTime) {
        return Promise.resolve(cacheItem.data)
      }
    }

    loading.value = true
    error.value = null
    try {
      const res = await queryFn()
      data.value = res
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

/**
 * useMutation 新增/编辑/删除
 * @param {Function} mutationFn 提交请求函数
 */
export function useMutation(mutationFn) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const mutate = async (...args) => {
    loading.value = true
    error.value = null
    try {
      const res = await mutationFn(...args)
      data.value = res
      return res
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    mutate
  }
}

/**
 * useInfiniteQuery 无限滚动分页【新增】
 * @param {Array} queryKey
 * @param {Function} queryFn ({pageParam})=>Promise
 * @param {Object} options {enabled:true, getNextPageParam}
 */
export function useInfiniteQuery(queryKey, queryFn, options = {}) {
  const { enabled = true, getNextPageParam } = options
  const cacheKey = JSON.stringify(queryKey)
  const cacheItem = queryCache.get(cacheKey)

  // pages: [第一页数据,第二页数据...]
  const pages = ref(cacheItem?.pages ?? [])
  const loading = ref(false)
  const error = ref(null)
  const hasNextPage = ref(true)

  // 当前页码标识
  let pageParam = options.initialPageParam ?? 1

  async function fetchNextPage() {
    if (!hasNextPage.value) { return }
    loading.value = true
    error.value = null
    try {
      const res = await queryFn({ pageParam })
      pages.value.push(res)
      // 由用户提供函数判断是否还有下一页
      const next = getNextPageParam(res)
      if (next === undefined || next === null) {
        hasNextPage.value = false
      } else {
        pageParam = next
      }
      // 存入缓存
      queryCache.set(cacheKey, {
        pages: pages.value,
        timestamp: Date.now()
      })
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  // 重置，清空全部分页，回到第一页
  async function refetch() {
    pages.value = []
    pageParam = options.initialPageParam ?? 1
    hasNextPage.value = true
    await fetchNextPage()
  }

  if (enabled) {
    fetchNextPage()
  }

  // 拍平所有列表数据，方便模板循环
  const flatData = computed(() => {
    return pages.value.reduce((acc, cur) => {
      return acc.concat(cur.records || cur)
    }, [])
  })

  return {
    pages,
    flatData,
    loading,
    error,
    hasNextPage,
    fetchNextPage,
    refetch
  }
}
