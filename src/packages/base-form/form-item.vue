<template>
  <el-form-item
    :label="label"
    :prop="realprop"
    :rules="realRules"
    :label-width="labelWidth"
  >
    <!-- 普通输入框 -->
    <el-input
      v-if="itemType==='input'"
      v-model="value"
      v-loading="loading"
      :disabled="disabled"
      :placeholder="fmtPlaceholder"
      :type="inputType"
      :rows="rows"
    >
      <template v-for="(_slot,i) in slots" :slot="_slot.type">
        <span :key="_slot.type+i">{{ _slot.text }}</span>
      </template>
    </el-input>

    <!-- 计数器 -->
    <div
      v-else-if="itemType==='number'"
      class="inputnumber"
    >
      <template v-for="(_slot,i) in prependSlot">
        <span
          :key="_slot.type+i"
          class="addition"
        >{{ _slot.text }}</span>
      </template>
      <el-input-number
        v-model="value"
        :disabled="disabled"
        :min="min"
        :max="max"
        :step="step"
        :step-strictly="stepStrictly"
      />
      <template v-for="(_slot,i) in appendSlot">
        <span
          :key="_slot.type+i"
          class="addition"
        >{{ _slot.text }}</span>
      </template>
    </div>

    <!-- 单选 -->
    <el-radio-group
      v-else-if="itemType==='radio'"
      v-model="value"
      :disabled="disabled"
      @change="handleChange"
    >
      <el-radio
        v-for="({value, disabled, label}, i) in optionsFmtRes"
        :key="`${i}_${value}`"
        :label="value"
        :disabled="disabled"
      >
        {{ label }}
      </el-radio>
    </el-radio-group>

    <!-- 多选 -->
    <el-checkbox-group
      v-else-if="itemType === 'checkbox'"
      v-model="value"
      :disabled="disabled"
      @change="handleChange"
    >
      <el-checkbox
        v-for="({value, disabled, label}, i) in optionsFmtRes"
        :key="`${i}_${value}`"
        :label="value"
        :disabled="disabled"
      >
        {{ label }}
      </el-checkbox>
    </el-checkbox-group>

    <!-- 本地下拉框 -->
    <el-select
      v-else-if="itemType==='select'"
      v-model="value"
      :disabled="disabled"
      :placeholder="fmtPlaceholder"
      :filterable="filterable"
      @change="handleChange"
    >
      <el-option
        v-for="({value, disabled, label}, i) in optionsFmtRes"
        :key="`${i}_${value}`"
        :label="label"
        :value="value"
      />
    </el-select>

    <!-- 日期选择框 -->
    <el-date-picker
      v-else-if="itemType==='date'"
      v-model="value"
      :disabled="disabled"
      :format="format"
      :value-format="valueFormat"
      :type="dateType"
      :start-placeholder="startPlaceholder"
      :end-placeholder="endPlaceholder"
      :placeholder="fmtPlaceholder"
    />

    <!-- 远程下拉框 -->
    <remote-select
      v-else-if="itemType === 'remoteselect'"
      :ref="prop + '_remoteSelect'"
      :disabled="disabled"
      :placeholder="fmtPlaceholder"
      :prop="prop"
      :host-name="hostName"
      :api-url="apiUrl"
      :method="method"
      :remote-params="remoteParams"
      :filter-prop="filterProps"
      :param-prop="paramProps"
      :parent="parent"
      :disableflg="disableflg"
      :disablekeyname="disablekeyname"
      :labelkeyname="labelkeyname"
      :valuekeyname="valuekeyname"
      :static-options="staticOptions"
      :static-filter="staticFilter"
      :relative-filter="relativeFilter"
      :autoget="autoget"
      :result-path="resultPath"
      :pagination="pagination"
      :page-num-key="pageNumKey"
      :filter-vals="filterVals"
      @recieveRemoteSelectValue="recieveRemoteSelectValue"
    />
  </el-form-item>
</template>

<script>
import { formItemProps } from './props'
import remoteSelect from './form-item-remoteselect'
import httpService from '../../utils/httpService'
import { deepCopy, parsePath, filterSelectFunc } from '../../utils/common'

