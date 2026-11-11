/**
 * vxe-table 3.6 的 validate() 与很多教程写的不一样：
 *
 *   校验通过 → resolve(undefined)
 *   校验失败 → **resolve**({ 字段名: [错误项...] })   ← 注意是 resolve，不是 reject！
 *             只有配置过 VXETable.config({ validToReject: 'obsolete' }) 才会走 reject。
 *
 * 所以 `.catch(...)` 在 3.6 里永远不会被校验失败触发，
 * 写成 `validate().then(提交数据)` 会「校验没过也提交成功」。
 *
 * 这里统一归一化成：
 *   通过 → null
 *   失败 → { field, message, row }（取第一个出错的字段，够用于提示 + 定位）
 */
export function pickValidError(result) {
  if (!result || typeof result !== 'object') return null
  const fields = Object.keys(result)
  if (!fields.length) return null
  const first = (result[fields[0]] || [])[0] || {}
  return {
    field: fields[0],
    message: (first.rule && first.rule.message) || "校验不通过",
    row: first.row
  }
}
