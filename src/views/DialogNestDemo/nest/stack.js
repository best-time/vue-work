import Vue from "vue";
import DialogHost from "./DialogHost.vue";

/**
 * 弹窗栈：用「一层一个组件 + 一个 Promise」替代 n 个 visible 布尔值。
 *
 * 对外只暴露四个方法：
 *   openLayer({ component, props, title, width, role }) -> Promise<结果>
 *   closeLayer(layer, payload)   关闭某一层（会先作废它上面所有层）
 *   closeTop()                   关最上层（ESC 走这里）
 *   closeAll()                   全关（页面离开时兜底）
 *
 * promise 的语义：确定 = resolve(结果)，取消/关闭 = resolve(undefined)。
 * 不做 reject，业务侧统一 `const res = await openLayer(...); if (!res) return`，
 * 避免「用户点取消」被迫写 try/catch。
 */
export const state = Vue.observable({
  layers: [],
  escCount: 0,
});

let seed = 0;
let host = null;

function ensureHost() {
  if (host && !host._isDestroyed) {
    return host;
  }
  host = new (Vue.extend(DialogHost))();
  host.$mount();
  document.body.appendChild(host.$el);
  return host;
}

export function openLayer(options = {}) {
  ensureHost();

  let resolveFn = null;
  const promise = new Promise((resolve) => {
    resolveFn = resolve;
  });

  const layer = {
    id: ++seed,
    title: "",
    width: "560px",
    top: "",
    role: "",
    component: null,
    props: {},
    visible: false,
    closing: false,
    payload: undefined,
    resolve: resolveFn,
    openedAt: Date.now(),
    ...options,
  };

  state.layers.push(layer);
  // 先让 el-dialog 以 visible=false 挂上，下一帧再打开，才能走一遍进场过渡
  Vue.nextTick(() => {
    if (!layer.closing) {
      layer.visible = true;
    }
  });

  promise.layer = layer;
  return promise;
}

/** 无动画直接摘掉（级联关闭、页面卸载时用） */
function dropLayer(layer, payload) {
  const i = state.layers.indexOf(layer);
  if (i < 0) {
    return;
  }
  state.layers.splice(i, 1);
  if (layer.resolve) {
    layer.resolve(payload);
  }
}

export function closeLayer(layer, payload) {
  if (!layer) {
    return;
  }
  const idx = state.layers.indexOf(layer);
  if (idx < 0) {
    return;
  }

  // 关中间层时，上面的层必须一起作废 —— 否则会出现「父弹窗没了，子弹窗还浮着」
  const ll = state.layers
      .slice(idx + 1)
      .reverse();
    ll.forEach((l) => dropLayer(l, undefined));

  if (layer.closing) {
    return;
  }
  layer.payload = payload;
  layer.closing = true;
  layer.visible = false;
}

/** el-dialog 的 @closed（离场动画结束）才真正出栈并兑现 Promise */
export function finishLayer(layer) {
  const i = state.layers.indexOf(layer);
  if (i < 0) {
    return;
  }
  state.layers.splice(i, 1);
  if (layer.resolve) {
    layer.resolve(layer.payload);
  }
}

export function closeTop() {
  const top = state.layers[state.layers.length - 1];
  if (!top || top.closing) {
    return null;
  }
  state.escCount += 1;
  closeLayer(top, undefined);
  return top;
}

export function closeAll() {
  state.layers
    .slice()
    .reverse()
    .forEach((l) => dropLayer(l, undefined));
}

export function destroyHost() {
  closeAll();
  if (host) {
    const el = host.$el;
    host.$destroy();
    if (el && el.parentNode) el.parentNode.removeChild(el);
    host = null;
  }
}

/** 有可见的浮层（下拉、日期面板）时，ESC 应该先关浮层，不该关弹窗 */
export function hasOpenFloat() {
  const sels = [
    ".el-select-dropdown",
    ".el-autocomplete-suggestion",
    ".el-picker-panel",
    ".el-dropdown-menu",
    ".el-popover",
  ];
  return sels.some((sel) =>
    Array.prototype.some.call(document.querySelectorAll(sel), (el) => {
      if (!el || el.style.display === "none") return false;
      return el.offsetParent !== null || el.getBoundingClientRect().height > 0;
    })
  );
}
