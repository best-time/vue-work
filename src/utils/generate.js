const toStr = Object.prototype.toString

function isStr(s) {
  return toStr.call(s) === '[object String]'
}

export function createObjectProps(defaultValue) {
  return {
    type: Object,
    default: () => (defaultValue && typeof defaultValue === 'object' ? defaultValue : {})
  }
}

export function createArrayProps(defaultValue) {
  return {
    type: Array,
    default: () => Array.isArray(defaultValue) ? defaultValue : []
  }
}

export function createBooleanProps(defaultValue) {
  return {
    type: Boolean,
    default: !!defaultValue
  }
}

export function createStringProps(defaultValue) {
  return {
    type: String,
    default: isStr(defaultValue) ? defaultValue : `${defaultValue}`
  }
}

export function createNumberProps(defaultValue) {
  return {
    type: Number,
    default: isNaN(parseFloat(`${defaultValue}`)) ? 0 : defaultValue
  }
}