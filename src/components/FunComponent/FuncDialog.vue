<template>
  <el-dialog
    :title="title"
    :visible.sync="visible"
    v-bind="dialogProps"
    append-to-body
    :close-on-click-modal="dialogProps.closeOnClickModal !== false"
    @close="handleClosed"
  >
    <!-- 纯文本模式：不传 component，传 message 即可（供 $confirm 复用） -->
    <div v-if="message" class="func-dialog-message">
      <p>{{ message }}</p>
    </div>

    <!-- 业务内容：把容器收到的插槽整体透传给业务组件 -->
    <component
      v-if="contentReady && contentComponent"
      :is="contentComponent"
      v-bind="contentProps"
      @confirm="onConfirm"
      @cancel="onCancel"
    >
      <!--
        插槽透传（Vue 2.6 官方推荐写法）
        ① 只遍历 $scopedSlots 就够：2.6 已经把所有插槽（普通插槽 + 作用域插槽）
           统一归一化成函数挂在 $scopedSlots 上，再遍历 $slots 会重复渲染同一批节点。
        ② v-slot:[name]="scope" 用 v-for 的 name 当动态插槽名，接住业务组件
           通过 <slot :xxx="数据"> 回传的作用域数据。
        ③ v-bind="scope" 必须写：少了它，业务组件传上来的作用域数据会在容器这一层被丢掉
           （插槽函数只能拿到空对象 {}），调用方的 scopedSlots.row(h, scope) 拿不到 row。
      -->
      <template v-for="(_, name) in $scopedSlots" v-slot:[name]="scope">
        <slot :name="name" v-bind="scope"></slot>
      </template>
    </component>

    <!-- footer：自定义 footer 走插槽，否则用默认按钮 -->
    <template v-if="contentReady && hasFooterSlot" slot="footer">
      <slot name="footer"></slot>
    </template>
    <div v-else-if="contentReady" slot="footer" class="func-dialog-footer">
      <el-button v-if="showCancel" @click="onCancel">{{ cancelText }}</el-button>
      <el-button
        type="primary"
        :loading="confirmLoading"
        @click="handleConfirm"
      >{{ confirmText }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
/**
 * FuncDialog — 函数式 el-dialog 容器
 *
 * 由 $dialog() 动态创建，负责：渲染业务组件、管理 visible、统一关闭逻辑、
 * 支持 beforeClose 拦截、异步确定按钮 loading、插槽透传、自定义 footer。
 * 关闭动画结束后自动销毁实例，避免 DOM 残留和内存泄漏。
 *
 * 插槽：容器自身没有模板父级，$slots/$scopedSlots 由 $dialog.js 的 injectSlots()
 *      在 $mount 之前注入，模板里按普通组件的方式使用即可。
 */
export default {
  name: 'FuncDialog',
  data() {
    return {
      visible: false,          // 控制 el-dialog 显隐
      // 插槽内容渲染开关：容器 $mount() 的首次渲染刻意为 false，
      // open() 时才置 true。原因：插槽函数是惰性执行的，首次渲染发生在
      // mountDialog() 内部（此时调用方的 const dlg = this.$dialogWithHandle(...)
      // 还没执行完），若渲染插槽就会执行调用方传入的函数 —— 闭包里引用 dlg
      // 会报 "Cannot access 'dlg' before initialization"。
      // 置 true 触发的重渲染走 nextTick，调用方那时已拿到句柄。
      contentReady: false,
      title: '',               // 弹窗标题
      message: '',             // 纯文本模式下的消息内容
      confirmText: '确 定',    // 默认确定按钮文案
      cancelText: '取 消',     // 默认取消按钮文案
      showCancel: true,        // 是否显示取消按钮（$alert 传 false）
      dialogProps: {},         // el-dialog 原生属性（width/close-on-click-modal 等）
      contentComponent: null,  // 业务组件
      contentProps: {},        // 传给业务组件的 props
      confirmLoading: false,   // 默认确定按钮 loading（配合异步 beforeClose）
      _resolve: null,          // 外部 Promise resolve
      _reject: null,           // 外部 Promise reject
      _beforeClose: null       // 关闭前拦截钩子
    }
  },
  computed: {
    // 是否自定义 footer。用 in 做存在性判断，不能写 this.$slots.footer：
    // $slots 上的 getter 是惰性求值的，读了就会立刻执行调用方的插槽函数
    hasFooterSlot() {
      return ('footer' in this.$slots) || ('footer' in this.$scopedSlots)
    }
  },
  methods: {
    /**
     * 打开弹窗并返回 Promise
     * @param {Object} options
     *  - title         {String}   标题
     *  - dialogProps   {Object}   el-dialog 原生属性透传
     *  - component     {Component}业务组件
     *  - props         {Object}   传给业务组件的 props
     *  - slots         {Object}   普通插槽：'文案' | VNode | VNode[] | (h) => VNode[]
     *  - scopedSlots   {Object}   作用域插槽：(h, scope) => VNode[]
     *  - beforeClose   {Function} async (vm, action) => Boolean，返回 false 阻止关闭
     * @returns {Promise<{type:'confirm'|'cancel', data:*}>}
     */
    open(options) {
      const {
        title = '',
        message = '',
        confirmText = '确 定',
        cancelText = '取 消',
        showCancel = true,
        dialogProps = {},
        component = null,
        props = {},
        beforeClose = null
      } = options

      this.title = title
      this.message = message
      this.confirmText = confirmText
      this.cancelText = cancelText
      this.showCancel = showCancel
      this.dialogProps = dialogProps
      this.contentComponent = component
      this.contentProps = props
      this._beforeClose = beforeClose
      this.visible = true
      this.contentReady = true // 此后（nextTick 重渲染）才开始渲染插槽内容，见 data 注释

      return new Promise((resolve, reject) => {
        this._resolve = resolve
        this._reject = reject
      })
    },

    /** 默认 footer 的确定按钮：支持异步 + beforeClose */
    async handleConfirm() {
      if (this._beforeClose) {
        const canClose = await this._beforeClose(this, 'confirm')
        if (canClose === false) return // 返回 false 则阻止关闭
      }
      this.resolve('confirm')
    },

    /** 业务组件 $emit('confirm', data) 触发 */
    onConfirm(val) {
      if (this._beforeClose) {
        this._beforeClose(this, 'confirm').then(canClose => {
          if (canClose !== false) this.resolve('confirm', val)
        })
        return
      }
      this.resolve('confirm', val)
    },

    /** 取消 / 业务组件 $emit('cancel') */
    onCancel() {
      if (this._beforeClose) {
        this._beforeClose(this, 'cancel').then(canClose => {
          if (canClose !== false) this.resolve('cancel')
        })
        return
      }
      this.resolve('cancel')
    },

    /** 统一收口：关闭 + 通知外部 */
    resolve(type, data) {
      this.confirmLoading = false
      this.visible = false
      if (this._resolve) {
        this._resolve({ type, data })
        this._resolve = null
      }
    },

    /** el-dialog 关闭动画结束后销毁实例，防止内存泄漏 */
    handleClosed() {
      this.$nextTick(() => {
        this.$destroy()
        this.$el.remove()
      })
    }
  }
}
</script>

<style scoped>
.func-dialog-footer {
  text-align: right;
}
.func-dialog-message {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}
</style>
