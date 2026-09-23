<template>
  <div class="h-dialog-demo">
    <h2>h-dialog —— 纯 render 函数版函数式 el-dialog</h2>
    <p class="h-dialog-demo__desc">
      容器整棵树用 h() 渲染（无 .vue 模板容器），插槽统一走 scopedSlots 传递。
      实现见 <code>components/FunComponent/h-dialog/index.js</code>。
    </p>

    <el-card shadow="never" class="h-dialog-demo__card">
      <div slot="header">调用示例（点按钮逐个试）</div>
      <div class="h-dialog-demo__btns">
        <el-button size="small" @click="demoBasic">① slots + scopedSlots 基础</el-button>
        <el-button size="small" @click="demoReactive">② 响应式插槽（跟随页面数据）</el-button>
        <el-button size="small" @click="demoFooterHandle">③ 自定义 footer + 句柄</el-button>
        <el-button size="small" @click="demoBeforeClose">④ beforeClose 拦截关闭</el-button>
        <el-button size="small" @click="demoConfirm">⑤ message 快捷确认框</el-button>
      </div>
      <el-input
        v-model="pageText"
        size="small"
        class="h-dialog-demo__input"
        placeholder="改这里，② 的弹窗内容实时变"
      />
      <div class="h-dialog-demo__result">
        最近一次弹窗结果：<b>{{ lastResult }}</b>
      </div>
    </el-card>
  </div>
</template>

<script>
import HDialogDemoContent from './HDialogDemoContent.vue'
import '@/components/FunComponent/h-dialog' // 注册 this.$hDialog / this.$hDialogWithHandle

export default {
  name: 'HDialogDemoPage',
  data() {
    return {
      pageText: '页面上的响应式数据',
      lastResult: '（还没打开过弹窗）'
    }
  },
  methods: {
    logResult(res) {
      this.lastResult = res && res.type === 'confirm' ? `confirm · ${JSON.stringify(res.data)}` : String(res && res.type)
    },

    /** ① 普通插槽（字符串 / VNode / 数组）+ 作用域插槽 */
    async demoBasic() {
      const h = this.$createElement
      const res = await this.$hDialog({
        title: '① h() 渲染的函数式弹窗',
        component: HDialogDemoContent,
        context: this,
        props: { list: HDialogDemoContent.props.list.default() },
        slots: {
          default: '默认插槽：字符串直接给。', // 字符串
          header: h('b', { style: { color: '#409eff' } }, 'header 插槽：单个 VNode'), // VNode
          extra: [ // VNode 数组
            h('p', { style: { margin: '0 0 4px' } }, 'extra 插槽第一行'),
            h('p', { style: { margin: 0, color: '#909399' } }, 'extra 插槽第二行')
          ]
        },
        scopedSlots: {
          // scope 是业务组件 <slot name="row" :row :index :checked> 回传的数据
          row: (h2, { row, index, checked }) => [
            h2('el-tag', { props: { size: 'mini', type: checked ? 'success' : 'info' } }, row.name),
            h2('span', { style: { marginLeft: '8px', color: '#909399' } }, `${row.email} · index=${index} · checked=${checked}`)
          ]
        },
        dialogProps: { width: '560px' }
      })
      this.logResult(res)
    },

    /** ② 插槽用函数写法：内容跟随调用方响应式数据实时变化 */
    async demoReactive() {
      const res = await this.$hDialog({
        title: '② 响应式插槽',
        component: HDialogDemoContent,
        context: this,
        props: { list: HDialogDemoContent.props.list.default() },
        slots: {
          // 函数式插槽：每次渲染重新执行，this.pageText 变化会实时反映到弹窗里
          default: h => [
            h('p', { style: { margin: 0 } }, [
              '页面输入框的内容是：',
              h('b', { style: { color: '#67c23a' } }, this.pageText || '（空）')
            ])
          ]
        },
        dialogProps: { width: '520px' }
      })
      this.logResult(res)
    },

    /** ③ 自定义 footer：默认按钮不渲染，用句柄 dlg 收口确认/取消 */
    demoFooterHandle() {
      const h = this.$createElement
      const dlg = this.$hDialogWithHandle({
        title: '③ 自定义 footer（$hDialogWithHandle）',
        component: HDialogDemoContent,
        context: this,
        props: { list: HDialogDemoContent.props.list.default(), hideActions: true },
        slots: {
          default: '底部按钮由 slots.footer 接管，点「保存」可看到 confirmLoading 生效。',
          // footer 函数里引用外层 const dlg：插槽函数在 open 后的 nextTick 才首次执行，
          // 那时 dlg 已完成赋值（容器的异步渲染保证了这一点），不会报 TDZ 错误
          footer: h2 => [
            h2('el-button', { props: { size: 'small' }, on: { click: () => dlg.onCancel() } }, '放弃'),
            h2('el-button', {
              props: { size: 'small', type: 'primary', loading: dlg.confirmLoading }, // dlg.confirmLoading 是响应式的
              on: { click: () => this.doFooterSubmit(dlg) }
            }, '保存（自定义 loading）')
          ]
        },
        dialogProps: { width: '540px', closeOnClickModal: false }
      })
      console.log('[h-dialog 句柄]', dlg)
      dlg.openPromise.then(res => this.logResult(res)) // 句柄上也挂了结果 Promise
    },

    async doFooterSubmit(dlg) {
      dlg.confirmLoading = true
      await new Promise(r => setTimeout(r, 800)) // 模拟请求
      dlg.confirmLoading = false
      dlg.onConfirm({ from: '自定义 footer' })
    },

    /** ④ beforeClose：返回 false 阻止关闭（右上角 X / 取消 / 确定都会先过这里） */
    async demoBeforeClose() {
      const res = await this.$hDialog({
        title: '④ beforeClose 拦截',
        component: HDialogDemoContent,
        context: this,
        props: { list: HDialogDemoContent.props.list.default() },
        beforeClose: async (vm, action) => {
          if (action === 'confirm') {
            vm.confirmLoading = true
            await new Promise(r => setTimeout(r, 600))
            vm.confirmLoading = false
            return true
          }
          this.$message.warning('cancel 已被拦截，弹窗不会关闭（再试一次确定吧）')
          return false
        },
        dialogProps: { width: '520px' }
      })
      this.logResult(res)
    },

    /** ⑤ 不传 component、只给 message：轻量确认框（resolve / reject 语义） */
    async demoConfirm() {
      try {
        await this.$hDialog({
          title: '⑤ 快捷确认',
          message: '这是一条 message 文案，没有业务组件，只有默认 footer。',
          context: this,
          dialogProps: { width: '420px', closeOnClickModal: false }
        })
        this.logResult({ type: 'confirm' })
        this.$message.success('点了确定')
      } catch (e) {
        this.logResult({ type: 'cancel' })
        this.$message.info('点了取消或关闭')
      }
    }
  }
}
</script>

<style scoped>
.h-dialog-demo { padding: 24px; }
.h-dialog-demo__desc { color: #909399; font-size: 13px; margin: 8px 0 16px; }
.h-dialog-demo__desc code { background: #f5f7fa; padding: 2px 6px; border-radius: 3px; }
.h-dialog-demo__card { max-width: 720px; }
.h-dialog-demo__btns { margin-bottom: 12px; }
.h-dialog-demo__input { max-width: 320px; }
.h-dialog-demo__result { margin-top: 12px; font-size: 13px; color: #606266; }
</style>
