module.exports = {
  presets: [
    ["@babel/preset-env", { modules: false }],
    ["@vue/cli-plugin-babel/preset"]
  ],
  plugins: [
    ["@babel/plugin-proposal-optional-chaining"],
    ["@babel/plugin-proposal-nullish-coalescing-operator"]
  ]
}
