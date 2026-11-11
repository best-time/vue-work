<template>
  <div class="cbd__grid">
    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>确认框里填东西</b>
        <code>#content 插槽 + close-on-confirm="false"</code>
      </div>
      <div class="cbd__pad">
        <confirm-button
          ref="richBtn"
          type="primary"
          :loading="loading"
          :close-on-confirm="false"
          confirm-title="提交审批意见"
          confirm-width="520px"
          confirm-icon="info"
          confirm-text="提交"
          @confirm="submit"
          @cancel="log('cancel', '③ 取消提交')"
        >
          提交审批
          <template #content>
            <p class="cbd__rich-tip">
              提交后流程进入下一节点，意见不可修改。当前节点：<b>部门负责人审批</b>
            </p>
            <el-input
              v-model="reason"
              type="textarea"
              :rows="3"
              maxlength="100"
              show-word-limit
              placeholder="审批意见（必填，至少 5 个字）"
              @input="error = ''"
            />
            <el-checkbox v-model="agree" class="cbd__rich-ck">
              我已核对候选人材料
            </el-checkbox>
            <p v-if="error" class="cbd__rich-err">{{ error }}</p>
          </template>
        </confirm-button>

        <p class="cbd__help">
          <code>close-on-confirm="false"</code>：点「提交」不关弹窗，确定按钮转圈，
          父级校验不过就停在弹窗里改（红字提示），成功了才 <code>ref.close()</code>。
          这是唯一需要父级调方法的场景。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>当前状态</b>
        <span class="cbd__muted">点「提交审批」边走边看</span>
      </div>
      <div class="cbd__pad">
        <div class="cbd__kv">
          <span>审批意见</span>
          <code>{{ reason || '(空)' }}</code>
        </div>
        <div class="cbd__kv">
          <span>已核对材料</span>
          <code>{{ agree ? 'true' : 'false' }}</code>
        </div>
        <div class="cbd__kv">
          <span>最近一次提交</span>
          <code>{{ lastSubmit || '(还没提交成功)' }}</code>
        </div>
        <div class="cbd__hint">
          先什么都不填直接点「提交」→ 弹窗不关、红字提示；
          填满并勾选后再提交 → 转圈 1s、弹窗关闭、按钮上出现成功 toast。
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import logMixin from './logMixin'
import { wait } from './wait'

export default {
  name: 'ConfirmButtonRichTab',
  mixins: [logMixin],

  data() {
    return {
      loading: false,
      reason: '',
      agree: false,
      error: '',
      lastSubmit: '',
    }
  },

  methods: {
    async submit() {
      if (this.reason.trim().length < 5) {
        this.error = '审批意见至少 5 个字'
        return
      }
      if (!this.agree) {
        this.error = '请先勾选「我已核对候选人材料」'
        return
      }

      this.error = ''
      this.loading = true
      this.log('confirm', '③ 校验通过，开始提交')
      await wait(1000)
      this.loading = false
      this.lastSubmit = this.reason.trim()
      this.log('success', '③ 提交成功，ref.close() 关掉弹窗')
      // close-on-confirm=false 时，弹窗由父级自己关
      this.$refs.richBtn.close()
      this.$message({ message: '审批意见已提交', type: 'success', duration: 1800, showClose: true })
    },
  },
}
</script>
