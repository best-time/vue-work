import { ref, reactive } from '@vue/composition-api'

/**
 * 通用el‑form Hook
 * @param {Object} initForm 表单初始对象
 * @param {Object} rules 校验规则，同el‑form rules
 */
export function useForm(initForm, rules = {}) {
  // el‑form 组件ref实例
  const formRef = ref(null)
  // 表单数据
  const form = reactive({ ...initForm })
  // 校验规则
  const formRules = reactive({ ...rules })
  // 提交loading
  const submitLoading = ref(false)

  /**
   * 表单校验
   * @returns {Promise<boolean>} true校验通过 / false失败
   */
  async function validate() {
    if (!formRef.value) return false
    return new Promise((resolve) => {
      formRef.value.validate((valid) => {
        resolve(!!valid)
      })
    })
  }

  /** 重置表单 & 清空校验提示 */
  function resetForm() {
    // 恢复初始值
    Object.assign(form, initForm)
    if (formRef.value) {
      formRef.value.resetFields()
    }
  }

  /**
   * 执行提交
   * @param {Function} submitApi 提交接口函数 Promise
   * @returns {Promise<any|null>} 接口返回结果，校验失败返回null
   */
  async function handleSubmit(submitApi) {
    const isValid = await validate()
    if (!isValid) return null

    submitLoading.value = true
    try {
      const res = await submitApi({ ...form })
      return res
    } catch (err) {
      console.error('表单提交失败', err)
      return Promise.reject(err)
    } finally {
      submitLoading.value = false
    }
  }

  /**
   * 回填表单数据（编辑场景）
   * @param {Object} data 后端回传对象
   */
  function setFormData(data) {
    Object.keys(form).forEach((key) => {
      form[key] = data?.[key] ?? initForm[key]
    })
  }

  return {
    formRef,
    form,
    formRules,
    submitLoading,
    validate,
    resetForm,
    handleSubmit,
    setFormData
  }
}

/*
const {
      formRef,
      form,
      formRules,
      submitLoading,
      resetForm,
      handleSubmit,
      setFormData
    } = useForm(
      // 初始表单
      {
        name: '',
        phone: '',
        remark: ''
      },
      // el‑form校验规则
      {
        name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
      }
    )
*/