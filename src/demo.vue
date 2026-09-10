<template>
  <div class="x6-demo">
    <div class="x6-demo__bar">
      <el-radio-group v-model="layoutName" size="small" @change="handleLayoutChange">
        <el-radio-button label="dagre">层次 dagre</el-radio-button>
        <el-radio-button label="grid">网格 grid</el-radio-button>
        <el-radio-button label="circular">环形 circular</el-radio-button>
      </el-radio-group>

      <el-button size="small" type="primary" @click="applyLayout(layoutName)">重新布局</el-button>
      <el-button size="small" @click="addNode">加一个节点</el-button>
      <el-button size="small" @click="cycleAllStatus">轮转节点状态</el-button>
      <el-button size="small" @click="resetGraph">重置</el-button>

      <el-tag size="small" type="info">节点 {{ nodeCount }} · 连线 {{ edgeCount }}</el-tag>
      <el-tag size="small">布局 {{ layoutName }}</el-tag>
    </div>

    <div ref="canvas" class="x6-demo__canvas"></div>

    <p class="x6-demo__tip">
      空白处按住拖拽可平移画布，滚轮缩放需按住 Ctrl / ⌘；<b>拖动节点</b>可调整位置，<b>点击节点</b>可切换它的状态。
      节点内部是真实 Vue 组件（@antv/x6-vue-shape），位置由 @antv/layout 计算。
    </p>
  </div>
</template>

<script>
import { Graph } from '@antv/x6'
// 副作用导入：注册 vue-shape 图形/视图，并挂上 Graph.registerVueComponent。
// 注意 1.5.x 里 **没有** `register` 导出，别再按老文档写 register({ shape, component })。
import '@antv/x6-vue-shape'
import '@antv/x6/dist/x6.css'
import { DagreLayout, GridLayout, CircularLayout } from '@antv/layout'

/** 节点尺寸：布局计算和真实渲染必须一致，否则连线会「错位」 */
const NODE_W = 224
const NODE_H = 92
/** 布局结果整体贴到左上角时留的边距 */
const PADDING = 40
/** 注册到 x6 的图形名 */
const SHAPE_NAME = 'demo-pipeline-node'
/** 注册到 x6-vue-shape 的组件名 */
const COMPONENT_NAME = 'demo-pipeline-card'

const STATUS_TEXT = { done: '已完成', doing: '进行中', todo: '待开始' }
const STATUS_ORDER = ['todo', 'doing', 'done']

const EDGE_LINE_ATTRS = {
  line: {
    stroke: '#b3bccf',
    strokeWidth: 1.5,
    targetMarker: { name: 'classic', size: 7 }
  }
}

/**
 * 节点内部渲染的 Vue 组件。
 *
 * 三个必须知道的约束：
 * 1. x6-vue-shape 是在当前组件的 scope **之外** `new Vue()` 把它挂进 foreignObject 的，
 *    所以 scoped 样式对它无效 —— 卡片样式见文件末尾那段非 scoped 的 <style>。
 * 2. 本项目是 runtime-only 构建（vue-cli 默认别名 vue -> vue/dist/vue.runtime.esm.js），
 *    没有模板编译器，所以这里只能用 render 函数，不能写 template 字符串。
 * 3. **别指望用 props 拿 node / graph**。x6-vue-shape@1.5.4 内部是
 *    `h(component, { graph, node })`，而在 Vue 2.7 下 vue-demi 的 h 就是 Vue 2.7 自己的 h
 *    （`createElement(currentInstance, type, props, children, 2, true)`，按 (type, props, children) 转发），
 *    于是 { graph, node } 被当成 VNodeData —— 但 Vue 2 只认 data.props / data.attrs 里的值，
 *    **顶层键会被直接忽略**。实测：写 `props: ['node','graph']` 时 this.node === undefined，卡片空白。
 *    （在 Vue 2.6 + vue-demi 的 v2 分支下能侥幸拿到，所以老 demo 看起来是好的，升级后就翻车。）
 *    官方给的正确通道是它 provide 出来的 getNode / getGraph —— 用 inject 取。
 */
