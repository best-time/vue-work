<template>
  <div class="slots-page">
    <h2>$dialog 插槽用法示例（$slots / $scopedSlots）</h2>
    <p class="slots-page__desc">
      函数式调用没有模板父级，插槽通过 <code>slots</code> / <code>scopedSlots</code> 两个选项用 JS 传入；
      统一支持 <code>'字符串'</code> / <code>VNode</code> / <code>VNode[]</code> / <code>(h, scope) =&gt; VNode[]</code> 四种写法。
      作用域插槽只能用函数式（需要等业务组件把 scope 传上来）。
    </p>

    <div class="slots-page__btns">
      <el-button @click="demoDefaultString">① slots.default：字符串</el-button>
      <el-button @click="demoNamedSlots">② slots.header / extra：具名插槽</el-button>
      <el-button @click="demoScopedRow">③ scopedSlots.row：作用域插槽</el-button>
      <el-button @click="demoRenderFunction">④ 渲染函数 + 响应式数据</el-button>
      <el-button @click="demoFooterHandle">⑤ slots.footer + 句柄控制</el-button>
      <el-button @click="demoAllSlots">⑥ 五插槽全接管组合</el-button>
      <el-button @click="demoFallback">⑦ 不传插槽：全 fallback</el-button>
    </div>

    <div class="slots-page__state">
      <p>调用方数据 form.name = <b>{{ form.name || '（空）' }}</b></p>
      <p>上一次弹窗结果：<b>{{ lastResult }}</b></p>
    </div>
  </div>
</template>

<script>
import SlotContent from './demo2.vue'

