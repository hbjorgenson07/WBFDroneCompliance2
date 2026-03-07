import { SprayLog, ProductEntry } from '@/lib/types'
import Badge from './ui/Badge'
import { formatDate, formatTime } from '@/lib/utils'

interface LogDetailProps {
  log: SprayLog
}

// Renders a single label/value row
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{String(value)}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h2>
      </div>
      <dl className="px-4 py-1">{children}</dl>
    </div>
  )
}

export default function LogDetail({ log }: LogDetailProps) {
  return (
    <div className="space-y-4 print:space-y-3">

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{log.job_id}</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            {log.customer_name ?? 'Unnamed Job'} &mdash; {log.field_name ?? 'No Field'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDate(log.date)}</p>
        </div>
        <Badge status={log.mission_status} />
      </div>

      {/* Mission / Job Information */}
      <Section title="Mission / Job Information">
        <Field label="Date"             value={formatDate(log.date)} />
        <Field label="Start Time"       value={formatTime(log.start_time)} />
        <Field label="End Time"         value={formatTime(log.end_time)} />
        <Field label="Operator / Pilot" value={log.operator_name} />
        <Field label="Aircraft"         value={log.aircraft_tail_number} />
        <Field label="Customer"         value={log.customer_name} />
        <Field label="Field Name"       value={log.field_name} />
        <Field label="Field Location"   value={log.field_location} />
        <Field label="GPS Coordinates"  value={log.gps_coordinates} />
        <Field label="Acreage Treated"  value={log.acreage_treated != null ? `${log.acreage_treated} acres` : null} />
        <Field label="Crop Type"        value={log.crop_type} />
        <Field label="Application Type" value={log.application_type} />
      </Section>

      {/* Product / Application Information */}
      {(() => {
        // Auto-migrate: use products array if present, otherwise build from flat fields
        const products: ProductEntry[] = log.products?.length > 0
          ? log.products
          : [{
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
            }]
        const multi = products.length > 1

        return products.map((p, i) => (
          <Section key={i} title={multi ? `Product ${i + 1}` : 'Product / Application Information'}>
            <Field label="Product Name"          value={p.product_name} />
            <Field label="EPA Registration #"    value={p.epa_registration_number} />
            <Field label="Product Type"          value={p.product_type} />
            <Field label="Target Pest / Purpose" value={p.target_pest} />
            <Field label="Rate Applied"          value={p.rate_applied} />
            <Field label="Total Quantity Used"   value={p.total_quantity_used} />
            <Field label="Carrier Type"          value={p.carrier_type} />
            <Field label="Carrier Rate"          value={p.carrier_rate} />
            <Field
              label="Restricted Use Pesticide"
              value={p.restricted_use_pesticide ? 'Yes — Restricted Use Pesticide' : 'No'}
            />
            <Field label="Label / Restriction Notes" value={p.label_restriction_notes} />
          </Section>
        ))
      })()}

      {/* Tank Mix Notes (shared across all products) */}
      {log.tank_mix_notes && (
        <Section title="Tank Mix Notes">
          <Field label="Tank Mix Notes" value={log.tank_mix_notes} />
        </Section>
      )}

      {/* Weather / Conditions */}
      <Section title="Weather / Conditions">
        <Field label="Wind Speed"            value={log.wind_speed} />
        <Field label="Wind Direction"        value={log.wind_direction} />
        <Field label="Temperature"           value={log.temperature} />
        <Field label="Humidity"              value={log.humidity} />
        <Field label="Sky Conditions"        value={log.sky_conditions} />
        <Field label="Inversion Notes"       value={log.inversion_concern_notes} />
        <Field label="Weather Notes"         value={log.weather_notes} />
      </Section>

      {/* Operational Notes */}
      <Section title="Operational Notes">
        <Field label="Swath Width"            value={log.swath_width} />
        <Field label="Flight Altitude"        value={log.flight_altitude_notes} />
        <Field label="Nozzle / Equipment"     value={log.nozzle_equipment_notes} />
        <Field label="Drift Mitigation"       value={log.drift_mitigation_notes} />
        <Field label="Incident / Issue Notes" value={log.incident_notes} />
        <Field label="General Remarks"        value={log.general_remarks} />
      </Section>

      {/* Record Metadata */}
      <Section title="Record Metadata">
        <Field label="Created" value={new Date(log.created_at).toLocaleString()} />
        <Field label="Updated" value={new Date(log.updated_at).toLocaleString()} />
      </Section>
    </div>
  )
}
