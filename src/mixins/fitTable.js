/**
 * fitTable —— 让 el-table / vxe-table 的高度跟着「外层容器」走
 * ----------------------------------------------------------------------
 * 为什么需要它：el-table 想固定表头就必须拿到**像素高度**（height 只认 number/px 字符串），
 * 传 '100%' 时内部 `bodyHeight = height - headerHeight` 会算成 NaN，表体直接塌掉。
 * 所以只能由 JS 量出容器的真实高度，再把数字喂给 :height。
 *
 * 用法（容器必须有独立的高度来源，见下方「⚠️」）：
 *   <div class="fit-box" ref="fitBox">
 *     <el-table ref="table" :height="fitHeight" :data="rows">…</el-table>
 *   </div>
 *
 *   import fitTable from '@/mixins/fitTable'
 *   export default { mixins: [fitTable], … }
 *
 * 可选：组件里声明 `fitTableMinHeight: 120` 作为下限（默认 120，按自定义选项读）。
 *
 * ⚠️ 容器高度不能由表格自己撑开（比如容器是 height:auto 的普通 div）。
 *    那会形成「表格变高 → 容器变高 → 表格更高」的循环。给容器一个独立的来源：
 *    固定 height、flex 里的 flex:1 + min-height:0、或 grid 行高。
 *
 * 为什么用 ResizeObserver 而不是只听 window.resize：
 *   卡片折叠、下钻面板展开、页签切换、表格上方筛选行换行……父容器变高变矮都不会触发
 *   window.resize，只有观察元素本身才准。
 *
 * 为什么不用 composition API hook：
 *   本项目 main.js 里 Vue.use(VueCompositionAPI) 是注释状态（靠 vue-demi 的 import 顺序
 *   顺带安装），setup() 能不能跑取决于引入顺序。这是布局基础设施，不赌那个。
 */
export default {
  data() {
    return {
      /** 给 :height 用；null = 还没量到（此时 el-table 走自动高度，不会报错） */
      fitHeight: null,
    }
  },

  mounted() {
    this.$nextTick(this.fitBind)
  },

  updated() {
    // 行数变化会让竖向滚动条出现 / 消失，而 Element 只在创建 layout 时算一次 gutterWidth；
    // 每次渲染后校正一次。fitGutter 内部有「一致就返回」的守卫，不会反复触发。
    this.$nextTick(this.fitGutter)
  },

  beforeDestroy() {
    this.fitUnbind()
  },

  methods: {
    fitBind() {
      this.fitUnbind();
      const box = this.$refs.fitBox;
      if (!box) return;

      // 先同步量一次，避免首帧闪一下「全量高度」
      this.fitSync();

      if (typeof ResizeObserver !== "undefined") {
        this.fitRO = new ResizeObserver(this.fitSync);
        this.fitRO.observe(box);
      } else {
        // 老内核（Chromium 84 之前）没有 ResizeObserver：
        // 退化成 window.resize + 一次延时补量，至少窗口变化时能跟上
        this.fitOnResize = this.fitSync;
        window.addEventListener("resize", this.fitOnResize);
        this.fitTimer = setTimeout(this.fitSync, 160);
      }
    },

    fitSync() {
      const box = this.$refs.fitBox;
      if (!box) return;

      // clientHeight 不含 border、含 padding：容器有内边距时表格不该把这圈 padding 也吃掉，
      // 所以直接量 border-box 再减掉上下 padding 与边框
      const cs = getComputedStyle(box);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const borderY = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      const h = Math.floor(box.getBoundingClientRect().height - padY - borderY);

      // 0 / 负数 = 元素被隐藏（v-show、页签切走、display:none 的祖先），
      // 这时别把表格压成 0，保留上一次的值
      if (h <= 0) return;

      // 组件可以声明 `fitTableMinHeight: 180`（自定义选项，通过 this.$options 读）
      const min = this.$options.fitTableMinHeight || 120;
      const next = Math.max(min, h);
      if (next !== this.fitHeight) this.fitHeight = next;

      // 高度变了才知道有没有竖向滚动条，gutter 得等表格重新布局后再校正
      this.$nextTick(this.fitGutter);
    },

    /**
     * 把 el-table 的 gutterWidth 校正成「真实滚动条宽度」。
     * 为什么需要：Element 用 utils/scrollbar-width.js 造一个 .el-scrollbar__wrap 探针量
     * 系统滚动条宽度，结果缓存在模块作用域里（整个应用只算一次）。如果表格滚动条被 CSS
     * 定制成 8px，而缓存是别的值（Chrome 桌面 15px / macOS 悬浮滚动条 0px，取决于哪个页面
     * 先创建了第一个 el-table），表头会按缓存值留 gutter、表体只少 8px：
     * 行分隔线和最后一列会在滚动条左侧留出一条 7px 白缝，表头右边界也比表体宽 7px。
     * 这里按实际量到的值改回来（只在「有滚动条且不一致」时动手，避免无谓的重渲染）。
     */
    fitGutter() {
      const table = this.$refs.table;
      const layout = table && table.layout;
      if (!layout) return;

      const body = table.$el.querySelector(".el-table__body-wrapper");
      if (!body) return;

      // offsetWidth − clientWidth 就是竖向滚动条占的宽度；0 说明当前没有滚动条，此时
      // gutterWidth 不参与计算（Element 只在 scrollY 时减它），不用管
      const actual = body.offsetWidth - body.clientWidth;
      if (!actual || actual === layout.gutterWidth) return;

      layout.gutterWidth = actual;
      layout.updateColumnsWidth();
      layout.updateElsHeight();
      // gutterWidth 是 render 时读的（表头 gutter / 表体宽度），得让组件重渲染一次
      table.$forceUpdate();
    },

    fitUnbind() {
      if (this.fitRO) {
        this.fitRO.disconnect();
        this.fitRO = null;
      }
      if (this.fitOnResize) {
        window.removeEventListener("resize", this.fitOnResize);
        this.fitOnResize = null;
      }
      if (this.fitTimer) {
        clearTimeout(this.fitTimer);
        this.fitTimer = null;
      }
    },
  },
};
