import { useState } from 'react'
import { EditIcon, DeleteIcon } from './Icons'
import './PaymentList.css'

function PaymentList({ payments, loading, filters, onFiltersChange, onDelete, onEdit, uniqueBeneficiaries = [], uniqueAccounts = [], uniqueProjects = [] }) {
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (name, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: '',
      dateTo: '',
      beneficiary: '',
      account: '',
      project: ''
    })
  }

  const hasActiveFilters = Object.values(filters).some(val => val !== '')

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US')
  }

  const formatNumber = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="payment-list-container">
        <div className="loading">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="payment-list-container">
      <div className="list-header">
        <h2>Records ({payments.length})</h2>
        <div className="header-actions">
          <button 
            className="btn btn-filter"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Filter'}
          </button>
          {hasActiveFilters && (
            <button 
              className="btn btn-clear"
              onClick={clearFilters}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group date-range-group">
            <label>من تاريخ</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="filter-group date-range-group">
            <label>إلى تاريخ</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>المستفيد</label>
            <select
              value={filters.beneficiary}
              onChange={(e) => handleFilterChange('beneficiary', e.target.value)}
            >
              <option value="">الكل</option>
              {uniqueBeneficiaries.map((beneficiary, index) => (
                <option key={index} value={beneficiary}>{beneficiary}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>الحساب</label>
            <select
              value={filters.account}
              onChange={(e) => handleFilterChange('account', e.target.value)}
            >
              <option value="">الكل</option>
              {uniqueAccounts.map((account, index) => (
                <option key={index} value={account}>{account}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>المشروع</label>
            <select
              value={filters.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
            >
              <option value="">الكل</option>
              {uniqueProjects.map((project, index) => (
                <option key={index} value={project}>{project}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="empty-state">
          {hasActiveFilters ? 'لا توجد نتائج للبحث' : 'لا توجد مدفوعات مسجلة'}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>تاريخ</th>
                <th>المستفيد</th>
                <th>الحساب</th>
                <th>المشروع</th>
                <th>الوصف</th>
                <th>الإجمالي</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{payment.beneficiary}</td>
                  <td>{payment.account}</td>
                  <td>{payment.project}</td>
                  <td>{payment.description || '—'}</td>
                  <td className="total-cell">{formatNumber(payment.total)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-edit"
                        onClick={() => onEdit(payment)}
                        title="تعديل"
                        aria-label="تعديل"
                      >
                        <EditIcon size={16} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => onDelete(payment.id)}
                        title="حذف"
                        aria-label="حذف"
                      >
                        <DeleteIcon size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PaymentList

