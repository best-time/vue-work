/**
 * h-dialog —— 纯 render 函数版「函数式调用 el-dialog」
 *
 * 与 ../$dialog.js（FuncDialog.vue 模板容器）的区别：
 *   - 容器不再是一个 .vue 文件，整棵弹窗树都用 h() 渲染，没有模板编译环节
 *   - 插槽不再注入 $slots/$scopedSlots 再透传，而是直接在 render 里把
 *     调用方传入的插槽值包成 scopedSlots 传给业务组件 / el-dialog
 *     （Vue 2.6 官方推荐：render 函数里所有插槽都用 scopedSlots 表达）
 *
 * options 参数：
 *   title        String    弹窗标题
 *   component    Component 业务组件（可选，不传且给 message 时做快捷确认框）
 *   props        Object    传给业务组件的 props
 *   slots        Object    普通插槽：'字符串' / VNode / VNode[] / (h, scope) => VNode|VNode[]
 *   scopedSlots  Object    作用域插槽：(h, scope) => VNode|VNode[]
 *   dialogProps  Object    el-dialog 原生属性透传（width / closeOnClickModal ...）
 *   beforeClose  Function  async (vm, action) => Boolean，返回 false 阻止关闭
 *   context      Object    调用方实例（决定插槽渲染上下文，$router/$store 可用）
 *   message      String    无组件时的正文文案
 *   confirmText / cancelText / showCancel   默认 footer 按钮文案与显隐
 *
 * 约定（与 $dialog.js 一致）：
 *   业务组件 确定 -> $emit('confirm', data)；取消 -> $emit('cancel')
 */
import Vue from "vue";

/**
 * 归一化插槽值 -> VNode[]
 * @param {Function} h     createElement（优先用调用方的 $createElement，
 *                                  插槽内容的渲染上下文即调用方，与模板里写插槽一致）
 * @param {*}        value 插槽值（函数 / VNode / VNode[] / 字符串）
 * @param {Object}   scope 作用域插槽回传的数据
 */
function toNodes(h, value, scope) {
  if (typeof value === "function") {
    const res = value(h, scope);
    return Array.isArray(res) ? res : [res];
  }
  // 静态值：内容固定，不跟随调用方数据变化（要响应式请用函数式写法）
  return Array.isArray(value) ? value : [value];
}

/**
 * 创建弹窗容器实例（render 函数版）
 * @returns {Vue} 容器实例，含 open/close/onConfirm/onCancel/destroy 与响应式 confirmLoading
 */
