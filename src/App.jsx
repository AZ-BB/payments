import { useState, useEffect } from 'react'
import { supabase } from './supabase/client'
import PaymentForm from './components/PaymentForm'
import PaymentList from './components/PaymentList'
import './App.css'

function App() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
        <h1>Payment Tracking</h1>
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
          {showForm ? 'cancel' : 'Add new record'}
        </button>
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

