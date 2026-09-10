import { ref } from '@vue/composition-api'
import { openDialog } from './fn'

/**
 * 命令式 el‑dialog Hook封装
 * @returns {{ open: Function, close: Function, dialogInst: import('@vue/composition-api').Ref<any> }}
 */
export function useElDialog() {
  const dialogInst = ref(null)

  /**
   * 打开弹窗
   * @param {Object} options openDialog配置
   */
  const open = (options) => {
    // 如果上一个弹窗还存在，先关闭
    if (dialogInst.value) {
      dialogInst.value.close()
    }
    dialogInst.value = openDialog({
      ...options,
      onClose: () => {
        options?.onClose?.()
        dialogInst.value = null
      }
    })
  }

  /** 关闭弹窗 */
  const close = () => {
    if (dialogInst.value) {
      dialogInst.value.close()
      dialogInst.value = null
    }
  }

  return {
    open,
    close,
    dialogInst
  }
}


/*

function open () {
const { open, close } = useElDialog()

    const handleEdit = () => {
      open({
        title: '编辑数据',
        width: '640px',
        closeOnClickModal: false,
        // 渲染外部SFC表单组件
        renderContent(h) {
          return h(MyEditForm, {
            props: {
              // js环境，这里可以直接使用 _.get / ?.，不受模板限制
              id: _.get(props, 'row.id', 0)
            },
            on: {
              // 子组件触发submit
              submit: (formData) => {
                console.log('提交表单', formData)
                close()
                root.$emit('refresh')
              }
            }
          })
        },
        onClose: () => {
          console.log('弹窗已关闭')
        }
      })
    }
      }
*/