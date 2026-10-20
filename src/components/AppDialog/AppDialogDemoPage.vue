<template>
  <div class="ad-demo">
    <div class="ad-demo__head">
      <div>
        <h2 class="ad-demo__title">
          AppDialog —— el-dialog 的轻封装（公共组件）
        </h2>
        <p class="ad-demo__desc">
          把「一个 visible 布尔 + 一份数据 + 一坨 @confirm /
          @cancel」收进组件内部：
          <b>v-model 声明式</b>、<b>ref.open(data) 命令式（返回 Promise）</b
          >两种打开方式都支持，
          <code>open()</code>
          传的数据通过作用域插槽下发，父组件不用为「弹窗里显示哪一条」再单独维护
          data。
        </p>
        <p class="ad-demo__desc ad-demo__desc--sub">
          示例按页签归类，每个 <code>el-tab-pane</code> 都带
          <code>lazy</code>：<strong>点开哪个才渲染哪个的 DOM</strong>，
          切回来时表单内容、列表状态、已喂进去的数据都还在。<br />
          左下的<strong>事件日志面板不随页签切换</strong>，任何页签下都能看到最新的
          open / confirm / cancel 记录。
        </p>
      </div>
      <div class="ad-demo__meta">
        <div><code>&lt;app-dialog&gt;</code></div>
        <div>源码 <code>src/components/AppDialog/</code></div>
        <div>基于 <code>el-dialog</code>(ElementUI 2.15)</div>
      </div>
    </div>

    <!-- 常驻状态条：不随页签切换，任何页签下都能看到实时状态 -->
    <div class="ad-demo__status">
      <span
        class="ad-demo__status-dot"
        :class="openCount ? 'is-on' : 'is-off'"
      ></span>
      <span
        >当前打开的弹窗 = <b>{{ openCount }}</b>
        <em>（{{ openNames || "无" }}）</em></span
      >
      <span
        >当前页签 = <b>{{ activeTab }}</b></span
      >
      <span
        >列表条数 = <b>{{ users.length }}</b></span
      >
      <span
        >日志 = <b>{{ logs.length }}</b></span
      >
      <span
        >闸门：锁死 <b>{{ lockDlg ? "开" : "关" }}</b> / 脏数据
        <b>{{ dirty ? "开" : "关" }}</b></span
      >
    </div>

    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="ad-demo__tabs"
      @tab-click="onTabClick"
    >
      <!-- ===================== ① 三种打开方式 ===================== -->
      <el-tab-pane label="① 打开方式" name="open" lazy>
        <div class="ad-demo__card-head">
          <b>父组件怎么打开：三种方式，挑顺手的用</b>
          <code>v-model / :visible.sync / ref.open()</code>
        </div>

        <div class="ad-demo__btns">
          <el-button size="small" type="primary" @click="d1.open = true">
            v-model 打开
          </el-button>
          <el-button size="small" @click="d2.open = true">
            :visible.sync 打开
          </el-button>
          <el-button size="small" type="success" @click="openByRef">
            ref.open(data) 打开
          </el-button>
        </div>

        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="ad-demo__alert"
        >
          <template slot="title">
            差别只在「谁管那个布尔」：v-model / .sync 是父组件管，ref.open()
            是组件自己管， 而且 <b>ref.open() 会返回 Promise</b>，await
            出来就能拿到用户点了确认还是取消。
          </template>
        </el-alert>

        <pre class="ad-demo__code">{{ CODE.open }}</pre>

        <!-- ①-a v-model -->
        <app-dialog
          v-model="d1.open"
          title="v-model 打开"
          width="420px"
          @confirm="log('① v-model 收到 confirm')"
        >
          <p class="ad-demo__p">
            显隐由父组件的 <code>d1.open</code> 决定。
            适合「一个页面就一个固定弹窗」——父组件里一眼能看出它开着还是关着。
          </p>
        </app-dialog>

        <!-- ①-b .sync -->
        <app-dialog
          :visible.sync="d2.open"
          title=":visible.sync 打开"
          width="420px"
          @confirm="log('① .sync 收到 confirm')"
        >
          <p class="ad-demo__p">
            <code>:visible.sync="d2.open"</code> 展开就是
            <code>:visible="d2.open" @update:visible="d2.open = $event"</code>，
            和 v-model 等价（组件内部用
            <code>model: { prop: 'visible' }</code> 把 v-model 指到了 visible
            上）。
          </p>
        </app-dialog>

        <!-- ①-c ref.open -->
        <app-dialog ref="cmd" title="ref.open(data) 打开" width="460px">
          <template #default="{ payload }">
            <p class="ad-demo__p">
              这次是<b>组件自己管显隐</b>，父组件只写一行
              <code>await this.$refs.cmd.open(row)</code>。<br />
              payload 通过作用域插槽拿到：<code>{{ payload }}</code>
            </p>
            <p class="ad-demo__p ad-demo__p--muted">
              看看左下角的事件日志 —— open() 的结果会在弹窗关闭后记上 type /
              source。
            </p>
          </template>
        </app-dialog>
      </el-tab-pane>

      <!-- ===================== ② 表单编辑 ===================== -->
      <el-tab-pane label="② 列表行编辑" name="edit" lazy>
        <div class="ad-demo__card-head">
          <b>最常用：列表行 → 编辑弹窗</b>
          <code>ref.open(row)</code> + <code>:close-on-confirm="false"</code> +
          <code>submit(form)</code>
        </div>

        <el-table
          ref="usersTable"
          :data="users"
          size="small"
          border
          class="ad-demo__table"
        >
          <el-table-column prop="name" label="姓名" width="110" />
          <el-table-column prop="dept" label="部门" width="120" />
          <el-table-column prop="no" label="工号" width="110" />
          <el-table-column label="状态" width="90">
            <template slot-scope="{ row }">
              <el-tag :type="row.online ? 'success' : 'info'" size="mini">
                {{ row.online ? "在线" : "离线" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220">
            <template slot-scope="{ row }">
              <el-button size="mini" type="text" @click="editRow(row)"
                >编辑</el-button
              >
              <el-button size="mini" type="text" @click="viewRow(row)"
                >只读查看</el-button
              >
              <el-button
                size="mini"
                type="text"
                class="ad-demo__danger"
                @click="removeRow(row)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>

        <p class="ad-demo__tip">
          「编辑 / 只读查看 / 删除」三个按钮全都只有一行 —— 差别只是
          <code>open(row)</code> 之后干嘛： 回填表单 / 直接展示 / await
          结果再删。<br />
          弹窗里的表单初始值靠 <code>payload</code> 回填（<code>@opened</code>
          时再 copy 到 form，避免直接改到列表数据）。
        </p>

        <pre class="ad-demo__code">{{ CODE.edit }}</pre>

        <!-- 编辑弹窗（同一份模板复用于「只读查看」，靠 readonly 切换） -->
        <app-dialog
          ref="editDlg"
          :title="edit.readonly ? '查看用户' : '编辑用户'"
          width="560px"
          :close-on-confirm="false"
          :body-max-height="320"
          :before-close="editBeforeClose"
          @opened="onEditOpened"
          @confirm="onEditConfirm"
          @cancel="onEditCancel"
        >
          <template #default="{ payload }">
            <el-form
              ref="editForm"
              :model="edit.form"
              :rules="editRules"
              size="small"
              label-width="72px"
            >
              <el-form-item label="姓名" prop="name">
                <el-input
                  v-model="edit.form.name"
                  :disabled="edit.readonly"
                  placeholder="请输入姓名"
                />
              </el-form-item>
              <el-form-item label="部门" prop="dept">
                <el-select
                  v-model="edit.form.dept"
                  :disabled="edit.readonly"
                  placeholder="请选择部门"
                >
                  <el-option
                    v-for="d in DEPTS"
                    :key="d"
                    :label="d"
                    :value="d"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="工号">
                <el-input :value="payload.no" disabled />
              </el-form-item>
              <el-form-item label="状态">
                <el-switch
                  v-model="edit.form.online"
                  :disabled="edit.readonly"
                  active-text="在线"
                />
              </el-form-item>
              <el-form-item label="备注" prop="remark">
                <el-input
                  v-model="edit.form.remark"
                  type="textarea"
                  :rows="3"
                  :disabled="edit.readonly"
                  placeholder="改点东西再点确定试试（取消时会提示有未保存修改）"
                />
              </el-form-item>
            </el-form>
          </template>
        </app-dialog>
      </el-tab-pane>

      <!-- ===================== ③ 详情子组件（v-model + 接口回填） ===================== -->
      <el-tab-pane label="③ 详情子组件" name="detail" lazy>
        <div class="ad-demo__card-head">
          <b>v-model 打开 + 子组件回填：接口返回的那个对象怎么传下去</b>
          <code>v-model</code> + <code>:detail="order.detail"</code> + <code>getForm()</code>
        </div>

        <p class="ad-demo__tip">
          v-model 模式下「谁管布尔」在父组件手里，所以「先开弹窗、再等接口」这件事也在父组件手里：
          <code>visible = true</code> → 子组件先挂载（此刻 <code>detail</code> 还是
          <code>null</code>）→ 接口 resolve 后父组件把<b>新的对象</b>赋给
          <code>detail</code> → 子组件 <code>watch(detail)</code> 触发回填。<br />
          <b>关键点</b>：子组件不能只在 <code>data() / created</code> 里读一次
          —— 那时接口还没回来，读到的是 <code>null</code>，数据到了也不会再回填；要
          <code>watch + immediate</code>。另外 <code>detail</code> 若始终是同一个对象、只改内部字段，
          非 deep 的 watch 不会触发 → 要么 <code>deep: true</code>，要么（更好）像这里一样<b>每次赋新对象</b>。
        </p>

        <div class="ad-demo__btns">
          <el-button size="small" type="primary" @click="openOrder(1001)">
            打开订单 A-1001（800ms 后返回）
          </el-button>
          <el-button size="small" @click="openOrder(1002)"> 换一条 A-1002（同一弹窗） </el-button>
          <el-button size="small" @click="openOrder(0)"> 模拟接口失败 </el-button>
          <el-switch v-model="order.awaitDetail" active-text="等接口回来才挂子组件（v-if 方案）" />
        </div>

        <p class="ad-demo__tip">
          两种方案对比：默认是 <b>先挂子组件、靠 watch 回填</b>（弹窗立刻出结构，加载态可控）；
          打开开关后变成 <b>v-if 等 detail 到了再挂</b>（子组件在
          <code>created</code> 里直接读一次就够，代价是接口期间弹窗里只能由父组件先占位）。
          两种都对，看你要哪种加载态。<br />
          子组件 <code>OrderDetailPanel.vue</code> 是 demo 专用的业务子组件，在本页<b>局部注册</b>
          （公共组件才进 <code>src/components/&lt;Xxx&gt;/index.js</code> 做全局注册）。
        </p>

        <pre class="ad-demo__code">{{ CODE.child }}</pre>

        <app-dialog
          ref="orderDlg"
          v-model="order.visible"
          :title="orderTitle"
          width="620px"
          :close-on-confirm="false"
          :body-max-height="420"
          @confirm="onOrderConfirm"
          @cancel="onOrderCancel"
        >
          <!-- v-if 方案下，接口期间子组件还没挂，得由父组件先占位 -->
          <p v-if="order.awaitDetail && !order.detail" class="ad-demo__p ad-demo__p--muted">
            {{
              order.loading
                ? "父组件：接口请求中…（v-if 方案，子组件还没挂载）"
                : "父组件：detail 为 null，子组件始终不挂载"
            }}
          </p>

          <order-detail-panel
            v-if="!order.awaitDetail || order.detail"
            ref="orderPanel"
            :detail="order.detail"
            :loading="order.loading"
            @fill="onPanelFill"
          />
        </app-dialog>

        <template v-if="order.lastSaved">
          <p class="ad-demo__tip">
            上一次点「确定」时从子组件 <code>getForm()</code> 读回的数据
            —— 父组件没有直接读 <code>detail</code>，读的是子组件里<b>编辑后</b>的副本：
          </p>
          <pre class="ad-demo__code">{{ savedText }}</pre>
        </template>
      </el-tab-pane>

      <!-- ===================== ④ 异步提交 ===================== -->
      <el-tab-pane label="④ 异步提交" name="async" lazy>
        <div class="ad-demo__card-head">
          <b>异步提交：@confirm 返回 Promise 就够</b>
          <code>async onConfirm() { await save(); return true }</code>
        </div>

        <p class="ad-demo__tip">
          提交函数写成 <code>async</code>，返回 <code>true</code> → 自动关；返回
          <code>false</code> → 留在弹窗里。 等待期间确认按钮<b>自动 loading</b
          >（<code>:auto-loading="false"</code> 可关掉，改用
          <code>setLoading()</code> 手动控制）。
        </p>

        <div class="ad-demo__btns">
          <el-button
            size="small"
            type="primary"
            @click="$refs.asyncDlg.open({ id: 9, name: '异步提交' })"
          >
            打开（模拟 1.2s 请求）
          </el-button>
          <el-button size="small" @click="$refs.manualDlg.open({})">
            手动 setLoading 版本
          </el-button>
        </div>

        <pre class="ad-demo__code">{{ CODE.async }}</pre>

        <!-- ③-a 自动 loading -->
        <app-dialog
          ref="asyncDlg"
          title="异步提交（自动 loading）"
          width="480px"
          :before-close="submittingGuard"
          @confirm="onAsyncConfirm"
        >
          <p class="ad-demo__p">
            点确定 → 模拟一次 1.2 秒的请求 → 自动关闭并返回结果。<br />
            如果先把「模拟失败」开关打开，请求会 resolve <code>false</code> →
            弹窗<b>不关</b>，让你留在里面改。
          </p>
          <el-switch v-model="asyncFail" active-text="模拟失败（不关弹窗）" />
        </app-dialog>

        <!-- ③-b 手动 loading + closeOnConfirm:false -->
        <app-dialog
          ref="manualDlg"
          title="手动 setLoading()"
          width="480px"
          :close-on-confirm="false"
          @confirm="onManualConfirm"
        >
          <template #default="{ loading }">
            <p class="ad-demo__p">
              这里把 <code>close-on-confirm</code> 关掉，自己控制节奏：<br />
              <code>setLoading(true)</code> → 请求 → 成功后
              <code>submit()</code> / 失败 <code>setLoading(false)</code>。
            </p>
            <p class="ad-demo__p ad-demo__p--muted">
              按钮当前 loading = <b>{{ loading }}</b>
            </p>
          </template>
        </app-dialog>
      </el-tab-pane>

      <!-- ===================== ⑤ 只要一个结果 ===================== -->
      <el-tab-pane label="⑤ await 结果" name="await" lazy>
        <div class="ad-demo__card-head">
          <b>只要一个「确定 / 取消」</b>
          <code>const res = await open(...)</code>
        </div>

        <p class="ad-demo__tip">
          不需要底部按钮之外的任何交互时，<b>不用监听事件</b>，<code
            >await</code
          >
          一行拿结果就行： <code>res.type</code> 是
          <code>'confirm' | 'cancel'</code>，
          <code>res.source</code> 告诉你是按钮点的、还是 X / 遮罩 / ESC 关的。
        </p>

        <div class="ad-demo__btns">
          <el-button size="small" type="danger" @click="askDelete"
            >删除一条数据（await 结果）</el-button
          >
        </div>

        <pre class="ad-demo__code">{{ CODE.awaitResult }}</pre>

        <app-dialog
          ref="confirmDlg"
          title="确认删除"
          width="420px"
          confirm-type="danger"
          confirm-text="删除"
        >
          <template #default="{ payload }">
            <p class="ad-demo__p">
              确定要删除
              <b>{{ payload && payload.name }}</b> 吗？删掉就找不回来了。
            </p>
          </template>
        </app-dialog>
      </el-tab-pane>

      <!-- ===================== ⑥ 关闭闸门 ===================== -->
      <el-tab-pane label="⑥ 关闭闸门" name="guard" lazy>
        <div class="ad-demo__card-head">
          <b>beforeClose —— 不管从哪儿关都要过它</b>
          <code>(action, done) =&gt; false | Promise | void</code>
        </div>

        <p class="ad-demo__tip">
          底部按钮、右上角 X、点遮罩、ESC —— 全部先过
          <code>beforeClose(action, done)</code>。 返回 <code>false</code>（或
          Promise resolve <code>false</code>）就不关；也可以像 ElementUI
          那样直接调 <code>done()</code> 放行。
        </p>

        <div class="ad-demo__btns">
          <el-button
            size="small"
            type="primary"
            @click="$refs.guardDlg.open({})"
          >
            打开（试试三种关闭方式）
          </el-button>
          <el-switch v-model="lockDlg" active-text="锁死不让关" />
          <el-switch v-model="dirty" active-text="标记为「有未保存修改」" />
        </div>

        <pre class="ad-demo__code">{{ CODE.beforeClose }}</pre>

        <app-dialog
          ref="guardDlg"
          title="beforeClose 演示"
          width="520px"
          :before-close="guardBeforeClose"
          @cancel="log('⑥ 收到 cancel（闸门放行后才发）')"
        >
          <p class="ad-demo__p">
            当前状态：锁死 = <b>{{ lockDlg }}</b
            >，脏数据 = <b>{{ dirty }}</b>
          </p>
          <el-alert type="warning" :closable="false" show-icon>
            <template slot="title">
              打开「锁死」后任何关闭方式都会被拦下（连 X 和 ESC
              都关不掉，只能由代码 close()）；
              打开「脏数据」后关的时候会弹一次二次确认。
            </template>
          </el-alert>
        </app-dialog>
      </el-tab-pane>

      <!-- ===================== ⑦ 插槽与滚动 ===================== -->
      <el-tab-pane label="⑦ 插槽" name="slot" lazy>
        <div class="ad-demo__card-head">
          <b>插槽：title / default / footer 全都能换</b>
          <code>#title</code> <code>#default</code> <code>#footer</code> +
          <code>body-max-height</code>
        </div>

        <p class="ad-demo__tip">
          三个插槽的作用域里都带 <code>payload</code>；default / footer
          还额外给了
          <code>loading / confirm / cancel / close</code
          >，自定义底部按钮时直接调，不用自己算状态。
        </p>

        <div class="ad-demo__btns">
          <el-button
            size="small"
            type="primary"
            @click="$refs.slotDlg.open({ title: '长内容', rows: 30 })"
          >
            打开（自定义头部 + 底部 + 内容区滚动）
          </el-button>
        </div>

        <pre class="ad-demo__code">{{ CODE.slot }}</pre>

        <app-dialog
          ref="slotDlg"
          width="620px"
          :show-footer="false"
          :body-max-height="280"
          custom-class="ad-demo__slot-dialog"
        >
          <template #title="{ payload, close }">
            <div class="ad-demo__custom-title">
              <i class="el-icon-document" />
              <span>{{ payload.title }}（{{ payload.rows }} 行）</span>
              <el-tag size="mini" type="success">自定义 title</el-tag>
              <a class="ad-demo__custom-title-close" @click="close">关掉</a>
            </div>
          </template>

          <template #footer="{ cancel, confirm, loading }">
            <div class="ad-demo__custom-footer">
              <span class="ad-demo__custom-footer-tip">
                这一行的按钮是父组件自己写的（<code>:show-footer="false"</code>），
                照样能拿到 <code>loading</code>。
              </span>
              <el-button size="small" @click="cancel">再想想</el-button>
              <el-button
                size="small"
                type="primary"
                :loading="loading"
                @click="confirm(payload)"
              >
                知道了
              </el-button>
            </div>
          </template>

          <p v-for="n in 30" :key="n" class="ad-demo__p ad-demo__p--muted">
            第 {{ n }} 行 —— 内容区超过
            <code>body-max-height="280"</code> 就自己滚动，
            弹窗不会长到屏幕外面去。
          </p>
        </app-dialog>
      </el-tab-pane>

      <!-- ===================== ⑧ 事件时序 ===================== -->
      <el-tab-pane label="⑧ 事件时序" name="event" lazy>
        <div class="ad-demo__card-head">
          <b>事件时序与来源</b>
          <code>@open → @opened → @confirm/@cancel → @close → @closed</code>
        </div>

        <p class="ad-demo__tip">
          <code>@open / @opened / @close / @closed</code> 是 el-dialog
          的原生事件（原样透传，行为不变）；
          <code>@confirm / @cancel</code> 是本组件加的语义事件。<br />
          左下的日志面板按顺序记录了每一次事件 —— 打开它点一遍就知道了。
        </p>

        <div class="ad-demo__btns">
          <el-button size="small" @click="$refs.eventDlg.open({})"
            >打开看时序</el-button
          >
          <el-button size="small" @click="d3.open = !d3.open"
            >父组件直接改 visible</el-button
          >
          <el-button size="small" plain @click="gotoTab('guard')">
            去看 ⑥ beforeClose 拦截 →
          </el-button>
        </div>

        <p class="ad-demo__tip">
          对照点：<b>父组件直接把 visible 改成 false 时不过 beforeClose</b
          >（父组件说了算）， 但挂起的 <code>open()</code> Promise 会被结算成
          <code>type: 'cancel'</code>，不会永远 pending。 想让 X /
          遮罩也不生效，用 <code>beforeClose</code> 或
          <code>:close-on-click-modal="false"</code>。
        </p>

        <app-dialog
          ref="eventDlg"
          title="事件时序"
          width="460px"
          @opened="log('⑧ opened（动画结束）')"
        >
          <p class="ad-demo__p">
            打开这一刻，日志里应该已经有 <code>open</code> 和
            <code>opened</code> 两条了。
          </p>
        </app-dialog>

        <app-dialog
          ref="ctrlDlg"
          v-model="d3.open"
          title="父组件直接改 visible"
          width="460px"
          @close="log('⑧ close（父组件改 visible 也会发）')"
        >
          <p class="ad-demo__p">
            点外面的按钮把 <code>d3.open</code> 改掉 → 这个弹窗跟着关（绕过了
            beforeClose）。
          </p>
        </app-dialog>
      </el-tab-pane>

      <!-- ===================== ⑨ 速查 ===================== -->
      <el-tab-pane label="⑨ 速查与约定" name="api" lazy>
        <div class="ad-demo__card-head">
          <b>速查与约定</b>
        </div>

        <el-table
          ref="apiTable"
          :data="API_ROWS"
          size="mini"
          border
          class="ad-demo__table"
        >
          <el-table-column prop="name" label="API" width="200" />
          <el-table-column prop="type" label="类型" width="120" />
          <el-table-column prop="desc" label="说明" />
        </el-table>

        <el-table
          ref="methodTable"
          :data="METHOD_ROWS"
          size="mini"
          border
          class="ad-demo__table ad-demo__api2"
        >
          <el-table-column prop="name" label="this.$refs.xxx" width="200" />
          <el-table-column prop="desc" label="说明" />
        </el-table>

        <p class="ad-demo__tip ad-demo__tip--block">
          <b>为什么不直接用 el-dialog？</b>
          直接用完全没问题，只是父组件要自己维护「布尔 + 数据 + 一堆事件」；
          封装之后同一份「点行 → 开弹窗 → 收结果」只要三行。<br />
          <b>和项目里已有的 $_dialog / $hDialog 有什么区别？</b>
          <code>$_dialog / $hDialog</code> 是运行时 <code>new Vue</code> 挂到
          body 的函数式弹窗，适合随手弹一个；
          <code>&lt;app-dialog&gt;</code>
          是模板里声明式的，父组件看得见结构、能写 scoped 样式，互补不冲突。<br />
          <b>注意</b>：<code>appendToBody</code> 默认 <b>true</b>（el-dialog
          原生默认 false）， 免得弹窗被父级的 <code>overflow: hidden</code> /
          <code>transform</code> 裁掉或压在下面。
        </p>
      </el-tab-pane>
    </el-tabs>

    <!-- 常驻事件日志（左下角，跟随页面，不随页签切换） -->
    <div class="ad-demo__log" :class="{ 'is-collapsed': logCollapsed }">
      <div class="ad-demo__log-head" @click="logCollapsed = !logCollapsed">
        <i class="el-icon-tickets" />
        <span>AppDialog 事件日志（{{ logs.length }}）</span>
        <a class="ad-demo__log-btn" @click.stop="logs = []">清空</a>
        <i :class="logCollapsed ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" />
      </div>
      <ul v-show="!logCollapsed" class="ad-demo__log-list">
        <li v-for="(l, i) in logs" :key="i">
          <span class="ad-demo__log-time">{{ l.time }}</span>
          <span>{{ l.text }}</span>
        </li>
        <li v-if="!logs.length" class="ad-demo__log-empty">
          点上面的按钮试试，这里会按顺序记录 open / opened / confirm / close /
          closed 和 open() 的返回值
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import OrderDetailPanel from "./OrderDetailPanel.vue";

const DEPTS = ["研发部", "产品部", "设计部", "测试部"];

/** 列表初始数据 */
const DEFAULT_USERS = [
  {
    id: 1,
    name: "张三",
    dept: "研发部",
    no: "A1001",
    online: true,
    remark: "",
  },
  {
    id: 2,
    name: "李四",
    dept: "产品部",
    no: "A1002",
    online: false,
    remark: "",
  },
  {
    id: 3,
    name: "王五",
    dept: "设计部",
    no: "A1003",
    online: true,
    remark: "",
  },
];

/** 模拟一次请求 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 模拟后端的订单详情表 */
const ORDER_DB = {
  1001: {
    orderNo: "A-1001",
    status: "待发货",
    createdAt: "2026-10-14 09:12:31",
    customer: "张三",
    phone: "13800000001",
    address: "广东省深圳市南山区科技园某某路 1 号 3 栋 501",
    remark: "",
    items: [
      { name: "机械键盘 87 键", price: 399, count: 1 },
      { name: "腕托（胡桃木）", price: 59, count: 2 },
    ],
  },
  1002: {
    orderNo: "A-1002",
    status: "已发货",
    createdAt: "2026-10-13 20:05:08",
    customer: "李四",
    phone: "13900000002",
    address: "浙江省杭州市余杭区某某街 88 号",
    remark: "工作日送公司前台",
    items: [
      { name: "27 寸显示器", price: 1499, count: 1 },
      { name: "DP 线 2m", price: 45, count: 1 },
      { name: "显示器支架", price: 269, count: 1 },
    ],
  },
};

/**
 * 模拟接口：800ms 后返回详情对象；id 不在表里就抛错（用来演示 detail 一直是 null 的空态）。
 * 注意返回的是「全新对象」——父组件每次都是换新对象，子组件的 watch(detail) 才会触发。
 */
function mockOrderDetail(id) {
  return sleep(800).then(() => {
    const d = ORDER_DB[id];
    if (!d) throw new Error("订单 " + id + " 不存在");
    return JSON.parse(JSON.stringify(d));
  });
}

export default {
  name: "AppDialogDemoPage",

  /**
   * 详情面板是「弹窗里的业务子组件」，只在 demo 页里用 → 局部注册即可。
   * （公共组件才放进 src/components/<Xxx>/index.js 做全局注册）
   */
  components: { OrderDetailPanel },

  data() {
    return {
      /** 当前选中的示例页签（el-tab-pane 带 lazy，只有点亮过的才会真正渲染） */
      activeTab: "open",

      DEPTS,
      users: DEFAULT_USERS.map((u) => Object.assign({}, u)),

      // ① 三种打开方式
      d1: { open: false },
      d2: { open: false },

      // ③ 详情子组件（v-model + 接口回填）
      order: {
        visible: false,
        loading: false,
        /** true → 等 detail 到了才挂子组件（v-if 方案）；false → 先挂、靠 watch 回填 */
        awaitDetail: false,
        detail: null,
        id: null,
        lastSaved: null,
        /** 请求序号：关掉弹窗 / 又开了另一条时，让挂起的请求结果作废 */
        seq: 0,
      },
      asyncFail: false,

      // ⑤ 闸门
      lockDlg: false,
      dirty: false,

      // ⑦ 事件
      d3: { open: false },

      // 编辑弹窗
      edit: {
        readonly: false,
        form: { name: "", dept: "", online: false, remark: "" },
        snapshot: "",
      },
      editRules: {
        name: [{ required: true, message: "姓名必填", trigger: "blur" }],
        dept: [{ required: true, message: "请选择部门", trigger: "change" }],
      },

      // 日志
      logs: [],
      logCollapsed: false,

      CODE: {
        open: `<!-- 1) v-model：父组件管布尔 -->
<app-dialog v-model="show" title="标题">...</app-dialog>

<!-- 2) :visible.sync：等价写法 -->
<app-dialog :visible.sync="show" title="标题">...</app-dialog>

<!-- 3) ref.open(data)：组件自己管，还能 await 结果 -->
<app-dialog ref="cmd" title="标题">
  <template #default="{ payload }">
    父组件传进来的数据：{{ payload }}
  </template>
</app-dialog>

async openByRef() {
  // 不用先 this.show = true，也不用再维持一份数据
  const res = await this.$refs.cmd.open({ id: 7, name: '张三' })
  // res = { type: 'confirm' | 'cancel', data, payload, source }
}`,

        child: `<!-- 父组件：v-model 管布尔，详情对象用 prop 传下去 -->
<app-dialog
  ref="orderDlg"
  v-model="order.visible"
  :title="orderTitle"
  :close-on-confirm="false"
  @confirm="onOrderConfirm"
>
  <order-detail-panel ref="orderPanel" :detail="order.detail" :loading="order.loading" />
</app-dialog>

// 打开：先开弹窗，再等接口；接口回来后赋一个「新对象」
async openOrder(id) {
  const o = this.order
  o.detail = null          // 先清掉上一条，避免弹窗里闪一下旧数据
  o.visible = true         // v-model：父组件自己开
  o.loading = true
  const token = ++o.seq    // 关掉 / 换一条时，让挂起的请求作废
  try {
    const detail = await api.getOrderDetail(id)
    if (token === o.seq) o.detail = detail    // ← 新对象，子组件的 watch 才会触发
  } finally {
    if (token === o.seq) o.loading = false
  }
}

// 确定：从子组件把编辑结果读回来（closeOnConfirm: false → 自己 submit）
onOrderConfirm() {
  const form = this.$refs.orderPanel.getForm()
  this.$refs.orderDlg.submit(form)   // 关闭并结算 open() 的 Promise
}

/* ---------- 子组件 OrderDetailPanel：回填写在 watch 里，不是 created ---------- */
export default {
  name: 'OrderDetailPanel',
  props: {
    detail: { type: Object, default: null },   // 接口返回的对象，null 表示还没回来
  },
  data() {
    return { form: {}, filled: 0 }
  },
  watch: {
    // immediate：挂载时若已有数据也回填；之后父组件每次「换新对象」都会再触发
    detail: { immediate: true, handler(v) { this.fill(v) } },
  },
  methods: {
    fill(d) {
      if (!d) { this.form = {}; return }
      // 深拷贝一份到自己身上，绝不直接改 props.detail
      this.form = { ...d, items: (d.items || []).map(i => ({ ...i })) }
      this.filled++
    },
    getForm() { return this.form },   // 父组件 ref 里取回编辑结果
  },
}`,

        edit: `<app-dialog
  ref="editDlg"
  :title="readonly ? '查看' : '编辑'"
  :close-on-confirm="false"   <!-- 校验没过就不该关 -->
  :body-max-height="320"      <!-- 内容区超出滚动 -->
  @opened="onEditOpened"      <!-- payload 回填表单 -->
  @confirm="onEditConfirm"
>
  <template #default="{ payload }">
    <el-form ref="form" :model="form" :rules="rules">...</el-form>
  </template>
</app-dialog>

// 一行打开
editRow(row) { this.$refs.editDlg.open(row) }

@opened() { Object.assign(this.form, this.$refs.editDlg.payload) }

async onEditConfirm() {
  const ok = await this.$refs.form.validate().catch(() => false)
  if (!ok) return false              // 返回 false → 弹窗不关
  await api.save(this.form)
  return this.$refs.editDlg.submit(this.form)   // 以「确认」结束（会结算 open 的 Promise）
}`,

        async: `<!-- 提交函数写 async 就行 -->
<app-dialog ref="dlg" @confirm="onConfirm">...</app-dialog>

async onConfirm() {
  const ok = await api.save()   // 期间确认按钮自动 loading
  return ok                     // true → 关闭并 settle 成 confirm；false → 留在弹窗里
}

// 想自己控制节奏：
//  :close-on-confirm="false" + :auto-loading="false"
async onConfirm() {
  this.$refs.dlg.setLoading(true)
  const ok = await api.save()
  this.$refs.dlg.setLoading(false)
  ok ? this.$refs.dlg.submit() : this.$message.error('保存失败')
}`,

        awaitResult: `askDelete() {
  const res = await this.$refs.confirmDlg.open({ id: row.id, name: row.name })
  // 不用监听任何事件，一行拿结果
  if (res.type === 'confirm') {
    this.users = this.users.filter(u => u.id !== res.data.id)
  }
  // res.source: 'footer'（点按钮）| 'close'（X / 遮罩 / ESC）| 'api'（代码关的）
}`,

        beforeClose: `<app-dialog :before-close="onBeforeClose">...</app-dialog>

// 返回 false 拦住；返回 Promise 就等它；也可以 ElementUI 那样调 done()
onBeforeClose(action, done) {
  if (this.locked) return false                       // 锁死，任何方式都关不掉
  if (!this.dirty) return true                        // 没改过，随便关
  return this.$confirm('有未保存的修改，确定关闭吗？')   // Promise<boolean>
    .then(() => true, () => false)
}`,

        slot: `<app-dialog :show-footer="false" :body-max-height="280" width="620px">
  <template #title="{ payload, close }">
    <b>{{ payload.title }}</b> <a @click="close">关掉</a>
  </template>

  <template #footer="{ cancel, confirm, loading }">
    <el-button @click="cancel">再想想</el-button>
    <el-button type="primary" :loading="loading" @click="confirm()">知道了</el-button>
  </template>
</app-dialog>`,
      },
    };
  },

  computed: {
    /** 页面里现在开着几个弹窗（弹窗 append-to-body，页签切换不影响它，所以状态条单独看一眼） */
    openCount() {
      return [this.d1.open, this.d2.open, this.d3.open, this.order.visible].filter(Boolean).length;
    },
    openNames() {
      const names = [];
      if (this.d1.open) names.push("① v-model");
      if (this.d2.open) names.push("① .sync");
      if (this.d3.open) names.push("⑧ 改 visible");
      if (this.order.visible) names.push("③ v-model");
      return names.join(" / ");
    },

    /** ③ 弹窗标题：跟着当前订单走 */
    orderTitle() {
      const no = this.order.detail ? this.order.detail.orderNo : "";
      return "订单详情" + (no ? " · " + no : this.order.id ? " · #" + this.order.id : "");
    },

    /** ③ 上一次「确定」回传的数据，展示给页面看 */
    savedText() {
      try {
        return JSON.stringify(this.order.lastSaved, null, 2);
      } catch (e) {
        return String(this.order.lastSaved);
      }
    },

    API_ROWS() {
      return [
        {
          name: "visible",
          type: "Boolean",
          desc: "显隐。支持 v-model / :visible.sync；也可以用 ref.open() 由组件自己管",
        },
        {
          name: "title / width / top",
          type: "String",
          desc: "透传 el-dialog（width 默认 520px，top 不传走 el-dialog 默认 15vh）",
        },
        {
          name: "fullscreen / center / modal",
          type: "Boolean",
          desc: "透传 el-dialog",
        },
        {
          name: "append-to-body",
          type: "Boolean",
          desc: "默认 true（原生默认 false）。挂到 body 下，不会被父级 overflow / transform 裁掉",
        },
        {
          name: "close-on-click-modal / close-on-press-escape / show-close",
          type: "Boolean",
          desc: "透传 el-dialog，默认都 true",
        },
        {
          name: "destroy-on-close",
          type: "Boolean",
          desc: "透传 el-dialog：关掉就销毁内容，下次开重新渲染",
        },
        {
          name: "show-footer / show-cancel",
          type: "Boolean",
          desc: "要不要底部 / 要不要取消按钮（默认 true / true）",
        },
        {
          name: "confirm-text / cancel-text / confirm-type",
          type: "String",
          desc: "默认按钮文案与类型（confirm-type 可设 danger）",
        },
        {
          name: "close-on-confirm",
          type: "Boolean",
          desc: "默认 true。关掉后自己 submit()/close()，适合需要校验/异步的弹窗",
        },
        {
          name: "loading / auto-loading",
          type: "Boolean",
          desc: "loading 手动控制；auto-loading 让 @confirm 返回 Promise 时自动 loading（默认 true）",
        },
        {
          name: "body-max-height / body-style",
          type: "String|Number / Object",
          desc: "内容区最大高度（超出滚动）与附加样式",
        },
        {
          name: "reset-on-close",
          type: "Boolean",
          desc: "默认 true：关闭后清掉 payload / loading",
        },
        {
          name: "before-close",
          type: "Function",
          desc: "(action, done) => false | Promise | void，底部按钮 / X / 遮罩 / ESC 全走它",
        },
      ];
    },
    METHOD_ROWS() {
      return [
        {
          name: "open(payload)",
          desc: "打开，返回 Promise<{ type, data, payload, source }>；已打开时只更新 payload",
        },
        {
          name: "submit(data)",
          desc: "以「确认」结果结束（不发 confirm 事件）；closeOnConfirm:false 时用",
        },
        { name: "close(data)", desc: "直接关闭，结果按「取消」结算" },
        {
          name: "cancel() / confirm(data)",
          desc: "等价于点底部的取消 / 确定（会调 @cancel / @confirm，返回值可拦住关闭）",
        },
        {
          name: "setLoading(v) / setVisible(v)",
          desc: "手动 loading / 只切显隐",
        },
        { name: "toggle(payload)", desc: "开着就关、关着就开" },
      ];
    },
  },

  mounted() {
    // demo 方便：探针 / 命令栏里可以直接 window.__page
    window.__page = this;
  },

  beforeDestroy() {
    if (window.__page === this) window.__page = null;
  },

  methods: {
    /** 记一条事件日志（页面左下角面板） */
    log(text) {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      this.logs.unshift({
        time: p(d.getMinutes()) + ":" + p(d.getSeconds()),
        text,
      });
      if (this.logs.length > 40) this.logs.pop();
    },

    /** 切到指定页签（页签之间互相跳） */
    gotoTab(name) {
      this.activeTab = name;
      this.$nextTick(this.layoutTables);
    },

    /**
     * 页签切换：lazy 的 pane 是「首次点亮才挂载」，而 el-table 的列宽是在 mounted 时
     * 按容器宽度算的 —— 容器刚插入时若还没参与布局，算出来的宽度可能是 0。
     * 这里等一帧再让表格重算一次，切页签后列宽不会塌。
     */
    onTabClick() {
      this.$nextTick(this.layoutTables);
    },

    layoutTables() {
      ["usersTable", "apiTable", "methodTable"].forEach((name) => {
        const table = this.$refs[name];
        if (table && typeof table.doLayout === "function") table.doLayout();
      });
    },

    /* ---------------- ① 命令式打开 ---------------- */
    async openByRef() {
      this.log("open() 传参：{ id: 7, name: '张三' }");
      const res = await this.$refs.cmd.open({ id: 7, name: "张三" });
      this.log(
        "open() 结果 → type=" +
          res.type +
          " source=" +
          res.source +
          " data=" +
          JSON.stringify(res.data)
      );
    },

    /* ---------------- ② 编辑 / 查看 / 删除 ---------------- */
    editRow(row) {
      this.edit.readonly = false;
      this.log("② 编辑：「" + row.name + "」→ open(row)");
      this.$refs.editDlg.open(row);
    },

    viewRow(row) {
      this.edit.readonly = true;
      this.log("② 只读查看：「" + row.name + "」→ open(row)");
      this.$refs.editDlg.open(row);
    },

    /** payload 回填：不在 data 里直接引用 row，免得改一半就脏了列表 */
    onEditOpened() {
      const payload = this.$refs.editDlg.payload || {};
      this.edit.form = {
        name: payload.name,
        dept: payload.dept,
        online: !!payload.online,
        remark: payload.remark || "",
      };
      this.edit.snapshot = JSON.stringify(this.edit.form);
      this.log("② opened → 用 payload 回填表单");
    },

    async onEditConfirm() {
      if (this.edit.readonly) {
        // 只读模式：直接以「确认」结束
        this.$refs.editDlg.submit(this.$refs.editDlg.payload);
        return;
      }
      const ok = await this.$refs.editForm.validate().catch(() => false);
      if (!ok) {
        this.log("② 校验没过 → 返回 false，弹窗不关");
        return false;
      }
      const form = Object.assign({}, this.edit.form);
      const id = (this.$refs.editDlg.payload || {}).id;
      const idx = this.users.findIndex((u) => u.id === id);
      if (idx > -1)
        this.users.splice(idx, 1, Object.assign({}, this.users[idx], form));
      // 保存成功后要把快照同步过去，否则 beforeClose 的脏检查会把「刚刚保存的内容」当成未保存修改
      this.edit.snapshot = JSON.stringify(form);
      this.log("② 保存成功 → submit(" + JSON.stringify(form) + ")");
      this.$refs.editDlg.submit(form);
    },

    onEditCancel() {
      this.log("② cancel → 弹窗关闭（脏检查见 beforeClose）");
    },

    /** 关之前有未保存修改就确认一下 */
    editBeforeClose() {
      if (this.edit.readonly) return true;
      const now = JSON.stringify(this.edit.form);
      if (now === this.edit.snapshot) return true;
      return this.$confirm("有未保存的修改，确定关闭吗？", "提示", {
        type: "warning",
      }).then(
        () => {
          this.log("② 脏数据确认关闭");
          return true;
        },
        () => {
          this.log("② 脏数据 → 选择继续编辑");
          return false;
        }
      );
    },

    async removeRow(row) {
      const res = await this.$refs.confirmDlg.open({
        id: row.id,
        name: row.name,
      });
      this.log("⑤ 删除结果 → type=" + res.type + " source=" + res.source);
      if (res.type !== "confirm") return;
      this.users = this.users.filter((u) => u.id !== res.data.id);
      this.$message.success("已删除「" + row.name + "」");
    },

    /* ---------------- ③ v-model + 子组件回填 ---------------- */
    /**
     * 打开订单详情。注意顺序：**先开弹窗、再等接口** ——
     * 子组件会先挂载（detail 还是 null），接口回来后父组件换一个「新对象」赋给 detail，
     * 子组件的 watch(detail) 触发回填。这就是「弹窗里放子组件」最常见的时序。
     */
    async openOrder(id) {
      const o = this.order;
      o.id = id;
      o.detail = null; // ★ 先清空：避免弹窗里闪一下上一条订单的旧数据
      o.lastSaved = null;
      o.visible = true; // ★ v-model：父组件自己管布尔，没有 open(data) 那套
      o.loading = true;
      const token = ++o.seq; // 关掉 / 再开另一条时，让这次请求的结果作废
      this.log("③ v-model 打开弹窗，此刻 detail = null");
      try {
        const detail = await mockOrderDetail(id);
        if (token !== o.seq) return; // 已经作废（被关闭或被后一次打开覆盖）
        o.detail = detail; // ★ 新对象 → 子组件 watch 触发回填
        this.log("③ 接口返回 → detail 换成新对象（子组件 watch 触发回填）");
      } catch (e) {
        if (token !== o.seq) return;
        this.log("③ 接口失败 → " + e.message + "，detail 保持 null");
        this.$message.error("加载订单失败：" + e.message);
      } finally {
        if (token === o.seq) o.loading = false;
      }
    },

    /** 子组件每次回填完都会 emit，用来在日志里看见时序 */
    onPanelFill(detail) {
      this.log("③ 子组件已回填（" + (detail ? detail.orderNo : "空态") + "）");
    },

    /** 关闭（X / 遮罩 / ESC / 取消 / 父组件改布尔都会走这里）：把挂起的请求作废掉 */
    onOrderCancel() {
      this.order.seq++;
      this.order.loading = false;
      this.log("③ 收到 cancel / close（挂起的请求已作废，不会再把旧结果写进来）");
    },

    /**
     * 确定：closeOnConfirm:false，所以自己 submit()。
     * 数据从子组件 getForm() 拿 —— 父组件并没有直接读 detail，读的是子组件里编辑后的副本。
     */
    onOrderConfirm() {
      if (this.order.loading) {
        this.$message.warning("接口还没回来，先等等");
        return false;
      }
      const panel = this.$refs.orderPanel;
      const form = panel && panel.getForm ? panel.getForm() : null;
      this.order.lastSaved = form;
      this.log("③ 确定 → 从子组件 getForm() 读回：客户=" + (form ? form.customer : "—"));
      this.$refs.orderDlg.submit(form);
    },

    /* ---------------- ④ 异步 ---------------- */
    /** 提交中不让关（返回 false 即可） */
    submittingGuard() {
      return this.$refs.asyncDlg.confirmLoading ? false : true;
    },

    async onAsyncConfirm() {
      this.log("④ 开始提交（按钮自动 loading）");
      await sleep(1200);
      if (this.asyncFail) {
        this.log("④ 提交失败 → 返回 false，弹窗不关");
        this.$message.error("保存失败，请重试");
        return false;
      }
      this.log("④ 提交成功 → 返回 true，自动关闭");
      this.$message.success("保存成功");
      return true;
    },

    async onManualConfirm() {
      const dlg = this.$refs.manualDlg;
      dlg.setLoading(true);
      this.log("④ setLoading(true)（closeOnConfirm: false，不会自动关）");
      await sleep(900);
      dlg.setLoading(false);
      this.log("④ 请求完成 → submit()");
      dlg.submit({ saved: true });
    },

    /* ---------------- ⑤ 只要结果 ---------------- */
    async askDelete() {
      const row = this.users[0];
      if (!row) return this.$message.info("列表空了，先刷新页面吧");
      this.log("⑤ open(" + row.name + ") 并 await 结果");
      const res = await this.$refs.confirmDlg.open({
        id: row.id,
        name: row.name,
      });
      this.log("⑤ 结果 → type=" + res.type + " source=" + res.source);
      if (res.type === "confirm") {
        this.users = this.users.filter((u) => u.id !== row.id);
        this.$message.success("已删除「" + row.name + "」");
      }
    },

    /* ---------------- ⑥ 闸门 ---------------- */
    guardBeforeClose(action) {
      if (this.lockDlg) {
        this.log("⑥ beforeClose(" + action + ") → 锁死，返回 false");
        this.$message.warning("锁死了，关不掉");
        return false;
      }
      if (!this.dirty) {
        this.log("⑥ beforeClose(" + action + ") → 放行");
        return true;
      }
      this.log("⑥ beforeClose(" + action + ") → 有脏数据，弹二次确认");
      return this.$confirm("确定放弃修改并关闭吗？", "提示", {
        type: "warning",
      }).then(
        () => true,
        () => false
      );
    },
  },
};
</script>

<style lang="scss" scoped>
.ad-demo {
  padding: 16px;
  background: #f7fafd;
  min-height: 100%;
  // 给左下角日志面板留位置
  padding-bottom: 72px;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  &__title {
    margin: 0 0 6px;
    font-size: 20px;
    color: #333;
  }

  &__desc {
    margin: 0;
    max-width: 760px;
    font-size: 13px;
    line-height: 20px;
    color: #666;

    b {
      color: #326fff;
    }

    &--sub {
      margin-top: 6px;
      color: #909399;

      code {
        padding: 0 4px;
        color: #326fff;
        background: #eef4ff;
        border-radius: 2px;
      }
    }
  }

  &__meta {
    flex: none;
    font-size: 12px;
    line-height: 20px;
    color: #909399;
    text-align: right;

    code {
      padding: 0 4px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 2px;
    }
  }

  /* 常驻状态条：跨页签可见 */
  &__status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 18px;
    margin: 0 0 14px;
    padding: 10px 14px;
    font-size: 13px;
    color: #606266;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 4px;

    b {
      font-weight: 600;
      color: #326fff;
    }

    em {
      margin-left: 4px;
      font-size: 12px;
      font-style: normal;
      color: #909399;
    }
  }

  &__status-dot {
    width: 8px;
    height: 8px;
    background: #c0c4cc;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(192, 196, 204, 0.2);

    &.is-on {
      background: #52c41a;
      box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.15);
    }
  }

  /* 示例页签 */
  &__tabs {
    ::v-deep .el-tabs__content {
      min-height: 340px;
      padding: 18px 20px;
    }

    ::v-deep .el-tab-pane {
      font-size: 13px;
    }
  }

  &__card-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;

    b {
      color: #333;
    }

    code {
      padding: 1px 6px;
      font-size: 12px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }
  }

  &__btns {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;

    ::v-deep .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__p {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 22px;
    color: #333;

    code {
      padding: 1px 5px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }

    &--muted {
      color: #909399;
    }
  }

  &__tip {
    margin: 12px 0 0;
    padding-left: 10px;
    font-size: 12px;
    line-height: 20px;
    color: #909399;
    border-left: 3px solid #d9e6ff;

    code {
      padding: 1px 5px;
      color: #326fff;
      background: #eef4ff;
      border-radius: 3px;
    }

    b {
      color: #606266;
    }

    &--block {
      margin-top: 12px;
      padding: 10px 12px;
      border-left-width: 3px;
      background: #fbfcff;
    }
  }

  &__code {
    margin: 12px 0 0;
    padding: 12px 14px;
    overflow-x: auto;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 19px;
    color: #4a5568;
    white-space: pre;
    background: #f5f7fa;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }

  &__table {
    font-size: 13px;

    ::v-deep .cell {
      font-size: 13px;
      line-height: 1.7;
      word-break: break-all;
    }
  }

  &__danger {
    color: #f56c6c;
  }

  &__api2 {
    margin-top: 12px;
  }

  &__custom-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  &__custom-title-close {
    margin-left: auto;
    font-size: 12px;
    font-weight: 400;
    color: #909399;
    cursor: pointer;

    &:hover {
      color: #326fff;
    }
  }

  &__custom-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  &__custom-footer-tip {
    margin-right: auto;
    font-size: 12px;
    color: #909399;

    code {
      color: #326fff;
    }
  }

  /* 左下角常驻事件日志：演示几种打开方式的差异时不用来回滚 */
  &__log {
    position: fixed;
    left: 16px;
    bottom: 16px;
    z-index: 2000;
    width: 320px;
    font-size: 12px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);

    &.is-collapsed {
      width: 200px;
    }
  }

  &__log-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color: #326fff;
    cursor: pointer;
    background: #f5f8ff;
    border-radius: 6px 6px 0 0;

    span {
      font-weight: 600;
    }
  }

  &__log-btn {
    margin-left: auto;
    color: #909399;

    &:hover {
      color: #f56c6c;
    }
  }

  &__log-list {
    max-height: 180px;
    margin: 0;
    padding: 6px 0;
    overflow-y: auto;
    list-style: none;

    li {
      display: flex;
      gap: 6px;
      padding: 3px 10px;
      line-height: 17px;
      color: #606266;
    }
  }

  &__log-time {
    flex: none;
    color: #c0c4cc;
    font-variant-numeric: tabular-nums;
  }

  &__log-empty {
    color: #c0c4cc !important;
    line-height: 18px !important;
  }
}
</style>
