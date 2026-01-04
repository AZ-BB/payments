import { useRef } from 'react'
import * as XLSX from 'xlsx'
import './ExcelImporter.css'

function ExcelImporter({ onImport, onCancel, type = 'payments' }) {
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      
      // Try to read with header row first
      let jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
        header: 1, // Read as array of arrays first
        defval: null 
      })
      
      // Find the header row (look for Arabic column names)
      let headerRowIndex = -1
      const expectedHeaders = type === 'incomes' 
        ? ['التاريخ', 'المشروع', 'الوحدة', 'العميل', 'الوصف', 'الاجمالي', 'وسيلة الدفع', 'إثبات الدفع']
        : ['التاريخ من', 'التاريخ الى', 'المستفيد', 'الحساب', 'المشروع', 'وصف', 'الاجمالي', 'وصف البند']
      
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i]
        if (Array.isArray(row)) {
          const rowText = row.join(' ').toLowerCase()
          // Check if this row contains expected headers
          const hasHeaders = expectedHeaders.some(header => 
            rowText.includes(header.toLowerCase()) || 
            rowText.includes(header.replace('التاريخ من', 'تاريخ من').toLowerCase()) ||
            rowText.includes(header.replace('التاريخ الى', 'تاريخ الى').toLowerCase())
          )
          if (hasHeaders) {
            headerRowIndex = i
            break
          }
        }
      }
      
      // If header row found, use it; otherwise use first row
      if (headerRowIndex >= 0) {
        const headers = jsonData[headerRowIndex].map((h, idx) => {
          if (!h || h === null || h === '') return `_EMPTY_${idx}`
          return String(h).trim()
        })
        const dataRows = jsonData.slice(headerRowIndex + 1)
        jsonData = dataRows.map(row => {
          const obj = {}
          headers.forEach((header, idx) => {
            obj[header] = row[idx] !== undefined && row[idx] !== null ? row[idx] : null
          })
          return obj
        })
      } else {
        // Fallback: try to read with default header detection
        jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: null })
      }

      // Debug: Log first row to see column names
      if (jsonData.length > 0) {
        console.log('First row keys:', Object.keys(jsonData[0]))
        console.log('First row data:', jsonData[0])
      }

      // Map Excel columns to fields based on type
      const mappedData = type === 'incomes' 
        ? mapIncomeData(jsonData)
        : mapPaymentData(jsonData)
      
      if (mappedData.length === 0) {
        alert('No correct data found in the file. Check the required columns.')
        return
      }

      console.log(`Successfully mapped ${mappedData.length} records`)
      console.log('Sample mapped data:', mappedData[0])

      onImport(mappedData)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error reading Excel file:', error)
      alert('Error reading the file. Check that the file is in Excel format.')
    }
  }

  // Map income data from Excel
  function mapIncomeData(jsonData) {
    return jsonData.map((row, index) => {
        const keys = Object.keys(row)
        
        // Helper function to find value by key
        const getValue = (keyVariations) => {
          for (const key of keyVariations) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key]
            }
          }
          return null
        }
        
        // Map income fields
        let date = getValue(['التاريخ', 'تاريخ', 'Date', 'date'])
        let project = getValue(['المشروع', 'Project', 'project'])
        let unit = getValue(['الوحدة', 'Unit', 'unit'])
        let client = getValue(['العميل', 'Client', 'client'])
        let description = getValue(['الوصف', 'وصف', 'Description', 'description']) || ''
        
        // For total, check both string and number values, including 0
        let total = null
        for (const keyVar of ['الاجمالي', 'الإجمالي', 'Total', 'total', 'Amount', 'amount']) {
          if (row[keyVar] !== undefined && row[keyVar] !== null && row[keyVar] !== '') {
            if (typeof row[keyVar] === 'number') {
              total = row[keyVar]
              break
            } else if (typeof row[keyVar] === 'string' && /[\d,]+/.test(row[keyVar])) {
              total = parseFloat(row[keyVar].replace(/,/g, ''))
              if (!isNaN(total)) break
            }
          }
        }
        
        let paymentMethod = getValue(['وسيلة الدفع', 'Payment Method', 'paymentMethod', 'payment_method']) || ''
        let paymentProof = getValue(['إثبات الدفع', 'Payment Proof', 'paymentProof', 'payment_proof']) || ''
        
        // Try to find total if not found yet - more comprehensive search
        if (total === null || total === undefined) {
          // First, try exact key match (check all keys for variations)
          for (const key of keys) {
            const trimmedKey = String(key).trim()
            const lowerKey = trimmedKey.toLowerCase()
            
            // Check for total-related keys
            if (trimmedKey === 'الاجمالي' || trimmedKey === 'الإجمالي' || 
                lowerKey === 'total' || lowerKey === 'amount' ||
                trimmedKey.includes('اجمالي') || trimmedKey.includes('إجمالي')) {
              const val = row[key]
              if (val !== undefined && val !== null && val !== '') {
                if (typeof val === 'number') {
                  total = val
                  break
                } else if (typeof val === 'string') {
                  const numVal = parseFloat(val.replace(/,/g, ''))
                  if (!isNaN(numVal)) {
                    total = numVal
                    break
                  }
                }
              }
            }
          }
          
          // If still not found, look for numeric values that could be the total
          // (excluding date serial numbers and other known fields)
          if (total === null || total === undefined) {
            const excludedKeys = ['التاريخ', 'تاريخ', 'date', 'Date', 'project', 'المشروع', 
                                 'client', 'العميل', 'unit', 'الوحدة', 'description', 'الوصف', 'وصف']
            for (const key of keys) {
              const val = row[key]
              const keyStr = String(key).toLowerCase()
              
              // Skip if this key is a known non-total field
              if (excludedKeys.some(excluded => keyStr.includes(excluded.toLowerCase()))) {
                continue
              }
              
              // Check for numeric values that could be totals
              if (typeof val === 'number' && val > 0) {
                // Reasonable total range (avoid Excel date serials which are usually 40000-50000)
                // But also handle cases where total might be in that range
                if (val >= 1 && val < 1000000000) {
                  // If we already have a date, and this number is different from the date, it might be total
                  if (!date || (typeof date === 'number' && val !== date)) {
                    total = val
                    break
                  } else if (typeof date !== 'number') {
                    // Date is not a number, so this could be total
                    total = val
                    break
                  }
                }
              }
            }
          }
        }
        
        // Validate required fields
        if (!date) {
          console.warn(`Row ${index + 2} skipped: Missing date`, row)
          return null
        }
        if (!project) {
          console.warn(`Row ${index + 2} skipped: Missing project`, row)
          return null
        }
        if (!client) {
          console.warn(`Row ${index + 2} skipped: Missing client`, row)
          return null
        }
        if (!total && total !== 0) {
          console.warn(`Row ${index + 2} skipped: Missing total. Row data:`, row)
          return null
        }

        // Convert date to ISO format
        const formattedDate = parseDate(date, index)
        if (!formattedDate) {
          console.warn(`Row ${index + 2} skipped: Invalid date format`, date)
          return null
        }

        // Convert total to number
        const numericTotal = typeof total === 'number' ? total : parseFloat(String(total).replace(/,/g, ''))

        if (isNaN(numericTotal) || numericTotal <= 0) {
          console.warn(`Row ${index + 2} skipped: Invalid total`, row)
          return null
        }

        return {
          date: formattedDate,
          project: String(project).trim(),
          unit: unit ? String(unit).trim() : '',
          client: String(client).trim(),
          description: description ? String(description).trim() : '',
          total: numericTotal,
          paymentMethod: paymentMethod ? String(paymentMethod).trim() : '',
          paymentProof: paymentProof ? String(paymentProof).trim() : ''
        }
      }).filter(item => item !== null)
  }

  // Helper function to parse dates
  function parseDate(date, index) {
    if (!date) return null
    
    let formattedDate = null
    
    if (typeof date === 'number') {
      try {
        const excelDate = XLSX.SSF.parse_date_code(date)
        formattedDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
      } catch (e) {
        const dateObj = new Date((date - 25569) * 86400 * 1000)
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0]
        }
      }
    } else if (typeof date === 'string') {
      const dateStr = date.trim()
      const monthNames = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
        'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6,
        'يوليو': 7, 'أغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
      }
      
      const ddmonyyyy = dateStr.match(/^(\d{1,2})[-/](\w+)[-/](\d{4})$/)
      if (ddmonyyyy) {
        const day = parseInt(ddmonyyyy[1], 10)
        const monthName = ddmonyyyy[2]
        const year = parseInt(ddmonyyyy[3], 10)
        const month = monthNames[monthName]
        
        if (month && !isNaN(day) && !isNaN(year)) {
          const parsedDate = new Date(year, month - 1, day)
          if (!isNaN(parsedDate.getTime())) {
            formattedDate = parsedDate.toISOString().split('T')[0]
          }
        }
      }
      
      if (!formattedDate) {
        const dateObj = new Date(dateStr)
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0]
        } else {
          const parts = dateStr.split(/[\/\-]/)
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10)
            const year = parseInt(parts[2], 10)
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              const parsedDate = new Date(year, month - 1, day)
              if (!isNaN(parsedDate.getTime())) {
                formattedDate = parsedDate.toISOString().split('T')[0]
              }
            }
          }
        }
      }
    }
    
    return formattedDate
  }

  // Map payment data from Excel (original payment mapping logic)
  function mapPaymentData(jsonData) {
    return jsonData.map((row, index) => {
        const keys = Object.keys(row)
        
        const getValue = (keyVariations) => {
          for (const key of keyVariations) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key]
            }
          }
          return null
        }
        
        let dateFrom = getValue(['التاريخ من', 'تاريخ من', 'Date From', 'date from', 'dateFrom'])
        let dateTo = getValue(['التاريخ الى', 'تاريخ الى', 'Date To', 'date to', 'dateTo'])
        let beneficiary = getValue(['المستفيد', 'Beneficiary', 'beneficiary']) || ''
        let account = getValue(['الحساب', 'Account', 'account'])
        let project = getValue(['المشروع', 'Project', 'project'])
        let description = getValue(['وصف البند', 'وصف', 'Description', 'description', 'الوصف']) || ''
        let total = getValue(['الاجمالي', 'الإجمالي', 'Total', 'total', 'Amount', 'amount'])
        
        const date = dateFrom || dateTo || getValue(['التاريخ', 'تاريخ', 'Date', 'date'])
        
        if (!date) {
          console.warn(`Row ${index + 2} skipped: Missing date`, row)
          return null
        }
        if (!account) {
          console.warn(`Row ${index + 2} skipped: Missing account`, row)
          return null
        }
        if (!project) {
          console.warn(`Row ${index + 2} skipped: Missing project`, row)
          return null
        }
        if (!total && total !== 0) {
          console.warn(`Row ${index + 2} skipped: Missing total`, row)
          return null
        }
        
        const formattedDate = parseDate(date, index)
        if (!formattedDate) {
          console.warn(`Row ${index + 2} skipped: Invalid date format`, date)
          return null
        }
        
        const numericTotal = typeof total === 'number' ? total : parseFloat(String(total).replace(/,/g, ''))
        if (isNaN(numericTotal) || numericTotal <= 0) {
          console.warn(`Row ${index + 2} skipped: Invalid total`, row)
          return null
        }
        
        return {
          date: formattedDate,
          beneficiary: String(beneficiary).trim(),
          account: String(account).trim(),
          project: String(project).trim(),
          description: String(description).trim(),
          total: numericTotal
        }
      }).filter(item => item !== null)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="excel-importer-overlay">
      <div className="excel-importer-modal">
        <h2>Import from Excel</h2>
        <p className="import-instructions">
          The file must contain the following columns:
          <br />
          {type === 'incomes' ? (
            <strong>التاريخ، المشروع، الوحدة، العميل، الوصف (اختياري)، الاجمالي، وسيلة الدفع (اختياري)، إثبات الدفع (اختياري)</strong>
          ) : (
            <strong>التاريخ من، التاريخ الى، المستفيد، الحساب، المشروع، وصف (اختياري)، الاجمالي</strong>
          )}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div className="import-actions">
          <button className="btn btn-primary" onClick={handleImportClick}>
            Choose Excel File
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExcelImporter

