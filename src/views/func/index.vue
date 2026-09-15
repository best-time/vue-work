<template>
  <div class="demo-page">
    <el-button @click="openSimple">① 基础用法（默认footer）</el-button>
    <el-button @click="openWithBeforeClose">② beforeClose 拦截</el-button>
    <el-button @click="openWithHandle">③ 返回句柄手动控制</el-button>
  </div>
</template>

<script>
import DemoContent from '@/components/Funcomponent/DemoContent.vue'
// import { h } from 'vue-demi'

export default {
  name: 'DemoPage',
  methods: {
    // ① 基础用法：不写 template、不定义 dialogVisible，直接 await 拿结果
    async openSimple() {
      const res = await this.$dialog({
        title: '基础函数弹窗',
        component: () => import('@/components/Funcomponent/DemoContent.vue'),
        props: { msg: '这是从调用方传入的内容' },
        dialogProps: { width: '500px', closeOnClickModal: false },
        context: this
      })
      if (res.type === 'confirm') {
        this.$message.success('确认：' + JSON.stringify(res.data))
      } else {
        this.$message.info('已取消')
      }
    },

    // ② beforeClose：确定/取消前异步校验，返回 false 阻止关闭
    async openWithBeforeClose() {
      const res = await this.$dialog({
        title: '拦截关闭示例',
        component: DemoContent,
        props: {},
        context: this,
        beforeClose: async (vm, action) => {
          if (action === 'confirm') {
            // 模拟异步校验
            const ok = await this.fakeCheck()
            if (!ok) {
              this.$message.warning('校验未通过，禁止关闭')
              return false
            }
          }
          return true
        }
      })

      if (res.type === 'confirm') {
        console.log('校验通过并确认', res.data)
      }
    },

    // ③ 返回 vm 句柄，可手动控制
    openWithHandle() {
      const dlg = this.$dialogWithHandle({
        title: '句柄控制示例',
        component: DemoContent,
        props: { msg: '由 dlg.confirmLoading 控制按钮' },
        context: this
      })
      // 手动置为 loading（配合异步 beforeClose 常见）
      // dlg.confirmLoading = true
    },

    fakeCheck() {
      return new Promise(resolve => setTimeout(() => resolve(Math.random() > 0.5), 300))
    }
  }
}
</script>

<style scoped>
.demo-page {
  padding: 24px;
}
.demo-page .el-button {
  margin-bottom: 8px;
}
</style>
