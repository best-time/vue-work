// src/components/TableCell.js
import _ from 'lodash'

export default {
  name: 'TableCell',
  functional: true,
  props: {
    /** 行数据对象 */
    row: Object,
    /** 取值路径，如 "user.name"、"tags.0.label" */
    prop: String,
    /** 默认兜底值 */
    default: {
      type: [String, Number],
      default: '--'
    }
  },
  /**
   * @param {Function} h createElement
   * @param {Object} ctx context
   */
  render(h, ctx) {
    const { props } = ctx
    const { row, prop } = props

    let cellValue
    if (prop) {
      // lodash.get 安全深层取值，模拟可选链，不会报模板语法错误
      cellValue = _.get(row, prop, props.default)
    } else {
      // 没有prop，渲染插槽内容
      return h('div', ctx.data, ctx.children)
    }

    return h('div', {
      // 继承外部传过来 class / style / attrs
      class: ctx.data.class,
      style: ctx.data.style
    }, cellValue)
  }
}
