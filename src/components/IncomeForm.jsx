import { useState, useEffect } from 'react'
import Autocomplete from './Autocomplete'
import './PaymentForm.css'

function IncomeForm({ onSubmit, onCancel, uniqueProjects = [], uniqueUnits = [], uniqueClients = [], uniquePaymentMethods = [], initialData = null }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project: '',
    unit: '',
    client: '',
    description: '',
    total: '',
    paymentMethod: '',
    paymentProof: ''
  })

  const formatNumberWithCommas = (value) => {
    if (!value && value !== 0) return ''
    // Remove all non-digit characters except decimal point
    const numericValue = String(value).replace(/[^\d.]/g, '')
    
    if (!numericValue) return ''
    
    // Split by decimal point
    const parts = numericValue.split('.')
    const integerPart = parts[0]
    const decimalPart = parts[1]
    
    // Format integer part with commas
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
    // Combine with decimal part if exists
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger
  }

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        project: initialData.project || '',
        unit: initialData.unit || '',
        client: initialData.client || '',
        description: initialData.description || '',
        total: formatNumberWithCommas(initialData.total),
        paymentMethod: initialData.paymentMethod || '',
        paymentProof: initialData.paymentProof || ''
      })
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        project: '',
        unit: '',
        client: '',
        description: '',
        total: '',
        paymentMethod: '',
        paymentProof: ''
      })
    }
  }, [initialData])

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'total') {
      // Format the total field with commas
      const formattedValue = formatNumberWithCommas(value)
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    
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
    if (!formData.project.trim()) newErrors.project = 'المشروع مطلوب'
    if (!formData.client.trim()) newErrors.client = 'العميل مطلوب'
    const numericTotal = parseFloat(formData.total.replace(/,/g, ''))
    if (!formData.total || isNaN(numericTotal) || numericTotal <= 0) {
      newErrors.total = 'الإجمالي يجب أن يكون رقمًا أكبر من الصفر'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) return

    // Remove commas from total before submitting
    const numericTotal = parseFloat(formData.total.replace(/,/g, ''))
    
    const submitData = {
      ...formData,
      total: numericTotal
    }

    onSubmit(submitData)

    // Reset form only if not editing (editing will be handled by parent)
    if (!initialData) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        project: '',
        unit: '',
        client: '',
        description: '',
        total: '',
        paymentMethod: '',
        paymentProof: ''
      })
      setErrors({})
    }
  }

  const isEditing = !!initialData

  return (
    <div className="payment-form-overlay" onClick={onCancel}>
      <div className="payment-form-container" onClick={(e) => e.stopPropagation()}>
        <div className="payment-form-header">
          <h2>{isEditing ? 'تعديل الإيراد' : 'إضافة إيراد جديد'}</h2>
          <button 
            type="button" 
            className="close-button"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form className="payment-form" onSubmit={handleSubmit}>
        
        <div className="form-group">
          <label htmlFor="date">التاريخ *</label>
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
          <label htmlFor="unit">الوحدة</label>
          <Autocomplete
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            options={uniqueUnits}
            placeholder="أدخل الوحدة أو اختر من القائمة"
            className={errors.unit ? 'error' : ''}
            error={!!errors.unit}
          />
          {errors.unit && <span className="error-message">{errors.unit}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="client">العميل *</label>
          <Autocomplete
            id="client"
            name="client"
            value={formData.client}
            onChange={handleChange}
            options={uniqueClients}
            placeholder="أدخل العميل أو اختر من القائمة"
            className={errors.client ? 'error' : ''}
            error={!!errors.client}
          />
          {errors.client && <span className="error-message">{errors.client}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">الوصف</label>
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
            type="text"
            id="total"
            name="total"
            value={formData.total}
            onChange={handleChange}
            placeholder="0.00"
            inputMode="decimal"
            className={errors.total ? 'error' : ''}
          />
          {errors.total && <span className="error-message">{errors.total}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="paymentMethod">وسيلة الدفع</label>
          <Autocomplete
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            options={uniquePaymentMethods}
            placeholder="أدخل وسيلة الدفع أو اختر من القائمة"
            className={errors.paymentMethod ? 'error' : ''}
            error={!!errors.paymentMethod}
          />
          {errors.paymentMethod && <span className="error-message">{errors.paymentMethod}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="paymentProof">إثبات الدفع (رابط)</label>
          <input
            type="url"
            id="paymentProof"
            name="paymentProof"
            value={formData.paymentProof}
            onChange={handleChange}
            placeholder="https://example.com/proof"
            className={errors.paymentProof ? 'error' : ''}
          />
          {errors.paymentProof && <span className="error-message">{errors.paymentProof}</span>}
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
    </div>
  )
}

export default IncomeForm

