<template>
  <app-dialog
    ref="dlg"
    custom-class="rcd-dlg rcd-dlg--urge"
    title="发起督办"
    width="760px"
    top="12vh"
    confirm-text="下发督办（生成责任人待办）"
    cancel-text="取 消"
    @confirm="submit"
  >
    <div v-if="risk" class="rcd-fgrid">
      <!-- 只读事项：一眼看清督办的是哪条风险、哪家机构 -->
      <div class="rcd-fi rcd-fi--full">
        <label>督办事项</label>
        <div class="rcd-fv">【{{ risk.lv }}风险】{{ risk.name }} — {{ risk.org }}</div>
      </div>

      <div class="rcd-fi rcd-fi--full">
        <label>督办要求</label>
        <textarea
          v-model="note"
          class="rcd-textarea"
          rows="4"
          maxlength="300"
          placeholder="请输入督办要求（选填）"
        ></textarea>
      </div>

      <div class="rcd-fi">
        <label>办理期限</label>
        <input v-model="deadline" class="rcd-inp" type="date" />
      </div>
    </div>
  </app-dialog>
</template>

<script>
import { TODAY, addDays } from '../mock'

/**
 * 风险预警 · 督办弹窗（卡片上的「督办」）
 * ------------------------------------------------------------
 * 表单项照原型 riskUrge 来，就三项：
 *   督办事项（【等级风险】名称 — 机构，只读）
 *   督办要求（选填 textarea）
 *   办理期限（date）
 * footer 也是原型 okFoot 的文案：取消 / 下发督办（生成责任人待办）。
 *
 * 提交只负责把「哪条风险 + 填了什么」交给父级，状态推进（待处理 → 处理中）
 * 和留痕都在父级做 —— 因为卡片上的按钮显隐、详情里的处理记录都要看同一份状态。
 *
 * 原型这一项没做校验（期限留空也能下发），这里只补一条「期限必填」，
 * 免得演示时无意间提交一条没有期限的督办，其它行为与原型一致。
 */
export default {
  name: 'RcdRiskUrgeDialog',

  data() {
    return { risk: null, note: '', deadline: '' }
  },

  methods: {
    /** @param {object} risk risksOf() 的一条（父级已套过状态覆盖） */
    open(risk) {
      this.risk = risk
      this.note = ''
      // 原型默认留空；演示里给个 5 天后的默认值，省得每次都要点日历
      this.deadline = addDays(TODAY, 5)
      return this.$refs.dlg.open()
    },

    submit() {
      if (!this.deadline) {
        this.$message.warning('请选择办理期限')
        return false
      }
      this.$emit('submit', {
        risk: this.risk,
        form: { note: this.note.trim(), deadline: this.deadline },
      })
      return true
    },
  },
}
</script>
