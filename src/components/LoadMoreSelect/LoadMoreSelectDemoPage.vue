<template>
  <div class="lmsd">
    <header class="lmsd__head">
      <div class="lmsd__head-main">
        <h2 class="lmsd__title">
          LoadMoreSelect · el-select 滚动到底加载下一页
        </h2>
        <p class="lmsd__desc">
          把 <code>el-select</code> 的远程下拉做成「滚到底自动加载下一页」：
          首次打开拉第 1 页，滚动到距底部 <code>offset</code> 以内拉下一页，
          到底显示「没有更多了」。封装在
          <code>src/components/LoadMoreSelect/</code>，全局标签
          <code>&lt;load-more-select&gt;</code>。
        </p>
      </div>
      <div class="lmsd__meta">
        <div>
          <code>&lt;load-more-select v-model="x" :request="fn" :page-size="10" /&gt;</code>
        </div>
        <div>请求函数：<code>({ page, pageSize, keyword }) =&gt; Promise&lt;{ list, total }&gt;</code></div>
      </div>
    </header>

    <el-tabs v-model="tab" type="border-card">
      <!-- ================= ① 基础 ================= -->
      <el-tab-pane label="① 基础 · 滚动加载" name="basic" lazy>
        <div class="lmsd__grid">
          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>单选框：物料</b>
              <code>v-model + @load</code>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__field">
                <label class="lmsd__label">物料</label>
                <load-more-select
                  ref="basic"
                  v-model="basic.value"
                  :request="basicRequest"
                  :value-item="basic.valueItem"
                  label-key="name"
                  value-key="id"
                  :page-size="10"
                  placeholder="点开下拉，往下滚"
                  @load="onBasicLoad"
                  @error="onBasicError"
                  @select="onBasicSelect"
                />
                <p class="lmsd__help">
                  每页 10 条、共 58 条。<b>滚到列表底部</b>会自动拉下一页；
                  打开时只拉第 1 页（<code>auto-load</code>），不会一次全拉。
                </p>
              </div>

              <div class="lmsd__actions">
                <el-button size="small" type="primary" @click="reloadBasic">
                  重新加载（ref.reload）
                </el-button>
                <el-button size="small" @click="fillFarItem">
                  回填第 47 条（value-item）
                </el-button>
                <el-button size="small" @click="clearBasic">清空</el-button>
              </div>

              <div class="lmsd__hint">
                「回填第 47 条」把一个<b>还没被加载出来</b>的值塞进 v-model：
                没有 <code>value-item</code> 时输入框会显示裸的 <code>1046</code>，
                给了它才会显示物料名。
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>当前状态</b>
              <span class="lmsd__muted">看页码、条数、是否到底</span>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__kv">
                <span>v-model</span>
                <code>{{ basic.value === '' ? '(空)' : basic.value }}</code>
              </div>
              <div class="lmsd__kv">
                <span>选中项</span>
                <code>{{ basic.picked ? basic.picked.name : '(未选中)' }}</code>
              </div>
              <div class="lmsd__kv">
                <span>已加载 / 当前页</span>
                <code>{{ basic.loaded }} 条 · 第 {{ basic.page }} 页</code>
              </div>
              <div class="lmsd__kv">
                <span>是否到底</span>
                <code :class="{ 'is-warn': basic.finished }">{{
                  basic.finished ? "finished = true" : "还有下一页"
                }}</code>
              </div>

              <div class="lmsd__log-title">
                请求日志
                <span class="lmsd__muted"
                  >（共 {{ basic.logs.length }} 次，只留最近 6 条）</span
                >
              </div>
              <ul class="lmsd__log">
                <li v-for="(item, i) in basic.logs" :key="i" class="lmsd__log-item">
                  <span class="lmsd__log-page">第 {{ item.page }} 页</span>
                  <span>+{{ item.count }} 条</span>
                  <span class="lmsd__muted">{{ item.cost }}ms</span>
                  <span v-if="item.finished" class="lmsd__log-end">到底</span>
                </li>
                <li v-if="!basic.logs.length" class="lmsd__log-empty">
                  还没有请求 —— 点开下拉试试
                </li>
              </ul>

              <div v-if="basic.error" class="lmsd__error">
                最近一次失败：{{ basic.error }}
              </div>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ================= ② 搜索 ================= -->
      <el-tab-pane label="② 搜索 + 滚动" name="search" lazy>
        <div class="lmsd__grid">
          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>边输边搜 + 翻页</b>
              <code>searchable</code>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__field">
                <label class="lmsd__label">物料（可搜索）</label>
                <load-more-select
                  ref="search"
                  v-model="search.value"
                  :request="searchRequest"
                  label-key="name"
                  value-key="id"
                  :page-size="8"
                  searchable
                  placeholder="输入关键词，如「钢」「SKU-1005」"
                  @load="onSearchLoad"
                  @select="onSearchSelect"
                />
                <p class="lmsd__help">
                  关键词交给<b>服务端</b>过滤（<code>filterable + remote</code>），
                  关键词一变就从第 1 页重来，滚动位置也回到顶部。
                  输入 <code>钢</code> 有 3 条、<code>不存在</code> 一条都没有。
                </p>
              </div>

              <div class="lmsd__hint">
                坑：Element 在 <code>remote</code> 模式下，如果
                <b>关键词为空且没有任何选项</b>，<code>emptyText</code> 会返回
                <code>false</code>，整个下拉 popper 被 <code>v-show</code> 掉 ——
                表现就是「点了没反应」。输入关键词后就会恢复。
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>搜索请求</b>
              <span class="lmsd__muted">关键词 / 页码 / 条数</span>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__kv">
                <span>当前关键词</span>
                <code>{{ search.keyword || '(空)' }}</code>
              </div>
              <div class="lmsd__kv">
                <span>已加载</span>
                <code>{{ search.loaded }} 条 · 第 {{ search.page }} 页</code>
              </div>
              <div class="lmsd__kv">
                <span>是否到底</span>
                <code>{{ search.finished ? "finished = true" : "还有下一页" }}</code>
              </div>

              <div class="lmsd__log-title">请求日志</div>
              <ul class="lmsd__log">
                <li
                  v-for="(item, i) in search.logs"
                  :key="i"
                  class="lmsd__log-item"
                >
                  <span class="lmsd__log-kw">「{{ item.keyword || "空" }}」</span>
                  <span class="lmsd__log-page">第 {{ item.page }} 页</span>
                  <span>+{{ item.count }} 条</span>
                  <span class="lmsd__muted">{{ item.cost }}ms</span>
                </li>
                <li v-if="!search.logs.length" class="lmsd__log-empty">
                  还没有搜索
                </li>
              </ul>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ================= ③ 多选 + 回显 ================= -->
      <el-tab-pane label="③ 多选 + 回显" name="multi" lazy>
        <div class="lmsd__grid">
          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>多选：一次挑多个物料</b>
              <code>multiple + collapse-tags</code>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__field">
                <label class="lmsd__label">物料（多选）</label>
                <load-more-select
                  v-model="multi.value"
                  :request="multiRequest"
                  :value-item="multi.keepPinned ? multi.items : null"
                  label-key="name"
                  value-key="id"
                  :page-size="10"
                  multiple
                  collapse-tags
                  placeholder="点开多选几条，再滚动加载"
                  @select="onMultiSelect"
                />
                <p class="lmsd__help">
                  选中项整条记录从 <code>@select</code> 抛出来（数组），
                  再原样传给 <code>value-item</code>。
                </p>
              </div>

              <div class="lmsd__actions">
                <el-switch
                  v-model="multi.keepPinned"
                  active-text="传 value-item"
                  inactive-text="不传"
                />
                <el-button size="small" @click="multi.value = []">
                  清空选中
                </el-button>
              </div>

              <div class="lmsd__hint">
                关掉 <code>value-item</code> 再滚动加载几页，已选标签会变成
                <b>裸 id</b>。原因在 Element 源码里：选项组件销毁时
                <code>onOptionDestroy → setSelected()</code> 重算，
                当前 <code>options</code> 里找不到的值只能拿原始值当 label。
                把已选项一直挂在 <code>value-item</code> 里（它们永远渲染出
                <code>el-option</code>），标签就不会丢。
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>选中的值</b>
              <span class="lmsd__muted">value 数组 + 整条记录</span>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__kv">
                <span>v-model</span>
                <code>{{ multi.value.length ? multi.value.join(", ") : "(空)" }}</code>
              </div>
              <div class="lmsd__kv">
                <span>条数</span>
                <code>{{ multi.value.length }}</code>
              </div>
              <div class="lmsd__log-title">@select 拿到的记录</div>
              <ul class="lmsd__log">
                <li
                  v-for="item in multi.items"
                  :key="item.id"
                  class="lmsd__log-item"
                >
                  <span class="lmsd__log-kw">{{ item.name }}</span>
                  <span class="lmsd__muted">{{ item.code }}</span>
                </li>
                <li v-if="!multi.items.length" class="lmsd__log-empty">
                  还没选
                </li>
              </ul>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ================= ④ 坑与边界 ================= -->
      <el-tab-pane label="④ 坑与边界" name="pitfall" lazy>
        <div class="lmsd__grid">
          <!-- 坑 1 -->
          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>坑 1：别用 el-select 的 loading 表示「加载更多」</b>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__field">
                <el-select
                  v-model="broken.value"
                  :loading="broken.useLoadingProp && broken.loading"
                  placeholder="已加载 12 条，点下面的按钮"
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in broken.list"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </div>
              <div class="lmsd__actions">
                <el-button
                  size="small"
                  :loading="broken.loading"
                  @click="loadMoreBroken"
                >
                  加载更多（+5 条）
                </el-button>
                <el-switch
                  v-model="broken.useLoadingProp"
                  active-text=":loading 传 true"
                  inactive-text=":loading 传 false"
                />
              </div>
              <p class="lmsd__help">
                点「加载更多」时把 loading 传给 el-select：
                <b>已经加载出来的 12 条会全部消失</b>，只剩一句「加载中」。
                源码里 <code>el-scrollbar</code> 上挂着
                <code>v-show="options.length &gt; 0 &amp;&amp; !loading"</code>。
                所以本组件只在<b>首屏</b>用 loading，翻页用列表底部的 footer。
              </p>
            </div>
          </el-card>

          <!-- 坑 2 -->
          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>坑 2：首屏不满一屏，永远不会触发 scroll</b>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__field">
                <label class="lmsd__label">pageSize = 4 · auto-fill 开</label>
                <load-more-select
                  v-model="fill.on"
                  :request="smallRequest"
                  label-key="name"
                  value-key="id"
                  :page-size="4"
                  @load="onFillOnLoad"
                />
              </div>
              <div class="lmsd__field">
                <label class="lmsd__label">pageSize = 4 · auto-fill 关</label>
                <load-more-select
                  v-model="fill.off"
                  :request="smallRequest"
                  label-key="name"
                  value-key="id"
                  :page-size="4"
                  :auto-fill="false"
                  @load="onFillOffLoad"
                />
              </div>
              <p class="lmsd__help">
                上面那个打开就自动续拉到<b>撑出滚动条</b>（{{
                  fill.onState ? "第 " + fill.onState.page + " 页" : "还没拉"
                }}）；下面那个只有 4 条、没有滚动条，
                于是<b>再也加载不出第 2 页</b> —— 这就是「小 pageSize 下拉只有一页」的真正原因。
              </p>
            </div>
          </el-card>

          <!-- 坑 3 -->
          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>坑 3：失败要能原地重试</b>
            </div>
            <div class="lmsd__pad">
              <div class="lmsd__field">
                <load-more-select
                  ref="failing"
                  v-model="failing.value"
                  :request="failRequest"
                  label-key="name"
                  value-key="id"
                  :page-size="10"
                  @error="onFailError"
                  @load="onFailLoad"
                />
              </div>
              <div class="lmsd__actions">
                <el-switch
                  v-model="failing.alwaysFail"
                  active-text="下次请求必失败"
                  inactive-text="恢复正常"
                />
                <el-button size="small" @click="$refs.failing.reload()">
                  重新请求
                </el-button>
              </div>
              <p class="lmsd__help">
                打开开关再点开下拉：空列表时是
                <b>空态里的「重试」</b>；已经加载过一部分时是
                <b>底部红字「加载失败，点击重试」</b>。
                重试走 <code>reload()</code> 还是下一页由组件自己判断
                （<code>pendingReset</code>）。
                <span v-if="failing.error" class="lmsd__error-inline">
                  最近一次：{{ failing.error }}
                </span>
              </p>
            </div>
          </el-card>

          <!-- 小结 -->
          <el-card shadow="never" class="lmsd__card">
            <div slot="header" class="lmsd__card-head">
              <b>四件事讲完</b>
            </div>
            <div class="lmsd__pad">
              <ol class="lmsd__notes">
                <li>
                  滚动容器是 <code>.el-select-dropdown__wrap</code>，从
                  <code>$refs.select.$refs.popper</code> 里取<b>自己那份</b>
                  （下拉 append-to-body，别用全局 query）。
                </li>
                <li>
                  是否到底靠 <code>total</code> 判断；后端不给 total 就退回
                  「本页条数 &lt; pageSize」。
                </li>
                <li>
                  响应要带 seq 作废旧请求；换关键词时页码、滚动位置一起重置。
                </li>
                <li>
                  回显项用 <code>value-item</code> 钉在列表里，顺带解决
                  多选标签丢文案的问题。
                </li>
              </ol>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { fetchOptions, OPTIONS } from "./mockApi";

