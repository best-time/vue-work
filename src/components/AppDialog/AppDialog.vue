<template>
  <el-dialog
    :visible="innerVisible"
    :title="title"
    :width="width"
    :top="top"
    :fullscreen="fullscreen"
    :center="center"
    :modal="modal"
    :modal-append-to-body="modalAppendToBody"
    :append-to-body="appendToBody"
    :lock-scroll="lockScroll"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :custom-class="customClass"
    :destroy-on-close="destroyOnClose"
    :before-close="handleBeforeClose"
    v-bind="$attrs"
    v-on="forwardedListeners"
  >
    <!-- 标题：想自定义（带图标 / 状态标签）就传 #title，scope 里给了 close -->
    <template slot="title">
      <slot name="title" :title="title" :close="close" :payload="payload">
        <span class="el-dialog__title">{{ title }}</span>
      </slot>
    </template>

    <!--
      内容区。scope 里带 payload：open(data) 传什么，这里就能拿到什么，
      父组件不用为了「弹窗里显示哪一行」再单独维护一个 data。
    -->
    <div v-if="hasBodyStyle" class="app-dialog__body" :style="bodyStyles">
      <slot
        :payload="payload"
        :loading="confirmLoading"
        :confirm="confirm"
        :cancel="cancel"
        :close="close"
      />
    </div>
    <slot
      v-else
      :payload="payload"
      :loading="confirmLoading"
      :confirm="confirm"
      :cancel="cancel"
      :close="close"
    />

    <!--
      底部：只要「要默认按钮」或「父组件传了 #footer」就渲染容器。
      两个插槽分开判断，是因为 v-slot 带解构时会落到 $scopedSlots 上、$slots 里没有。
    -->
    <div v-if="hasFooter" slot="footer" class="app-dialog__footer">
      <slot
        name="footer"
        :payload="payload"
        :loading="confirmLoading"
        :confirm="confirm"
        :cancel="cancel"
        :close="close"
      >
        <el-button
          v-if="showCancel"
          size="small"
          :disabled="confirmLoading"
          @click="cancel"
          >{{ cancelText }}</el-button
        >
        <el-button
          size="small"
          :type="confirmType"
          :loading="confirmLoading"
          @click="confirm()"
          >{{ confirmText }}</el-button
        >
      </slot>
    </div>
  </el-dialog>
</template>

<script>
/**
 * AppDialog —— el-dialog 的轻封装（公共组件）
 *
 * 解决的问题：el-dialog 只有 `visible` 一个入口，父组件必须自己维护
 * 「一个布尔 + 一份数据 + 一坨 @confirm/@cancel 处理」，弹窗多了就到处是重复代码。
 * 这里补四件事：
 *   1. 打开方式统一：v-model / :visible.sync / this.$refs.xxx.open(data)（返回 Promise）
 *   2. 数据下发统一：open(data) 的 data 通过作用域插槽给到内容区和 footer，
 *      父组件不必为「弹窗里显示哪一条」再单独声明一个 data
 *   3. 关闭收口统一：底部按钮 / X / 遮罩 / ESC 全部汇到一个闸门 beforeClose(action, done)，
 *      再加 confirm / cancel 事件 + open() 的 Promise 结果，怎么写都行
 *   4. 「确认」的返回值说了算：@confirm 返回 false 就不关（校验没过）、返回 Promise
 *      就自动转 loading 并在完成后关闭；彻底自己控制则 closeOnConfirm: false + submit()
 *
 * 与项目里已有的两个「函数式弹窗」的区别：
 *   $_dialog / $hDialog  —— 运行时 new Vue 挂到 body，适合「随手弹一个」，
 *                          父组件里看不到弹窗模板
 *   <app-dialog>         —— 模板里声明式，父组件看得见结构、能写 scoped style，
 *                          需要 ref 才能命令式打开
 * 三者互补，不冲突。
 */
/** 同一个事件绑了多处时，$listeners 里的值是数组 —— 统一都调一遍 */
function callAll(handler, payload) {
  if (!handler) return;
  if (Array.isArray(handler)) handler.forEach((fn) => fn(payload));
  else handler(payload);
}