const NodeCard = {
  inject: {
    getNode: { default: null },
    getGraph: { default: null }
  },
  data() {
    return { label: '', desc: '', status: 'todo' }
  },
  created() {
    this.syncFromNode()
    const node = this.resolveNode()
    if (node) {
      // node.setData() 会触发 change:data，这里跟着刷新，实现「数据驱动节点内容」
      node.on('change:data', this.syncFromNode, this)
    }
  },
  beforeDestroy() {
    const node = this.resolveNode()
    if (node) {
      node.off('change:data', this.syncFromNode, this)
    }
  },
  methods: {
    resolveNode() {
      return this.getNode ? this.getNode() : null
    },
    syncFromNode() {
      const node = this.resolveNode()
      const data = (node && node.getData()) || {}
      this.label = data.label || ''
      this.desc = data.desc || ''
      this.status = data.status || 'todo'
    }
  },
  render(h) {
    return h('div', { class: 'x6-card is-' + this.status }, [
      h('div', { class: 'x6-card__body' }, [
        h('div', { class: 'x6-card__label' }, this.label),
        h('div', { class: 'x6-card__desc' }, this.desc)
      ]),
      h('span', { class: 'x6-card__badge' }, STATUS_TEXT[this.status] || '')
    ])
  }
}

const BASE_NODES = [
  { id: 'req', label: '需求评审', desc: 'PM + 前后端', status: 'done' },
  { id: 'design', label: '方案设计', desc: '接口 / 数据结构', status: 'done' },
  { id: 'dev', label: '编码开发', desc: '前端 + 后端', status: 'doing' },
  { id: 'mock', label: '接口联调', desc: 'Mock → 真实接口', status: 'doing' },
  { id: 'test', label: '单元测试', desc: 'jsdom + 断言', status: 'todo' },
  { id: 'build', label: '构建打包', desc: 'vue-cli-service build', status: 'todo' },
  { id: 'deploy', label: '部署上线', desc: '灰度 → 全量', status: 'todo' },
  { id: 'monitor', label: '线上监控', desc: '错误率 / 性能', status: 'todo' }
]

const BASE_EDGES = [
  ['req', 'design'],
  ['design', 'dev'],
  ['design', 'mock'],
  ['dev', 'test'],
  ['mock', 'test'],
  ['test', 'build'],
  ['build', 'deploy'],
  ['deploy', 'monitor']
]

