/**
 * 模拟接口延迟。
 *
 *   await wait(900)          —— 只等
 *   return wait(400, false)  —— 等完拿一个值（守卫里用）
 */
export const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))
