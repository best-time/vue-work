/** 四个页签共用的小日志条 */
export default {
  data() {
    return { logs: [] }
  },
  methods: {
    log(kind, text) {
      const t = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      this.logs.push({ t, kind, text })
      if (this.logs.length > 40) this.logs.shift()
    },
    clearLog() {
      this.logs.splice(0, this.logs.length)
    }
  }
}
