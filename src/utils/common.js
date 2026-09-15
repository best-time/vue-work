/**
 * 解析 src/assets 下静态资源的 URL（双打包器兼容）。
 *
 * - webpack：require 存在，走动态 require 上下文（webpack 的动态 `new URL` 编译出来的是
 *   上下文模块调用，返回模块对象而非 URL 字符串，不能用）
 * - vite：没有 require；`import.meta.glob` 是**构建期转换**（运行时并不存在这个函数，
 *   所以不能用 `typeof import.meta.glob` 判断），eager 预收集全部资源成「路径 -> URL」表
 *
 * 因此只能用 `typeof require` 识别 webpack，让 vite 走默认分支。
 * @param {string} imageName 文件名，如 "icon-market.svg"
 * @param {string} [folderPath] assets 下的子目录，默认 "imgs"
 * @returns {string} 资源 URL
 */
export function getAssetsImgByPath(imageName, folderPath = "imgs") {
  if (typeof require === "function") {
    return require(`@/assets/${folderPath}/${imageName}`);
  }
  const mods = import.meta.glob("../assets/**/*", {
    eager: true,
    query: "?url",
    import: "default"
  });
  return mods[`../assets/${folderPath}/${imageName}`];
}


/**
 * 将值转换为数组
 * @param {*} target 
 * @returns {Array}
 */
export function toArray(target) {
  if (Array.isArray(target)) {
    return target;
  }
  return target ? [target]  : [];
}

/**
 * 返回有长度的数组,否则返回空数组
 * @param {*} target
 * @returns {Array}
 */
export function getArray(target) {
  return Array.isArray(target) && target.length ? target : [];
}

/**
 * 检查值是否为 null 或 undefined
 * @param {*} value 
 * @returns {boolean}
 */
export function isNil(value) {
  return value === null || value === undefined;
}

export function safeParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue || {}
  }
}

export function safeStringify(value, defaultValue = null) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return defaultValue || '""'
  }
}

export function checkType(target) {
  const value = Object.prototype.toString.call(target);
  const result = value.match(/\[object (\w+)\]/);
  return result ? result[1].toLowerCase() : '';
}

export function isType(target, type) {
  return checkType(target) === strTrim(type).toLowerCase();
}

export function strTrim(target) {
  return target ? `${target}`.trim() : '';
}


export function strEqual(...args) {
  if (args.length < 2) {
    return false;
  }
  if (args.length === 2) {
    return strTrim(args[0]) === strTrim(args[1]);
  }
  return [...new Set(args.map((it) => strTrim(it)))].length === 1;
}