export default {
  name: 'FormItem',
  components: {
    remoteSelect
  },
  props: formItemProps,
  data () {
    const { relativeProp = [] } = this
    // 拆分
    const filterProps = [], paramProps = []
    relativeProp.forEach(props => {
      const { paramkey, filterkey } = props
      paramkey !== undefined && paramProps.push(props)
      filterkey !== undefined && filterProps.push(props)
    })

    return {
      loading: false,
      value: undefined,
      relativeFilter: {},
      // 筛选参数列表
      filterProps,
      // 动态请求参数列表
      paramProps
    }
  },
  computed: {
    prependSlot () {
      return this.filterSlot('prepend')
    },
    appendSlot () {
      return this.filterSlot('append')
    },
    realprop () {
      const { prop } = this
      return Array.isArray(prop) ? prop[0] : prop
    },
    realRules () {
      return this.generateRules()
    },
    // 格式化placeholder
    fmtPlaceholder () {
      const { placeholder, itemType } = this
      return placeholder === undefined ? itemType === 'input' ? '请输入' : '请选择' : placeholder
    },
    // 筛选条件
    filterVals() {
      const { filterProps, staticFilter, parent } = this
      // 筛选参数 当前值
      const res = { ...staticFilter }
      // 过滤配置 筛选出有意义的标识
      filterProps.forEach(({ prop, filterkey, require }) => {
        // 标识val
        const filterVal = parent[prop];
        // 赋值
        (filterVal !== undefined || require) && (res[filterkey] = filterVal)
      })
      // 如果有改变则返回新的筛选条件
      return res
    },
    optionsFmtRes() {
      const { options, labelkeyname, valuekeyname, filterVals } = this
      // 返回过滤后的结果
      return filterSelectFunc(options, labelkeyname, valuekeyname, filterVals)
    }
  },
  watch: {
    value (newVal) {
      const { prop } = this
      const obj = {}
      if (Array.isArray(prop)) {
        prop.forEach((vv, i) => {
          obj[vv] = newVal[i]
        })
      } else {
        obj[prop] = newVal
      }
      this.$emit('recieveFormItemValue', obj)
    }
  },
  created () {
    this.initVal()
  },
  methods: {
    // slot类型区分
    filterSlot (type) {
      const { slots } = this
      return slots && slots.length ? slots.filter(item => item.type === type) : []
    },
    // 数组数据处理
    handleArrItem (val, alternate) {
      return val === undefined ? alternate : val
    },
    // 初始化value
    initVal () {
      const { defaultValue, itemCur, itemType } = this
      let _value = itemCur === undefined ? defaultValue : itemCur
      // checkbox 初始值不可以为undefined
      this.value = itemType === 'checkbox' && _value === undefined ? [] : _value
    },
    // 重置val
    reset (type) {
      const { itemType, prop } = this
      if (itemType === 'remoteselect') {
        this.$refs[`${prop}_remoteSelect`].reset()
      }
      if (type === 'clear') {
        this.value = Array.isArray(prop) ? ['', ''] : itemType === 'checkbox' ? [] : undefined
      } else {
        this.initVal()
      }
    },
    // 接收remoteSelect 值
    recieveRemoteSelectValue (obj) {
      this.$emit('recieveFormItemValue', obj)
    },
    // change emit
    handleChange (value) {
      const { change, formrefname } = this
      typeof change === 'function' && change(value, formrefname)
    },
    // 唯一性验证方法
    validateUniqueCode ({ hostName, apiUrl, method, message, paramkey, statusPath, messagePath }) {
      return async (rule, value, callback, sourse) => {
        const params = {}
        paramkey !== undefined ? Object.assign(params, { [paramkey]: value }) : Object.assign(params, sourse)

        this.loading = true
        const res = await httpService.accessAPI({ hostName, apiUrl, method, params })
        this.loading = false

        const status = parsePath(res, statusPath)
        // 远程验证
        status ? callback() : callback(new Error(parsePath(res, messagePath, message)))
      }
    },
    // 生成唯一性验证 rules
    generateRules () {
      const { rules, checkApi, checkApi: { trigger } = {}, validateUniqueCode } = this
      const realRules = deepCopy(rules)
      checkApi && realRules.push({
        validator: validateUniqueCode(checkApi), trigger
      })
      return realRules
    }
  }
}
</script>
<style>
  .inputnumber {
    display: inline-table;
    width: 100%;
  }

  .inputnumber .el-input-number {
    width: 100%;
  }

  .inputnumber .addition {
    color: #909399;
    vertical-align: middle;
    display: table-cell;
    position: relative;
    border-radius: 0 4px 4px 0;
    padding: 0 20px;
    width: 1px;
    white-space: nowrap;
    font-size: 14px;
    line-height: 25px;
  }

  .base-form .el-radio__input {
    vertical-align: top;
    outline: none;
  }

  .base-form .el-radio__label, .base-form .el-checkbox {
    font-weight: normal;
  }

  .base-form .el-select, .base-form .el-input__inner {
    width: 100%;
  }
</style>
