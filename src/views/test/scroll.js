/**
 * v-infinite-scroll 无限滚动加载指令（Vue 2）
 *
 * 策略：
 *   1. 优先使用 IntersectionObserver（性能更好、不依赖 scroll 事件与节流）
 *   2. 浏览器不支持时自动回退到 scroll 监听
 *
 * 用法一：直接传函数
 *   <div v-infinite-scroll="loadMore">...</div>
 *
 * 用法二：传配置对象
 *   <div v-infinite-scroll="{ handler: loadMore, distance: 80, disabled: noMore }">
 *
 * 配置项：
 *   handler  {Function}  触底回调，返回 Promise 时 Promise 结束前不会重复触发
 *   distance {number}    距底部多少 px 触发，默认 60
 *   immediate{boolean}   是否在首屏内容不足一屏时自动连续加载，默认 true
 *   disabled {boolean}   为 true 时停止触发（用于“没有更多了”）
 *
 * 实现要点：
 *   - 在列表末尾插入一个 1px 高的“哨兵”元素，由 IntersectionObserver 观察
 *   - root 为滚动容器（window 滚动时传 null），rootMargin 底部设为 distance
 *   - 用 getBoundingClientRect 判断哨兵是否仍可见，内容不足一屏时连续加载
 *   - unbind 时 disconnect、移除监听、删除哨兵
 *
 * 放在 el-dialog 里用（见 src/views/test/scroll.vue 的 ②）：
 *   - 弹窗内容懒渲染，inserted 推迟到第一次打开，那一刻列表是空的；
 *   - 所以滚动根只能「认声明」——谁写了 overflow-y:auto/scroll 就是谁，
 *     不能要求此刻已经溢出，否则会退化成 window、盒子内部滚动全部失灵；
 *   - 首屏可以在 @opened 里再补一次（弹窗过渡结束时尺寸才稳定）；
 *   - 弹窗关闭只是 v-show，DOM 与指令状态都还在，重新打开不会重复拉。
 */

const STATE_KEY = "__infiniteScrollState__";
const SENTINEL_CLASS = "infinite-scroll-sentinel";

function noop() {}

function isWindow(el) {
  return el === window || el === document || el === document.documentElement;
}

function isAtBottom(container, distance) {
  if (isWindow(container)) {
    const doc = document.documentElement;
    return (
      window.innerHeight + window.pageYOffset >= doc.scrollHeight - distance
    );
  }
  return (
    container.scrollTop + container.clientHeight >=
    container.scrollHeight - distance
  );
}

/**
 * 找到真正的滚动容器
 * 元素自身（或最近祖先）声明了 overflow-y:auto/scroll → 用它
 * 都找不到 → window（页面级滚动）
 *
 * ⚠️ 这里不能要求「此刻已经溢出」（scrollHeight > clientHeight）：
 *   inserted 那一刻列表往往是空的，定高盒子的 scrollHeight === clientHeight，
 *   会把滚动根误判成 window —— 之后盒子内部的滚动就再也感知不到了。
 *   声明了 overflow 就说明它是设计上的滚动容器，直接采信。
 */
function resolveContainer(el) {
  let node = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY)) {
      return node;
    }
    node = node.parentNode;
  }
  return window;
}

function throttle(fn, wait) {
  let last = 0;
  let timer = null;

  const wrapped = function (...args) {
    const now = Date.now();
    const remain = wait - (now - last);
    if (remain <= 0) {
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remain);
    }
  };

  wrapped.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return wrapped;
}

function createState() {
  return {
    handler: noop,
    distance: 60,
    immediate: true,
    disabled: false,
    loading: false,
    container: null,
    sentinel: null,
    observer: null,
    onScroll: null,
  };
}

