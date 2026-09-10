import { ref } from '@vue/composition-api'

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

/*
// useQuery 查询
    const { data, loading, error, refetch } = useQuery(
      ['user', 1001], // queryKey
      () => fetchUserInfo(1001),
      { staleTime: 1000 * 30 } // 30秒缓存，期间不重复请求
    )

    // useMutation 修改
    const {
      loading: mutateLoading,
      mutate
    } = useMutation((payload) => updateUser(payload))

    const handleSave = async () => {
      await mutate({ name: 'test' })
      // 修改完，手动刷新查询，模拟 invalidateQueries
      refetch()
    }

    return {
      data, loading, error, refetch,
      mutateLoading, handleSave
    }

*/