export default {
  name: 'SlotsDemoPage',
  data() {
    return {
      // 列表数据：通过 props 传给业务组件
      list: [
        { id: 1, name: '张三', email: 'zhangsan@test.com' },
        { id: 2, name: '李四', email: 'lisi@test.com' },
        { id: 3, name: '王五', email: 'wangwu@test.com' }
      ],
      form: { name: '张三', dept: '研发部' },
      lastResult: '（还没打开过弹窗）'
    }
  },
  methods: {
    /** 统一打印结果，方便观察 confirm 携带的数据 */
    logResult(res) {
      this.lastResult = res.type === 'confirm'
          ? `confirm -> ${JSON.stringify(res.data)}`
          : 'cancel'
      console.log('[$dialog 结果]', res)
    },

    // ① 最简写法：slots 的值就是一段文本，容器会当成文本节点渲染
    async demoDefaultString() {
      const h = this.$createElement

      const res = await this.$_dialog({
        title: '① slots.default 传字符串',
        component: SlotContent,
        context: this,
        props: { list: this.list },
        slots: {
          // 字符串 / 数字：会被当成文本节点
          default: () => h('span', {
            style: {
              color: 'red'
            }
          },'这段文字来自 slots.default，以字符串形式传入（省去 h() 的写法）')
        },
        dialogProps: { width: '560px' }
      })
      this.logResult(res)
    },

    // ② 具名插槽：header / extra 用 this.$createElement 造 VNode 数组
    async demoNamedSlots() {
      const h = this.$createElement
      const res = await this.$_dialog({
        title: '② slots.header / slots.extra 具名插槽',
        component: SlotContent,
        context: this,
        props: { list: this.list },
        slots: {
          // VNode 数组（推荐：结构清晰，能带 props/事件/样式）
          header: [
            h('h4', { style: { margin: '0 0 4px' } }, '标题区（slots.header）'),
            h('p', { style: { margin: 0, color: '#909399' } }, '具名插槽可以随便写结构，业务组件用 v-if="$slots.header" 控制是否渲染')
          ],
          // 单个 VNode 也可以（不需要包成数组）
          extra: h('el-alert', {
            props: { type: 'info', 'show-icon': true, title: '附加说明（slots.extra）' },
            style: { marginTop: '8px' }
          })
        },
        dialogProps: { width: '560px' }
      })
      this.logResult(res)
    },

    // ③ 作用域插槽：业务组件 <slot name="row" :row :index :checked> 把数据交上来
    async demoScopedRow() {
      const h = this.$createElement
      const res = await this.$_dialog({
        title: '③ scopedSlots.row 作用域插槽',
        component: SlotContent,
        context: this,
        props: { list: this.list },
        slots: {
          default: h('p', { style: { margin: '0 0 8px' } }, '下面的行渲染完全由调用方接管（scopedSlots.row）。')
        },
        scopedSlots: {
          /**
           * 作用域插槽固定签名：(h, scope) => VNode | VNode[]
           * scope 就是业务组件 <slot name="row" :row :index :checked> 上绑的那些数据
           */
          row: (h2, { row, index, checked }) => [
            h2('span', { style: { display: 'inline-block', width: '30px', color: '#909399' } }, `#${index + 1}`),
            h2('el-tag', { props: { size: 'mini', type: checked ? 'success' : 'info' } }, row.name),
            h2('span', { style: { margin: '0 12px', color: '#606266' } }, row.email),
            h2('el-button', {
              props: { type: 'text', size: 'mini' },
              on: {
                // 行内按钮拿到的是「调用方的数据」，处理逻辑随手可写
                click: () => this.$message.info(`当前行：${row.name}（index=${index}，checked=${checked}）`)
              }
            }, '查看')
          ]
        },
        dialogProps: { width: '620px' }
      })
      this.logResult(res)
    },

    // ④ 渲染函数形式：内容跟随调用方的响应式数据实时更新
    async demoRenderFunction() {
      const res = await this.$_dialog({
        title: '④ 渲染函数 + 响应式数据',
        component: SlotContent,
        context: this,
        props: { list: [], hideActions: true },
        slots: {
          /**
           * 函数形式：(h) => VNode[]
           * 插槽函数在「容器每次渲染」时执行，所以这里读到的 this.form 是实时的；
           * 输入框改数据 -> 调用方数据变化 -> 容器重新渲染 -> 插槽拿到新值。
           */
          default: (h) => [
            h('p', { style: { margin: '0 0 8px', color: '#909399' } },
                '下面是渲染函数写出来的表单，修改后页面上的 form.name 会同步变化：'),
            h('el-form', { props: { labelWidth: '70px', size: 'mini' } }, [
              h('el-form-item', { props: { label: '姓名' } }, [
                h('el-input', {
                  props: { value: this.form.name, placeholder: '输入姓名' },
                  on: { input: v => { this.form.name = v } }
                })
              ]),
              h('el-form-item', { props: { label: '部门' } }, [
                h('el-select', {
                  props: { value: this.form.dept },
                  on: { input: v => { this.form.dept = v } }
                }, ['研发部', '产品部', '测试部'].map(d =>
                    h('el-option', { key: d, props: { label: d, value: d } })
                ))
              ])
            ]),
            h('p', { style: { color: '#67c23a' } }, `插槽内读到的实时值：${this.form.name || '（空）'} / ${this.form.dept}`)
          ]
        },
        // 关闭前校验，演示插槽内容与 beforeClose 的组合使用
        beforeClose: async (vm, action) => {
          if (action === 'confirm' && !this.form.name) {
            this.$message.warning('姓名不能为空，已阻止关闭')
            return false
          }
          return true
        },
        dialogProps: { width: '520px' }
      })
      this.logResult(res)
    },

    // ⑤ 自定义 footer：底部按钮由调用方接管，通过句柄 vm 触发容器的确认/取消逻辑
    async demoFooterHandle() {
      const h = this.$createElement
      const dlg = this.$dialogWithHandle({
        title: '⑤ slots.footer + $dialogWithHandle',
        component: SlotContent,
        context: this,
        props: { list: this.list, hideActions: true },
        slots: {
          default: h('p', { style: { margin: '0 0 8px' } }, '底部按钮由 slots.footer 完全接管，容器的默认「取消 / 确定」不会再渲染。'),
          /**
           * footer 也是普通插槽：容器模板里 v-if="hasFooterSlot" 会优先渲染它。
           * 这里用到外部变量 dlg —— 插槽函数是「惰性执行」的（首次渲染在 $dialogWithHandle 返回之后），
           * 所以闭包里引用 dlg 不会出现未初始化的报错。
           */
          footer: h2 => [
            h2('el-button', { props: { size: 'mini' }, on: { click: () => dlg.onCancel() } }, '放弃'),
            h2('el-button', {
              // dlg.confirmLoading 是响应式的：改了它 footer 会自动重渲染
              props: { size: 'mini', type: 'primary', loading: dlg.confirmLoading },
              on: { click: () => this.doFooterSubmit(dlg) }
            }, '保存（自定义 loading）')
          ]
        },
        dialogProps: { width: '560px', closeOnClickModal: false }
      })
      console.log('[句柄]', dlg)
      // 句柄能直接操作容器：dlg.confirmLoading = true / dlg.visible = true ...
      // 句柄上也挂了结果 Promise，想要结果就 await 它
      this.logResult(await dlg.openPromise)
    },

    // 配合 ⑤ 的异步提交：手动切 loading，再走容器的 onConfirm
    async doFooterSubmit(dlg) {
      dlg.confirmLoading = true
      await new Promise(resolve => setTimeout(resolve, 600))
      dlg.confirmLoading = false
      this.$message.success('自定义 footer 提交成功')
      // onConfirm 会走 beforeClose 拦截逻辑并以 confirm 收口（onCancel 同理）
      dlg.onConfirm({ from: 'slots.footer 自定义按钮' })
    },

    // ⑥ 组合示例：header + default + row + extra + footer 一次性全给
    async demoAllSlots() {
      const h = this.$createElement
      // 既要自定义 footer（按钮要能关弹窗），又要拿结果 -> 用句柄 + openPromise
      const dlg = this.$dialogWithHandle({
        title: '⑥ 五个插槽全接管',
        component: SlotContent,
        context: this,
        props: { list: this.list, hideActions: true },
        slots: {
          header: h('p', { style: { margin: 0, fontWeight: 600 } }, '选择你要加入的成员（header 插槽）'),
          default: h('p', { style: { margin: '0 0 8px', color: '#909399' } }, '这里是默认插槽，用来放说明文字。'),
          extra: h('p', { style: { margin: '8px 0 0', color: '#e6a23c' } }, 'extra 插槽：放个提醒 —— 提交后不可修改'),
          footer: [
            h('el-button', { props: { size: 'mini' }, on: { click: () => this.$message.info('footer 里的「帮助」按钮') } }, '帮助'),
            h('el-button', { props: { size: 'mini' }, on: { click: () => dlg.onCancel() } }, '取消'),
            h('el-button', { props: { size: 'mini', type: 'primary' }, on: { click: () => dlg.onConfirm({ from: '⑥ 自定义 footer' }) } }, '确定')
          ]
        },
        scopedSlots: {
          row: (h2, { row, index, checked }) => [
            h2('el-checkbox', {}, [row.name]),
            h2('span', { style: { marginLeft: '10px', color: '#909399' } }, `${row.email} · index=${index} · checked=${checked}`)
          ]
        },
        dialogProps: { width: '600px' }
      })
      this.logResult(await dlg.openPromise)
    },

    // ⑦ 不传任何插槽：业务组件里所有插槽都走 fallback（对照第 ①~⑥ 看差异）
    async demoFallback() {
      const res = await this.$_dialog({
        title: '⑦ 不传插槽：全部走 fallback',
        component: SlotContent,
        context: this,
        props: { list: this.list },
        dialogProps: { width: '520px' }
      })
      this.logResult(res)
    }
  }
}
</script>

<style scoped>
.slots-page {
  padding: 24px;
}
.slots-page h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.slots-page__desc {
  max-width: 820px;
  margin: 0 0 16px;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
}
.slots-page__desc code {
  padding: 1px 4px;
  background: #f5f7fa;
  border-radius: 3px;
  color: #409eff;
}
.slots-page__btns .el-button {
  margin: 0 8px 8px 0;
}
.slots-page__state {
  margin-top: 8px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
  font-size: 13px;
}
.slots-page__state b {
  color: #409eff;
}
</style>
