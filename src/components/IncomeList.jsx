import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { EditIcon, DeleteIcon } from './Icons'
import './PaymentList.css'

function IncomeList({ incomes, loading, filters, onFiltersChange, onDelete, onEdit, onDeleteSelected, uniqueProjects = [], uniqueUnits = [], uniqueClients = [], uniquePaymentMethods = [] }) {
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
      project: '',
      unit: '',
      client: '',
      paymentMethod: ''
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
    const exportData = incomes.map(income => {
      // Format date back to DD-Mon-YYYY format for Excel
      const date = new Date(income.date)
      const day = date.getDate()
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = monthNames[date.getMonth()]
      const year = date.getFullYear()
      const formattedDate = `${day}-${month}-${year}`

      // Return in reversed order (RTL) - last column first
      return {
        'إثبات الدفع': income.paymentProof || '',
        'وسيلة الدفع': income.paymentMethod || '',
        'الاجمالي': income.total,
        'الوصف': income.description || '',
        'العميل': income.client,
        'الوحدة': income.unit,
        'المشروع': income.project,
        'التاريخ': formattedDate
      }
    })

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الإيرادات')

    // Set column widths (reversed order)
    const colWidths = [
      { wch: 20 }, // إثبات الدفع
      { wch: 15 }, // وسيلة الدفع
      { wch: 15 }, // الاجمالي
      { wch: 40 }, // الوصف
      { wch: 20 }, // العميل
      { wch: 15 }, // الوحدة
      { wch: 15 }, // المشروع
      { wch: 12 }  // التاريخ
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
    const filename = `الإيرادات_${dateStr}.xlsx`

    // Export file
    XLSX.writeFile(wb, filename)
  }

  // Calculate total of all displayed incomes
  const totalAmount = incomes.reduce((sum, income) => sum + (parseFloat(income.total) || 0), 0)

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(incomes.map(income => income.id)))
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

  const isAllSelected = incomes.length > 0 && selectedIds.size === incomes.length
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < incomes.length

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
          <h2>Incomes ({incomes.length})</h2>
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
          <div className="filter-group">
            <label>الوحدة</label>
            <select
              value={filters.unit}
              onChange={(e) => handleFilterChange('unit', e.target.value)}
            >
              <option value="">الكل</option>
              {uniqueUnits.map((unit, index) => (
                <option key={index} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>العميل</label>
            <select
              value={filters.client}
              onChange={(e) => handleFilterChange('client', e.target.value)}
            >
              <option value="">الكل</option>
              {uniqueClients.map((client, index) => (
                <option key={index} value={client}>{client}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>وسيلة الدفع</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="">الكل</option>
              {uniquePaymentMethods.map((method, index) => (
                <option key={index} value={method}>{method}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {incomes.length === 0 ? (
        <div className="empty-state">
          {hasActiveFilters ? 'لا توجد نتائج للبحث' : 'لا توجد إيرادات مسجلة'}
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
                <th>التاريخ</th>
                <th>المشروع</th>
                <th>الوحدة</th>
                <th>العميل</th>
                <th>الوصف</th>
                <th>الإجمالي</th>
                <th>وسيلة الدفع</th>
                <th>إثبات الدفع</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map(income => (
                <tr key={income.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(income.id)}
                      onChange={(e) => handleSelectOne(income.id, e.target.checked)}
                    />
                  </td>
                  <td className="date-cell">{formatDate(income.date)}</td>
                  <td>{income.project}</td>
                  <td>{income.unit}</td>
                  <td>{income.client}</td>
                  <td>{income.description || '—'}</td>
                  <td className="total-cell">{formatNumber(income.total)}</td>
                  <td>{income.paymentMethod || '—'}</td>
                  <td>
                    {income.paymentProof ? (
                      <a 
                        href={income.paymentProof} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="payment-proof-link"
                        title={income.paymentProof}
                      >
                        عرض الإثبات
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-edit"
                        onClick={() => onEdit(income)}
                        title="تعديل"
                        aria-label="تعديل"
                      >
                        <EditIcon size={16} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => onDelete(income.id)}
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

export default IncomeList