function applyBinding(state, binding) {
  const val = binding.value;

  if (typeof val === "function") {
    state.handler = val;
    state.disabled = false;
    return;
  }

  if (val && typeof val === "object") {
    state.handler = val.handler || noop;
    if (typeof val.distance === "number") state.distance = val.distance;
    if (typeof val.immediate === "boolean") state.immediate = val.immediate;
    if (typeof val.disabled === "boolean") state.disabled = val.disabled;
  }
}

function createSentinel(el) {
  const sentinel = document.createElement("div");
  sentinel.className = SENTINEL_CLASS;
  sentinel.style.cssText = "height:1px;width:100%;pointer-events:none;";
  el.appendChild(sentinel);
  return sentinel;
}

/** 哨兵是否仍在可视区（含 distance 提前量） */
function isSentinelVisible(state) {
  if (!state.sentinel || !state.sentinel.parentNode) return false;
  const rect = state.sentinel.getBoundingClientRect();

  if (isWindow(state.container)) {
    return rect.top <= window.innerHeight + state.distance;
  }

  const rootRect = state.container.getBoundingClientRect();
  return rect.top <= rootRect.bottom + state.distance;
}

function trigger(state) {
  if (state.loading || state.disabled) return;

  state.loading = true;
  let result;

  try {
    result = state.handler();
  } catch (e) {
    state.loading = false;
    throw e;
  }

  const done = () => {
    state.loading = false;

    // 加载完内容仍不满一屏时，IntersectionObserver 不会再次回调，
    // 这里主动补触发，直到填满或 disabled
    if (state.immediate && !state.disabled && isSentinelVisible(state)) {
      setTimeout(() => trigger(state), 0);
    }
  };

  if (result && typeof result.then === "function") {
    result.then(done, done);
  } else {
    done();
  }
}

function setupObserver(state) {
  state.observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      console.log(entry)
      if (!entry || !entry.isIntersecting) return;
      if (state.loading || state.disabled) return;
      trigger(state);
    },
    {
      root: isWindow(state.container) ? null : state.container,
      // 底部外扩 distance，实现“距底部 distance 就提前加载”
      rootMargin: `0px 0px ${state.distance}px 0px`,
      threshold: 0,
    }
  );

  state.observer.observe(state.sentinel);
}

function setupScrollFallback(state) {
  state.onScroll = throttle(() => {
    if (state.loading || state.disabled) return;
    if (isAtBottom(state.container, state.distance)) {
      trigger(state);
    }
  }, 120);

  state.container.addEventListener("scroll", state.onScroll, { passive: true });
}

function cleanup(state) {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }

  if (state.onScroll) {
    if (state.onScroll.cancel) state.onScroll.cancel();
    if (state.container)
      state.container.removeEventListener("scroll", state.onScroll);
    state.onScroll = null;
  }

  if (state.sentinel && state.sentinel.parentNode) {
    state.sentinel.parentNode.removeChild(state.sentinel);
  }
  state.sentinel = null;
}

export default {
  inserted(el, binding) {
    const state = createState();
    applyBinding(state, binding);
    el[STATE_KEY] = state;

    state.container = resolveContainer(el);
    state.sentinel = createSentinel(el);

    if (typeof IntersectionObserver !== "undefined") {
      setupObserver(state);
    } else {
      setupScrollFallback(state);
    }

    // 首屏内容不足一屏时自动触发
    if (state.immediate) {
      setTimeout(() => {
        if (state.disabled || state.loading) return;
        if (isSentinelVisible(state)) trigger(state);
      }, 50);
    }
  },

  update(el, binding) {
    const state = el[STATE_KEY];
    if (!state) return;

    applyBinding(state, binding);

    // Vue 插入新列表项后，哨兵可能不在末尾，重新移到最后
    if (
      state.sentinel &&
      state.sentinel.parentNode === el &&
      el.lastChild !== state.sentinel
    ) {
      el.appendChild(state.sentinel);
    }
  },

  unbind(el) {
    const state = el[STATE_KEY];
    if (!state) return;
    cleanup(state);
    el[STATE_KEY] = null;
  },
};