export default {
  name: 'X6LayoutDemo',
  data() {
    return {
      layoutName: 'dagre',
      nodeCount: 0,
      edgeCount: 0
    }
  },
  mounted() {
    // 等容器挂到 DOM 上拿到尺寸后再建图
    this.$nextTick(this.initGraph)
  },
  beforeDestroy() {
    if (this.graph) {
      // dispose 会连带销毁所有节点视图（含 foreignObject 里的 Vue 实例）
      this.graph.dispose()
      this.graph = null
    }
  },
  methods: {
    initGraph() {
      if (!this.$refs.canvas) {
        return
      }

      // 图形注册放在建图之前；第三参 true = 覆盖，避免热更新/二次进入时报「已注册」
      Graph.registerVueComponent(COMPONENT_NAME, NodeCard, true)
      Graph.registerNode(
        SHAPE_NAME,
        {
          inherit: 'vue-shape',
          width: NODE_W,
          height: NODE_H,
          component: COMPONENT_NAME
        },
        true
      )

      this.graph = new Graph({
        container: this.$refs.canvas,
        autoResize: true,
        background: { color: '#fbfbfd' },
        grid: {
          size: 16,
          visible: true,
          type: 'dot',
          args: { color: '#e6e8ef', thickness: 1 }
        },
        panning: { enabled: true, eventTypes: ['leftMouseDown', 'mouseWheel'] },
        mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'], minScale: 0.4, maxScale: 2 },
        connecting: {
          router: 'manhattan',
          connector: { name: 'rounded', args: { radius: 8 } },
          anchor: 'center',
          connectionPoint: 'anchor',
          allowBlank: false,
          allowLoop: false,
          createEdge() {
            return this.createEdge({ attrs: EDGE_LINE_ATTRS })
          }
        }
      })

      this.graph.on('node:click', (payload) => {
        this.cycleNodeStatus(payload.node)
      })
      this.graph.on('edge:connected', () => {
        this.refreshCounts()
      })

      this.resetGraph()
    },

    /** 重置成初始的流水线数据，并跑一次当前布局 */
    resetGraph() {
      if (!this.graph) {
        return
      }

      const cells = []

      BASE_NODES.forEach((item) => {
        cells.push({
          id: item.id,
          shape: SHAPE_NAME,
          x: 0,
          y: 0,
          data: { label: item.label, desc: item.desc, status: item.status }
        })
      })

      BASE_EDGES.forEach((pair) => {
        cells.push({
          shape: 'edge',
          source: pair[0],
          target: pair[1],
          attrs: EDGE_LINE_ATTRS,
          zIndex: -1
        })
      })

      // fromJSON 会整体替换掉旧模型，不用先 clearCells
      this.graph.fromJSON(cells)
      this.extraSeq = 0
      this.applyLayout(this.layoutName)
      this.refreshCounts()
    },

    handleLayoutChange(name) {
      this.applyLayout(name)
    },

    /**
     * 用 @antv/layout 算出坐标，再写回 x6 的节点。
     *
     * 关键点：三种布局返回的 (x, y) 语义不完全一致（dagre 是节点中心、grid 是格子中心），
     * 所以这里统一按「中心点」处理 —— 减去半个节点尺寸，再把整体平移到左上角留白处，
     * 这样无论用哪种算法，画布上的结果都不会跑到负坐标区或者贴边。
     */
    applyLayout(name) {
      const graph = this.graph
      if (!graph) {
        return
      }

      const cells = graph.getNodes()
      if (!cells.length) {
        return
      }

      const layoutNodes = cells.map((cell) => ({ id: cell.id, size: [NODE_W, NODE_H] }))
      const layoutEdges = graph.getEdges().map((edge) => ({
        source: edge.getSourceCellId(),
        target: edge.getTargetCellId()
      }))

      const instance = this.createLayout(name)
      if (!instance) {
        return
      }

      const model = instance.layout({ nodes: layoutNodes, edges: layoutEdges })
      if (!model || !model.nodes) {
        return
      }

      this.moveToTopLeft(model.nodes)
      // 整体缩放到可视区内（不超过 1 倍，避免小图被拉大变糊）。
      // dagre 纵向铺开后高 ~1200px，比画布还高，centerContent 只平移会裁掉顶部。
      graph.zoomToFit({ padding: 32, maxScale: 1 })
    },

    /** 按名字造一个 @antv/layout 的实例；节点/边数据在 applyLayout 里统一喂给 layout() */
    createLayout(name) {
      if (name === 'grid') {
        const box = this.$refs.canvas ? this.$refs.canvas.getBoundingClientRect() : null
        return new GridLayout({
          type: 'grid',
          width: box && box.width ? Math.round(box.width) : 960,
          height: box && box.height ? Math.round(box.height) : 520,
          nodeSize: [NODE_W, NODE_H],
          preventOverlap: true,
          nodeSpacing: 48,
          condense: false
        })
      }

      if (name === 'circular') {
        return new CircularLayout({
          type: 'circular',
          radius: 300,
          startAngle: Math.PI / 2,
          endAngle: Math.PI / 2 + Math.PI * 2,
          clockwise: true,
          divisions: 1,
          ordering: 'topology',
          nodeSize: [NODE_W, NODE_H],
          preventOverlap: true,
          preventOverlapPadding: 20
        })
      }

      return new DagreLayout({
        type: 'dagre',
        rankdir: 'TB',
        align: 'UL',
        nodesep: 40,
        ranksep: 96,
        nodeSize: [NODE_W, NODE_H],
        controlPoints: false
      })
    },

    /** 把布局结果（中心点语义）转成 x6 的左上角坐标，并整体贴到左上角 */
    moveToTopLeft(positions) {
      const graph = this.graph
      let minX = Infinity
      let minY = Infinity

      positions.forEach((point) => {
        const x = point.x - NODE_W / 2
        const y = point.y - NODE_H / 2
        if (x < minX) {
          minX = x
        }
        if (y < minY) {
          minY = y
        }
      })

      if (minX === Infinity) {
        return
      }

      positions.forEach((point) => {
        const cell = graph.getCellById(point.id)
        if (!cell) {
          return
        }
        const x = Math.round(point.x - NODE_W / 2 - minX + PADDING)
        const y = Math.round(point.y - NODE_H / 2 - minY + PADDING)
        cell.position(x, y)
      })
    },

    /** 往图上追加一个节点（挂在最后一个基础节点上），再重排 */
    addNode() {
      const graph = this.graph
      if (!graph) {
        return
      }

      this.extraSeq = this.extraSeq || 0
      this.extraSeq += 1

      const id = 'extra-' + this.extraSeq
      const from = BASE_NODES[(this.extraSeq - 1) % BASE_NODES.length].id

      graph.addNode({
        id: id,
        shape: SHAPE_NAME,
        x: 0,
        y: 0,
        data: {
          label: '临时任务 ' + this.extraSeq,
          desc: '点我切换状态',
          status: 'todo'
        }
      })

      if (graph.getCellById(from)) {
        graph.addEdge({ source: from, target: id, attrs: EDGE_LINE_ATTRS, zIndex: -1 })
      }

      this.applyLayout(this.layoutName)
      this.refreshCounts()
    },

    /** 单个节点状态轮转：走 node.setData()，节点里的 Vue 组件通过 change:data 自动刷新 */
    cycleNodeStatus(node) {
      if (!node || typeof node.getData !== 'function') {
        return
      }

      const data = node.getData() || {}
      const index = STATUS_ORDER.indexOf(data.status)
      const nextStatus = STATUS_ORDER[(index + 1) % STATUS_ORDER.length]

      node.setData({
        label: data.label || node.id,
        desc: data.desc || '',
        status: nextStatus
      })
    },

    cycleAllStatus() {
      if (!this.graph) {
        return
      }
      this.graph.getNodes().forEach((node) => this.cycleNodeStatus(node))
    },

    refreshCounts() {
      if (!this.graph) {
        return
      }
      this.nodeCount = this.graph.getNodes().length
      this.edgeCount = this.graph.getEdges().length
    }
  }
}
</script>

