import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { EditIcon, DeleteIcon } from './Icons'
import './PaymentList.css'

function PaymentList({ payments, loading, filters, onFiltersChange, onDelete, onEdit, onDeleteSelected, uniqueBeneficiaries = [], uniqueAccounts = [], uniqueProjects = [] }) {
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const selectAllCheckboxRef = useRef(null)

  const handleFilterChange = (name, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear selections when filters change
    setSelectedIds(new Set())
  }

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: '',
      dateTo: '',
      beneficiary: '',
      account: '',
      project: ''
    })
    // Clear selections when filters are cleared
    setSelectedIds(new Set())
  }

  const hasActiveFilters = Object.values(filters).some(val => val !== '')

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const formatNumber = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const exportToExcel = () => {
    // Prepare data for export with Arabic column headers (reversed order for RTL)
    const exportData = payments.map(payment => {
      // Format date back to DD-Mon-YYYY format for Excel
      const date = new Date(payment.date)
      const day = date.getDate()
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = monthNames[date.getMonth()]
      const year = date.getFullYear()
      const formattedDate = `${day}-${month}-${year}`

      // Return in reversed order (RTL) - last column first
      return {
        'الاجمالي': payment.total,
        'وصف البند': payment.description || '',
        'المشروع': payment.project,
        'الحساب': payment.account,
        'المستفيد': payment.beneficiary || '',
        'التاريخ الى': formattedDate,
        'التاريخ من': formattedDate
      }
    })

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المدفوعات')

    // Set column widths (reversed order)
    const colWidths = [
      { wch: 15 }, // الاجمالي
      { wch: 40 }, // وصف البند
      { wch: 15 }, // المشروع
      { wch: 20 }, // الحساب
      { wch: 20 }, // المستفيد
      { wch: 12 }, // التاريخ الى
      { wch: 12 }  // التاريخ من
    ]
    ws['!cols'] = colWidths

    // Set RTL direction for the sheet
    if (!ws['!views']) ws['!views'] = []
    ws['!views'][0] = {
      rightToLeft: true
    }

    // Generate filename with current date
    const today = new Date()
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`
    const filename = `المدفوعات_${dateStr}.xlsx`

    // Export file
    XLSX.writeFile(wb, filename)
  }

  // Calculate total of all displayed payments
  const totalAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.total) || 0), 0)

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(payments.map(payment => payment.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id, checked) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} سجل محدد؟`)) return
    
    onDeleteSelected(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const isAllSelected = payments.length > 0 && selectedIds.size === payments.length
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < payments.length

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

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
        <div className="header-title-section">
          <h2>Payments Record ({payments.length})</h2>
          <div className="total-summary">
            <span className="total-label">Total:</span>
            <span className="total-value">{formatNumber(totalAmount)}</span>
          </div>
        </div>
        <div className="header-actions">
          {selectedIds.size > 0 && (
            <button 
              className="btn btn-danger"
              onClick={handleDeleteSelected}
              title="Delete Selected"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button 
            className="btn btn-export"
            onClick={exportToExcel}
            title="Export to Excel"
          >
            Export
          </button>
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
            <label>From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="filter-group date-range-group">
            <label>To Date</label>
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
                <th style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    ref={selectAllCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    title="Select All"
                  />
                </th>
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
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(payment.id)}
                      onChange={(e) => handleSelectOne(payment.id, e.target.checked)}
                    />
                  </td>
                  <td className="date-cell">{formatDate(payment.date)}</td>
                  <td>{payment.beneficiary || '—'}</td>
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

