<template>
  <div class="dnh">
    <el-dialog
      v-for="(layer, i) in layers"
      :key="layer.id"
      :visible="layer.visible"
      :title="layer.title"
      :width="layer.width"
      :top="layer.top || 7 + i * 2 + 'vh'"
      :custom-class="'dnh__box dnh__box--' + (i + 1)"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="onDialogClose(layer)"
      @closed="onClosed(layer)"
    >
      <component
        :is="layer.component"
        v-bind="layer.props"
        :depth="i + 1"
        @resolve="onResolve(layer, $event)"
        @dismiss="onDismiss(layer)"
      />
    </el-dialog>
  </div>
</template>

<script>
import {
  state,
  closeLayer,
  finishLayer,
  closeTop,
  hasOpenFloat,
} from "./stack";

/**
 * 唯一的宿主：只负责「按栈渲染 + 把事件翻译成 Promise 结果」。
 * 它自己不带任何业务，换成别的项目只要复制这个文件和 stack.js。
 */
export default {
  name: "DialogHost",

  data() {
    return {
      layers: state.layers
    };
  },

  mounted() {
    // el-dialog 的 close-on-press-escape 只有 prop 没有实现（源码里没有 keydown 监听），
    // 所以 ESC 由宿主统一处理：只关最上面那一层。
    this.onKeydown = (e) => {
      const isEsc = e.key === "Escape" || e.keyCode === 27;
      if (!isEsc) {
        return;
      }
      // 有展开的下拉/日期面板，先让它们自己处理
      if (hasOpenFloat()) {
        return;
      }

      if (!state.layers.length) {
        return;
      }
      e.stopPropagation();
      closeTop();
    };
    document.addEventListener("keydown", this.onKeydown, true);
  },

  beforeDestroy() {
    document.removeEventListener("keydown", this.onKeydown, true);
  },

  methods: {
    onResolve(layer, payload) {
      closeLayer(layer, payload === undefined ? null : payload);
    },

    onDismiss(layer) {
      closeLayer(layer, undefined);
    },

    /** X 按钮 / ESC / 代码里改 visible 都会走到这里，统一按「取消」处理 */
    onDialogClose(layer) {
      if (layer.closing) {
        return;
      }
      closeLayer(layer, undefined);
    },

    onClosed(layer) {
      finishLayer(layer);
    },
  },
};
</script>

<style lang="scss">
@import "./nest.scss";

/* 宿主挂在 body 上，样式必须是全局的（scoped 加不到 body 子节点） */
.dnh__box {
  border-radius: 6px;

  .el-dialog__header {
    padding: 14px 18px 10px;
    border-bottom: 1px solid #ebeef5;
  }

  .el-dialog__title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2d3d;
  }

  .el-dialog__headerbtn {
    top: 16px;
  }

  .el-dialog__body {
    padding: 16px 18px;
  }
}
</style>
