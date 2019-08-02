<template>
  <el-select
    v-model="value"
    v-loading="loading"
    v-selectscroll="handleScroll"
    :disabled="disabled"
    :placeholder="placeholder"
    @focus="getRemoteData"
  >
    <el-option
      v-for="(option, i) in compoundSelectOptions"
      :key="i +'_'+ option.value"
      :disabled="disableflg === option[disablekeyname]"
      :value="option.value"
      :label="option.label"
    />
  </el-select>
</template>
<script>
import { formItemProps } from './props'
import httpService from '../../utils/httpService'
import { parsePath, filterSelectFunc, isObjectValueEqual, fmtDataList } from '../../utils/common'

export default {
  name: 'Remoteselect',
  props: {
    ...formItemProps,
    filterProps: {
      type: Array,
      default: () => ([])
    },
    paramProps: {
      type: Array,
      default: () => ([])
    },
    filterVals: {
      type: Object,
      default: () => ({})
    },
  },
  data () {
    console.log('ddddddddd')
    return {
      value: undefined,
      remoteOptions: [],
      // 是否更新 发起请求的标志
      updateFlg: true,
      loading: false,
      pageNum: 1,
      pages: 0,
      // 参数
      paramCache: {}
    }
  },
  computed: {
    // 有效参数
    fmtParams() {
      const { paramProps, remoteParams, parent, paramCache, clear } = this
      // 监听forms params 变化，将兄弟formitem 关联起来
      // 被关联项改变，重置关联项的值
      const _privateRemoteParams = { ...remoteParams }
      // 遍历赋值
      paramProps.forEach(({ prop, paramkey, require }) => {
        _privateRemoteParams[paramkey] = parent[prop]
        // 一个强关联项值是否为undefined或空
        // return require && (paramVal === undefined || paramVal === '')
      })
      // 有变化则清空
      !isObjectValueEqual(_privateRemoteParams, paramCache) && clear()
      // 任意一个强关联项值为undefined 或空、或参数对象无变化时 不请求数据
      return _privateRemoteParams
    },
    compoundSelectOptions () {
      const { remoteOptions, staticOptions, labelkeyname, valuekeyname, filterVals } = this
      // 返回过滤后的结果
      return filterSelectFunc(staticOptions.concat(remoteOptions), labelkeyname, valuekeyname, filterVals)
    }
  },
  watch: {
    value (newVal) {
      // 独立更新则向上级组件反馈
      const { prop, parent } = this
      parent[prop] !== newVal && this.$emit('recieveRemoteSelectValue', {
        [prop]: newVal
      })
    },
  },
  created () {
    this.autoget && this.getRemoteData()
  },
  methods: {
    abledReq() {
      const { paramProps, fmtParams, paramCache } = this
      // 无更新 返回false
      if(isObjectValueEqual(fmtParams, paramCache))
        return false
      return paramProps.every(({ paramkey, require }) => {
        // 当前值
        const paramVal = fmtParams[paramkey]
        // 一个强关联项值是否为undefined或空
        return !require || paramVal !== undefined && paramVal !== ''
      })
    },
    async getRemoteData (pageFlg) {
      const {
        updateFlg, hostName, apiUrl, method, resultPath, labelkeyname,
        valuekeyname, autoget, pagination, pageNum, remoteOptions, pageNumKey,
        pagePath, value, fmtParams, abledReq } = this
      // 正在执行 | 无更新 | 强关联项为空 时，直接返回
      if (!updateFlg || !abledReq()) return

      // 请求远程数据
      Object.assign(this, {
        loading: true,
        updateFlg: true
      })
      // 参数
      const _params = { ...fmtParams }
      // 分页
      pagination && Object.assign(_params, { [pageNumKey]: pageNum })
      // 请求数据
      const res = await httpService.accessAPI({ hostName, apiUrl, method, params: _params })
      // 分页结果
      const pages = pagination ? parsePath(res, pagePath, 0) : 0
      // 结果数据
      const result = parsePath(res, resultPath, [])
      // 格式化参数
      let dataList = result.map(item => fmtDataList(item, labelkeyname, valuekeyname))
      // 分页加载需与之前拼接
      pageFlg && (dataList = remoteOptions.concat(dataList))
      // 主动更新情况 设置值为第一项
      const nVal = value === undefined && autoget && dataList.length ? dataList[0].value : value
      // 标识重置
      Object.assign(this, {
        pages,
        remoteOptions: dataList,
        value: nVal,
        updateFlg: false,
        loading: false
      })
    },
    clear () {
      Object.assign(this, {
        value: undefined,
        remoteOptions: []
      })
    },
    reset () {
      this.value = undefined
    },
    /** *******************************
     ** Fn: handleScroll
     ** Intro: 处理滚动行为
     ** @params: direction 为true代表向下滚动,为false代表向上滚动
     *********************************/
    handleScroll (direction) {
      if (!direction) return
      // 请求下一页的数据
      let { pages, pageNum, getRemoteData } = this
      // 最后一页
      if (pageNum > --pages) return
      // 翻页
      Object.assign(this, {
        pageNum: ++pageNum,
        updateFlg: true
      })
      // 请求数据
      getRemoteData(true)
    }
  }
}

</script>
