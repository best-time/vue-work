import { useElDialog } from './useDialog'

export function useConfirmDialog() {
  const { open, close } = useElDialog()

  /**
   * @param {string} message 提示文本
   * @param {Function} onOk 确认回调
   * @param {string} [title]
   */
  const confirm = (message, onOk, title = '操作确认') => {
    open({
      title,
      width: '420px',
      closeOnClickModal: false,
      renderContent(h) {
        return h('div', { style: 'padding:10px 0' }, message)
      },
      footerRender(h) {
        return h('div', [
          h('el-button', { on: { click: close } }, '取消'),
          h(
            'el-button',
            {
              props: { type: 'primary' },
              on: {
                click: () => {
                  onOk?.()
                  close()
                }
              }
            },
            '确定'
          )
        ])
      }
    })
  }

  return { confirm, close }
}


/*

const { confirm } = useConfirmDialog()

  const handleDelete = ()=>{
    confirm('确定要删除这条记录吗？',()=>{
      console.log('执行删除')
      root.$emit('delete')
    })
  }
    
*/