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
import { parsePath } from '../../utils/common'

export default {
  name: 'Remoteselect',
  props: {
    ...formItemProps,
    relativeFilter: {
      type: Object,
      default: () => ({})
    },
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
    return {
      value: undefined,
      remoteOptions: [],
      // 是否更新 发起请求的标志
      updateFlg: true,
      loading: false,
      pageNum: 1,
      pages: 0
    }
  },
  computed: {
    compoundSelectOptions () {
      const { remoteOptions, staticOptions, filterVals } = this
      // 当前opts
      const _compoundOptions = staticOptions.concat(remoteOptions)
      // 筛选参数 keys 集合
      const filterValsKeys = Object.keys(filterVals)
      // 过滤数组 筛选出filter所标识的options
      return filterValsKeys.length ? _compoundOptions.filter(option => {
        // 符合筛选条件(并集)则返回true
        return filterValsKeys.every(key => option[key] === filterVals[key])
      }) : _compoundOptions
    }
  },
  watch: {
    value (newVal) {
      this.$emit('recieveRemoteSelectValue', {
        [this.prop]: newVal
      })
    },
    remoteParams () {
      // 关联参数值发生改变 触发请求
      Object.assign(this, {
        value: undefined,
        remoteOptions: [],
        updateFlg: true
      })
    },
    relativeFilter () {
      this.value = undefined
    },
    parent (newval, oldval) {
      const { paramProps, remoteParamsChange } = this
      // 监听forms params 变化，将兄弟formitem 关联起来
      // 被关联项改变，重置关联项的值
      paramProps.some(({ prop }) => newval[prop] !== oldval[prop]) && remoteParamsChange()
    }
  },
  created () {
    this.autoget && this.getRemoteData()
  },
  methods: {
    remoteParamsChange () {
      const { remoteParams, paramProps, parent } = this

      const _privateRemoteParams = { ...remoteParams }
      paramProps.forEach(({ prop, paramkey }) => {
        // 作为请求的参数
        _privateRemoteParams[paramkey] = parent[prop]
      })
      this.privateRemoteParams = _privateRemoteParams
    },
    async getRemoteData () {
      const { updateFlg, hostName, apiUrl, method, resultPath, remoteParams, labelkeyname, valuekeyname, autoget, pagination, pageNum, remoteOptions, pageNumKey, pagePath, paramProps, value } = this

      if (!updateFlg) return

      // 强关联项值为undefined 或者空 不请求
      const strongRealtiveBool = paramProps.every(({ require, paramkey }) => {
        return !require || remoteParams[paramkey] !== undefined && remoteParams[paramkey] !== ''
      })
      if (!strongRealtiveBool) return
      // 参数
      const _params = { ...remoteParams }
      // 分页
      pagination && Object.assign(_params, { [pageNumKey]: pageNum })
      // 请求远程数据
      this.loading = true
      const res = await httpService.accessAPI({ hostName, apiUrl, method, params: _params })
      // 分页
      const pages = pagination ? parsePath(res, pagePath, 0) : 0
      // 数据
      const result = parsePath(res, resultPath, [])
      // 格式化参数
      const dataList = result.map(item => {
        return {
          ...item,
          label: item[labelkeyname],
          value: item[valuekeyname]
        }
      }).concat(remoteOptions)
      // 主动更新情况 设置值为第一项
      const nVal = autoget && remoteOptions.length ? dataList[0].value : value
      // 标识重置
      Object.assign(this, {
        pages,
        remoteOptions,
        value: nVal,
        updateFlg: false,
        loading: false
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
      getRemoteData()
    }
  }
}

</script>
