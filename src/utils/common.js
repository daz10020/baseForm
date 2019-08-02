// 路径解析
export const parsePath = (data, fmt = [], def = undefined) => {
  // 没有路径
  if (fmt.length) return def
  // 初始值
  let res = data
  try {
    // 遍历
    fmt.forEach(key => {
      res = res[key]
    })
  } catch (e) {
    // 没返回则返回默认值
    res = def
  }
  return res
}
export const deepCopy = (obj, cache = []) => {

  // just return if obj is immutable value
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // if obj is hit, it is in circular structure
  const hit = cache.filter(c => c.original === obj)[0]
  if (hit) {
    return hit.copy
  }

  const copy = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  cache.push({
    original: obj,
    copy
  })

  Object.keys(obj).forEach(key => {
    copy[key] = deepCopy(obj[key], cache)
  })

  return copy
}
// 格式化数组
export const fmtDataList = (item, labelkeyname, valuekeyname) => {
  return typeof item !== 'object' ? {
    label: item,
    value: item
  } : {
    ...item,
    label: item[labelkeyname],
    value: item[valuekeyname]
  };
}
// select过滤
export const filterSelectFunc = (options, labelkeyname, valuekeyname, filterVals) => {
  // 筛选参数 keys 集合
  const filterValsKeys = Object.keys(filterVals)
  // 结果
  const res = []
  // 过滤数组 筛选出filter所标识的options
  options.forEach(option => {
    // options不是对象类型 或者 符合筛选条件(并集)则返回true
    if (!filterValsKeys.length || filterValsKeys.every(key => option[key] === filterVals[key]))  {
      // 格式化后结果
      res.push(fmtDataList(options, labelkeyname, valuekeyname))
    }
  })
  return res
}

// 对比两个对象的值是否完全相等 返回值 true/false
export const isObjectValueEqual =  (a, b) => {
  const aType = typeof a, bType = typeof b
  if (aType !== bType) return false
  if (aType === 'object') {
    //取对象a和b的属性名
    const aProps = Object.keys(a)
    const bProps = Object.keys(b)
    // 判断属性名的length是否一致
    if (aProps.length != bProps.length) return false
    // 判断属性名是否都能找到
    if (aProps.some(key => bProps.indexOf(key) === -1)) return false
    // 判断属性值
    return aProps.every(key => isObjectValueEqual(a[key], b[key]))
  } else {
    return a === b
  }
}
