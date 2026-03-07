'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Textarea } from './ui/Input'
import { Select } from './ui/Select'
import Toggle from './ui/Toggle'
import Button from './ui/Button'
import { SprayLogFormData, ProductEntry, emptyProduct } from '@/lib/types'
import { generateJobId, todayString } from '@/lib/utils'
import ProductSearch from './ProductSearch'

interface SprayLogFormProps {
  // Initial data for edit mode or duplicate mode
  initialData?: Partial<SprayLogFormData>
  // The log ID if editing an existing log (undefined = new log)
  logId?: string
}

// Default empty form state
function emptyForm(): SprayLogFormData {
  return {
    job_id:                    generateJobId(),
    date:                      todayString(),
    start_time:                null,
    end_time:                  null,
    operator_name:             null,
    aircraft_tail_number:      null,
    customer_name:             null,
    field_name:                null,
    field_location:            null,
    gps_coordinates:           null,
    acreage_treated:           null,
    crop_type:                 null,
    application_type:          null,
    mission_status:            'planned',
    product_name:              null,
    epa_registration_number:   null,
    product_type:              null,
    target_pest:               null,
    rate_applied:              null,
    total_quantity_used:       null,
    carrier_type:              null,
    carrier_rate:              null,
    tank_mix_notes:            null,
    restricted_use_pesticide:  false,
    label_restriction_notes:   null,
    products:                  [emptyProduct()],
    wind_speed:                null,
    wind_direction:            null,
    temperature:               null,
    humidity:                  null,
    sky_conditions:            null,
    inversion_concern_notes:   null,
    weather_notes:             null,
    nozzle_equipment_notes:    null,
    swath_width:               null,
    flight_altitude_notes:     null,
    drift_mitigation_notes:    null,
    incident_notes:            null,
    general_remarks:           null,
  }
}

// Section header with collapse toggle
function SectionHeader({
  title, open, onToggle
}: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full py-3 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-left"
    >
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        {title}
      </h2>
      <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
    </button>
  )
}