export default {
  name: "AppDialog",
  // 未声明的属性（modal-class / z-index 之类）一律透传给 el-dialog，不要重复挂在根元素上
  inheritAttrs: false,
  // 让 v-model 直接作用在 visible 上，同时 :visible.sync 也能用
  model: { prop: "visible", event: "update:visible" },

  props: {
    // ---- 显隐 ----
    visible: { type: Boolean, default: false },

    // ---- el-dialog 原生项 ----
    title: { type: String, default: "" },
    width: { type: String, default: "520px" },
    top: { type: String, default: undefined },
    fullscreen: Boolean,
    center: Boolean,
    modal: { type: Boolean, default: true },
    modalAppendToBody: { type: Boolean, default: true },
    /**
     * 默认 true（el-dialog 原生默认是 false）：
     * 弹窗挂在 body 下，才不会被父级的 overflow: hidden / transform / z-index 层叠上下文困住
     */
    appendToBody: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    showClose: { type: Boolean, default: true },
    customClass: { type: String, default: "" },
    destroyOnClose: Boolean,

    // ---- 底部按钮 ----
    /** 是否渲染底部（false 时不渲染默认按钮；父组件自己传了 #footer 时容器仍在） */
    showFooter: { type: Boolean, default: true },
    showCancel: { type: Boolean, default: true },
    confirmText: { type: String, default: "确 定" },
    cancelText: { type: String, default: "取 消" },
    confirmType: { type: String, default: "primary" },
    /** 点确认后是否自动关闭。要「校验通过才关」直接让 @confirm 返回 false 也行 */
    closeOnConfirm: { type: Boolean, default: true },
    /** 确认按钮 loading（也可以随时 this.$refs.xxx.setLoading(true)） */
    loading: Boolean,
    /** @confirm / @cancel 返回 Promise 时，确认按钮自动 loading（默认开） */
    autoLoading: { type: Boolean, default: true },

    // ---- 内容区 ----
    /** 内容区最大高度，超出滚动；数字按 px 处理 */
    bodyMaxHeight: { type: [String, Number], default: undefined },
    bodyStyle: { type: Object, default: () => ({}) },

    // ---- 关闭闸门 ----
    /** 关闭后是否清空 payload / loading / 结果（false 则保留上次内容） */
    resetOnClose: { type: Boolean, default: true },
    /**
     * (action, done) => boolean | Promise<boolean> | void
     *   action: 'confirm' | 'cancel'（X / 遮罩 / ESC 也算 cancel，但 source 会是 'close'）
     *   返回 false（或 Promise resolve false）→ 拦住不关
     *   也可以直接调 done() 放行（ElementUI 原生写法，两者等价、先到先算）
     * 注意：@confirm 返回 false 同样能拦住关闭，且更省事；beforeClose 适合「不管怎么关都要拦」的场景。
     */
    beforeClose: { type: Function, default: null },
  },

  data() {
    return {
      innerVisible: this.visible,
      /** open(data) 传进来的数据，内容区 / footer 通过作用域插槽拿 */
      payload: {},
      innerLoading: false,
      /** 本次关闭的来源：api | footer | close（X / 遮罩 / ESC） */
      source: "",
      opened: false,
    };
  },

  computed: {
    confirmLoading() {
      return this.loading || this.innerLoading;
    },
    bodyStyles() {
      const style = Object.assign({}, this.bodyStyle);
      const h = this.bodyMaxHeight;
      if (h !== undefined && h !== null && h !== "") {
        style.maxHeight = typeof h === "number" ? h + "px" : h;
        if (!style.overflow) style.overflow = "auto";
      }
      return style;
    },
    hasBodyStyle() {
      return Object.keys(this.bodyStyles).length > 0;
    },
    /**
     * 要不要渲染底部容器。
     * show-footer=false 只是「不要默认按钮」，父组件自己用 #footer 时仍然要渲染容器，
     * 否则自定义底部会被一起干掉。
     */
    hasFooter() {
      if (this.showFooter !== false) {
        return true;
      }
      return !!(this.$slots.footer || this.$scopedSlots.footer);
    },
    /**
     * 透传给 el-dialog 的监听器。
     *   - 过滤掉 v-model / .sync 的 update:visible —— 那个由本组件自己 emit，
     *     否则 el-dialog 内部 hide() 也会透一次，父组件的回调被调两遍
     *   - opened / closed 包一层做内部记账，再原样回调父组件的同名 handler
     */
    forwardedListeners() {
      const out = {};
      const listeners = this.$listeners || {};
      const self = this;
      Object.keys(listeners).forEach((k) => {
        if (k === "update:visible" || k === "input") return;
        out[k] = listeners[k];
      });
      const userOpened = out.opened;
      const userClosed = out.closed;
      out.opened = function (e) {
        self.opened = true;
        callAll(userOpened, e);
      };
      out.closed = function (e) {
        self.onClosed();
        callAll(userClosed, e);
      };
      return out;
    },
  },

  watch: {
    visible(v) {
      if (v === this.innerVisible) return;
      this.innerVisible = v;
      // 父组件直接改 visible 关掉：放行（父组件说了算），但要把挂起的 Promise 结算掉，
      // 否则 await open() 的地方会永远 pending
      if (!v && this._resolve) this.settle("cancel");
    },
    innerVisible(v) {
      this.$emit("update:visible", v);
      // 兜底：不管是谁把显隐置成 false（含 open() 之后同一 tick 里父组件立刻改回），
      // 挂起的 Promise 都必须结算，否则 await open() 会永远 pending
      if (!v && this._resolve) this.settle("cancel");
    },
  },

  beforeDestroy() {
    // 组件被销毁时别让 await open() 卡死
    this.settle("cancel");
  },

  methods: {
    /* ============================ 打开 ============================ */

    /**
     * 打开弹窗（命令式）。父组件不用维护布尔，也不用 ref 之外的任何状态。
     *   const res = await this.$refs.edit.open(row)
     *   res → { type: 'confirm' | 'cancel', data, payload, source }
     * 已经打开时重复调用：只更新 payload，返回同一个 Promise（不会产生两个结果）。
     */
    open(payload) {
      if (payload !== undefined) this.payload = payload;
      if (this._resolve) {
        this.innerVisible = true;
        return this._promise;
      }
      this.source = "api";
      this._promise = new Promise((resolve) => {
        this._resolve = resolve;
      });
      this.innerVisible = true;
      return this._promise;
    },

    toggle(payload) {
      return this.innerVisible ? this.close() : this.open(payload);
    },

    /** 只切显示状态，不结算 Promise、不过 beforeClose（父组件自己控制时用） */
    setVisible(v) {
      this.innerVisible = v !== false;
    },

    /* ============================ 关闭 ============================ */

    /**
     * 「取消」：调用父组件的 @cancel（返回 false / Promise<false> 可以拦住），再走闸门。
     * 默认底部的取消按钮就是调它。
     */
    cancel() {
      this.source = "footer";
      const out = this.invoke("cancel", this.payload);
      return this.followOut(out, "cancel", this.payload);
    },

    /**
     * 「确认」：调用父组件的 @confirm，然后按返回值与 closeOnConfirm 决定关不关。
     *   @confirm 返回 false / Promise<false>  → 不关（表单校验没过）
     *   @confirm 返回 Promise（async 函数）  → 按钮自动 loading，resolve 后再关
     *   closeOnConfirm: false               → 完全不自动关，等父组件自己 submit()/close()
     * 默认底部的确认按钮就是调它。
     */
    confirm(data) {
      const payload = data === undefined ? this.payload : data;
      this.source = "footer";
      const out = this.invoke("confirm", payload);
      if (!this.closeOnConfirm) {
        return Promise.resolve(false);
      }
      return this.followOut(out, "confirm", payload);
    },

    /**
     * 强制以「确认」结果结束（不发 confirm 事件）。
     * 用在 closeOnConfirm: false + 自己校验/异步提交成功的场景：
     *   await this.$refs.dlg.submit(this.form)
     */
    submit(data) {
      const payload = data === undefined ? this.payload : data;
      this.source = "api";
      return this.gate("confirm", payload);
    },

    /** 纯 API 关闭（不发事件），结果按「取消」结算 */
    close(data) {
      this.source = "api";
      return this.gate("cancel", data);
    },

    setLoading(v) {
      this.innerLoading = v !== false;
    },

    /* ============================ 内部 ============================ */

    /**
     * 调用父组件传进来的某个监听器（@confirm / @cancel）。
     * 直接拿 $listeners 上的函数而不是 $emit —— 只有拿到返回值，才能支持
     * 「handler 返回 false 拦住关闭 / 返回 Promise 自动 loading」这种写法。
     * 同一个事件绑了多个 handler 时退回 $emit（只广播，不参与决策）。
     */
    invoke(name, payload) {
      const handler = this.$listeners && this.$listeners[name];
      if (typeof handler === "function") {
        return handler(payload);
      }
      this.$emit(name, payload);
      return undefined;
    },

    /**
     * 消化 handler 的返回值：
     *   Promise → 期间自动 loading（autoLoading 且是确认动作时），resolve false 则拦住
     *   false   → 拦住
     *   其它    → 继续走闸门
     */
    followOut(out, action, payload, done) {
      if (out === false) {
        return Promise.resolve(false);
      }
      if (out && typeof out.then === "function") {
        const auto = this.autoLoading && action === "confirm";
        if (auto) this.setLoading(true);
        const stop = () => {
          if (auto) this.setLoading(false);
        };
        return out.then(
          (ok) => {
            stop();
            if (ok === false) return false;
            return this.gate(action, payload, done);
          },
          (err) => {
            stop();
            console.error("[AppDialog] " + action + " 处理失败：", err);
            return false;
          }
        );
      }
      return this.gate(action, payload, done);
    },

    /**
     * 关闭闸门。三种来源最终都落在这里：
     *   底部按钮 / cancel() / close() → gate(action)
     *   X / 遮罩 / ESC              → gate('cancel', data, done)  过了再调 done()
     * 返回 false 表示被 beforeClose 拦下。
     */
    gate(action, data, done) {
      const self = this;
      let called = false;
      const pass = () => {
        if (called) return;
        called = true;
        if (typeof done === "function") done(); // el-dialog 的 hide()
        self.doClose(action, data);
      };
      const fn = this.beforeClose;
      if (typeof fn !== "function") {
        pass();
        return Promise.resolve(true);
      }
      let res;
      try {
        res = fn(action, pass); // 第二参数是「放行」，兼容 ElementUI 的 done 写法
      } catch (e) {
        console.error("[AppDialog] beforeClose 抛错：", e);
        pass();
        return Promise.resolve(true);
      }
      if (res === false) return Promise.resolve(false);
      if (res && typeof res.then === "function") {
        return res.then(
          (ok) => {
            if (ok === false) return false;
            pass();
            return true;
          },
          () => false
        );
      }
      pass();
      return Promise.resolve(true);
    },

    /**
     * el-dialog 的 before-close：点 X / 点遮罩 / ESC 都会来这里。
     * 语义上统一算「取消」——一样会调父组件的 @cancel（返回 false 可以拦住），
     * 区别只是结果里的 source 会是 'close'，方便区分用户是怎么关的。
     */
    handleBeforeClose(done) {
      if (this.source !== "footer") this.source = "close";
      const out = this.invoke("cancel", this.payload);
      this.followOut(out, "cancel", this.payload, done);
    },

    doClose(action, data) {
      this.innerVisible = false;
      this.settle(action, data);
    },

    /** 结算 open() 返回的 Promise（多次调用只有第一次生效） */
    settle(type, data) {
      const resolve = this._resolve;
      if (!resolve) {
        return;
      }
      this._resolve = null;
      this._promise = null;
      resolve({
        type: type === "confirm" ? "confirm" : "cancel",
        data: data === undefined ? this.payload : data,
        payload: this.payload,
        source: this.source || "api",
      });
    },

    onClosed() {
      this.opened = false;
      this.source = "";
      if (!this.resetOnClose) {
        return;
      }
      this.innerLoading = false;
      this.payload = {};
    },
  },
};
</script>

<style lang="scss" scoped>
.app-dialog__footer {
  text-align: right;
}
</style>