const EMPTY_LOG = () => [];

export default {
  name: "LoadMoreSelectDemoPage",

  data() {
    return {
      tab: "basic",

      basic: {
        value: "",
        valueItem: null,
        picked: null,
        page: 0,
        loaded: 0,
        finished: false,
        error: "",
        logs: EMPTY_LOG(),
      },

      search: {
        value: "",
        keyword: "",
        page: 0,
        loaded: 0,
        finished: false,
        logs: EMPTY_LOG(),
      },

      multi: {
        value: [],
        items: [],
        keepPinned: true,
      },

      fill: {
        on: "",
        off: "",
        onState: null,
        offState: null,
      },

      broken: {
        value: "",
        list: OPTIONS.slice(0, 12).map((o) => ({ ...o })),
        loading: false,
        useLoadingProp: true,
      },

      failing: {
        value: "",
        alwaysFail: false,
        error: "",
      },
    };
  },

  methods: {
    /* ---------------- 请求函数（真实项目里换成 axios） ---------------- */

    basicRequest(params) {
      return fetchOptions({ ...params, delay: 240 });
    },

    searchRequest(params) {
      return fetchOptions({ ...params, delay: 260 });
    },

    multiRequest(params) {
      return fetchOptions({ ...params, delay: 220 });
    },

    smallRequest(params) {
      return fetchOptions({ ...params, delay: 180 });
    },

    failRequest(params) {
      return fetchOptions({
        ...params,
        delay: 400,
        fail: this.failing.alwaysFail,
      });
    },

    /* ---------------- ① 基础 ---------------- */

    onBasicLoad(e) {
      this.basic.page = e.page;
      this.basic.loaded += e.count;
      this.basic.finished = e.finished;
      this.basic.error = "";
      this.pushLog(this.basic, e);
    },

    onBasicError(err) {
      this.basic.error = (err && err.message) || "加载失败";
    },

    onBasicSelect(item) {
      this.basic.picked = item;
    },

    pushLog(box, e) {
      box.logs = [
        { page: e.page, count: e.count, cost: e.cost, finished: e.finished, keyword: e.keyword },
        ...box.logs,
      ].slice(0, 6);
    },

    reloadBasic() {
      this.basic.logs = [];
      this.basic.loaded = 0;
      this.basic.finished = false;
      this.basic.error = "";
      this.$refs.basic.reload();
    },

    fillFarItem() {
      const item = OPTIONS[46];
      this.basic.value = item.id;
      this.basic.valueItem = item;
      this.basic.picked = item;
    },

    clearBasic() {
      this.basic.value = "";
      this.basic.valueItem = null;
      this.basic.picked = null;
    },

    /* ---------------- ② 搜索 ---------------- */

    onSearchLoad(e) {
      this.search.keyword = e.keyword;
      this.search.page = e.page;
      if (e.page === 1) this.search.loaded = e.count;
      else this.search.loaded += e.count;
      this.search.finished = e.finished;
      this.pushLog(this.search, e);
    },

    onSearchSelect(item) {
      this.search.keyword = item ? item.name : "";
    },

    /* ---------------- ③ 多选 ---------------- */

    onMultiSelect(items) {
      this.multi.items = Array.isArray(items) ? items : [];
    },

    /* ---------------- ④ 坑 ---------------- */

    loadMoreBroken() {
      if (this.broken.loading) return;
      this.broken.loading = true;
      setTimeout(() => {
        const from = this.broken.list.length;
        this.broken.list = this.broken.list.concat(
          OPTIONS.slice(from, from + 5).map((o) => ({ ...o }))
        );
        this.broken.loading = false;
      }, 900);
    },

    onFailError(err) {
      this.failing.error = (err && err.message) || "加载失败";
    },

    onFailLoad() {
      this.failing.error = "";
    },

    onFillOnLoad(e) {
      this.fill.onState = e;
    },

    onFillOffLoad(e) {
      this.fill.offState = e;
    },
  },
};
</script>

