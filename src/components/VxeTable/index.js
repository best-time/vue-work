/**
 * VxeTable 公共组件入口（基于 vxe-table 3.6.x，Vue 2.6 兼容）
 *
 * 使用：在 main.js 里 `import '@/components/VxeTable'` 即可，
 *       之后模板里可直接用 <vxe-table> / <vxe-grid>，或用封装好的 <CommonTable>。
 *
 * 注意版本：vxe-table 4.x（>=4.7 需 @vxe-ui/core，peer vue ^3.2）是 Vue3 专用，
 *          Vue 2.6 项目必须用 3.6.x。
 */
import Vue from 'vue'
import XEUtils from 'xe-utils'
import VXETable from 'vxe-table'
import 'vxe-table/lib/index.css'
import CommonTable from './CommonTable.vue'

// 关键：vxe-table 3.x 的 ESM 入口不会自动注册组件，必须显式 install，
// 否则 <vxe-grid> / <vxe-table> 会报 Unknown custom element
Vue.use(VXETable)

// 全局默认参数（对所有 vxe 组件生效）
if (typeof VXETable.setup === 'function') {
  VXETable.setup({
    size: 'small',   // mini / small / medium
    zIndex: 3000     // 弹层层级（高于 element-ui）
  })
} else {
  VXETable.config({ zIndex: 3000 })
}

// 常用全局格式化器：列配置里直接 formatter: 'formatMoney' / 'formatDate' 复用
VXETable.formats.add('formatMoney', ({ cellValue }, digits = 2) => {
  return cellValue == null ? '' : `¥${XEUtils.commafy(Number(cellValue), { digits })}`
})
VXETable.formats.add('formatDate', ({ cellValue }, pattern = 'yyyy-MM-dd') => {
  return cellValue ? XEUtils.toDateString(cellValue, pattern) : ''
})

// 全局注册公共表格
Vue.component('CommonTable', CommonTable)

export { VXETable, CommonTable }
export default VXETable
