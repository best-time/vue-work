/**
 * 操作日志小工具：每个页签底部都有一块「事件流」，用来把 vxe-table 抛的
 * edit-actived / edit-closed / edit-disabled / valid-error 这些事件落到屏幕上，
 * 否则光看表格根本不知道回调有没有触发。
 *
 * 只保留最近 6 条，避免越跑越长。
 */
export default {
  data() {
    return {
      logs: []
    }
  },
  methods: {
    push(text) {
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      this.logs.unshift(`${time}  ${text}`)
      if (this.logs.length > 6) this.logs.splice(6)
    }
  }
}
