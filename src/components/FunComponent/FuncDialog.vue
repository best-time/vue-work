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

    <!-- 默认插槽：渲染业务内容（支持插槽透传） -->
    <component
      v-if="contentComponent"
      :is="contentComponent"
      v-bind="contentProps"
      @confirm="onConfirm"
      @cancel="onCancel"
    >
      <template v-for="(_, name) in $scopedSlots" :slot="name">
        <slot :name="name"></slot>
      </template>
    </component>

    <!-- footer：自定义 footer 走插槽，否则用默认按钮 -->
    <template v-if="$slots.footer" slot="footer">
      <slot name="footer"></slot>
    </template>
    <div v-else slot="footer" class="func-dialog-footer">
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
 */
export default {
  name: 'FuncDialog',
  data() {
    return {
      visible: false,          // 控制 el-dialog 显隐
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
  methods: {
    /**
     * 打开弹窗并返回 Promise
     * @param {Object} options
     *  - title         {String}   标题
     *  - dialogProps   {Object}   el-dialog 原生属性透传
     *  - component     {Component}业务组件
     *  - props         {Object}   传给业务组件的 props
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
