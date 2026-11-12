<template>
  <div class="vet vet--confirm">
    <p class="vet__tip">
      行内编辑最难的不是「怎么变输入框」，而是<b>编辑中的值存在哪里</b>。
      这里用组件变量 <code>draft</code> 承接输入，<code>row.remark</code>
      在接口返回成功之前一直是旧值 —— 所以「取消」什么都不用做，丢草稿就行；
      确认则先校验、再调接口，<b>接口成功才写回表格</b>。
      编辑态下 <b>✓ ✗</b> 悬浮在输入框右侧（输入框吃满整格，只留出 padding-right），
      回车 = 确认，Esc = 取消。
    </p>

    <p class="vet__tip vet__tip--evt">
      事件同样分三个：进入编辑 <code>@edit-actived</code>、退出 <code>@edit-closed</code>、
      被 <code>activeMethod</code> 挡下 <code>@edit-disabled</code>（这组名字 3.5.6 起就没改过，
      和 <code>setActiveCell</code> 那批方法名不是一回事）。<b>被挡下的那次不发
      <code>edit-actived</code></b>，所以只监听 actived 会漏掉它 —— 保存中点别的格子，
      下面日志里能看到「编辑被拦下」。
    </p>

    <p class="vet__tip vet__tip--api">
      这套代码在 <b>vxe-table 3.5.6 / 3.6.x</b> 上都能跑：<code>setEditCell</code> /
      <code>clearEdit</code> 是 <b>3.5.7</b> 才改的名，3.5.6 里叫
      <code>setActiveCell</code> / <code>clearActived</code>；<code>beforeEditMethod</code>
      同理（3.5.6 叫 <code>activeMethod</code>，3.6.x 两套都认）。下面按<b>方法是否存在</b>挑，
      不去判断版本号 —— 表格下方的「当前编辑」面板会显示当前实际走的是哪套。
    </p>

    <div class="vet__bar">
      <el-switch v-model="failNext" active-text="让接口报错" />
      <span class="vet__bar-tip">
        打开这个开关，下一次点「确认」会拿到 504，用来验证<b>失败时不写值、也保持编辑态</b>
      </span>
    </div>

    <vxe-table
      ref="table"
      :data="rows"
      :edit-config="editConfig"
      border
      show-overflow
      max-height="320"
      @edit-actived="onActived"
      @edit-closed="onClosed"
      @edit-disabled="onDisabled"
    >
      <vxe-column type="seq" width="56" title="#" />
      <vxe-column field="name" title="姓名" width="100" />
      <vxe-column field="dept" title="部门" width="100">
        <template #default="{ row }">{{ deptLabel(row.dept) }}</template>
      </vxe-column>

      <!--
        可编辑列：edit-render 只给一个空对象（不需要内置控件），
        编辑态完全由 #edit 插槽接管。
      -->
      <vxe-column
        field="remark"
        title="备注（点格子进入编辑）"
        min-width="260"
        :edit-render="{}"
      >
        <template #default="{ row }">
          <span v-if="row.remark">{{ row.remark }}</span>
          <span v-else class="vet__ph">（空，点一下填写）</span>
        </template>

        <!--
          编辑态：✓ ✗ 悬浮在输入框右侧（absolute），不再占一行位置。
          两个前提：
            1. 外层 .vet-inline 必须 position: relative，且宽高跟着输入框走；
            2. 必须给 .el-input__inner 留出 padding-right，否则长文本会从按钮
               底下透出来（白底上叠浅色字，看着像重影）。
          按钮在正在编辑的 td 内部，vxe 的 mousedown 判定算「没离开」，
          所以不需要 vxe-table--ignore-clear。
        -->
        <template #edit="{ row }">
          <div class="vet-inline">
            <el-input
              ref="editInput"
              v-model="draft"
              size="mini"
              maxlength="24"
              :disabled="saving"
              placeholder="最多 24 个字"
              @keyup.enter.native="confirm"
              @keyup.esc.native="cancel"
            />
            <span class="vet-inline__acts">
              <el-button
                class="vet-inline__ico vet-inline__ico--ok"
                type="text"
                icon="el-icon-check"
                title="确认（Enter）"
                :loading="saving"
                @click.stop="confirm"
              />
              <el-button
                class="vet-inline__ico vet-inline__ico--no"
                type="text"
                icon="el-icon-close"
                title="取消（Esc）"
                :disabled="saving"
                @click.stop="cancel"
              />
            </span>
          </div>
        </template>
      </vxe-column>

      <!-- 这个字段库里没有，接口返回后要 $set 才会响应式更新 -->
      <vxe-column field="updatedAt" title="最后保存" width="170">
        <template #default="{ row }">
          <span :class="{ 'vet__ph': !row.updatedAt }">
            {{ row.updatedAt || "—" }}
          </span>
        </template>
      </vxe-column>

      <!-- 只保留「进入编辑」入口；确认/取消已经在格子里了 -->
      <vxe-column title="操作" width="96" align="center">
        <template #default="{ row }">
          <span v-if="isEditing(row)" class="vet__ph">编辑中…</span>
          <el-button v-else type="text" size="mini" @click.stop="edit(row)">
            编辑
          </el-button>
        </template>
      </vxe-column>
    </vxe-table>

    <div class="vet__panel">
      <div class="vet__grid">
        <div>
          <p class="vet__pane-hd">当前编辑</p>
          <dl class="vet__kv">
            <dt>行</dt>
            <dd>{{ editing ? editing.name : "未在编辑" }}</dd>
            <dt>原值</dt>
            <dd>{{ editing ? editing.origin || "（空）" : "—" }}</dd>
            <dt>草稿</dt>
            <dd>{{ editing ? draft || "（空）" : "—" }}</dd>
            <dt>状态</dt>
            <dd :class="stateClass">{{ stateText }}</dd>
            <dt>接口</dt>
            <dd class="vet__api">{{ apiMode }}</dd>
          </dl>
        </div>

        <div>
          <p class="vet__pane-hd">
            最近一次接口调用
            <span v-if="lastApi" :class="lastApi.ok ? 'vet__ok' : 'vet__err'">
              {{ lastApi.ok ? "成功" : "失败" }} · {{ lastApi.cost }}ms
            </span>
          </p>
          <pre class="vet__json">{{ apiText }}</pre>
        </div>
      </div>

      <ul class="vet__log">
        <li v-for="(item, i) in logs" :key="i">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { createStaff, deptLabel, saveRemark } from "../mock";
