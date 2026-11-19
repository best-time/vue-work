<template>
  <div class="infinite-demo">
    <h3>无限滚动加载</h3>
    <p class="desc">
      滚动到距底部 80px 会自动加载下一页；数据加载完显示「没有更多了」。
    </p>

    <!-- ===================== ① 页面内的滚动容器 ===================== -->
    <section class="block">
      <div class="block-title">① 页面内的滚动容器</div>

      <div
        ref="listBox"
        class="scroll-list"
        v-infinite-scroll="{ handler: loadMore, disabled: noMore, distance: 80 }"
      >
        <div v-for="item in list" :key="item.id" class="list-item">
          <span class="item-index">{{ item.id }}</span>
          <span class="item-title">{{ item.title }}</span>
        </div>

        <div v-if="loading" class="list-tip">加载中...</div>
        <div v-else-if="!list.length" class="list-tip">暂无数据</div>
        <div v-else-if="noMore" class="list-tip">没有更多了</div>
      </div>

      <div class="btn-row">
        <el-button type="primary" size="small" @click="reset">重置</el-button>
        <span class="count">已加载 {{ list.length }} / {{ total }}</span>
      </div>
    </section>

    <!-- ===================== ② el-dialog 里 ===================== -->
    <section class="block">
      <div class="block-title">② el-dialog 里（弹窗懒渲染 + 独立滚动容器）</div>
      <p class="desc">
        弹窗内容默认是<b>懒渲染</b>的：第一次点开才把插槽插进 DOM，指令的
        <code>inserted</code> 也推迟到那一刻——列表还是空的、弹窗还在过渡中。
        所以指令<b>不能</b>用「此刻内容有没有溢出」来判断滚动根（空列表时
        <code>scrollHeight === clientHeight</code>，会退化成 window，之后盒子内部再怎么滚都不响应），
        只能看谁<b>声明了</b> <code>overflow-y: auto</code>。首屏再用 <code>@opened</code> 兜一次。
      </p>

      <div class="btn-row">
        <el-button type="primary" size="small" @click="openDialog">
          打开弹窗
        </el-button>
        <el-button size="small" @click="resetDlg">重置数据</el-button>
        <span class="count">已加载 {{ dlg.list.length }} / {{ dlg.total }}</span>
      </div>
    </section>

    <!-- ===================== 弹窗本体 ===================== -->
    <el-dialog
      title="选择人员"
      width="520px"
      :visible.sync="dialogVisible"
      :close-on-click-modal="false"
      @opened="onDialogOpened"
      @closed="onDialogClosed"
    >
      <div class="dlg-bar">
        <span class="dlg-count">
          已加载 {{ dlg.list.length }} / {{ dlg.total }}
          <template v-if="dlg.noMore">（已到底）</template>
        </span>
        <el-button type="text" size="small" @click="resetDlg">重置</el-button>
      </div>

      <!--
        弹窗里的滚动容器：和 ① 一样是「定高的盒子 + 自身 overflow」。
        指令挂在它自己身上，滚动根就是它，不依赖弹窗外层。
      -->
      <div
        ref="dlgList"
        class="scroll-list scroll-list--dlg"
        v-infinite-scroll="{
          handler: loadMoreInDialog,
          disabled: dlg.noMore,
          distance: 60,
        }"
      >
        <div
          v-for="item in dlg.list"
          :key="item.id"
          class="list-item list-item--pick"
          :class="{ 'is-active': activeId === item.id }"
          @click="activeId = item.id"
        >
          <span class="item-index">{{ item.id }}</span>
          <span class="item-title">
            {{ item.title }}
            <em class="item-sub">{{ item.dept }}</em>
          </span>
          <i v-if="activeId === item.id" class="item-check el-icon-check" />
        </div>

        <div v-if="dlg.loading" class="list-tip">加载中...</div>
        <div v-else-if="!dlg.list.length" class="list-tip">暂无数据</div>
        <div v-else-if="dlg.noMore" class="list-tip">没有更多了</div>
      </div>

      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmPick">
          确定
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import infiniteScroll from "./scroll";

const DLG_TOTAL = 40;

function blankDlgState() {
  return {
    list: [],
    page: 1,
    pageSize: 10,
    total: DLG_TOTAL,
    loading: false,
    noMore: false,
  };
}

/**
 * 无限滚动示例
 *
 * 前提：main.js 已注册指令
 *   import InfiniteScroll from './directives/infiniteScroll'
 *   Vue.directive('infinite-scroll', InfiniteScroll)
 *
 * 本页用局部注册，避免影响其他页面（Element UI 2.15 自带同名指令，
 * 全局抢注会把它顶掉；局部注册只作用于本组件）。
 */
