import { SprayLog, ProductEntry } from './types'
import { formatDate } from './utils'

// Indiana OISC compliance columns per 355 IAC 4-4-1
const INDIANA_HEADERS = [
  'Application Date',
  'Customer Name',
  'Site / Field Location',
  'GPS Coordinates',
  'Applicator Name',
  'Cert #',
  'Crop / Site Treated',
  'Target Pest',
  'Acreage Treated',
  'Product Name',
  'EPA Reg #',
  'Product Type',
  'Rate Applied',
  'Total Quantity',
  'Carrier Type',
  'RUP',
  'Aircraft Tail #',
  'Wind Speed',
  'Wind Direction',
  'Temperature (F)',
  'Humidity (%)',
]

// Flatten a log into one row per product (for multi-product / tank mix entries)
function expandLogRows(log: SprayLog): string[][] {
  const baseFields = [
    formatDate(log.date),
    log.customer_name ?? '',
    [log.field_name, log.field_location].filter(Boolean).join(' — '),
    log.gps_coordinates ?? '',
    log.operator_name ?? '',
    '', // Cert # — not stored in DB; user fills manually
    log.crop_type ?? '',
  ]

  const trailingFields = [
    log.aircraft_tail_number ?? '',
    log.wind_speed ?? '',
    log.wind_direction ?? '',
    log.temperature ?? '',
    log.humidity ?? '',
  ]

  function productFields(p: ProductEntry): string[] {
    return [
      p.target_pest ?? '',
      log.acreage_treated?.toString() ?? '',
      p.product_name ?? '',
      p.epa_registration_number ?? '',
      p.product_type ?? '',
      p.rate_applied ?? '',
      p.total_quantity_used ?? '',
      p.carrier_type ?? '',
      p.restricted_use_pesticide ? 'Yes' : 'No',
    ]
  }

  // If there are multiple products in the products array, expand one row each
  if (log.products && log.products.length > 0) {
    return log.products.map(p => [
      ...baseFields,
      ...productFields(p),
      ...trailingFields,
    ])
  }

  // Fall back to the top-level product fields
  const singleProduct: ProductEntry = {
    product_name: log.product_name,
    epa_registration_number: log.epa_registration_number,
    product_type: log.product_type,
    target_pest: log.target_pest,
    rate_applied: log.rate_applied,
    total_quantity_used: log.total_quantity_used,
    carrier_type: log.carrier_type,
    carrier_rate: log.carrier_rate,
    restricted_use_pesticide: log.restricted_use_pesticide,
    label_restriction_notes: log.label_restriction_notes,
  }

  return [[...baseFields, ...productFields(singleProduct), ...trailingFields]]
}

// Build Indiana compliance CSV string
export function buildIndianaComplianceCsv(logs: SprayLog[]): string {
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`

  const allRows = logs.flatMap(expandLogRows)

  return [
    INDIANA_HEADERS.map(escape).join(','),
    ...allRows.map(r => r.map(escape).join(',')),
  ].join('\n')
}

// Build Indiana compliance PDF (client-side only — uses jspdf)
export async function buildCompliancePdf(logs: SprayLog[]): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default || autoTableModule.autoTable

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Indiana Commercial Applicator Use Records', pageWidth / 2, 36, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Date range from logs
  if (logs.length > 0) {
    const dates = logs.map(l => l.date).sort()
    const rangeText = `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`
    doc.text(rangeText, pageWidth / 2, 50, { align: 'center' })
  }

  doc.text(`Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 62, { align: 'center' })

  // Table
  const allRows = logs.flatMap(expandLogRows)

  autoTable(doc, {
    head: [INDIANA_HEADERS],
    body: allRows,
    startY: 74,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [22, 101, 52], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 20, right: 20 },
    didDrawPage: (data: any) => {
      // Footer on every page
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text(
        'Records maintained per 355 IAC 4-4-1  |  Indiana Office of the State Chemist',
        pageWidth / 2,
        pageHeight - 18,
        { align: 'center' },
      )
      doc.text(
        `Page ${pageNumber}`,
        pageWidth - 24,
        pageHeight - 18,
        { align: 'right' },
      )
    },
  })

  doc.save(`indiana-compliance-${new Date().toISOString().slice(0, 10)}.pdf`)
}