import logMixin from "./logMixin";

export default {
  name: "InlineConfirmTab",
  mixins: [logMixin],

  data() {
    return {
      rows: createStaff(),
      /** 编辑中的草稿：不写 row，取消才可能「什么都没发生」 */
      draft: "",
      /** null | { id, name, origin } —— 同一时刻只编辑一行 */
      editing: null,
      /** 接口请求中：锁输入框、锁确认按钮、也不许切格子 */
      saving: false,
      /** 打开后下一次保存必定失败，用来演示失败分支 */
      failNext: false,
      /** 最近一次接口往返，面板里原样展示 */
      lastApi: null,
      /** 运行期探测出来的方法名：3.5.6 和 3.5.7+ 不一样，写进面板省得猜 */
      apiMode: "探测中…",

      editConfig: {
        trigger: "click",
        mode: "cell",
        showIcon: false,
        // 请求期间禁止切到别的格子，否则 await 回来后状态就错位了。
        // 用 activeMethod 而不是 beforeEditMethod：3.6.17 里是
        // `editOpts.beforeEditMethod || editOpts.activeMethod`（lib/edit/src/mixin.js），
        // 两套都认；而 3.5.6 只认 activeMethod。这个写法跨版本且不会触发弃用警告。
        activeMethod: () => !this.saving
      }
    };
  },

  mounted() {
    if (!this.$refs.table) {
      this.apiMode = "未探测到表格实例";
      return;
    }
    this.apiMode = this.tableMethod("setEditCell", "setActiveCell")
      ? "3.5.7+ · setEditCell / clearEdit"
      : "3.5.6 · setActiveCell / clearActived";
  },

  computed: {
    stateText() {
      if (!this.editing) return "空闲";
      if (this.saving) return "保存中…";
      return "编辑中";
    },
    stateClass() {
      if (!this.editing) return "";
      return this.saving ? "vet__warn" : "vet__ok";
    },
    apiText() {
      if (!this.lastApi) return "还没有调用过接口";
      return JSON.stringify(this.lastApi, null, 2);
    }
  },

  methods: {
    deptLabel,

    /**
     * 按「方法存不存在」挑 API，不去判断版本号。
     * vxe 3.5.7 做过一次 Active → Edit 的重命名，3.6.x 两套并存（旧名标 deprecated），
     * 3.5.6 只有旧名。Vue 2 的 methods 已经 bind 到实例，直接调用即可。
     */
    tableMethod(modern, legacy) {
      const t = this.$refs.table;
      if (!t) return null;
      const fn = t[modern] || t[legacy];
      return typeof fn === "function" ? fn : null;
    },

    isEditing(row) {
      return !!this.editing && this.editing.id === row.id;
    },

    editingRow() {
      if (!this.editing) return null;
      return this.rows.find((r) => r.id === this.editing.id) || null;
    },

    /** 代码进入编辑态：3.5.7+ 是 setEditCell(row, field)，3.5.6 是 setActiveCell(row, field) */
    edit(row) {
      if (this.saving) return;
      const setEditCell = this.tableMethod("setEditCell", "setActiveCell");
      if (setEditCell) setEditCell(row, "remark");
    },

    onActived({ row, column }) {
      // 只有备注列配了 edit-render，所以这里必然是从备注列进来的
      this.editing = {
        id: row.id,
        name: row.name,
        origin: row.remark || ""
      };
      this.draft = row.remark || "";
      this.push(`进入编辑：${row.name} · ${column.title}`);
      this.$nextTick(this.focusInput);
    },

    /**
     * 被 activeMethod 拒掉时只发 edit-disabled，不发 edit-actived。
     * 本页唯一的拦截条件就是「上一条正在保存」，所以这里能直接给出原因；
     * 真实业务里校验不过（无权限、行已锁定）也走同一个事件。
     */
    onDisabled({ row, column }) {
      const why = this.saving ? "上一条正在保存" : "activeMethod 返回 false";
      this.push(`编辑被拦下：${row.name} · ${column.title}（${why}）`);
    },

    /**
     * 用 id 比对：切到下一格时 actived 可能先于 closed 到达，
     * 无脑清空会把新格子的状态（刚设好的 editing）清掉。
     */
    onClosed({ row }) {
      if (!this.editing || this.editing.id !== row.id) return;
      const dropped = this.draft.trim() !== (this.editing.origin || "");
      this.editing = null;
      this.draft = "";
      // 点页面别处会走这里（autoClear 默认开），草稿就没了，值得记一条
      this.push(dropped ? "退出编辑：未确认的草稿已丢弃" : "退出编辑");
    },

    focusInput() {
      const ref = this.$refs.editInput;
      const inst = Array.isArray(ref) ? ref[0] : ref;
      if (inst && inst.focus) inst.focus();
    },

    closeEdit() {
      // 3.5.7+ 叫 clearEdit()，3.5.6 叫 clearActived()；两者都会异步触发 edit-closed
      const clearEdit = this.tableMethod("clearEdit", "clearActived");
      // 所以这里同步先把状态清掉，免得在 edit-closed 之前有代码又读到旧的 editing
      this.editing = null;
      this.draft = "";
      if (clearEdit) clearEdit();
    },

    /** 取消：草稿直接丢掉。row.remark 从头到尾没被碰过，所以不需要还原 */
    cancel() {
      if (this.saving) return;
      const row = this.editingRow();
      const changed = row && this.draft.trim() !== (row.remark || "");
      this.push(
        changed
          ? `取消：草稿「${this.draft}」丢弃，原值仍是「${row.remark || "（空）"}」`
          : "取消：没有改动"
      );
      this.closeEdit();
    },

    /**
     * 确认：校验 → 调接口 → 成功才写回
     * 注意失败分支不调 closeEdit()，编辑态与草稿都保留，用户可以直接重试
     */
    async confirm() {
      if (this.saving) return;
      const row = this.editingRow();
      if (!row) return;

      const value = String(this.draft || "").trim();
      if (!value) {
        this.$message.warning("备注不能为空");
        this.push("确认被拦下：备注为空");
        this.focusInput();
        return;
      }
      if (value === (row.remark || "")) {
        this.push("值没有变化，直接退出编辑");
        this.closeEdit();
        return;
      }

      const payload = { id: row.id, remark: value };
      const url = `/api/staff/${row.id}/remark`;
      this.saving = true;
      this.push(`PUT ${url} 请求体：${JSON.stringify(payload)}`);

      const t0 = Date.now();
      try {
        const res = await saveRemark(payload, { fail: this.failNext });
        // 以接口返回为准（服务端做了 trim + 压空格），不是用本地草稿
        row.remark = res.data.remark;
        // updatedAt 是表里原本没有的字段，Vue 2 必须 $set 才是响应式的
        this.$set(row, "updatedAt", res.data.updatedAt);

        this.lastApi = {
          ok: true,
          method: "PUT",
          url,
          status: 200,
          payload,
          response: res,
          cost: Date.now() - t0
        };

        this.push(`接口成功：remark = 「${res.data.remark}」`);
        this.$message.success("已保存（模拟接口）");
        this.closeEdit();
      } catch (err) {
        this.lastApi = {
          ok: false,
          method: "PUT",
          url,
          status: 504,
          payload,
          response: { message: err.message },
          cost: Date.now() - t0
        };
        this.push(`接口失败：${err.message}（保持编辑态，可重试）`);
        this.$message.error(err.message);
        // 失败时不动 row，也不关编辑态
      } finally {
        this.saving = false;
        this.$nextTick(this.focusInput);
      }
    }
  }
};
</script>