export default function SprayLogForm({ initialData, logId }: SprayLogFormProps) {
  const router = useRouter()
  const isEditing = !!logId

  // Form state — merged from defaults + any initial data passed in
  const [form, setForm] = useState<SprayLogFormData>(() => {
    const base = { ...emptyForm(), ...initialData }
    // Auto-migrate: flat product fields → products[0]
    if ((!base.products || base.products.length === 0) && base.product_name) {
      base.products = [{
        product_name: base.product_name,
        epa_registration_number: base.epa_registration_number,
        product_type: base.product_type,
        target_pest: base.target_pest,
        rate_applied: base.rate_applied,
        total_quantity_used: base.total_quantity_used,
        carrier_type: base.carrier_type,
        carrier_rate: base.carrier_rate,
        restricted_use_pesticide: base.restricted_use_pesticide,
        label_restriction_notes: base.label_restriction_notes,
      }]
    }
    if (!base.products || base.products.length === 0) base.products = [emptyProduct()]
    return base
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Dirty flags: tracks which product indices have had total_quantity_used manually edited
  const qtyDirtyRef = useRef<Set<number>>((() => {
    const dirty = new Set<number>()
    if (initialData?.products?.length) {
      initialData.products.forEach((p, i) => { if (p.total_quantity_used) dirty.add(i) })
    } else if (initialData?.total_quantity_used) {
      dirty.add(0)
    }
    return dirty
  })())

  // Auto-calculate Total Quantity Used per product from Carrier Rate × Acreage
  useEffect(() => {
    const acres = form.acreage_treated
    if (!acres || acres <= 0) return
    let changed = false
    const updated = form.products.map((p, i) => {
      if (qtyDirtyRef.current.has(i)) return p
      const rate = parseFloat(p.carrier_rate ?? '')
      if (!isNaN(rate) && rate > 0) {
        const qty = rate * acres
        const rounded = Number.isInteger(qty) ? qty : Math.round(qty * 100) / 100
        const newVal = `${rounded} gal`
        if (p.total_quantity_used !== newVal) {
          changed = true
          return { ...p, total_quantity_used: newVal }
        }
      }
      return p
    })
    if (changed) setForm(f => ({ ...f, products: updated }))
  }, [form.products, form.acreage_treated])

  // Autocomplete suggestions fetched from the user's existing records
  const [suggestions, setSuggestions] = useState<{
    aircraft: string[]; operators: string[]; customers: string[]; crops: string[]
  }>({ aircraft: [], operators: [], customers: [], crops: [] })

  // Past products for ProductSearch (derived from logs fetch, no extra call)
  const [pastProducts, setPastProducts] = useState<Array<{
    product_name: string
    epa_registration_number: string | null
    product_type: string | null
    target_pest: string | null
    rate_applied: string | null
    carrier_type: string | null
    restricted_use_pesticide: boolean
    label_restriction_notes: string | null
  }>>([])

  // Section open/closed state — all open by default on desktop
  const [sections, setSections] = useState({ mission: true, product: true, weather: true, ops: true })

  // Fetch distinct field values for autocomplete suggestions
  useEffect(() => {
    fetch('/api/logs?limit=500')
      .then(r => r.json())
      .then((logs: Array<Record<string, unknown>>) => {
        if (!Array.isArray(logs)) return
        const uniq = (key: string) =>
          [...new Set(logs.map(l => l[key] as string).filter(Boolean))].sort()
        setSuggestions({
          aircraft:  uniq('aircraft_tail_number'),
          operators: uniq('operator_name'),
          customers: uniq('customer_name'),
          crops:     uniq('crop_type'),
        })

        // Deduplicate past products by product_name for ProductSearch
        const seen = new Set<string>()
        const products = logs
          .filter(l => l.product_name)
          .reduce<typeof pastProducts>((acc, l) => {
            const name = l.product_name as string
            if (!seen.has(name)) {
              seen.add(name)
              acc.push({
                product_name:             name,
                epa_registration_number:  (l.epa_registration_number as string) ?? null,
                product_type:             (l.product_type as string) ?? null,
                target_pest:              (l.target_pest as string) ?? null,
                rate_applied:             (l.rate_applied as string) ?? null,
                carrier_type:             (l.carrier_type as string) ?? null,
                restricted_use_pesticide: (l.restricted_use_pesticide as boolean) ?? false,
                label_restriction_notes:  (l.label_restriction_notes as string) ?? null,
              })
            }
            return acc
          }, [])
        setPastProducts(products)
      })
      .catch(() => {}) // Suggestions are non-critical; silently ignore errors
  }, [])

  // Toggle a section open/closed
  function toggleSection(key: keyof typeof sections) {
    setSections(s => ({ ...s, [key]: !s[key] }))
  }

  // Generic field updater — handles strings, numbers, booleans
  function set(field: keyof SprayLogFormData, value: string | number | boolean | null) {
    setForm(f => ({ ...f, [field]: value === '' ? null : value }))
  }

  // Product-specific updaters
  function setProduct(index: number, field: keyof ProductEntry, value: string | boolean | null) {
    setForm(f => {
      const products = [...f.products]
      products[index] = { ...products[index], [field]: value === '' ? null : value }
      return { ...f, products }
    })
  }
  function addProduct() {
    setForm(f => ({ ...f, products: [...f.products, emptyProduct()] }))
  }
  function removeProduct(index: number) {
    setForm(f => ({ ...f, products: f.products.filter((_, i) => i !== index) }))
    // Shift dirty flags above the removed index
    const newDirty = new Set<number>()
    qtyDirtyRef.current.forEach(i => {
      if (i < index) newDirty.add(i)
      else if (i > index) newDirty.add(i - 1)
    })
    qtyDirtyRef.current = newDirty
  }

  // Submit the form — either create or update
  async function handleSubmit(redirectToDetail: boolean) {
    if (!form.date) {
      setError('Date is required.')
      return
    }
    setSaving(true)
    setError('')

    try {
      const url    = isEditing ? `/api/logs/${logId}` : '/api/logs'
      const method = isEditing ? 'PUT' : 'POST'

      // Populate flat fields from products[0] for backward compat & search
      const payload = { ...form }
      if (payload.products.length > 0) {
        const p = payload.products[0]
        payload.product_name = p.product_name
        payload.epa_registration_number = p.epa_registration_number
        payload.product_type = p.product_type
        payload.target_pest = p.target_pest
        payload.rate_applied = p.rate_applied
        payload.total_quantity_used = p.total_quantity_used
        payload.carrier_type = p.carrier_type
        payload.carrier_rate = p.carrier_rate
        payload.restricted_use_pesticide = p.restricted_use_pesticide
        payload.label_restriction_notes = p.label_restriction_notes
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }

      const saved = await res.json()

      if (redirectToDetail) {
        router.push(`/logs/${saved.id}`)
      } else {
        // Stay on form — if new, update URL to edit route so refreshes don't duplicate
        if (!isEditing) {
          router.replace(`/logs/${saved.id}/edit`)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Helper to render a datalist for autocomplete
  function DataList({ id, items }: { id: string; items: string[] }) {
    return (
      <datalist id={id}>
        {items.map(i => <option key={i} value={i} />)}
      </datalist>
    )
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit(true) }} className="space-y-4 pb-10">

      {/* ── Section 1: Mission / Job Information ── */}
      <div className="space-y-3">
        <SectionHeader title="Mission / Job Information" open={sections.mission} onToggle={() => toggleSection('mission')} />
        {sections.mission && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
            <Input
              label="Job ID"
              value={form.job_id}
              onChange={e => set('job_id', e.target.value)}
              hint="Auto-generated — you can edit this"
              required
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              required
            />
            <Input
              label="Start Time"
              type="time"
              value={form.start_time ?? ''}
              onChange={e => set('start_time', e.target.value)}
            />
            <Input
              label="End Time"
              type="time"
              value={form.end_time ?? ''}
              onChange={e => set('end_time', e.target.value)}
            />
            <div>
              <Input
                label="Operator / Pilot Name"
                value={form.operator_name ?? ''}
                onChange={e => set('operator_name', e.target.value)}
                list="operators-list"
                placeholder="e.g. John Smith"
              />
              <DataList id="operators-list" items={suggestions.operators} />
            </div>
            <div>
              <Input
                label="Aircraft Tail Number"
                value={form.aircraft_tail_number ?? ''}
                onChange={e => set('aircraft_tail_number', e.target.value)}
                list="aircraft-list"
                placeholder="e.g. N12345"
              />
              <DataList id="aircraft-list" items={suggestions.aircraft} />
            </div>
            <div>
              <Input
                label="Customer / Farm Name"
                value={form.customer_name ?? ''}
                onChange={e => set('customer_name', e.target.value)}
                list="customers-list"
                placeholder="e.g. Smith Farms"
              />
              <DataList id="customers-list" items={suggestions.customers} />
            </div>
            <Input
              label="Field Name or ID"
              value={form.field_name ?? ''}
              onChange={e => set('field_name', e.target.value)}
              placeholder="e.g. North Field, Field 4A"
            />
            <Input
              label="Field Location Description"
              value={form.field_location ?? ''}
              onChange={e => set('field_location', e.target.value)}
              placeholder="e.g. 2 miles east of Hwy 30"
            />
            <Input
              label="GPS Coordinates (optional)"
              value={form.gps_coordinates ?? ''}
              onChange={e => set('gps_coordinates', e.target.value)}
              placeholder="e.g. 41.123, -96.456"
            />
            <Input
              label="Acreage Treated"
              type="number"
              min="0"
              step="0.01"
              value={form.acreage_treated ?? ''}
              onChange={e => set('acreage_treated', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g. 120.5"
            />
            <div>
              <Input
                label="Crop Type"
                value={form.crop_type ?? ''}
                onChange={e => set('crop_type', e.target.value)}
                list="crops-list"
                placeholder="e.g. Corn, Soybeans, Wheat"
              />
              <DataList id="crops-list" items={suggestions.crops} />
            </div>
            <Select
              label="Application Type"
              value={form.application_type ?? ''}
              onChange={e => set('application_type', e.target.value)}
              placeholder="Select type..."
              options={[
                { value: 'spray', label: 'Spray' },
                { value: 'spread', label: 'Spread' },
              ]}
            />
            <Select
              label="Mission Status"
              value={form.mission_status}
              onChange={e => set('mission_status', e.target.value)}
              options={[
                { value: 'planned',   label: 'Planned' },
                { value: 'completed', label: 'Completed' },
                { value: 'canceled',  label: 'Canceled' },
              ]}
            />
          </div>
        )}
      </div>

      {/* ── Section 2: Product / Application Information ── */}
      <div className="space-y-3">
        <SectionHeader title="Product / Application Information" open={sections.product} onToggle={() => toggleSection('product')} />
        {sections.product && (
          <div className="space-y-4 px-1">
            {form.products.map((product, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                {/* Product card header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Product {idx + 1}
                  </h3>
                  {form.products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(idx)}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProductSearch
                    pastProducts={pastProducts}
                    currentValues={{
                      product_name:             product.product_name,
                      epa_registration_number:  product.epa_registration_number,
                      product_type:             product.product_type,
                      target_pest:              product.target_pest,
                      rate_applied:             product.rate_applied,
                      carrier_type:             product.carrier_type,
                      restricted_use_pesticide: product.restricted_use_pesticide,
                      label_restriction_notes:  product.label_restriction_notes,
                    }}
                    onSelect={fields => {
                      setProduct(idx, 'product_name',            fields.product_name)
                      setProduct(idx, 'epa_registration_number', fields.epa_registration_number ?? '')
                      setProduct(idx, 'product_type',            fields.product_type ?? '')
                      setProduct(idx, 'target_pest',             fields.target_pest ?? '')
                      setProduct(idx, 'rate_applied',            fields.rate_applied ?? '')
                      setProduct(idx, 'carrier_type',            fields.carrier_type ?? '')
                      setProduct(idx, 'restricted_use_pesticide', fields.restricted_use_pesticide)
                      setProduct(idx, 'label_restriction_notes', fields.label_restriction_notes ?? '')
                    }}
                  />
                  <Input
                    label="Product Name"
                    value={product.product_name ?? ''}
                    onChange={e => setProduct(idx, 'product_name', e.target.value)}
                    placeholder="e.g. Roundup PowerMAX"
                  />
                  <Input
                    label="EPA Registration Number"
                    value={product.epa_registration_number ?? ''}
                    onChange={e => setProduct(idx, 'epa_registration_number', e.target.value)}
                    placeholder="e.g. 524-539"
                  />
                  <Select
                    label="Product Type"
                    value={product.product_type ?? ''}
                    onChange={e => setProduct(idx, 'product_type', e.target.value)}
                    placeholder="Select type..."
                    options={[
                      { value: 'Herbicide', label: 'Herbicide' },
                      { value: 'Fungicide', label: 'Fungicide' },
                      { value: 'Insecticide', label: 'Insecticide' },
                      { value: 'Acaricide / Miticide', label: 'Acaricide / Miticide' },
                      { value: 'Bactericide', label: 'Bactericide' },
                      { value: 'Rodenticide', label: 'Rodenticide' },
                      { value: 'Plant Growth Regulator', label: 'Plant Growth Regulator' },
                      { value: 'Adjuvant / Surfactant', label: 'Adjuvant / Surfactant' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                  <div>
                    <Input
                      label="Target Pest or Purpose"
                      value={product.target_pest ?? ''}
                      onChange={e => setProduct(idx, 'target_pest', e.target.value)}
                      placeholder="e.g. Broadleaf Weeds, Aphids"
                      list={`pest-options-${idx}`}
                    />
                    <datalist id={`pest-options-${idx}`}>
                      {[
                        'Broadleaf Weeds', 'Grass Weeds', 'Annual Weeds', 'Perennial Weeds', 'Sedge / Nutsedge',
                        'Aphids', 'Armyworm', 'Caterpillars', 'Corn Rootworm', 'Grasshoppers',
                        'Spider Mites', 'Stinkbug', 'Thrips', 'Whitefly',
                        'Fungal Disease', 'Powdery Mildew', 'Gray Mold / Botrytis', 'Rust', 'Blight', 'Sclerotinia',
                      ].map(p => <option key={p} value={p} />)}
                    </datalist>
                  </div>
                  <Input
                    label="Rate Applied"
                    value={product.rate_applied ?? ''}
                    onChange={e => setProduct(idx, 'rate_applied', e.target.value)}
                    placeholder="e.g. 22 oz/acre"
                  />
                  <Input
                    label="Total Quantity Used"
                    value={product.total_quantity_used ?? ''}
                    onChange={e => {
                      qtyDirtyRef.current.add(idx)
                      setProduct(idx, 'total_quantity_used', e.target.value)
                    }}
                    placeholder="e.g. 180 gallons"
                  />
                  <Select
                    label="Carrier Type"
                    value={product.carrier_type ?? ''}
                    onChange={e => setProduct(idx, 'carrier_type', e.target.value)}
                    placeholder="Select carrier..."
                    options={[
                      { value: 'Water', label: 'Water' },
                      { value: 'UAN (Liquid Fertilizer)', label: 'UAN (Liquid Fertilizer)' },
                      { value: 'Diesel', label: 'Diesel' },
                      { value: 'Vegetable Oil', label: 'Vegetable Oil' },
                      { value: 'Mineral Oil', label: 'Mineral Oil' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                  <Input
                    label="Carrier Rate"
                    value={product.carrier_rate ?? ''}
                    onChange={e => setProduct(idx, 'carrier_rate', e.target.value)}
                    placeholder="e.g. 5 GPA"
                  />
                  <div className="sm:col-span-2">
                    <Toggle
                      label="Restricted Use Pesticide (RUP)"
                      description="Check if this product is classified as restricted use"
                      checked={product.restricted_use_pesticide}
                      onChange={val => setProduct(idx, 'restricted_use_pesticide', val)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Label or Restriction Notes"
                      value={product.label_restriction_notes ?? ''}
                      onChange={e => setProduct(idx, 'label_restriction_notes', e.target.value)}
                      placeholder="Any relevant label requirements, buffer zones, restrictions..."
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Product button */}
            <button
              type="button"
              onClick={addProduct}
              className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
            >
              + Add Product
            </button>

            {/* Tank Mix Notes — shared across all products */}
            <div>
              <Textarea
                label="Tank Mix Notes"
                value={form.tank_mix_notes ?? ''}
                onChange={e => set('tank_mix_notes', e.target.value)}
                placeholder="Notes about the tank mix, compatibility, mixing order..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: Weather / Conditions ── */}
      <div className="space-y-3">
        <SectionHeader title="Weather / Conditions" open={sections.weather} onToggle={() => toggleSection('weather')} />
        {sections.weather && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
            <Input
              label="Wind Speed"
              value={form.wind_speed ?? ''}
              onChange={e => set('wind_speed', e.target.value)}
              placeholder="e.g. 8 mph"
            />
            <Input
              label="Wind Direction"
              value={form.wind_direction ?? ''}
              onChange={e => set('wind_direction', e.target.value)}
              placeholder="e.g. SW, South, 225°"
            />
            <Input
              label="Temperature"
              value={form.temperature ?? ''}
              onChange={e => set('temperature', e.target.value)}
              placeholder="e.g. 72°F"
            />
            <Input
              label="Humidity"
              value={form.humidity ?? ''}
              onChange={e => set('humidity', e.target.value)}
              placeholder="e.g. 55%"
            />
            <Select
              label="Sky Conditions"
              value={form.sky_conditions ?? ''}
              onChange={e => set('sky_conditions', e.target.value)}
              placeholder="Select conditions..."
              options={[
                { value: 'Clear', label: 'Clear' },
                { value: 'Mostly Clear', label: 'Mostly Clear' },
                { value: 'Partly Cloudy', label: 'Partly Cloudy' },
                { value: 'Mostly Cloudy', label: 'Mostly Cloudy' },
                { value: 'Overcast', label: 'Overcast' },
                { value: 'Fog / Low Visibility', label: 'Fog / Low Visibility' },
                { value: 'Haze', label: 'Haze' },
              ]}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Inversion Concern Notes"
                value={form.inversion_concern_notes ?? ''}
                onChange={e => set('inversion_concern_notes', e.target.value)}
                placeholder="Note any temperature inversion conditions or concerns..."
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="General Weather Notes"
                value={form.weather_notes ?? ''}
                onChange={e => set('weather_notes', e.target.value)}
                placeholder="Any other weather observations..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 4: Operational Notes ── */}
      <div className="space-y-3">
        <SectionHeader title="Operational Notes" open={sections.ops} onToggle={() => toggleSection('ops')} />
        {sections.ops && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
            <Input
              label="Swath Width"
              value={form.swath_width ?? ''}
              onChange={e => set('swath_width', e.target.value)}
              placeholder="e.g. 60 ft"
            />
            <Input
              label="Flight Altitude Notes"
              value={form.flight_altitude_notes ?? ''}
              onChange={e => set('flight_altitude_notes', e.target.value)}
              placeholder="e.g. 10 ft AGL"
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Nozzle / Equipment Notes"
                value={form.nozzle_equipment_notes ?? ''}
                onChange={e => set('nozzle_equipment_notes', e.target.value)}
                placeholder="Nozzle type, pressure, equipment condition..."
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Drift Mitigation Notes"
                value={form.drift_mitigation_notes ?? ''}
                onChange={e => set('drift_mitigation_notes', e.target.value)}
                placeholder="Steps taken to reduce drift risk..."
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Incident or Issue Notes"
                value={form.incident_notes ?? ''}
                onChange={e => set('incident_notes', e.target.value)}
                placeholder="Any incidents, equipment issues, or unusual events..."
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="General Remarks"
                value={form.general_remarks ?? ''}
                onChange={e => set('general_remarks', e.target.value)}
                placeholder="Anything else worth noting about this job..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          loading={saving}
          onClick={() => handleSubmit(true)}
        >
          {isEditing ? 'Save Changes' : 'Save & View'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          loading={saving}
          onClick={() => handleSubmit(false)}
        >
          Save & Continue Editing
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
