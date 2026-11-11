<template>
  <div class="cbd__grid">
    <el-card shadow="never" class="cbd__card cbd__card--wide">
      <div slot="header" class="cbd__card-head">
        <b>el-button 的属性全部透传</b>
        <code>inheritAttrs: false + v-bind="$attrs"</code>
      </div>
      <div class="cbd__pad">
        <div class="cbd__actions">
          <confirm-button
            v-for="b in passthrough"
            :key="b.label"
            :need-confirm="false"
            :type="b.type"
            :plain="b.plain"
            :round="b.round"
            :circle="b.circle"
            :icon="b.icon"
            :size="b.size"
            :disabled="b.disabled"
            @click="log('click', '④ 透传按钮：' + b.label)"
          >
            {{ b.circle ? "" : b.label }}
          </confirm-button>
        </div>
        <p class="cbd__help">
          上面这些按钮除了 <code>:need-confirm="false"</code> 没有多写一行配置，
          <code>type / size / plain / round / circle / icon / disabled</code>
          都是父级传进来、由 <code>$attrs</code> 落到 <code>el-button</code> 上的。
          以后 el-button 加新属性，本组件不用改。
        </p>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>坑 1 / 2</b>
        <span class="cbd__muted">loading 与事件</span>
      </div>
      <div class="cbd__pad">
        <ol class="cbd__notes">
          <li>
            <b>两处 loading 要取「或」</b>：内部 <code>actionLoading</code> 与外部
            <code>:loading</code> 任一为 true 就禁用。只认一个的话，
            action 转圈期间外部还能点 —— 这是漏得最狠的一处。
          </li>
          <li>
            <b>不能再 <code>v-on="$listeners"</code></b>：本组件自己会
            <code>$emit('click')</code>，把监听器再透给 el-button，
            <code>@click</code> 会触发两次。所以按白名单剔除本组件的事件，其余（鼠标移入等）才转发。
          </li>
          <li>
            <b>loading 时收不到 click</b>：<code>el-button</code> 的
            <code>loading</code> 会同时把 <code>disabled</code> 置真，
            disabled 的原生 button 不派发 click，所以「转圈期间连点无效」是白拿的。
          </li>
        </ol>
      </div>
    </el-card>

    <el-card shadow="never" class="cbd__card">
      <div slot="header" class="cbd__card-head">
        <b>坑 3 / 4</b>
        <span class="cbd__muted">关闭时机与样式</span>
      </div>
      <div class="cbd__pad">
        <ol class="cbd__notes" start="4">
          <li>
            <b><code>@close</code> 分不清是谁关的</b>：el-dialog 的 close 对
            ✕ / ESC / 点遮罩 / 父级把 visible 置 false 都会触发。
            组件内部用 <code>closeBy</code> 打标记，只在
            <code>'none'</code>（用户按 ✕ 或 ESC）时才 <code>emit('cancel')</code>，
            否则确认后还会多抛一次 cancel。
          </li>
          <li>
            <b>弹窗样式不继承父级 scoped</b>：<code>append-to-body</code> 后 DOM 在
            body 下，父页面的 scoped 样式与 CSS 变量都拿不到。
            组件自带一份 <code>.cb-dlg</code> 前缀的全局样式；
            <code>#content</code> 插槽里的节点属于父级作用域，仍然吃父页面样式。
          </li>
        </ol>
        <div class="cbd__hint">
          另外两个方法：<code>ref.open()</code> 直接弹确认框（跳过 before-confirm），
          <code>ref.close()</code> 关掉它 —— 富内容场景就是靠后者在成功后收尾。
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import logMixin from './logMixin'

export default {
  name: 'ConfirmButtonPitfallTab',
  mixins: [logMixin],

  data() {
    return {
      // 全部是 el-button 自己的属性，组件一个都没声明
      passthrough: [
        { label: 'primary', type: 'primary', size: 'small' },
        { label: 'success plain', type: 'success', plain: true, size: 'small' },
        { label: 'warning round', type: 'warning', round: true, size: 'small' },
        { label: 'danger', type: 'danger', size: 'small' },
        { label: 'info plain', type: 'info', plain: true, size: 'small' },
        { label: 'text', type: 'text', size: 'small' },
        { label: '带图标', type: 'primary', plain: true, size: 'small', icon: 'el-icon-upload2' },
        { label: 'mini', size: 'mini' },
        { label: 'disabled', type: 'primary', size: 'small', disabled: true },
        { label: '', type: 'primary', circle: true, size: 'small', icon: 'el-icon-plus' },
      ],
    }
  },
}
</script>
