export function getAssetsImgByPath(imageName, folderPath = "imgs") {
  return require(`@/assets/${folderPath}/${imageName}`);
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