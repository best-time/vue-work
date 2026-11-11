<template>
  <div class="cbd__grid">
    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>A · 只关心事件</b>
        <code>:loading + @confirm</code>
      </div>
      <div class="cbd__pad">
        <confirm-button
          type="primary"
          :loading="busy"
          confirm-title="提交申请"
          confirm-content="提交后将进入部门负责人审批，审批期间不可修改。"
          @click="log('click', 'A · 点击按钮')"
          @confirm="onConfirm"
          @cancel="log('cancel', 'A · 取消')"
        >
          提交申请
        </confirm-button>
        <p class="cbd__help">
          组件只负责弹框，loading 由业务自己给：<code>:loading="busy"</code>。
          适合已有统一提交逻辑、不想把 Promise 交给组件的场景。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>B · action 接管（推荐）</b>
        <code>:action + success-text</code>
      </div>
      <div class="cbd__pad">
        <confirm-button
          type="primary"
          :action="actionB"
          success-text="已提交审核"
          confirm-title="提交审核"
          confirm-content="确认提交后，招聘计划将锁定，直到审核结果返回。"
          @click="log('click', 'B · 点击按钮')"
          @confirm="log('confirm', 'B · 确认，开始执行')"
          @success="log('success', 'B · action 成功：' + $event)"
          @error="log('error', 'B · action 失败：' + msgOf($event))"
        >
          提交审核
        </confirm-button>
        <p class="cbd__help">
          点「确定」→ 弹窗立刻关 → 按钮转圈 1.2s → 成功 toast。
          转圈期间 <code>el-button</code> 自己是 disabled 的，连点无效，页面里不用再写一遍
          <code>loading = true / false</code>。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>C · 不弹确认</b>
        <code>:need-confirm="false"</code>
      </div>
      <div class="cbd__pad">
        <confirm-button
          size="small"
          plain
          :need-confirm="false"
          :action="actionC"
          success-text="已保存草稿"
          @confirm="log('confirm', 'C · 直接执行（from=' + $event.from + '）')"
        >
          保存草稿（点一下就走）
        </confirm-button>
        <p class="cbd__help">
          高频且可逆的操作没必要每次都问。<code>need-confirm="false"</code> 时
          <code>@confirm</code> 也照发，<code>$event.from === 'direct'</code>，
          和弹窗路径（<code>from === 'dialog'</code>）能区分开。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>D · 失败了会怎样</b>
        <code>reject + error-text</code>
      </div>
      <div class="cbd__pad">
        <confirm-button
          type="danger"
          plain
          :action="actionD"
          error-text="发布失败，请联系管理员"
          confirm-title="发布到生产环境"
          confirm-content="本次发布会覆盖线上配置，确认继续？"
          confirm-type="danger"
          confirm-icon="warning"
          @error="log('error', 'D · 收到 reject：' + msgOf($event))"
        >
          发布（必定失败）
        </confirm-button>
        <p class="cbd__help">
          <code>action</code> reject 时组件会 <code>$emit('error')</code> 并 toast：
          传了 <code>error-text</code> 就<b>只用它</b>（上面弹的是固定文案），
          不传则用 <code>err.message</code>，再兜底「操作失败」。
          真实原因仍从 <code>@error</code> 拿到（见右侧日志）。不想 toast 就别用
          <code>action</code>，回到 A 的写法。
        </p>
      </div>
    </el-card>
  </div>
</template>

<script>
import logMixin from './logMixin'
import { wait } from './wait'

export default {
  name: 'ConfirmButtonBasicTab',
  mixins: [logMixin],

  data() {
    return {
      /** A 的 loading 由页面自己管 */
      busy: false,
    }
  },

  methods: {
    async onConfirm() {
      this.busy = true
      this.log('confirm', 'A · 收到 confirm，外部 loading 接管')
      await wait(900)
      this.busy = false
      this.log('success', 'A · 业务自己的异步流程结束')
      this.$message({ message: '申请已提交（loading 由页面控制）', type: 'success', duration: 1800, showClose: true })
    },

    async actionB() {
      await wait(1200)
      return 'PLAN-2026-031'
    },

    async actionC() {
      await wait(600)
      return 'draft'
    },

    /** 故意失败：演示 reject → emit error + toast */
    actionD() {
      return wait(700).then(() => {
        throw new Error('线上配置校验未通过：缺少灰度分组')
      })
    },
  },
}
</script>