function createDialog(options) {
  // 调用方的 $createElement：插槽函数收到的 h 与调用方同源，
  // 闭包里读调用方响应式数据能在业务组件 render 时被正确收集
  const ctxH = options.context && options.context.$createElement;

  return new Vue({
    parent: options.context || null, // 保证 $router/$store 等全局能力可用
    data() {
      return {
        inited: false, // 首次 $mount 只渲染占位节点（见 render 内注释）
        visible: false,
        title: options.title || "",
        confirmLoading: false, // 响应式：默认 footer 与自定义 footer 都能读它做 loading
        component: options.component || null,
        contentProps: options.props || {},
        message: options.message || "",
        confirmText: options.confirmText || "确 定",
        cancelText: options.cancelText || "取 消",
        showCancel: options.showCancel !== false,
      };
    },
    beforeCreate() {
      // 非响应式数据：插槽值（VNode/函数）、dialogProps、回调，observe 它们没有意义还会告警
      this._slots = options.slots || {};
      this._scopedSlots = options.scopedSlots || {};
      this._dialogProps = options.dialogProps || {};
      this._beforeClose = options.beforeClose;
      this._ctxH = ctxH;
      this._resolve = null;
      this._closing = false;
    },
    methods: {
      /**
       * 打开弹窗并返回结果 Promise
       * 注意：inited/visible 是异步渲染队列驱动的，真正的 render 在 nextTick 执行，
       * 那时调用方的同步代码已结束 —— 闭包里的 const dlg = $hDialogWithHandle(...)
       * 已完成赋值，插槽函数可以安全引用 dlg，不会报 TDZ 错误。
       */
      open() {
        return new Promise((resolve) => {
          this._resolve = resolve;
          this.inited = true;
          this.visible = true;
        });
      },

      /** 关闭并结算 Promise；action: 'confirm' | 'cancel' */
      async close(action, data) {
        if (this._closing) return;
        if (typeof this._beforeClose === "function") {
          const ok = await this._beforeClose(this, action);
          if (ok === false) return; // 返回 false 则不关闭、Promise 继续 pending
        }
        this._closing = true;
        this.visible = false;
        const resolve = this._resolve;
        this._resolve = null;
        if (resolve) {
          resolve(
            action === "confirm"
              ? { type: "confirm", data }
              : { type: action || "cancel" }
          );
        }
      },

      /** 供句柄 / 默认 footer / 业务组件 confirm 事件统一收口 */
      onConfirm(data) {
        this.close("confirm", data);
      },
      onCancel() {
        this.close("cancel");
      },

      /** 弹窗动画结束后清理 DOM 与实例（el-dialog 的 closed 事件触发） */
      destroy() {
        if (this.$el && this.$el.parentNode) {
          this.$el.parentNode.removeChild(this.$el);
        }
        this.$destroy();
      },
    },
    destroyed() {
      if (this.$el && this.$el.parentNode) {
        this.$el.parentNode.removeChild(this.$el);
      }
    },
    render(h) {
      // 首次 $mount() 是同步渲染：此时调用方还没拿到返回值（const dlg 尚未初始化），
      // 若在这里执行用户的插槽函数会踩 TDZ。所以先渲染一个隐藏占位节点，
      // open() 置 inited=true 后由异步渲染队列完成真正的渲染。
      if (!this.inited) {
        return h("div", { style: { display: "none" } });
      }

      const ch = this._ctxH || h;

      // 所有插槽统一包成 scopedSlots（普通插槽传 () => 节点 即可）。
      // 不走 data.slot 模板子节点方案的原因：resolveSlots 只认「与业务组件同
      // context 渲染的子节点」，调用方 h 出来的 VNode context 是调用方，
      // 传过去会被丢掉；scopedSlots 则没有这个限制。
      const scopedSlots = {};
      Object.keys(this._slots).forEach((name) => {
        const value = this._slots[name];
        scopedSlots[name] = (scope) => toNodes(ch, value, scope);
      });
      Object.keys(this._scopedSlots).forEach((name) => {
        const value = this._scopedSlots[name];
        scopedSlots[name] = (scope) => toNodes(ch, value, scope);
      });

      // 内容区：业务组件 或 message 纯文案
      const children = [];
      if (this.component) {
        children.push(
          h(this.component, {
            props: this.contentProps,
            on: {
              confirm: (data) => this.onConfirm(data),
              cancel: () => this.onCancel(),
            },
            scopedSlots,
          })
        );
      } else if (this.message) {
        children.push(
          h(
            "p",
            { style: { margin: "0", lineHeight: "1.7", color: "#606266" } },
            [this.message]
          )
        );
      }

      const footerFn = scopedSlots.footer;
      // footer：调用方传了 footer 插槽就透传，否则渲染默认按钮。
      // 关键：el-dialog 模板是 v-if="$slots.footer"，它只认「同 context 渲染、
      // 带 data.slot 的子节点」——所以这里必须用容器自己的 h 包一层
      // slot: 'footer' 的节点传给 el-dialog，不能走 scopedSlots（会被丢弃）。
      const footerNodes = footerFn
        ? footerFn({}) // 自定义 footer：函数内的 h 仍是调用方的，渲染上下文正确
        : [
            ...(this.showCancel
              ? [
                  h(
                    "el-button",
                    {
                      props: { size: "small" },
                      on: { click: () => this.onCancel() },
                    },
                    [this.cancelText]
                  ),
                ]
              : []),
            h(
              "el-button",
              {
                props: {
                  size: "small",
                  type: "primary",
                  loading: this.confirmLoading,
                },
                on: { click: () => this.onConfirm() },
              },
              [this.confirmText]
            ),
          ];
      return h(
        "el-dialog",
        {
          props: {
            visible: this.visible,
            title: this.title,
            ...this._dialogProps,
          },
          on: {
            // 点遮罩 / 右上角 X / ESC 关闭都视为 cancel（会先过 beforeClose）
            "update:visible": (v) => {
              if (!v) this.onCancel();
            },
            // 关闭动画结束后再销毁，避免动画中断
            closed: () => this.destroy(),
          },
        },
        [
          ...children,
          h(
            "div",
            { slot: "footer", style: { textAlign: "right" } },
            footerNodes
          ),
        ]
      );
    },
  });
}

/** 创建实例并挂到 body（首次渲染为隐藏占位，open 后才渲染真正内容） */
function mountDialog(options) {
  const vm = createDialog(options);
  vm.$mount();
  document.body.appendChild(vm.$el);
  return vm;
}

/**
 * 函数式调用 el-dialog（Promise 版）
 *   const res = await this.$hDialog({ title, component, props, slots, scopedSlots })
 *   // res: { type: 'confirm'|'cancel', data }
 */
function $hDialog(options) {
  return mountDialog(options).open(options);
}

/**
 * 句柄版：手动控制 loading / visible / 手动收口
 *   const dlg = this.$hDialogWithHandle({...})
 *   dlg.confirmLoading = true
 *   dlg.onConfirm(data) / dlg.onCancel()
 *   const res = await dlg.openPromise
 */
function $hDialogWithHandle(options) {
  const vm = mountDialog(options);
  vm.openPromise = vm.open(options);
  return vm;
}

// 全局注册（不覆盖已有定义，避免与 $dialog.js 的方法名冲突）
if (!Vue.prototype.$hDialog) {
  Vue.prototype.$hDialog = $hDialog;
}
if (!Vue.prototype.$hDialogWithHandle) {
  Vue.prototype.$hDialogWithHandle = $hDialogWithHandle;
}

export { $hDialog, $hDialogWithHandle, createDialog, mountDialog };
export default $hDialog;
