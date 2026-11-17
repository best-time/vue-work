<template>
  <div>
    <div class="sec-t">
      入职人员结构（确认入职人员）
      <span style="margin-left: auto; font-weight: 400">
        <button
          v-for="k in dimKeys"
          :key="k"
          class="lnk"
          :style="k === dim ? 'font-weight:700;text-decoration:underline' : ''"
          @click="$emit('update:dim', k)"
        >
          {{ k }}
        </button>
      </span>
    </div>
    <div class="hint" style="margin-bottom: 6px">
      口径与上方「确认入职人数」一致（{{ scopeLabel }} · {{ year }} · {{ qtypeLabel }}），
      结构合计 = 确认入职人数。
    </div>

    <div v-if="donutTotal > 0" class="donut-wrap">
      <!--
        环图交给 echarts（原生 conic-gradient 版已换掉）：
        外径 99% / 内径 68% 对应原型的 156px 环 + inset 25px 内圈（78 - 53 = 25）。
        圆心那两行字也由 echarts 自己画（graphic 文字），没有任何 DOM 叠层 ——
        见下方 pieOption.graphic 与顶部说明。
      -->
      <div class="rcd-donut">
        <e-chart :option="pieOption" width="156px" height="156px" />
      </div>
      <ul class="lgd">
        <li v-for="d in donutRows" :key="d.n">
          <span class="dot" :style="{ background: d.c }"></span>{{ d.n }}
          <span class="lg-n">{{ d.v }}人 · {{ pct(d.v, donutTotal) }}%</span>
        </li>
      </ul>
    </div>
    <div v-else class="empty">当前筛选条件下暂无入职人员结构数据</div>

    <div class="hint" style="margin-top: 8px">
      分析结论：录用人员以硕士与本科为主；「笔试」环节人员流失较多。
      <button class="lnk" @click="$emit('goto-candidate')">查看人员明细 →</button>
    </div>
  </div>
</template>

<script>
import EChart from "@/components/EChart/index.vue";
import { dimsOf, pct as pctOf } from "../mock";

// canvas 里的字不继承 CSS，得显式给字体族；与 .rcd-page 上的 font-family 保持一致
const FONT = '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

// 环图 canvas 固定 156×156（见 .rcd-donut / e-chart 的 width、height），
// 圆心 78,78；两行行高与样式尺寸由这里统一算，改尺寸时同步改这三处即可
const SIZE = 156;
const CENTER = SIZE / 2;
const NUM_LH = 31;
const LAB_LH = 16;

/**
 * 圆心两行字交给 echarts 的 graphic 文字（不是 series.label、也不是 DOM 叠层）：
 *   · 为什么不是 series.label + rich：hover 时 echarts 会给被强调的扇区单独算 label 的
 *     layout，position:'center' 在强调态下会退化成「扇区外侧」，圆心就多出一份文字并跑到
 *     环外；就算把 emphasis.disabled，也只是「碰巧不动」，语义上仍在赌强调态的行为。
 *   · 为什么不是 title：title 的 left:'center' 先把「整块」（块宽 = 最宽那行）水平居中，
 *     再叠加 textAlign:'center' 时，两行会以块的左边界为中心再偏半个块宽 —— 实测数字中心
 *     落在 55 而不是 78。graphic 直接给圆心坐标，没有这层二次偏移。
 *   · graphic 不是 series 的子节点，不参与 hover / 高亮 / 动画重排；hover 只留 tooltip
 *     一种反馈，和原型 conic-gradient 的手感一致。
 *   · 代价：文字进了 canvas，会跟着 .e-chart 的 drop-shadow 吃到一层极淡的投影（原型圆心
 *     字是 DOM，完全干净）。肉眼在 1:1 下基本看不出，要彻底干净只能再叠一层无 filter 的 canvas。
 */

/**
 * 入职人员结构环图（echarts）
 * ------------------------------------------------------------
 * 总数直接用父级的「确认入职人数」prop（不是自己从实施里累加），
 * 这样才能保证「结构合计 = 上方 KPI 的确认入职人数」恒成立 ——
 * 原型这两处是各算各的，对不上。
 *
 * 为什么不用 echarts 自带 legend：原型右侧图例是「名称 + N人 · x%」两段右对齐的
 * 富文本，echarts legend 做不出那个排版，且它不参与环图缩放。所以环图交给 echarts，
 * 图例仍是 HTML（与原型一致，也能让 .lgd 的 hover 底色继续生效）。
 */
