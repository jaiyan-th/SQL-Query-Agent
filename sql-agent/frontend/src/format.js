const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2
})

export function displayValue(value, column) {
  if (value === null) return 'NULL'
  if (typeof value === 'number' && /(^|_)inr($|_)/i.test(column)) return rupees.format(value)
  return String(value)
}
