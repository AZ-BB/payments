import { useState, useEffect } from 'react'
import Autocomplete from './Autocomplete'
import './PaymentForm.css'

function PaymentForm({ onSubmit, onCancel, uniqueBeneficiaries = [], uniqueAccounts = [], uniqueProjects = [], initialData = null }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    beneficiary: '',
    account: '',
    project: '',
    description: '',
    total: ''
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        beneficiary: initialData.beneficiary || '',
        account: initialData.account || '',
        project: initialData.project || '',
        description: initialData.description || '',
        total: initialData.total || ''
      })
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        beneficiary: '',
        account: '',
        project: '',
        description: '',
        total: ''
      })
    }
  }, [initialData])

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.date) newErrors.date = 'تاريخ مطلوب'
    if (!formData.beneficiary.trim()) newErrors.beneficiary = 'المستفيد مطلوب'
    if (!formData.account.trim()) newErrors.account = 'الحساب مطلوب'
    if (!formData.project.trim()) newErrors.project = 'المشروع مطلوب'
    if (!formData.total || parseFloat(formData.total) <= 0) {
      newErrors.total = 'الإجمالي يجب أن يكون رقمًا أكبر من الصفر'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) return

    const submitData = {
      ...formData,
      total: parseFloat(formData.total)
    }

    onSubmit(submitData)

    // Reset form only if not editing (editing will be handled by parent)
    if (!initialData) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        beneficiary: '',
        account: '',
        project: '',
        description: '',
        total: ''
      })
      setErrors({})
    }
  }

  const isEditing = !!initialData

  return (
    <div className="payment-form-container">
      <form className="payment-form" onSubmit={handleSubmit}>
        <h2>{isEditing ? 'تعديل دفعة' : 'إضافة دفعة جديدة'}</h2>
        
        <div className="form-group">
          <label htmlFor="date">تاريخ *</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={errors.date ? 'error' : ''}
          />
          {errors.date && <span className="error-message">{errors.date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="beneficiary">المستفيد *</label>
          <Autocomplete
            id="beneficiary"
            name="beneficiary"
            value={formData.beneficiary}
            onChange={handleChange}
            options={uniqueBeneficiaries}
            placeholder="أدخل اسم المستفيد أو اختر من القائمة"
            className={errors.beneficiary ? 'error' : ''}
            error={!!errors.beneficiary}
          />
          {errors.beneficiary && <span className="error-message">{errors.beneficiary}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="account">الحساب *</label>
          <Autocomplete
            id="account"
            name="account"
            value={formData.account}
            onChange={handleChange}
            options={uniqueAccounts}
            placeholder="أدخل الحساب أو اختر من القائمة"
            className={errors.account ? 'error' : ''}
            error={!!errors.account}
          />
          {errors.account && <span className="error-message">{errors.account}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="project">المشروع *</label>
          <Autocomplete
            id="project"
            name="project"
            value={formData.project}
            onChange={handleChange}
            options={uniqueProjects}
            placeholder="أدخل المشروع أو اختر من القائمة"
            className={errors.project ? 'error' : ''}
            error={!!errors.project}
          />
          {errors.project && <span className="error-message">{errors.project}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">وصف</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="أدخل الوصف"
            rows="3"
            className={errors.description ? 'error' : ''}
          />
          {errors.description && <span className="error-message">{errors.description}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="total">الإجمالي *</label>
          <input
            type="number"
            id="total"
            name="total"
            value={formData.total}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={errors.total ? 'error' : ''}
          />
          {errors.total && <span className="error-message">{errors.total}</span>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? 'تحديث' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PaymentForm

