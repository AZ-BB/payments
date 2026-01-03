import { useRef } from 'react'
import * as XLSX from 'xlsx'
import './ExcelImporter.css'

function ExcelImporter({ onImport, onCancel }) {
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
      const expectedHeaders = ['التاريخ من', 'التاريخ الى', 'المستفيد', 'الحساب', 'المشروع', 'وصف', 'الاجمالي', 'وصف البند']
      
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

      // Map Excel columns to payment fields
      // Expected columns: التاريخ من, التاريخ الى, المستفيد, الحساب, المشروع, وصف, الاجمالي
      // Also handle cases where columns are _EMPTY, _EMPTY_1, etc.
      // AND handle reversed key-value pairs (values as keys, keys as values)
      const mappedData = jsonData.map((row, index) => {
        // Get all keys and values to understand the structure
        const keys = Object.keys(row)
        const values = Object.values(row)
        
        // Helper function to find value by key (normal case)
        const getValue = (keyVariations) => {
          for (const key of keyVariations) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key]
            }
          }
          return null
        }
        
        // Helper function to find key by value (reversed case)
        const getKeyByValue = (valueVariations) => {
          for (const value of valueVariations) {
            for (const key of keys) {
              if (row[key] === value || String(row[key]).trim() === String(value).trim()) {
                return row[key]
              }
            }
          }
          return null
        }
        
        // Try normal case first
        let dateFrom = getValue(['التاريخ من', 'تاريخ من', 'Date From', 'date from', 'dateFrom'])
        let dateTo = getValue(['التاريخ الى', 'تاريخ الى', 'Date To', 'date to', 'dateTo'])
        let beneficiary = getValue(['المستفيد', 'Beneficiary', 'beneficiary'])
        let account = getValue(['الحساب', 'Account', 'account'])
        let project = getValue(['المشروع', 'Project', 'project'])
        let description = getValue(['وصف البند', 'وصف', 'Description', 'description', 'الوصف', 'Description of Item']) || ''
        let total = getValue(['الاجمالي', 'الإجمالي', 'Total', 'total', 'Amount', 'amount'])
        
        // If normal case didn't work, try reversed case (values as keys)
        if (!dateFrom) {
          dateFrom = getKeyByValue(['التاريخ من', 'تاريخ من'])
        }
        if (!dateTo) {
          dateTo = getKeyByValue(['التاريخ الى', 'تاريخ الى'])
        }
        if (!beneficiary) {
          beneficiary = getKeyByValue(['المستفيد'])
        }
        if (!account) {
          account = getKeyByValue(['الحساب'])
        }
        if (!project) {
          project = getKeyByValue(['المشروع'])
        }
        if (!description) {
          description = getKeyByValue(['وصف البند', 'وصف', 'الوصف']) || ''
        }
        if (!total) {
          // Check if "الاجمالي" is a key with a numeric value (try exact match and trimmed)
          for (const key of keys) {
            const trimmedKey = String(key).trim()
            if (trimmedKey === 'الاجمالي' || trimmedKey === 'الإجمالي' || trimmedKey === 'Total' || trimmedKey === 'total') {
              const val = row[key]
              if (val !== undefined && val !== null && val !== '') {
                if (typeof val === 'number') {
                  total = val
                  break
                } else if (typeof val === 'string' && /[\d,]+/.test(val)) {
                  total = parseFloat(val.replace(/,/g, ''))
                  break
                }
              }
            }
          }
          // Check if "الاجمالي" is a value (reversed case)
          for (const key of keys) {
            const value = row[key]
            if (value === 'الاجمالي' || value === 'الإجمالي' || value === 'Total' || value === 'total') {
              // The key might be the total value
              if (typeof key === 'number' || (typeof key === 'string' && /[\d,]+/.test(key))) {
                total = key
                break
              }
            }
          }
          // If still not found, look for numeric values that aren't dates
          if (!total) {
            for (const key of keys) {
              const value = row[key]
              if (typeof value === 'number' && value > 0) {
                // Check if the key is "الاجمالي" or similar
                if (key === 'الاجمالي' || key === 'الإجمالي' || key === 'Total' || key === 'total') {
                  total = value
                  break
                }
              }
            }
          }
          // Last resort: find any numeric value that's not a date
          if (!total) {
            for (const key of keys) {
              const value = row[key]
              if (typeof value === 'number' && value > 0 && value < 1000000) {
                // Check if this might be the total by checking the key
                const keyStr = String(key).toLowerCase()
                if (!keyStr.includes('تاريخ') && !keyStr.includes('date') && !keyStr.includes('empty') && 
                    keyStr !== 'المستفيد' && keyStr !== 'الحساب' && keyStr !== 'المشروع') {
                  total = value
                  break
                }
              }
            }
          }
        }
        
        // If using _EMPTY columns, try to map by position
        // Based on the image: _EMPTY (date from), _EMPTY_1 (date to), _EMPTY_3 (account), _EMPTY_4 (project), _EMPTY_5 (description)
        if (!dateFrom && keys.includes('_EMPTY')) {
          dateFrom = row['_EMPTY']
        }
        if (!dateTo && keys.includes('_EMPTY_1')) {
          dateTo = row['_EMPTY_1']
        }
        if (!account && keys.includes('_EMPTY_3')) {
          account = row['_EMPTY_3']
        }
        if (!project && keys.includes('_EMPTY_4')) {
          project = row['_EMPTY_4']
        }
        if (!description && keys.includes('_EMPTY_5')) {
          description = row['_EMPTY_5'] || ''
        }
        
        // Try to find beneficiary - might be in _EMPTY_2 or another position
        if (!beneficiary) {
          // Check all _EMPTY keys for text that might be beneficiary
          for (const key of keys) {
            if (key.startsWith('_EMPTY')) {
              const value = row[key]
              if (typeof value === 'string' && value.trim() && 
                  !value.match(/^\d+$/) && // Not just numbers
                  value !== account && value !== project && value !== description) {
                beneficiary = value
                break
              }
            }
          }
        }
        
        // Try to find total - might be a key with number value or _EMPTY_X
        if (!total) {
          // Look for keys that contain numbers with commas (like "2,563,345")
          for (const key of keys) {
            if (typeof key === 'string' && /[\d,]+/.test(key)) {
              total = row[key]
              break
            }
          }
          // Or check _EMPTY_6, _EMPTY_7, etc.
          for (let i = 6; i < 20; i++) {
            const key = `_EMPTY_${i}`
            if (keys.includes(key) && (typeof row[key] === 'number' || (typeof row[key] === 'string' && /[\d,]+/.test(row[key])))) {
              total = row[key]
              break
            }
          }
        }
        
        // Use dateFrom as the main date, fallback to dateTo if dateFrom is not available
        const date = dateFrom || dateTo || row['تاريخ'] || row['Date'] || row['date'] || row['التاريخ']

        // Debug logging for problematic rows
        if (!total && total !== 0) {
          console.log(`Row ${index + 2} - Searching for total:`, {
            keys: keys,
            row: row,
            foundTotal: total,
            allNumericValues: keys.filter(k => typeof row[k] === 'number').map(k => ({ key: k, value: row[k] }))
          })
        }
        
        // Validate required fields
        if (!date) {
          console.warn(`Row ${index + 2} skipped: Missing date`, row)
          return null
        }
        // Beneficiary is optional, so we don't skip if it's missing
        if (!account) {
          console.warn(`Row ${index + 2} skipped: Missing account`, row)
          return null
        }
        if (!project) {
          console.warn(`Row ${index + 2} skipped: Missing project`, row)
          return null
        }
        if (!total && total !== 0) {
          console.warn(`Row ${index + 2} skipped: Missing total. Row data:`, row)
          console.warn(`Available keys:`, keys)
          console.warn(`All values:`, Object.entries(row))
          return null
        }

        // Convert date to ISO format if needed
        let formattedDate = null
        
        if (typeof date === 'number') {
          // Excel date serial number
          try {
            const excelDate = XLSX.SSF.parse_date_code(date)
            formattedDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
          } catch (e) {
            // If parsing fails, try as regular date
            const dateObj = new Date((date - 25569) * 86400 * 1000)
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString().split('T')[0]
            }
          }
        } else if (typeof date === 'string') {
          // Try to parse date string (handle various formats)
          const dateStr = date.trim()
          
          // Handle format: DD-Mon-YYYY (e.g., "1-Feb-2025")
          const monthNames = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
            'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6,
            'يوليو': 7, 'أغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
          }
          
          // Try DD-Mon-YYYY format
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
          
          // If not parsed yet, try standard Date parsing
          if (!formattedDate) {
            const dateObj = new Date(dateStr)
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString().split('T')[0]
            } else {
              // Try parsing as DD/MM/YYYY or DD-MM-YYYY
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
        
        // Validate date was parsed
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
          beneficiary: beneficiary ? String(beneficiary).trim() : '',
          account: String(account).trim(),
          project: String(project).trim(),
          description: description ? String(description).trim() : '',
          total: numericTotal
        }
      }).filter(item => item !== null)

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
          <strong>التاريخ من، التاريخ الى، المستفيد، الحساب، المشروع، وصف (اختياري)، الاجمالي</strong>
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

