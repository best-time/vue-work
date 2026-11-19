/**
 * vxe-table 方法名兼容层（3.5.6 ↔ 3.5.7+）
 *
 * 3.5.7 把两组方法改了名，行为完全一致：
 *   setActiveCell → setEditCell
 *   clearActived  → clearEdit
 *   isActiveByRow → isEditByRow
 *
 * package.json 现在锁的是 3.5.6（只有左边那套），但写业务代码时没必要跟着版本改，
 * 统一走这里的函数：按「方法是否存在」挑，升到 3.6 也不用动调用方。
 *
 * 两个写操作方法都保证返回 Promise —— vxe 自己的实现本来就返回 Promise，
 * 万一拿到的是 undefined（表格还没挂载 / 方法不存在）也补一个已 resolve 的，
 * 免得调用方写 `.then()` 直接炸。
 */

/** 按顺序取第一个存在的方法（自动绑定 this） */
export function pickTableMethod(table, ...names) {
  if (!table) return null;
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    if (typeof table[name] === "function") return table[name].bind(table);
  }
  return null;
}

function toPromise(ret) {
  return ret && typeof ret.then === "function" ? ret : Promise.resolve(ret);
}

/** 进入编辑：3.5.7+ 是 setEditCell(row, field)，3.5.6 是 setActiveCell(row, field) */
export function vxeSetEditCell(table, row, field) {
  const fn = pickTableMethod(table, "setEditCell", "setActiveCell");
  return toPromise(fn ? fn(row, field) : null);
}

/** 退出编辑（把编辑中的值落盘）：3.5.7+ 是 clearEdit()，3.5.6 是 clearActived() */
export function vxeClearEdit(table) {
  const fn = pickTableMethod(table, "clearEdit", "clearActived");
  return toPromise(fn ? fn() : null);
}

/**
 * 某一行是否处于编辑态。
 * 3.5.7+ 用 isEditByRow(row)（会区分 cell / row 两种模式），
 * 3.5.6 只有 isActiveByRow(row)，在整行模式下两者等价。
 */
export function vxeIsEditByRow(table, row) {
  const fn = pickTableMethod(table, "isEditByRow", "isActiveByRow");
  return fn ? !!fn(row) : false;
}
