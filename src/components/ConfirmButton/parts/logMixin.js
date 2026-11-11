/**
 * 各页签共用的小工具。
 *
 * 事件日志是「常驻」在页面右侧的，只有一个列表，所以日志数据留在页面（父级），
 * 页签组件不各存一份 —— 否则切页签、点弹窗之后看不出跨页签的时序。
 * 页签里调 this.log(type, text)，混进来到的是 $emit('log', {type, text})。
 */
export default {
  methods: {
    /** @param {string} type click / confirm / cancel / block / success / error */
    log(type, text) {
      this.$emit('log', { type, text })
    },

    /** Error → 可读文案 */
    msgOf(err) {
      return (err && err.message) || String(err)
    },
  },
}