<style lang="scss" scoped>
.lmsd {
  padding: 16px;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 16px;
  }

  &__head-main {
    min-width: 0;
  }

  &__title {
    font-size: 20px;
    font-weight: 600;
    color: $color-3;
  }

  &__desc {
    max-width: 760px;
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.7;
    color: $color-6;
  }

  &__meta {
    flex: none;
    padding: 8px 12px;
    border: 1px dashed #d8dfe9;
    border-radius: 6px;
    background-color: #fafcff;
    color: $color-9;
    font-size: 12px;
    line-height: 1.9;

    code {
      color: $color-primary;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  &__card {
    border-radius: 8px;
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;

    code {
      padding: 1px 6px;
      border-radius: 3px;
      background-color: rgba($color-primary, 0.08);
      color: $color-primary;
      font-size: 12px;
    }
  }

  &__pad {
    padding: 4px 2px 0;
  }

  &__field {
    margin-bottom: 12px;
  }

  &__label {
    display: block;
    margin-bottom: 6px;
    color: $color-6;
    font-size: 13px;
  }

  &__help {
    margin-top: 8px;
    color: $color-9;
    font-size: 12px;
    line-height: 1.7;

    code {
      padding: 1px 4px;
      border-radius: 3px;
      background-color: #f2f4f8;
      color: $color-6;
    }
  }

  &__hint {
    margin-top: 12px;
    padding: 8px 12px;
    border-left: 3px solid rgba($color-primary, 0.4);
    border-radius: 4px;
    background-color: #f7faff;
    color: $color-6;
    font-size: 12px;
    line-height: 1.75;

    code {
      color: $color-primary;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__kv {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px dashed #eef1f6;
    color: $color-6;
    font-size: 13px;

    code {
      color: $color-3;
      font-size: 12px;
      word-break: break-all;
    }

    .is-warn {
      color: $color-primary;
    }
  }

  &__log-title {
    margin: 14px 0 6px;
    color: $color-3;
    font-size: 13px;
    font-weight: 600;
  }

  &__log {
    border-radius: 6px;
    background-color: #fafbfd;
  }

  &__log-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 10px;
    border-bottom: 1px solid #f0f2f6;
    color: $color-6;
    font-size: 12px;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__log-page {
    color: $color-primary;
  }

  &__log-kw {
    max-width: 46%;
    overflow: hidden;
    color: $color-3;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__log-end {
    padding: 0 5px;
    border-radius: 3px;
    background-color: rgba($color-primary, 0.1);
    color: $color-primary;
  }

  &__log-empty {
    padding: 10px;
    color: $color-9;
    font-size: 12px;
    text-align: center;
  }

  &__muted {
    color: $color-9;
    font-size: 12px;
  }

  &__error {
    margin-top: 10px;
    padding: 6px 10px;
    border-radius: 4px;
    background-color: rgba($red-color, 0.08);
    color: $red-color;
    font-size: 12px;
  }

  &__error-inline {
    display: block;
    margin-top: 4px;
    color: $red-color;
  }

  &__notes {
    padding-left: 18px;
    color: $color-6;
    font-size: 12px;
    line-height: 1.9;
    list-style: decimal;

    li {
      list-style: decimal;
    }

    code {
      padding: 1px 4px;
      border-radius: 3px;
      background-color: #f2f4f8;
      color: $color-6;
    }
  }
}
</style>