<!-- 页面外壳用 scoped 就够了 -->
<style scoped>
.x6-demo {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 12px 16px;
}
.x6-demo__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.x6-demo__canvas {
  flex: 1;
  min-height: 320px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}
.x6-demo__tip {
  flex: none;
  margin: 8px 2px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
}
</style>

<!--
  节点卡片必须是**非 scoped** 的：它就是渲染在节点内的那个 Vue 组件的样式，
  而那个组件是 x6-vue-shape 在别的 scope 里 new 出来的，拿不到 data-v-xxx 属性。
  用 .x6-card 前缀避免污染其它页面。
-->
<style>
/*
 * 关键修复：src/styles/reset.css 里有 `svg { height: auto; max-width: 100% }`，
 * CSS 声明的优先级高于 svg 元素上的 height="100%" 属性，于是 x6 画布的 svg
 * 被 `height: auto` 压成了浏览器对无固有尺寸替换元素的默认高度（约 150px），
 * 表现为「画布只剩顶部一条能看见/能拖拽，下面全是空白」。
 * 这里把画布 svg 恢复成撑满容器（.x6-graph-svg 本身就是 absolute + inset:0）。
 * 选择器限定在 .x6-demo__canvas 内，不影响其它页面的普通 svg 图标。
 */
.x6-demo__canvas svg {
  height: 100%;
  max-width: none;
}
/*
 * 第二个坑：reset.css 的 `body { min-height: 100vh }` 会命中 x6 塞进
 * foreignObject 里的嵌套 <body>，节点卡片跟着 height:100% 被拉到整屏高，
 * 全部叠在一起（拖拽/点击都会错乱）。这里把嵌套 body 的最小高度清掉。
 */
.x6-demo__canvas foreignObject > body {
  min-height: 0;
}
.x6-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 12px 16px 12px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  border: 1px solid #dcdfe6;
  border-left: 5px solid #c0c4cc;
  border-radius: 10px;
  background: #ffffff;
  font-family: inherit;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(31, 45, 61, 0.08);
}
.x6-card__label {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.x6-card__desc {
  font-size: 13px;
  line-height: 1.25;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.x6-card__badge {
  font-size: 12px;
  line-height: 1;
  color: #a8abb2;
}
.x6-card.is-done {
  border-left-color: #67c23a;
  background: #f6fbf3;
}
.x6-card.is-done .x6-card__badge {
  color: #67c23a;
}
.x6-card.is-doing {
  border-left-color: #e6a23c;
  background: #fdfaf3;
}
.x6-card.is-doing .x6-card__badge {
  color: #e6a23c;
}
.x6-card.is-todo {
  border-left-color: #c0c4cc;
}
</style>