<style scoped>
.vet {
  padding: 4px 2px 12px;
}
.vet__tip {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 22px;
  color: #606266;
}
.vet__tip code,
.vet__bar-tip code {
  background: #f2f5ff;
  color: #326fff;
  padding: 1px 6px;
  border-radius: 3px;
}
/* 事件说明：纯文字小字，夹在正文和兼容说明之间，不抢视觉重心 */
.vet__tip--evt {
  margin-bottom: 10px;
  padding-left: 12px;
  border-left: 3px solid #dfe4ec;
  font-size: 12px;
  line-height: 20px;
  color: #7a8290;
}
/* 版本兼容说明：跟主提示区分开，别喧宾夺主 */
.vet__tip--api {
  margin-top: -4px;
  padding: 8px 12px;
  background: #f7f9ff;
  border-left: 3px solid #326fff;
  border-radius: 0 4px 4px 0;
  font-size: 12px;
  line-height: 20px;
  color: #5c6472;
}
.vet__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}.vet__bar-tip {
  font-size: 12px;
  color: #909399;
}
.vet__ph {
  color: #c0c4cc;
}

/* 编辑态：输入框吃满整格，✓ ✗ 悬浮在它右侧（不占布局宽度） */
.vet-inline {
  position: relative;
}
/* 关键：给按钮让出位置，否则长文本会从按钮底下透出来 */
.vet-inline ::v-deep .el-input__inner {
  padding-right: 54px;
}
.vet-inline__acts {
  position: absolute;
  top: 50%;
  right: 2px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  transform: translateY(-50%);
}
.vet-inline__acts .el-button {
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  font-size: 13px;
  border-radius: 4px;
  background: transparent;
}
/* Element 自带的 .el-button + .el-button { margin-left: 10px } 会和 gap 叠加 */
.vet-inline__acts .el-button + .el-button {
  margin-left: 0;
}
.vet-inline__ico--ok {
  color: #67c23a;
}
.vet-inline__ico--ok:hover {
  color: #529b2e;
  background: #f0f9eb;
}
.vet-inline__ico--no {
  color: #909399;
}
.vet-inline__ico--no:hover {
  color: #606266;
  background: #f4f4f5;
}
/* 保存中 ✗ 要真的看起来是禁用的（上面几条 specificity 更高，会盖掉 Element 的灰） */
.vet-inline__acts .el-button.is-disabled {
  color: #c0c4cc;
  background: transparent;
}

