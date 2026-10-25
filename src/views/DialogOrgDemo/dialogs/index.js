/**
 * 弹窗注册表 —— 页面和弹窗之间唯一的接口
 *
 * 为什么要有这一层：
 *   页面只需要知道「开哪个、带什么参数、拿回什么结果」，
 *   标题 / 宽度 / 点击遮罩是否可关 / footer 由谁渲染，全部沉到这里。
 *   加一个弹窗 = 加一条 MAP + 一个 .vue 文件，页面一行都不改。
 *
 * 两种 footer 模式（这决定「校验没过不许关」怎么实现）：
 *   self: true   → 业务表单自带按钮（props.selfFooter = true），容器默认 footer 关掉。
 *                  函数式容器（$_dialog）拿不到业务组件实例，只能这么办。
 *   self: false  → 用容器默认 footer（只读弹窗、纯确认框这种没有校验的）
 */
import OrderEditForm from "./forms/OrderEditForm.vue";
import OrderAuditForm from "./forms/OrderAuditForm.vue";
import OrderImportForm from "./forms/OrderImportForm.vue";
import OrderDetailView from "./forms/OrderDetailView.vue";

export const DIALOGS = {
  edit: { comp: OrderEditForm, title: "编辑订单", width: "680px", self: true },
  audit: { comp: OrderAuditForm, title: "订单审批", width: "520px", self: true },
  import: { comp: OrderImportForm, title: "批量导入", width: "560px", self: true },
  detail: {
    comp: OrderDetailView,
    title: "订单详情",
    width: "640px",
    self: false,
    showCancel: false,
    confirmText: "关 闭",
  },
};

/**
 * 打开一个已注册的弹窗
 * @param {Vue}    ctx  调用方实例（this），保证弹窗里 $router / $store / $message 可用
 * @param {String} key  DIALOGS 的键：edit / audit / import / detail
 * @param {Object} props 传给业务组件的 props（只传 id 这类定位参数，不传业务快照）
 * @returns {Promise<{type:'confirm'|'cancel', data:*}>}
 */
export function openDialog(ctx, key, props = {}) {
  const d = DIALOGS[key];
  if (!d) throw new Error("[openDialog] 未注册的弹窗：" + key);

  const options = {
    title: d.title,
    component: d.comp,
    props: d.self ? { ...props, selfFooter: true } : props,
    context: ctx,
    dialogProps: { width: d.width, closeOnClickModal: false, top: "8vh" },
  };

  // 空 footer 插槽 = 关掉容器默认按钮（不是 showCancel，那个只挡取消）
  if (d.self) options.slots = { footer: () => [] };
  if (d.showCancel === false) options.showCancel = false;
  if (d.confirmText) options.confirmText = d.confirmText;

  return ctx.$_dialog(options);
}