export default {
  name: "RcdDonutChart",

  components: { EChart },

  props: {
    onboard: { type: Number, default: 0 },
    year: { type: String, default: "2026" },
    dim: { type: String, default: "学历" },
    scopeLabel: { type: String, default: "全省" },
    qtype: { type: String, default: "全部" },
  },

  computed: {
    qtypeLabel() {
      return this.qtype === "全部" ? "校招+社招" : this.qtype;
    },
    dims() {
      return dimsOf(this.onboard, this.year);
    },
    dimKeys() {
      return Object.keys(this.dims);
    },
    donutRows() {
      return this.dims[this.dim] || [];
    },
    donutTotal() {
      return this.donutRows.reduce((a, b) => a + b.v, 0);
    },

    pieOption() {
      return {
        // 圆心两行字：总量 + 「确认入职」，由 echarts 画在 canvas 上（graphic 元素），
        // 不是 series.label、也不是 DOM 叠层。
        //  ★ 不用 title 的原因：title 的 left:'center' 会先把整块（宽 = 最长行）水平居中，
        //    再叠加 textAlign:'center'，两行文字会以「块的左边界」为中心再偏半个块宽
        //    （实测数字中心落在 55，应 78）。graphic 直接给圆心坐标，没有这层二次偏移。
        //  ★ 坐标按容器写死：canvas 固定 156×156（.rcd-donut 与 e-chart 的 width/height
        //    都是 156），圆心 = 78,78；两行行高 31 + 16，整体沿环心上下对称。
        graphic: [
          {
            type: "text",
            silent: true,
            z: 10,
            style: {
              x: CENTER,
              y: CENTER - (NUM_LH + LAB_LH) / 2 + NUM_LH / 2,
              text: String(this.donutTotal),
              fill: "#1c5cb0",
              font: "700 25px " + FONT,
              textAlign: "center",
              textVerticalAlign: "middle",
            },
          },
          {
            type: "text",
            silent: true,
            z: 10,
            style: {
              x: CENTER,
              y: CENTER + (NUM_LH + LAB_LH) / 2 - LAB_LH / 2,
              text: "确认入职",
              fill: "#909399",
              font: "400 11px " + FONT,
              textAlign: "center",
              textVerticalAlign: "middle",
            },
          },
        ],
        // 原型是 donutIn（整体 scale + rotate），scale 比默认的从中心展开更接近
        animationType: "scale",
        animationDuration: 760,
        animationEasing: "cubicOut",
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(255,255,255,.97)",
          borderColor: "#e4ebf7",
          borderWidth: 1,
          padding: [7, 10],
          textStyle: { color: "#303133", fontSize: 12 },
          extraCssText:
            "box-shadow:0 10px 26px -12px rgba(16,42,100,.42);border-radius:8px;",
          formatter: (p) => `${p.name}：<b>${p.value}</b> 人 · ${p.percent}%`,
        },
        series: [
          {
            type: "pie",
            // 圆直径 156 → 外半径 78、内半径 53（原型 inset:25px）
            radius: ["68%", "99%"],
            center: ["50%", "50%"],
            // 原型 conic-gradient 是连续色块，没有扇区间隙
            itemStyle: { borderWidth: 0 },
            // 点一下不该有「选中」状态
            selectedMode: false,
            // ★ 关掉强调：不做 lighten、不缩放、不加阴影、label 也不重排。
            //   开着的话 hover 扇区会被提亮一档，且圆心文字会多出一份跑到环外。
            emphasis: { disabled: true },
            label: { show: false },
            labelLine: { show: false },
            data: this.donutRows.map((d) => ({
              name: d.n,
              value: d.v,
              itemStyle: { color: d.c },
            })),
          },
        ],
      };
    },
  },

  methods: {
    pct(a, b) {
      return pctOf(a, b);
    },
  },
};
</script>
