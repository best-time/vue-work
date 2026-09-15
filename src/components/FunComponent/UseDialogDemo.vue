<template>
  <div class="demo-setup">
    <el-button @click="openSimple">① setup 基础用法</el-button>
    <el-button @click="openWithBeforeClose">② setup beforeClose（闭包访问）</el-button>
    <el-button @click="confirmDelete">③ setup $confirm</el-button>
    <el-button @click="showAlert">④ setup $alert</el-button>
    <p v-if="resultText" class="result-text">结果：{{ resultText }}</p>
  </div>
</template>

<script>
import { ref } from 'vue-demi'
import { useDialog } from '@/utils/useDialog'
import DemoContent from './DemoContent.vue'

/**
 * setup 中使用函数式弹窗的示例：全程无 this
 * 依赖 @vue/composition-api（main.js 需 Vue.use(VueCompositionAPI)）
 */
export default {
  name: 'DemoSetup',
  setup() {
    const { dialog, confirm, alert } = useDialog()
    const resultText = ref('')

    // ① 基础用法：直接 await 拿结果
    const openSimple = async () => {
      const res = await dialog({
        title: 'setup 函数弹窗',
        component: DemoContent,
        props: { msg: '来自 setup 的调用' },
        dialogProps: { width: '500px' }
      })
      resultText.value = res.type === 'confirm'
        ? '确认：' + JSON.stringify(res.data)
        : '已取消'
    }

    // ② beforeClose：setup 里写箭头函数，直接闭包访问变量，无 this 问题
    const openWithBeforeClose = async () => {
      const res = await dialog({
        title: 'setup beforeClose',
        component: DemoContent,
        props: {},
        beforeClose: async (vm, action) => {
          if (action === 'confirm' && resultText.value === '') {
            // 校验不通过则阻止关闭
            return false
          }
          return true
        }
      })
      console.log(res)
    }

    // ③ 确认框：确认 resolve，取消 reject（try/catch）
    const confirmDelete = async () => {
      try {
        await confirm('确定删除这条记录吗？', '删除确认', {
          confirmText: '删 除'
        })
        resultText.value = '已删除'
      } catch (e) {
        resultText.value = '已取消删除'
      }
    }

    // ④ 单按钮提示：恒 resolve
    const showAlert = async () => {
      await alert('操作已成功，请继续。', '完成', { confirmText: '好 的' })
      resultText.value = '提示已关闭'
    }

    return { openSimple, openWithBeforeClose, confirmDelete, showAlert, resultText }
  }
}
</script>

<style scoped>
.demo-setup {
  padding: 24px;
}
.demo-setup .el-button {
  margin-bottom: 8px;
}
.result-text {
  margin-top: 12px;
  color: #409eff;
  font-size: 13px;
}
</style>
