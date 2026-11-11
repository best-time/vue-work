<template>
  <el-drawer
    :visible.sync="visible"
    :title="title"
    direction="rtl"
    :size="panelWidth"
    custom-class="rcd-dw"
    :append-to-body="true"
    :modal-append-to-body="true"
    :with-header="true"
    :show-close="true"
    :wrapper-closable="true"
    :close-on-press-escape="true"
  >
    <!-- 头部换成原型那套：15px 主色标题 + 3px 竖条（Element 默认是 20px 灰字） -->
    <template #title>
      <h3 class="rcd-dw__t">{{ title }}</h3>
    </template>

    <div v-if="risk" class="rcd-dw__bd">
      <!-- 要素：原型是 3 列网格，4 项排成 3 + 1 -->
      <div class="rcd-desc">
        <div class="rcd-di">
          <span>风险等级</span>
          <b>{{ risk.lv }}风险</b>
        </div>
        <div class="rcd-di">
          <span>产生时间</span>
          <b>{{ risk.time }}</b>
        </div>
        <div class="rcd-di">
          <span>所属单位</span>
          <b>{{ risk.org }}</b>
        </div>
        <div class="rcd-di">
          <span>预警类型</span>
          <b>规则预警</b>
        </div>
      </div>

      <div class="rcd-sect">风险内容</div>
      <p class="rcd-para">{{ risk.content }}</p>

      <!-- 处理记录：三段按状态条件出现，与原型 riskView 的判断一致 -->
      <div class="rcd-sect">处理记录</div>
      <ul class="rcd-tl">
        <li>
          风险生成，状态置为「待处理」
          <div class="rcd-tl__tt">{{ risk.time }} 09:00 · 系统定时扫描</div>
        </li>
        <li v-if="risk.status !== '待处理'">
          发起督办/开始办理，状态更新为「处理中」
          <div class="rcd-tl__tt">责任人员已接收待办</div>
        </li>
        <li v-if="risk.status === '已解除'">
          系统再次扫描，风险条件已消失，自动解除
          <div class="rcd-tl__tt">解除记录已保留</div>
        </li>
      </ul>

      <div class="rcd-sect">关联业务</div>
      <button class="rcd-btn rcd-btn--pri" @click="$emit('goto', risk)">
        进入相关业务页面（自动筛选）
      </button>
    </div>
  </el-drawer>
</template>

<script>
/**
 * 风险预警 · 详情抽屉（卡片上的「查看」）
 * ------------------------------------------------------------
 * 形态照原型来：原型 riskView 用的是 openDrawer()，右侧滑出、宽 min(720px, 92vw)，
 * 内容四块 —— 要素网格 / 风险内容 / 处理记录（时间线）/ 关联业务。
 * 这里直接用 ElementUI 的 <el-drawer> 承载，不再自己糊遮罩 + 面板：
 *
 *   1. 尺寸：size 允许传字符串，Element 会原样写进 style.width，
 *      所以直接把 min(720px, 92vw) 交过去，不用 !important 去盖内联样式；
 *   2. 逃生：抽屉在 .rcd-page（overflow-y:auto）内部，append-to-body 挪到 body，
 *      否则会被页面的滚动容器裁掉；
 *   3. 遮罩与滚动：Element 自带的 .v-modal + lockScroll 会给 body 加
 *      .el-popup-parent--hidden 并补 padding-right，比手写遮罩更省事，也不会出现
 *      「抽屉开着后台还能滚」；
 *   4. 关闭：✕ / 点遮罩 / ESC 都由 el-drawer 处理（close-on-press-escape 默认就是
 *      true，这里显式写出来免得后来人以为没开），不用再自己监听 keydown。
 *
 * 只有一种情况要手动干预：Element 默认 header 有 margin-bottom:32px、标题是
 * 20px 灰字，和原型不符 → 在 dialogs.scss 的 .el-drawer.rcd-dw 里改掉。
 * 抽屉 DOM 落在 body 下、不在 .dash-wrap 里，--primary 等变量同样要重新声明一遍。
 *
 * 处理记录只按 status 条件渲染，跟原型一样——不额外造「第几步」的状态：
 *   待处理 → 只有第一条；
 *   处理中 → 前两条；
 *   已解除 → 三条（第二条也还在，原型就是这么写的）。
 */
export default {
  name: 'RcdRiskDetailDrawer',

  data() {
    return {
      visible: false,
      risk: null,
      /** 原型 .drawer 宽度；字符串直传给 el-drawer 的 size */
      panelWidth: 'min(720px, 92vw)',
    }
  },

  computed: {
    title() {
      return this.risk ? `风险详情 · ${this.risk.name}` : '风险详情'
    },
  },

  methods: {
    /** @param {object} risk risksOf() 的一条（父级已套过状态覆盖） */
    open(risk) {
      this.risk = risk
      this.visible = true
    },

    close() {
      this.visible = false
    },
  },
}
</script>
