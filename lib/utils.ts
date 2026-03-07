import { SprayLog } from './types'

// Generate a job ID in the format "JOB-YYYYMMDD-XXXX"
export function generateJobId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `JOB-${dateStr}-${rand}`
}

// Format a date string "YYYY-MM-DD" to a readable format like "March 7, 2026"
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Format a time string "HH:MM:SS" to "HH:MM AM/PM"
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—'
  const [hourStr, minuteStr] = timeStr.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minute} ${period}`
}

// Convert spray logs array to a CSV string for download
export function buildCsv(logs: SprayLog[]): string {
  const headers = [
    'Job ID', 'Date', 'Start Time', 'End Time', 'Status',
    'Operator', 'Aircraft', 'Customer', 'Field Name', 'Field Location',
    'GPS Coordinates', 'Acreage', 'Crop Type', 'Application Type',
    'Product Name', 'EPA Reg #', 'Product Type', 'Target Pest',
    'Rate Applied', 'Total Quantity', 'Carrier Type', 'Carrier Rate',
    'Tank Mix Notes', 'Restricted Use', 'Label Notes',
    'Wind Speed', 'Wind Direction', 'Temperature', 'Humidity',
    'Sky Conditions', 'Inversion Notes', 'Weather Notes',
    'Nozzle/Equipment Notes', 'Swath Width', 'Flight Altitude Notes',
    'Drift Mitigation Notes', 'Incident Notes', 'General Remarks',
    'Created At', 'Updated At', 'Products (All)',
  ]

  const rows = logs.map(log => [
    log.job_id, log.date, log.start_time ?? '', log.end_time ?? '', log.mission_status,
    log.operator_name ?? '', log.aircraft_tail_number ?? '', log.customer_name ?? '',
    log.field_name ?? '', log.field_location ?? '', log.gps_coordinates ?? '',
    log.acreage_treated ?? '', log.crop_type ?? '', log.application_type ?? '',
    log.product_name ?? '', log.epa_registration_number ?? '', log.product_type ?? '',
    log.target_pest ?? '', log.rate_applied ?? '', log.total_quantity_used ?? '',
    log.carrier_type ?? '', log.carrier_rate ?? '', log.tank_mix_notes ?? '',
    log.restricted_use_pesticide ? 'Yes' : 'No', log.label_restriction_notes ?? '',
    log.wind_speed ?? '', log.wind_direction ?? '', log.temperature ?? '',
    log.humidity ?? '', log.sky_conditions ?? '', log.inversion_concern_notes ?? '',
    log.weather_notes ?? '', log.nozzle_equipment_notes ?? '', log.swath_width ?? '',
    log.flight_altitude_notes ?? '', log.drift_mitigation_notes ?? '',
    log.incident_notes ?? '', log.general_remarks ?? '',
    log.created_at, log.updated_at,
    log.products?.length > 1 ? JSON.stringify(log.products) : '',
  ])

  // Wrap each cell in quotes and escape any internal quotes
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`

  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

// Trigger a CSV file download in the browser
export function downloadCsv(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Return today's date as a "YYYY-MM-DD" string (local time)
export function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Truncate a string for display in cards
export function truncate(str: string | null, length = 40): string {
  if (!str) return '—'
  return str.length > length ? str.slice(0, length) + '…' : str
}
