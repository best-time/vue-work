module.exports = {
  presets: [
    ["@babel/preset-env", { modules: false }],
    ["@vue/cli-plugin-babel/preset"]
  ],
  plugins: [
    ["@babel/plugin-proposal-optional-chaining"],
    ["@babel/plugin-proposal-nullish-coalescing-operator"],
    // ---- webpack 4 不支持 import.meta 语法（Module parse failed: Unexpected token）----
    // src/utils/common.js 的 vite 分支里有 `import.meta.glob(...)` 字面量，
    // webpack 4 的解析器直接报错。此内联插件把「import.meta.xxx」整体替换成空对象字面量：
    // - webpack（走 babel）：`({}).glob(...)` 语法合法；运行时走不到（前面的
    //   `typeof require === "function"` 分支已 return），纯粹为了让解析器放行
    // - vite（esbuild 转译，不走 babel）：import.meta.glob 字面量原样保留，
    //   vite 的构建期 glob 转换正常工作
    // 不要用 babel-plugin-transform-import-meta：它只认 url/resolve/filename/dirname，
    // 不处理 import.meta.glob（v2 实测无效，v3 是纯 ESM，node 14 的 babel 加载不了）
    {
      visitor: {
        MemberExpression(path) {
          const node = path.node
          if (
            node.object.type === "MetaProperty" &&
            node.object.meta.name === "import" &&
            node.object.property.name === "meta"
          ) {
            path.replaceWith({ type: "ObjectExpression", properties: [] })
          }
        }
      }
    }
  ],
  exclude: [/node_modules/]
}
