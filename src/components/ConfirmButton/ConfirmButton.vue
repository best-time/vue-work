<template>
  <span class="cb-wrap">
    <!--
      el-button 的原生属性（type / size / plain / round / circle / icon / disabled …）
      全部走 $attrs 透传，本组件只接管 loading 和 click。
    -->
    <el-button
      ref="btn"
      v-bind="$attrs"
      :loading="isLoading"
      v-on="btnListeners"
      @click="onBtnClick"
    >
      <slot></slot>
    </el-button>

    <!--
      二次确认弹窗。append-to-body：按钮常在表格/滚动容器里，不挪到 body 会被裁。
      点遮罩不关（危险操作得明确选一个），ESC 与 ✕ 等于取消。
      v-if="dialogReady"：第一次点开才创建弹窗 DOM。不加这个的话，
      「表格里每行一个删除按钮」会先渲染出几十个 display:none 的弹窗。
    -->
    <el-dialog
      v-if="dialogReady"
      :visible.sync="dlgVisible"
      :title="confirmTitle"
      :width="confirmWidth"
      :top="confirmTop"
      :append-to-body="true"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
      custom-class="cb-dlg"
      @close="onDialogClose"
    >
      <div class="cb-dlg__body">
        <i v-if="iconClass" class="cb-dlg__icon" :class="iconClass"></i>
        <div class="cb-dlg__main">
          <slot name="content">
            <p v-if="confirmContent" class="cb-dlg__text">
              {{ confirmContent }}
            </p>
          </slot>
        </div>
      </div>

      <div slot="footer" class="cb-dlg__foot">
        <el-button size="small" :disabled="isLoading" @click="onCancel">
          {{ cancelText }}
        </el-button>
        <el-button
          size="small"
          :type="confirmType"
          :loading="isLoading"
          @click="onConfirm"
        >
          {{ confirmText }}
        </el-button>
      </div>
    </el-dialog>
  </span>
</template>

<script>
/**
 * ConfirmButton —— 带 loading + 二次确认的 el-button（公共组件）
 * ------------------------------------------------------------------
 * 解决三件事：
 *   1. 「点了先问一句」：默认点按钮先弹确认框，确认后才 emit confirm；
 *   2. 「确认后转圈」：给 action 就自动 loading，转圈期间按钮点不动（el-button
 *      的 loading 本身就 disabled），不用每个页面都写 `loading = true; await ...; loading = false`；
 *   3. 「失败别静默」：action reject 时统一 toast + emit error，成功可选 toast。
 *
 * 三种用法（按「谁来管 loading」划分，可以混用）：
 *
 *   A. 只关心事件，loading 自己管
 *      <confirm-button type="primary" :loading="busy" @confirm="submit">提交</confirm-button>
 *
 *   B. 组件管（推荐）：action 返回 Promise，成功后自动收 loading
 *      <confirm-button type="primary" :action="del" success-text="已删除">删除</confirm-button>
 *
 *   C. 不弹确认（危险以外的高频操作）
 *      <confirm-button :need-confirm="false" :action="save">保存</confirm-button>
 *
 * 为什么不用 $confirm / ElMessageBox：
 *   它的内容只能是字符串（或 vnode），做「确认前填个原因 / 勾选已知晓」就得
 *   自己拼 render 函数；这里用 el-dialog + #content 插槽，模板里直接写表单，
 *   还能拿到 el-dialog 的宽度/标题/关闭时机控制。
 *
 * props 里没有声明 type/size/plain/icon/disabled —— 它们通过 $attrs 直接落到
 * el-button 上（inheritAttrs: false），el-button 以后加属性这里不用跟着改。
 */
const ICON_MAP = {
  warning: "el-icon-warning",
  info: "el-icon-info",
  success: "el-icon-success",
  error: "el-icon-error",
  question: "el-icon-question",
};

/** 本组件自己的事件，不能透传给 el-button，否则 @click 会触发两次 */
const OWN_EVENTS = ["click", "confirm", "cancel", "block", "success", "error"];