export default {
  name: "InfiniteScrollDemo",
  directives: {
    infiniteScroll: infiniteScroll,
  },
  data() {
    return {
      // ① 页面内
      list: [],
      page: 1,
      pageSize: 10,
      total: 60,
      loading: false,
      noMore: false,

      // ② 弹窗内：状态独立，翻页互不影响
      dialogVisible: false,
      dlg: blankDlgState(),
      activeId: null,
    };
  },
  methods: {
    /* ------------------------- ① 页面内 ------------------------- */

    /**
     * 触底回调
     * 返回 Promise，指令会在请求结束前阻止重复触发
     */
    async loadMore() {
      if (this.loading || this.noMore) return;

      this.loading = true;
      try {
        await this.mockRequest(this.page, this.pageSize);

        const start = (this.page - 1) * this.pageSize;
        const end = Math.min(start + this.pageSize, this.total);
        const items = [];

        for (let i = start; i < end; i++) {
          items.push({ id: i + 1, title: `列表项 ${i + 1}` });
        }

        this.list = this.list.concat(items);
        this.page += 1;

        if (this.list.length >= this.total) {
          this.noMore = true;
        }
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.list = [];
      this.page = 1;
      this.noMore = false;
      this.loading = false;

      const el = this.$refs.listBox;
      if (el) el.scrollTop = 0;

      // 重置后内容为空，主动加载一页（scrolling 不会触发）
      this.$nextTick(() => this.loadMore());
    },

    /* ------------------------- ② 弹窗内 ------------------------- */

    openDialog() {
      this.dialogVisible = true;
    },

    /**
     * 弹窗打开动画结束后兜一次首屏。
     *
     * 指令的 inserted 在「第一次打开」时才执行，那一刻：
     *   - 弹窗还在 dialog-fade 过渡里；
     *   - 列表还没有数据，盒子 scrollHeight === clientHeight；
     * 于是「自己是不是滚动容器」可能判断不出来。这里补一次，
     * 保证首屏一定有数据（之后的过程仍然全交给指令）。
     */
    onDialogOpened() {
      const s = this.dlg;
      if (!s.list.length && !s.loading) this.loadMoreInDialog();
    },

    onDialogClosed() {
      // 关闭只是 v-show：DOM 与指令状态都还在，选中项清掉即可。
      this.activeId = null;
    },

    loadMoreInDialog() {
      const s = this.dlg;
      if (s.loading || s.noMore) return;

      s.loading = true;
      const page = s.page;

      return this.mockRequest(page, s.pageSize).then(
        () => {
          const start = (page - 1) * s.pageSize;
          const end = Math.min(start + s.pageSize, s.total);
          s.list = s.list.concat(this.makePersons(start, end));
          s.page = page + 1;
          s.noMore = s.list.length >= s.total;
          s.loading = false;
        },
        () => {
          s.loading = false;
        }
      );
    },

    resetDlg() {
      this.dlg = blankDlgState();
      this.activeId = null;

      const el = this.$refs.dlgList;
      if (el) el.scrollTop = 0;

      // 重置后内容为空，主动拉一页；之后靠指令
      this.$nextTick(() => this.loadMoreInDialog());
    },

    confirmPick() {
      if (this.activeId == null) {
        this.$message.warning("请先选择一位人员");
        return;
      }
      const picked = this.dlg.list.find((it) => it.id === this.activeId);
      this.$message.success(`已选择 ${picked.title}`);
      this.dialogVisible = false;
    },

    makePersons(start, end) {
      const items = [];
      for (let i = start; i < end; i++) {
        items.push({
          id: i + 1,
          title: `人员 ${i + 1}`,
          dept: `部门 ${(i % 5) + 1}`,
        });
      }
      return items;
    },

    /* ------------------------- 公共 ------------------------- */

    // 模拟分页接口
    mockRequest(page, pageSize) {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ page, pageSize }), 600);
      });
    },
  },
};
</script>

<style scoped>
.infinite-demo {
  padding: 24px;
}

.infinite-demo h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #303133;
}

.desc {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #909399;
}

.desc b {
  color: #606266;
  font-weight: 600;
}

.desc code {
  padding: 1px 4px;
  border-radius: 3px;
  background: #f2f4f8;
  color: #5a6b8c;
  font-size: 12px;
}

.block + .block {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px dashed #e4e7ed;
}

.block-title {
  position: relative;
  margin-bottom: 10px;
  padding-left: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.block-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 3px;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #326fff;
}

.scroll-list {
  height: 420px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.scroll-list--dlg {
  height: 300px;
}

.list-item {
  display: flex;
  align-items: center;
  height: 44px;
  margin-bottom: 6px;
  padding: 0 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}

.list-item--pick {
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.15s, border-color 0.15s;
}

.list-item--pick:hover {
  background: #eef3ff;
}

.list-item--pick.is-active {
  background: #eef3ff;
  border-color: #326fff;
  color: #326fff;
}

.item-index {
  width: 32px;
  color: #909399;
}

.item-title {
  flex: 1;
  min-width: 0;
}

.item-sub {
  margin-left: 8px;
  font-style: normal;
  font-size: 12px;
  color: #a8abb2;
}

.item-check {
  color: #326fff;
}

.list-tip {
  padding: 12px 0;
  text-align: center;
  font-size: 12px;
  color: #909399;
}

.btn-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.count {
  font-size: 12px;
  color: #909399;
}

.dlg-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dlg-count {
  font-size: 12px;
  color: #909399;
}
</style>
