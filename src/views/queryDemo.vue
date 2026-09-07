<template>
  <div>
    <!-- useQuery 普通查询 -->
    <div>
      <div v-if="qLoading">查询加载中</div>
      <div v-if="qError">查询出错</div>
      <div>{{ qData }}</div>
      <button @click="qRefetch">刷新查询</button>
    </div>

    <!-- useMutation 修改 -->
    <div>
      <button @click="handleSave" :disabled="mLoading">提交保存</button>
    </div>

    <!-- useInfiniteQuery 无限滚动 -->
    <div>
      <div v-for="item in infiniteFlatData" :key="item.id">{{ item.name }}</div>
      <div v-if="infLoading">加载更多...</div>
      <button @click="fetchNextPage" v-if="infHasNextPage">加载下一页</button>
      <div v-if="!infHasNextPage">没有更多了</div>
    </div>
  </div>
</template>

<script>
import { useQuery, useMutation, useInfiniteQuery, invalidateQueries } from '@/utils/query'
import { getUserList, saveUser, getUserInfiniteList } from '@/api/list'

export default {
  setup() {
    // 1.useQuery
    const {
      data: qData,
      loading: qLoading,
      error: qError,
      refetch: qRefetch
    } = useQuery(['user', 'list'], () => getUserList({ page:1, size:10 }), {
      staleTime: 1000 * 20
    })

    // 2.useMutation
    const { loading: mLoading, mutate } = useMutation(saveUser)
    const handleSave = async () => {
      await mutate({ name: '张三' })
      // 修改后让缓存失效，刷新列表
      invalidateQueries(['user', 'list'])
      qRefetch()
    }

    // 3.useInfiniteQuery 无限分页
    const {
      flatData: infiniteFlatData,
      loading: infLoading,
      hasNextPage: infHasNextPage,
      fetchNextPage,
      refetch: infRefetch
    } = useInfiniteQuery(
      ['user', 'infinite'],
      ({ pageParam }) => getUserInfiniteList({ pageParam }),
      {
        initialPageParam: 1,
        // 根据返回数据，计算下一页参数，返回 undefined 代表无下一页
        getNextPageParam: (lastPage) => {
          const { page, total, size } = lastPage
          const maxPage = Math.ceil(total / size)
          return page < maxPage ? page + 1 : undefined
        }
      }
    )

    return {
      qData, qLoading, qError, qRefetch,
      mLoading, handleSave,
      infiniteFlatData, infLoading, infHasNextPage, fetchNextPage, infRefetch
    }
  }
}
</script>
