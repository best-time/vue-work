<template>
  <div class="bdt">
    <el-row :gutter="14">
      <el-col :span="12">
        <el-card shadow="never" class="bdt__card">
          <div slot="header" class="bdt__head">
            <code>先量一遍，别猜</code>
            <span class="bdt__tip">用真实 DOM 采样</span>
          </div>

          <div class="bdt__acts">
            <el-button size="small" type="primary" @click="run">开 3 层并测量</el-button>
            <el-button size="small" :disabled="!depth" @click="closeAllLayers">关闭全部</el-button>
          </div>

          <div class="bdt__stats">
            <div v-for="s in stats" :key="s.label" class="bdt__stat">
              <span>{{ s.label }}</span>
              <b :class="{ 'is-warn': s.warn }">{{ s.value }}</b>
            </div>
          </div>

          <p class="bdt__hint">
            现在<span class="bdt__inline-tag">栈深度 {{ depth }}</span>
            —— 按下 <b>ESC</b>，只有最上面那层会关掉。Element 的
            <code>close-on-press-escape</code> 只声明了 prop，组件里没有 keydown 监听，所以原生
            el-dialog 按 ESC 是不关的，这个能力得自己补。
          </p>

          <div class="bdt__code">{{ sourceCode }}</div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never" class="bdt__card">
          <div slot="header" class="bdt__head">
            <code>几层用什么写法</code>
          </div>
          <el-table :data="plan" size="mini" border>
            <el-table-column prop="layers" label="层数" width="76" />
            <el-table-column prop="way" label="做法" min-width="130" />
            <el-table-column prop="why" label="理由" min-width="180" />
          </el-table>

          <div class="bdt__warn">
            <div class="bdt__warn-title">3 层以上先别写弹窗</div>
            <ul class="bdt__list">
              <li><b>抽屉 el-drawer</b>：第 2 层改成右侧抽屉，用户还能看到第 1 层的上下文</li>
              <li><b>整页 / 子路由</b>：第 3 层以后基本是「另一个业务」，值得有自己的 URL</li>
              <li><b>步骤条 el-steps</b>：如果是「填表 → 选客户 → 确认」，本质是一个流程，不该是 3 个弹窗</li>
              <li><b>行内编辑</b>：只是想改一个字段，就别开第 2 层</li>
            </ul>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { state, openLayer, closeAll } from '../nest/stack'

/** runtime-only 构建，这里只能用 render，不能写 template 字符串 */
const ProbeLayer = {
  name: 'ProbeLayer',
  props: { depth: { type: Number, default: 1 } },
  render(h) {
    return h('div', { class: 'bdt__probe' }, [
      h('p', '第 ' + this.depth + ' 层，只为测量而开。'),
      h(
        'p',
        { class: 'bdt__probe-hint' },
        '按 ESC：只有最上面这层会消失（拦截在宿主里，不是 Element 的能力）。'
      ),
      h('div', { class: 'bdt__probe-foot' }, [
        h(
          'button',
          {
            class: 'el-button el-button--default el-button--mini',
            on: { click: () => this.$emit('dismiss') }
          },
          '关本层'
        )
      ])
    ])
  }
}