.vet__panel {
  margin-top: 14px;
  padding: 12px 14px;
  background: #fafbff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.vet__grid {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 16px;
}
@media (max-width: 860px) {
  .vet__grid {
    grid-template-columns: 1fr;
  }
}
.vet__pane-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}
.vet__ok {
  color: #67c23a;
  font-weight: 400;
}
.vet__err {
  color: #f56c6c;
  font-weight: 400;
}
.vet__warn {
  color: #e6a23c;
}
.vet__kv {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 5px 8px;
  margin: 0;
  font-size: 12px;
  line-height: 18px;
}
.vet__kv dt {
  color: #909399;
}
.vet__kv dd {
  margin: 0;
  color: #303133;
  word-break: break-all;
}
/* 面板里显示当前实际用到的那套 vxe 方法名 */
.vet__kv .vet__api {
  color: #326fff;
  font-size: 11px;
  line-height: 16px;
}
.vet__json {
  margin: 0;
  max-height: 150px;
  overflow: auto;
  padding: 10px 12px;
  background: #1f2430;
  color: #c8d3f5;
  border-radius: 6px;
  font-size: 12px;
  line-height: 18px;
}
.vet__log {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 12px 0 0;
  padding: 10px 0 0;
  border-top: 1px dashed #e4e7ed;
  list-style: none;
  font-size: 12px;
  line-height: 20px;
  color: #909399;
}
</style>
