import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from '../contexts/AuthContext'
import './Credit.css'

function Credit() {
  const { user } = useAuth()
  const [incomes, setIncomes] = useState([])
  const [payments, setPayments] = useState([])
  const [creditBoxes, setCreditBoxes] = useState({
    'كاش': 0,
    'بنك': 0,
    'عهدة': 0
  })
  const [savedBoxes, setSavedBoxes] = useState({
    'كاش': 0,
    'بنك': 0,
    'عهدة': 0
  })
  const [inputValues, setInputValues] = useState({
    'كاش': '0',
    'بنك': '0',
    'عهدة': '0'
  })
  const [focusedInput, setFocusedInput] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    
    fetchData()
    
    // Subscribe to real-time changes for current user only
    const incomesChannel = supabase
      .channel('credit-incomes-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'incomes',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchIncomes()
        }
      )
      .subscribe()

    const paymentsChannel = supabase
      .channel('credit-payments-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'payments',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchPayments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(incomesChannel)
      supabase.removeChannel(paymentsChannel)
    }
  }, [user])

  const fetchData = async () => {
    await Promise.all([
      fetchIncomes(),
      fetchPayments(),
      fetchCreditBoxes()
    ])
    setLoading(false)
  }

  const fetchIncomes = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select('total')
        .eq('user_id', user.id)

      if (error) throw error
      setIncomes(data || [])
    } catch (error) {
      console.error('Error fetching incomes:', error)
    }
  }

  const fetchPayments = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('total')
        .eq('user_id', user.id)

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  const fetchCreditBoxes = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('credit_boxes')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      
      const boxes = {}
      if (data && data.length > 0) {
        data.forEach(box => {
          boxes[box.box_type] = parseFloat(box.amount) || 0
        })
      } else {
        // Initialize boxes if they don't exist
        await initializeCreditBoxes()
        return fetchCreditBoxes()
      }
      
      setCreditBoxes(boxes)
      setSavedBoxes(boxes) // Store saved values for comparison
      // Initialize input values with formatted numbers
      const formattedInputs = {}
      Object.entries(boxes).forEach(([key, value]) => {
        formattedInputs[key] = formatNumberInput(value)
      })
      setInputValues(formattedInputs)
    } catch (error) {
      console.error('Error fetching credit boxes:', error)
    }
  }

  const initializeCreditBoxes = async () => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('credit_boxes')
        .upsert([
          { box_type: 'كاش', amount: 0, user_id: user.id },
          { box_type: 'بنك', amount: 0, user_id: user.id },
          { box_type: 'عهدة', amount: 0, user_id: user.id }
        ], { onConflict: 'user_id,box_type' })

      if (error) throw error
    } catch (error) {
      console.error('Error initializing credit boxes:', error)
    }
  }

  // Map Arabic box types to English labels for display
  const getBoxLabel = (boxType) => {
    const labels = {
      'كاش': 'Cash',
      'بنك': 'Bank',
      'عهدة': 'عهدة'
    }
    return labels[boxType] || boxType
  }

  const formatNumberInput = (value) => {
    if (value === '' || value === null || value === undefined) return ''
    // Parse to number
    const num = parseFloat(value) || 0
    // Format with thousand separators
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  const parseNumberInput = (value) => {
    if (!value) return 0
    // Remove commas and parse
    const cleaned = value.toString().replace(/,/g, '')
    return parseFloat(cleaned) || 0
  }

  const handleBoxChange = (boxType, value) => {
    // Remove all non-numeric characters except decimal point
    const cleaned = value.toString().replace(/[^\d.]/g, '')
    
    // Handle multiple decimal points - keep only the first one
    const parts = cleaned.split('.')
    const sanitized = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned
    
    // Parse the numeric value
    const numValue = parseFloat(sanitized) || 0
    
    // Format with commas while preserving decimal input
    let formatted = ''
    if (sanitized === '' || sanitized === '.') {
      formatted = sanitized
    } else if (sanitized.includes('.')) {
      // Has decimal point - format integer part with commas
      const [intPart, decPart] = sanitized.split('.')
      const formattedInt = intPart ? parseFloat(intPart).toLocaleString('en-US') : ''
      formatted = formattedInt + (decPart !== undefined ? '.' + decPart : '')
    } else {
      // No decimal point - format normally
      formatted = numValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    }
    
    // Update input display value (formatted with commas)
    setInputValues(prev => ({
      ...prev,
      [boxType]: formatted
    }))
    
    // Update numeric state
    setCreditBoxes(prev => ({
      ...prev,
      [boxType]: numValue
    }))
  }

  const handleBoxFocus = (boxType) => {
    setFocusedInput(boxType)
    // Keep formatted value when focused (with commas)
    const formatted = formatNumberInput(creditBoxes[boxType])
    setInputValues(prev => ({
      ...prev,
      [boxType]: formatted || ''
    }))
  }

  const handleBoxBlur = (boxType) => {
    setFocusedInput(null)
    // Ensure value is properly formatted on blur
    const formatted = formatNumberInput(creditBoxes[boxType])
    setInputValues(prev => ({
      ...prev,
      [boxType]: formatted
    }))
  }

  const handleCancel = () => {
    // Revert to saved values
    setCreditBoxes({ ...savedBoxes })
    
    // Update input values to match saved values
    const formattedInputs = {}
    Object.entries(savedBoxes).forEach(([key, value]) => {
      formattedInputs[key] = formatNumberInput(value)
    })
    setInputValues(formattedInputs)
  }

  const handleSave = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      
      // Save all boxes at once
      const updates = Object.entries(creditBoxes).map(([boxType, amount]) => ({
        box_type: boxType,
        amount: parseFloat(amount) || 0,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('credit_boxes')
        .upsert(updates, { onConflict: 'user_id,box_type' })

      if (error) throw error
      
      // Update saved values after successful save
      setSavedBoxes({ ...creditBoxes })
      alert('Data saved successfully')
    } catch (error) {
      console.error('Error saving credit boxes:', error)
      alert('Error saving data')
      // Revert to saved values on error
      setCreditBoxes({ ...savedBoxes })
    } finally {
      setSaving(false)
    }
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(creditBoxes) !== JSON.stringify(savedBoxes)

  const formatNumber = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Calculate totals
  const totalIncomes = incomes.reduce((sum, income) => sum + (parseFloat(income.total) || 0), 0)
  const totalPayments = payments.reduce((sum, payment) => sum + (parseFloat(payment.total) || 0), 0)
  const netAmount = totalIncomes - totalPayments
  
  // Sum of credit boxes
  const totalBoxes = Object.values(creditBoxes).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0)
  
  // Final calculation: totalBoxes - netAmount
  const finalAmount = totalBoxes - netAmount

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="credit-container">
        {/* Net Amount Section */}
        <div className="credit-section">
          <h2>Net Amount</h2>
          <div className="calculation-box">
            <div className="calculation-row">
              <span className="calculation-label">Total Incomes:</span>
              <span className="calculation-value positive">{formatNumber(totalIncomes)}</span>
            </div>
            <div className="calculation-row">
              <span className="calculation-label">Total Payments:</span>
              <span className="calculation-value negative">{formatNumber(totalPayments)}</span>
            </div>
            <div className="calculation-divider"></div>
            <div className="calculation-row total-row">
              <span className="calculation-label">Net:</span>
              <span className={`calculation-value ${netAmount >= 0 ? 'positive' : 'negative'}`}>
                {formatNumber(netAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Credit Boxes Section */}
        <div className="credit-section">
          <div className="credit-section-header">
            <h2>Accounts</h2>
            <div className="credit-section-actions">
              {hasUnsavedChanges && (
                <button
                  className="btn btn-cancel"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
              <button
                className={`btn btn-primary btn-save ${hasUnsavedChanges ? 'has-changes' : ''}`}
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          {hasUnsavedChanges && (
            <div className="unsaved-notice">
              You have unsaved changes
            </div>
          )}
          <div className="credit-boxes-grid">
            {Object.entries(creditBoxes).map(([boxType, amount]) => (
              <div key={boxType} className="credit-box">
                <label className="credit-box-label">{getBoxLabel(boxType)}</label>
                <input
                  type="text"
                  className="credit-box-input"
                  value={inputValues[boxType] || '0'}
                  onChange={(e) => handleBoxChange(boxType, e.target.value)}
                  onFocus={() => handleBoxFocus(boxType)}
                  onBlur={() => handleBoxBlur(boxType)}
                  disabled={saving}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <div className="boxes-total">
            <span className="boxes-total-label">Total:</span>
            <span className="boxes-total-value">{formatNumber(totalBoxes)}</span>
          </div>
        </div>

        {/* Final Result Section */}
        <div className="credit-section">
          <h2>Check</h2>
          <div className={`final-result ${finalAmount >= 0 ? 'positive' : 'negative'}`}>
            <div className="final-result-label">{
              finalAmount >= 0 ? 'فائض' : 'عجز'
              }</div>
            <div className="final-result-value">{formatNumber(finalAmount)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Credit

