<template>
  <div class="card tone-blue">
    <div class="card-h">
      <h3>重点计划实施进度</h3>
      <button class="lnk" @click="$emit('open-all')">查看全部计划 →</button>
    </div>
    <div class="card-b">
      <template v-if="rows.length">
        <div v-for="f in rows" :key="f.im.id" class="impl-item">
          <div class="impl-row">
            <div class="impl-title">
              <button class="impl-name" title="点击进入计划" @click="$emit('open', f.im)">{{ f.im.name }}</button>
              <div class="hint">
                <template v-if="scope === 'ALL'">{{ f.im.org }} · </template>{{ f.im.type }} · 招聘{{ f.im.headcount }}人
                <template v-if="f.gap > 0"> · <b style="color: #e23b3b">缺口{{ f.gap }}人</b></template>
                · 拟录用{{ f.im.progress.planned }}人 · 当前环节：<b>{{ f.im.progress.inflight > 0 ? f.im.flow[2] || f.im.flow[0] : '未启动' }}</b>
              </div>
            </div>
            <span class="tag" :class="'tag-' + f.tone">{{ f.t }}</span>
          </div>
          <div class="impl-prog">
            <div class="prog" :class="{ bad: f.t === '超期', warn: f.t === '预警' }" style="flex: 1">
              <span :style="{ '--w': f.rate + '%', width: f.rate + '%' }"></span>
            </div>
            <span class="impl-pct">完成率 {{ f.rate }}%</span>
          </div>
        </div>
      </template>
      <div v-else class="empty">当前筛选条件下暂无重点计划</div>
    </div>
  </div>
</template>

<script>
/**
 * 重点计划实施进度卡
 * ------------------------------------------------------------
 * rows 是父级 planRisk() 打分排序后的前 5 条（含 im / rate / t / tone / gap），
 * 「重点」的口径（编制 ≥ 25 才入选）也在父级，这里不管排序与筛选。
 * scope 只用来决定 hint 里要不要带机构名（全省视图才带）。
 */
export default {
  name: 'RcdFocusPlans',

  props: {
    rows: { type: Array, default: () => [] },
    scope: { type: String, default: 'ALL' },
  },
}
</script>
