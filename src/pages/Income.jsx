import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import IncomeForm from '../components/IncomeForm'
import IncomeList from '../components/IncomeList'
import ExcelImporter from '../components/ExcelImporter'
import { toDatabaseFormat, fromDatabaseFormatArray } from '../utils/incomeMapper'
import './Income.css'

function Income() {
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    project: '',
    unit: '',
    client: '',
    paymentMethod: ''
  })

  useEffect(() => {
    fetchIncomes()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('incomes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'incomes' },
        () => {
          fetchIncomes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchIncomes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setIncomes(fromDatabaseFormatArray(data || []))
    } catch (error) {
      console.error('Error fetching incomes:', error)
      alert('حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleAddIncome = async (incomeData) => {
    try {
      const dbData = toDatabaseFormat(incomeData)
      const { data, error } = await supabase
        .from('incomes')
        .insert([dbData])
        .select()

      if (error) throw error
      setShowForm(false)
      setEditingIncome(null)
      fetchIncomes()
    } catch (error) {
      console.error('Error adding income:', error)
      alert('حدث خطأ في إضافة السجل')
    }
  }

  const handleEditIncome = async (incomeData) => {
    try {
      const dbData = toDatabaseFormat(incomeData)
      const { error } = await supabase
        .from('incomes')
        .update(dbData)
        .eq('id', editingIncome.id)

      if (error) throw error
      setShowForm(false)
      setEditingIncome(null)
      fetchIncomes()
    } catch (error) {
      console.error('Error updating income:', error)
      alert('حدث خطأ في تحديث السجل')
    }
  }

  const handleStartEdit = (income) => {
    setEditingIncome(income)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingIncome(null)
  }

  const handleImportExcel = async (importedData) => {
    try {
      console.log(`Starting import of ${importedData.length} records`)
      
      // Insert all records in batches
      const batchSize = 100
      let inserted = 0
      let errors = []

      for (let i = 0; i < importedData.length; i += batchSize) {
        const batch = importedData.slice(i, i + batchSize).map(toDatabaseFormat)
        console.log(`Importing batch ${Math.floor(i / batchSize) + 1}, records ${i + 1} to ${Math.min(i + batchSize, importedData.length)}`)
        
        const { data, error } = await supabase
          .from('incomes')
          .insert(batch)
          .select()

        if (error) {
          console.error('Error importing batch:', error)
          console.error('Batch data:', batch)
          errors.push(`الدفعة ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        } else {
          inserted += data?.length || 0
          console.log(`Successfully inserted ${data?.length || 0} records in batch ${Math.floor(i / batchSize) + 1}`)
        }
      }

      if (errors.length > 0) {
        alert(`تم استيراد ${inserted} من ${importedData.length} سجل بنجاح.\n\nحدثت أخطاء في ${errors.length} دفعة:\n${errors.join('\n')}`)
      } else {
        alert(`تم استيراد ${inserted} سجل بنجاح`)
      }

      setShowImport(false)
      fetchIncomes()
    } catch (error) {
      console.error('Error importing data:', error)
      alert(`حدث خطأ في استيراد البيانات: ${error.message}`)
    }
  }

  const handleDeleteIncome = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return

    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchIncomes()
    } catch (error) {
      console.error('Error deleting income:', error)
      alert('حدث خطأ في حذف السجل')
    }
  }

  // Extract unique values for dropdowns
  const uniqueProjects = [...new Set(incomes.map(i => i.project).filter(Boolean))].sort()
  const uniqueUnits = [...new Set(incomes.map(i => i.unit).filter(Boolean))].sort()
  const uniqueClients = [...new Set(incomes.map(i => i.client).filter(Boolean))].sort()
  const uniquePaymentMethods = [...new Set(incomes.map(i => i.paymentMethod).filter(Boolean))].sort()

  const filteredIncomes = incomes.filter(income => {
    const incomeDate = new Date(income.date)
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null
    
    const inDateRange = 
      (!dateFrom || incomeDate >= dateFrom) &&
      (!dateTo || incomeDate <= dateTo)
    
    return (
      inDateRange &&
      (!filters.project || income.project === filters.project) &&
      (!filters.unit || income.unit === filters.unit) &&
      (!filters.client || income.client === filters.client) &&
      (!filters.paymentMethod || income.paymentMethod === filters.paymentMethod)
    )
  })

  return (
    <div className="app">
      <div className="income-container">
        <div className="income-header">
          <h1>Incomes</h1>
          <div className="header-buttons">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowImport(true)}
            >
              Import from Excel
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                if (showForm) {
                  handleCancelForm()
                } else {
                  setShowForm(true)
                  setEditingIncome(null)
                }
              }}
            >
              {showForm ? 'Cancel' : 'Add new record'}
            </button>
          </div>
        </div>

      {showForm && (
        <IncomeForm 
          onSubmit={editingIncome ? handleEditIncome : handleAddIncome}
          onCancel={handleCancelForm}
          uniqueProjects={uniqueProjects}
          uniqueUnits={uniqueUnits}
          uniqueClients={uniqueClients}
          uniquePaymentMethods={uniquePaymentMethods}
          initialData={editingIncome}
        />
      )}

      {showImport && (
        <ExcelImporter
          type="incomes"
          onImport={handleImportExcel}
          onCancel={() => setShowImport(false)}
        />
      )}

      <IncomeList
        incomes={filteredIncomes}
        loading={loading}
        filters={filters}
        onFiltersChange={setFilters}
        onDelete={handleDeleteIncome}
        onEdit={handleStartEdit}
        uniqueProjects={uniqueProjects}
        uniqueUnits={uniqueUnits}
        uniqueClients={uniqueClients}
        uniquePaymentMethods={uniquePaymentMethods}
      />
      </div>
    </div>
  )
}

export default Income