export default {
  name: "ConfirmButton",

  // $attrs 给 el-button 用，别再挂一份到根 span 上
  inheritAttrs: false,

  props: {
    /** 外部 loading（业务自己 await 时用），与内部 action 的 loading 取「或」 */
    loading: { type: Boolean, default: false },

    /** 是否要先弹确认框；false = 点一下直接执行 */
    needConfirm: { type: Boolean, default: true },

    // ---- 确认框文案 / 外观 ----
    confirmTitle: { type: String, default: "操作确认" },
    confirmContent: { type: String, default: "" },
    confirmText: { type: String, default: "确定" },
    cancelText: { type: String, default: "取消" },
    /** 确认按钮的 type：危险操作传 danger */
    confirmType: { type: String, default: "primary" },
    confirmWidth: { type: String, default: "460px" },
    confirmTop: { type: String, default: "15vh" },
    /** 标题左侧图标：warning / info / success / error / question，或任意 el-icon-* 类；none 不显示 */
    confirmIcon: { type: String, default: "none" },

    /**
     * 点确定后是否立刻关弹窗。
     *   true （默认）：关掉 → 按钮转圈 → 结束 toast，用户始终能看到按钮上的 loading；
     *   false：弹窗不关，确定按钮转圈，成功才关 —— 适合「确定前还要异步校验」的场景。
     */
    closeOnConfirm: { type: Boolean, default: true },

    /** 弹确认框之前的守卫：(event) => boolean | Promise<boolean>；返回 false 不弹窗，emit block */
    beforeConfirm: { type: Function, default: null },

    /** 确认后要做的事：() => Promise；组件负责 loading / success / error */
    action: { type: Function, default: null },

    /** 成功后 toast 的文案，空串不弹 */
    successText: { type: String, default: "" },
    /** 失败后 toast 的文案，空串则用 err.message，再兜底「操作失败」 */
    errorText: { type: String, default: "" },
  },

  data() {
    return {
      /** 弹窗 DOM 是否已创建（第一次点开才建，见模板注释） */
      dialogReady: false,
      dlgVisible: false,
      actionLoading: false,
      /** beforeConfirm 异步期间：挡住连点 */
      guardPending: false,
      /**
       * 弹窗是被谁关的：'none' | 'confirm' | 'cancel'。
       * el-dialog 的 @close 对所有关闭方式都会触发（包括我们主动把 visible 置 false），
       * 靠这个标记区分「按钮关的」和「✕ / ESC 关的」，否则 cancel 会重复 emit。
       */
      closeBy: "none",
    };
  },

  computed: {
    /** 内部 action 与外部 loading 取或：任何一个在转，按钮就不能再点 */
    isLoading() {
      return this.actionLoading || this.loading;
    },

    iconClass() {
      if (!this.confirmIcon || this.confirmIcon === "none") {
        return "";
      }
      return ICON_MAP[this.confirmIcon] || this.confirmIcon;
    },

    /** 除本组件自身事件外的监听器，原样给 el-button（鼠标移入之类的 .native 还能用） */
    btnListeners() {
      const out = { ...this.$listeners };
      OWN_EVENTS.forEach((k) => delete out[k]);
      return out;
    },
  },

  methods: {
    /* ================= 点击入口 ================= */
    onBtnClick(event) {
      // loading / disabled 时 el-button 自己不 emit click，这里再兜一层
      if (this.isLoading || (this.$attrs && this.$attrs.disabled)) {
        return;
      }

      // 先抛 click（埋点、日志用），再走确认流程
      this.$emit("click", event);

      if (this.guardPending) {
        return;
      }

      if (!this.needConfirm) {
        this.$emit("confirm", { from: "direct", event });
        this.runAction(false);
        return;
      }

      if (!this.beforeConfirm) {
        this.open();
        return;
      }

      // 守卫可能是异步的（比如先查一次接口才知道要不要确认），期间忽略连点
      this.guardPending = true;
      Promise.resolve()
        .then(() => this.beforeConfirm(event))
        .then((ok) => {
          this.guardPending = false;
          if (ok === false) {
            this.$emit("block", event);
            return;
          }
          this.open();
        })
        .catch((err) => {
          this.guardPending = false;
          this.$emit("error", err);
        });
    },

    /* ================= 弹窗 ================= */
    /** 打开确认框（父级也可以 ref.open() 直接弹） */
    open() {
      this.closeBy = "none";
      if (this.dialogReady) {
        this.dlgVisible = true;
        return;
      }
      // 第一次：先把弹窗挂出来，下一帧再置 visible，这样入场动画照样有
      this.dialogReady = true;
      this.$nextTick(() => {
        this.dlgVisible = true;
      });
    },

    /** 关确认框（closeOnConfirm=false 时，父级校验通过后自己调） */
    close() {
      this.closeBy = "confirm";
      this.dlgVisible = false;
    },

    onCancel() {
      this.closeBy = "cancel";
      this.dlgVisible = false;
      this.$emit("cancel");
    },

    onConfirm() {
      this.$emit("confirm", { from: "dialog", event: null });
      if (this.closeOnConfirm) {
        this.closeBy = "confirm";
        this.dlgVisible = false;
        this.runAction(false);
      } else {
        // 弹窗留着，成功后才关
        this.runAction(true);
      }
    },

    /**
     * el-dialog 的 @close：✕ / ESC / 我们主动置 false 都会来。
     * closeBy 是 confirm / cancel 时说明已经 emit 过，只有 'none' 才是用户按 ✕ 或 ESC。
     */
    onDialogClose() {
      const by = this.closeBy;
      this.closeBy = "none";
      if (by === "none") {
        this.$emit("cancel");
      }
    },

    /* ================= 执行 ================= */
    /**
     * @param {boolean} closeAfter 成功后是否关掉确认框（closeOnConfirm=false 的路径）
     */
    async runAction(closeAfter) {
      if (typeof this.action !== "function" || this.actionLoading) {
        return;
      }
      this.actionLoading = true;
      try {
        const res = await this.action();
        this.$emit("success", res);
        if (this.successText) {
          this.toast("success", this.successText);
        }
        if (closeAfter) {
          this.closeBy = "confirm";
          this.dlgVisible = false;
        }
      } catch (err) {
        this.$emit("error", err);
        // 失败不关弹窗：用户能直接改完再点一次（closeOnConfirm=false 时尤其重要）
        this.toast(
          "error",
          this.errorText || (err && err.message) || "操作失败"
        );
      } finally {
        this.actionLoading = false;
      }
    },

    toast(type, message) {
      this.$message({
        message,
        type,
        duration: type === "error" ? 2400 : 1800,
        showClose: true,
      });
    },
  },
};
</script>

