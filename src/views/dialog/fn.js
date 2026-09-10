// src/components/DialogFn.js
// Vue 构造器必须从 'vue' 导入；'@vue/composition-api' 的 default 是插件对象
import Vue from 'vue'

const DialogComponent = {
  props: {
    visible: Boolean,
    title: { type: String, default: '' },
    width: { type: String, default: '50%' },
    closeOnClickModal: { type: Boolean, default: true },
    // 弹窗内容，可以传VNode / render函数
    renderContent: Function,
    footerRender: Function,
  },
  render(h) {
    const { visible, title, width, closeOnClickModal, renderContent, footerRender } = this
    if (!visible) return null

    // el‑dialog
    return h('el-dialog', {
      props: {
        visible,
        title,
        width,
        closeOnClickModal
      },
      on: {
        'update:visible': (val) => {
          this.$emit('update:visible', val)
        },
        close: () => {
          this.$emit('close')
        }
      }
    }, [
      // dialog 主体内容
      renderContent ? renderContent(h) : null,
      // 底部插槽 footer
      footerRender
        ? {
            template: '<div slot="footer"></div>',
            scopedSlots: {
              footer: () => footerRender(h)
            }
          }
        : {
            template: '<div slot="footer"></div>',
            scopedSlots: {
              footer: () => null
            }
          }
    ])
  }
}

/**
 * 函数调用方法
 * @param {Object} options
 * @returns {Object} { close }
 */
export function openDialog(options = {}) {
  const { title, width, closeOnClickModal, renderContent, footerRender, onClose } = options

  // 实例
  const vm = new Vue({
    render(h) {
      return h(DialogComponent, {
        props: {
          visible: true,
          title,
          width,
          closeOnClickModal,
          renderContent,
          footerRender
        },
        on: {
          'update:visible': (val) => {
            if (!val) {
              vm.$destroy()
              vm.$el.remove()
            }
          },
          close: () => {
            typeof onClose === 'function' && onClose()
            vm.$destroy()
            vm.$el.remove()
          }
        }
      })
    }
  }).$mount()

  document.body.appendChild(vm.$el)

  return {
    close() {
      vm.$destroy()
      vm.$el.remove()
    }
  }
}

/*
function handleOpen() {
      this.$openDialog({
        title: '函数式弹窗',
        width: '600px',
        closeOnClickModal: true,
        // 渲染弹窗主体内容，h就是createElement
        renderContent(h) {
          return h('div', [
            h('p', '这是命令式 el‑dialog，不需要写在template'),
            h('el-input', {
              props: { placeholder: '请输入内容' }
            })
          ])
        },
        // 自定义底部footer
        footerRender(h) {
          return h('div', [
            h('el-button', { on: { click: () => console.log('取消') } }, '取消'),
            h('el-button', { props: { type: 'primary' }, on: { click: () => console.log('确认') } }, '确认')
          ])
        },
        onClose() {
          console.log('弹窗关闭')
        }
      })
    }
*/