export default {
  name: 'BoundaryTab',

  data() {
    return {
      layers: state.layers,
      stats: [
        { label: '可见 wrapper', value: 0 },
        { label: '.v-modal 数', value: 0, warn: true },
        { label: '最高 z-index', value: '—' },
        { label: 'body 下 wrapper（含隐藏）', value: 0 }
      ],
      plan: [
        { layers: '1 层', way: '内联 el-dialog', why: '写在页面里最直观，v-model 常驻' },
        { layers: '2 层', way: '内联或栈都行', why: '只多一个 visible，还能忍' },
        { layers: '3~4 层', way: '栈 + 一层一个文件', why: '可见性、关闭顺序、结果回传都交给栈' },
        { layers: '5 层以上', way: '改结构', why: '弹窗套弹窗已经超出用户能记住的层级' }
      ],
      sourceCode: [
        '// node_modules/element-ui/packages/dialog/src/component.vue',
        'props: {',
        '  closeOnPressEscape: { type: Boolean, default: true }',
        '},',
        '// ...全文再无 keydown / Escape 相关代码',
        '',
        '// src/utils/popup/popup-manager.js —— 遮罩是单例',
        'let modalDom = PopupManager.modalDom',
        '// 所以 4 层弹窗也只有 1 个 .v-modal'
      ].join('\n')
    }
  },

  computed: {
    depth() {
      return this.layers.length
    }
  },

  watch: {
    /* 层数一变就重新采样：按 ESC 关掉一层后，上面的数字要跟着变 */
    'layers.length'() {
      setTimeout(this.sample, 450)
    }
  },

  methods: {
    async run() {
      for (let i = 1; i <= 3; i++) {
        openLayer({
          title: '测量层 ' + i,
          width: '520px',
          role: 'ProbeLayer',
          component: ProbeLayer,
          props: { depth: i }
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 700))
      this.sample()
    },

    sample() {
      const wrappers = Array.prototype.filter.call(
        document.querySelectorAll('.el-dialog__wrapper'),
        (el) => el.style.display !== 'none'
      )
      const zs = wrappers.map((el) => Number(el.style.zIndex) || 0)
      this.stats = [
        { label: '可见 wrapper', value: wrappers.length },
        { label: '.v-modal 数', value: document.querySelectorAll('.v-modal').length, warn: true },
        { label: '最高 z-index', value: zs.length ? Math.max.apply(null, zs) : '—' },
        {
          label: 'body 下 wrapper（含隐藏）',
          value: document.querySelectorAll('body > .el-dialog__wrapper').length
        }
      ]
    },

    closeAllLayers() {
      closeAll()
      setTimeout(this.sample, 500)
    }
  }
}
</script>

<style lang="scss" scoped>
.bdt {
  &__card {
    height: 100%;
    border-radius: 6px;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    code {
      font-size: 13px;
      color: #326fff;
    }
  }

  &__tip {
    font-size: 12px;
    color: #909399;
  }

  &__acts {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__stats {
    display: flex;
    gap: 10px;
  }

  &__stat {
    flex: 1;
    padding: 8px 6px;
    text-align: center;
    background: #f7f9fc;
    border: 1px solid #ebeef5;
    border-radius: 4px;

    span {
      display: block;
      font-size: 11px;
      color: #909399;
    }

    b {
      display: block;
      font-size: 18px;
      line-height: 26px;
      color: #326fff;

      &.is-warn {
        color: #e6a23c;
      }
    }
  }

  &__hint {
    margin: 12px 0;
    font-size: 12px;
    line-height: 1.9;
    color: #909399;

    b {
      color: #5c6b8a;
    }

    code {
      padding: 0 3px;
      color: #5c6b8a;
      background: #f2f4f8;
      border-radius: 2px;
    }
  }

  &__inline-tag {
    display: inline-block;
    padding: 0 6px;
    margin: 0 2px;
    font-size: 11px;
    color: #fff;
    background: #326fff;
    border-radius: 9px;
  }

  &__code {
    max-height: 180px;
    overflow: auto;
    padding: 10px 12px;
    font-family: Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 1.75;
    color: #2c3e50;
    white-space: pre;
    background: #f6f8fa;
    border: 1px solid #eaeef2;
    border-radius: 4px;
  }

  &__warn {
    padding: 10px 12px;
    margin-top: 12px;
    background: #fff8e6;
    border: 1px solid #fdefc8;
    border-radius: 4px;
  }

  &__warn-title {
    margin-bottom: 4px;
    font-size: 13px;
    font-weight: 600;
    color: #b88230;
  }

  &__list {
    padding-left: 16px;
    margin: 0;
    font-size: 12px;
    line-height: 1.9;
    color: #8a7039;

    b {
      color: #7a5f21;
    }
  }

  &__probe {
    font-size: 14px;
    line-height: 1.8;
    color: #303133;
  }

  &__probe-hint {
    margin: 4px 0 12px;
    font-size: 12px;
    color: #909399;
  }

  &__probe-foot {
    padding-top: 10px;
    text-align: right;
    border-top: 1px solid #ebeef5;
  }
}
</style>