<style lang="scss">
/* 根 span 只为了把 el-dialog 放进模板（Vue 2 单根节点），表现上不能影响按钮排版 */
.cb-wrap {
  display: inline-block;
  vertical-align: middle;
  line-height: 0;
}

/* append-to-body 的弹窗拿不到父级 scoped 样式，所以这里必须是非 scoped，
   靠 cb- 前缀自建作用域（与项目里 dialogs.scss / RemoteInput 的 rcd-、ri- 同思路） */
.cb-dlg {
  border-radius: 8px;
  overflow: hidden;

  .el-dialog__header {
    padding: 16px 20px 0;
  }
  .el-dialog__title {
    font-size: 16px;
    font-weight: 600;
    color: $color-3;
  }
  .el-dialog__headerbtn {
    top: 17px;
  }
  .el-dialog__body {
    padding: 16px 20px 6px;
  }
  .el-dialog__footer {
    padding: 10px 20px 16px;
  }
}

.cb-dlg__body {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.cb-dlg__icon {
  flex: none;
  margin-top: 1px;
  font-size: 20px;
  line-height: 1;
  color: #e6a23c;

  &.el-icon-error {
    color: #f56c6c;
  }
  &.el-icon-success {
    color: #67c23a;
  }
  &.el-icon-info,
  &.el-icon-question {
    color: $color-primary;
  }
}

.cb-dlg__main {
  flex: 1;
  min-width: 0;
}

.cb-dlg__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: $color-6;
  word-break: break-word;
}

.cb-dlg__foot {
  display: flex;
  justify-content: flex-end;
}
</style>
