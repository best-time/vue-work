<template>
  <div class="card tone-rose">
    <div class="card-h">
      <h3>风险预警</h3>
      <button class="lnk" title="风险预警时间参数配置" @click="$emit('cfg')">⚙ 预警配置</button>
      <div class="tb-l risk-filter">
        <button
          v-for="c in chips"
          :key="c.lv"
          class="tag risk-chip"
          :class="['tag-' + c.cls, { 'risk-chip--on': lv === c.lv }]"
          :title="'点击按' + c.label + '筛选'"
          @click="pick(c.lv)"
        >
          {{ c.label }} {{ c.count }}
        </button>
        <button v-if="lv" class="lnk" title="取消筛选，显示全部风险" @click="pick('')">显示全部 ✕</button>
      </div>
    </div>
    <div class="card-b risk-scroll">
      <div v-for="r in rows" :key="r.id" class="risk-i">
        <span class="risk-lv" :style="{ background: TONE_DOT[r.lv] }"></span>
        <div class="risk-main">
          <div class="risk-name">{{ r.name }}<span class="hint">｜{{ r.org }}</span></div>
          <div class="hint">{{ r.content }} ｜ 产生时间 {{ r.time }}</div>
        </div>
        <button class="lnk" @click="$emit('view', r)">查看</button>
        <button v-if="r.status !== '已解除'" class="lnk" @click="$emit('urge', r)">督办</button>
      </div>
      <div v-if="!rows.length" class="empty">当前筛选条件下暂无风险记录</div>
    </div>
  </div>
</template>

<script>
import { TONE_DOT } from '../mock'

/**
 * 风险预警卡
 * ------------------------------------------------------------
 * 筛选等级 lv 用 `.sync` 挂在父级：换机构 / 换年度时父级 resetDrill()
 * 要把它一起清掉，状态放子组件里就得再补一套 reset 逻辑，容易漏。
 * 计数始终按「全部风险」算，不随当前筛选变化 —— 否则筛完「高」，
 * 中/低的数字就都变成 0，没法来回切。
 *
 * 行内按钮照原型：`查看` 恒有；`督办` 仅在 status !== '已解除' 时出现
 * （原型还叠了一层 isUnion —— 只有联合银行身份能督办，本页就是联合银行
 * 视角的驾驶舱，所以这层恒真，不再单独判）。
 */
export default {
  name: 'RcdRiskCard',

  props: {
    risks: { type: Array, default: () => [] },
    lv: { type: String, default: '' },
  },

  data() {
    return { TONE_DOT }
  },

  computed: {
    chips() {
      const n = (level) => this.risks.filter((r) => r.lv === level).length
      return [
        { lv: '高', cls: 'red', label: '高风险', count: n('高') },
        { lv: '中', cls: 'orange', label: '中风险', count: n('中') },
        { lv: '低', cls: 'green', label: '低风险', count: n('低') },
      ]
    },
    rows() {
      return this.risks.filter((r) => !this.lv || r.lv === this.lv)
    },
  },

  methods: {
    pick(lv) {
      // 再点一次同一个 chip 就是取消筛选
      this.$emit('update:lv', this.lv === lv ? '' : lv)
    },
  },
}
</script>
