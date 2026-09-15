<template>
  <div class="demo-page">
    <el-button @click="openSimple">① 基础用法（默认footer）</el-button>
    <el-button @click="openWithBeforeClose">② beforeClose 拦截</el-button>
    <el-button @click="openWithHandle">③ 返回句柄手动控制</el-button>
    <el-button @click="confirmDelete">④ 全局 $confirm 快捷确认</el-button>
    <el-button @click="showAlert">⑤ 全局 $alert 单按钮提示</el-button>
    <el-button @click="openNested">⑥ 多级弹窗叠加</el-button>
  </div>
</template>

<script>
import DemoContent from '@/components/DemoContent.vue'

export default {
  name: 'DemoPage',
  methods: {
    // ① 基础用法：不写 template、不定义 dialogVisible，直接 await 拿结果
    async openSimple() {
      const res = await this.$dialog({
        title: '基础函数弹窗',
        component: DemoContent,
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
        // 必须用箭头函数：beforeClose 由容器调用，箭头函数才能让 this 指向当前页面组件
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
      if (res.type === 'confirm') console.log('校验通过并确认', res.data)
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
      return new Promise(resolve => setTimeout(() => resolve(true), 300))
    },

    // ④ 全局快捷确认框（语义同 this.$confirm：确认 resolve，取消 reject）
    async confirmDelete() {
      try {
        await this.$confirm('确定删除这条记录吗？删除后不可恢复。', '删除确认', {
          confirmText: '删 除',
          cancelText: '再想想',
          type: 'warning',
          width: '440px'
        })
        this.$message.success('已删除')
      } catch (e) {
        this.$message.info('已取消删除')
      }
    },

    // ⑤ 单按钮提示：只有"知道了"，无论确定或关闭都 resolve
    async showAlert() {
      await this.$alert('操作已成功，请继续。', '完成', { confirmText: '好 的' })
      this.$message.success('提示已关闭')
    },

    // ⑥ 多级弹窗叠加：append-to-body 已内置，再开一层即可
    async openNested() {
      const first = await this.$dialog({
        title: '第一层弹窗',
        component: DemoContent,
        props: { msg: '第一层，确定后弹出第二层' },
        context: this
      })
      if (first.type === 'confirm') {
        const second = await this.$dialog({
          title: '第二层弹窗',
          component: DemoContent,
          props: { msg: '第二层内容，基于第一层的结果继续' },
          context: this
        })
        console.log('第二层结果：', second)
      }
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
