// Utility to convert between camelCase (JS) and snake_case (DB)
// This is a workaround for PostgREST schema cache issues

export const toDatabaseFormat = (incomeData) => {
  if (!incomeData) return incomeData
  
  const dbData = { ...incomeData }
  
  // Convert camelCase to snake_case for database
  if ('paymentMethod' in dbData) {
    dbData.payment_method = dbData.paymentMethod
    delete dbData.paymentMethod
  }
  
  if ('paymentProof' in dbData) {
    dbData.payment_proof = dbData.paymentProof
    delete dbData.paymentProof
  }
  
  return dbData
}

export const fromDatabaseFormat = (incomeData) => {
  if (!incomeData) return incomeData
  
  const jsData = { ...incomeData }
  
  // Convert snake_case to camelCase for JavaScript
  if ('payment_method' in jsData) {
    jsData.paymentMethod = jsData.payment_method
    delete jsData.payment_method
  }
  
  if ('payment_proof' in jsData) {
    jsData.paymentProof = jsData.payment_proof
    delete jsData.payment_proof
  }
  
  return jsData
}

export const fromDatabaseFormatArray = (incomes) => {
  if (!Array.isArray(incomes)) return incomes
  return incomes.map(fromDatabaseFormat)
}

