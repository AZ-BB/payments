import { useState, useEffect } from 'react'
import { supabase } from './supabase/client'
import PaymentForm from './components/PaymentForm'
import PaymentList from './components/PaymentList'
import ExcelImporter from './components/ExcelImporter'
import './App.css'

function App() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    beneficiary: '',
    account: '',
    project: ''
  })

  useEffect(() => {
    fetchPayments()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('payments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          fetchPayments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
      alert('حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayment = async (paymentData) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()

      if (error) throw error
      setShowForm(false)
      setEditingPayment(null)
      fetchPayments()
    } catch (error) {
      console.error('Error adding payment:', error)
      alert('حدث خطأ في إضافة السجل')
    }
  }

  const handleEditPayment = async (paymentData) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', editingPayment.id)

      if (error) throw error
      setShowForm(false)
      setEditingPayment(null)
      fetchPayments()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('حدث خطأ في تحديث السجل')
    }
  }

  const handleStartEdit = (payment) => {
    setEditingPayment(payment)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingPayment(null)
  }

  const handleImportExcel = async (importedData) => {
    try {
      console.log(`Starting import of ${importedData.length} records`)
      
      // Insert all records in batches
      const batchSize = 100
      let inserted = 0
      let errors = []

      for (let i = 0; i < importedData.length; i += batchSize) {
        const batch = importedData.slice(i, i + batchSize)
        console.log(`Importing batch ${Math.floor(i / batchSize) + 1}, records ${i + 1} to ${Math.min(i + batchSize, importedData.length)}`)
        
        const { data, error } = await supabase
          .from('payments')
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
      fetchPayments()
    } catch (error) {
      console.error('Error importing data:', error)
      alert(`حدث خطأ في استيراد البيانات: ${error.message}`)
    }
  }

  const handleDeletePayment = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('حدث خطأ في حذف السجل')
    }
  }

  // Extract unique values for dropdowns
  const uniqueBeneficiaries = [...new Set(payments.map(p => p.beneficiary).filter(Boolean))].sort()
  const uniqueAccounts = [...new Set(payments.map(p => p.account).filter(Boolean))].sort()
  const uniqueProjects = [...new Set(payments.map(p => p.project).filter(Boolean))].sort()

  const filteredPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.date)
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null
    
    const inDateRange = 
      (!dateFrom || paymentDate >= dateFrom) &&
      (!dateTo || paymentDate <= dateTo)
    
    return (
      inDateRange &&
      (!filters.beneficiary || payment.beneficiary === filters.beneficiary) &&
      (!filters.account || payment.account === filters.account) &&
      (!filters.project || payment.project === filters.project)
    )
  })

  return (
    <div className="app">
      <header className="app-header">
        <h1>تطبيق تسجيل المدفوعات</h1>
        <div className="header-buttons">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowImport(true)}
          >
            استيراد من Excel
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              if (showForm) {
                handleCancelForm()
              } else {
                setShowForm(true)
                setEditingPayment(null)
              }
            }}
          >
            {showForm ? 'إلغاء' : 'إضافة دفعة جديدة'}
          </button>
        </div>
      </header>

      {showForm && (
        <PaymentForm 
          onSubmit={editingPayment ? handleEditPayment : handleAddPayment}
          onCancel={handleCancelForm}
          uniqueBeneficiaries={uniqueBeneficiaries}
          uniqueAccounts={uniqueAccounts}
          uniqueProjects={uniqueProjects}
          initialData={editingPayment}
        />
      )}

      {showImport && (
        <ExcelImporter
          onImport={handleImportExcel}
          onCancel={() => setShowImport(false)}
        />
      )}

      <PaymentList
        payments={filteredPayments}
        loading={loading}
        filters={filters}
        onFiltersChange={setFilters}
        onDelete={handleDeletePayment}
        onEdit={handleStartEdit}
        uniqueBeneficiaries={uniqueBeneficiaries}
        uniqueAccounts={uniqueAccounts}
        uniqueProjects={uniqueProjects}
      />
    </div>
  )
}

export default App

