// TypeScript types for the Spray Log Tracker app

export type MissionStatus = 'planned' | 'completed' | 'canceled'
export type ApplicationType = 'spray' | 'spread'

// The full spray log record as stored in Supabase
export interface SprayLog {
  id: string
  user_id: string

  // Job Information
  job_id: string
  date: string             // ISO date string "YYYY-MM-DD"
  start_time: string | null
  end_time: string | null
  operator_name: string | null
  aircraft_tail_number: string | null
  customer_name: string | null
  field_name: string | null
  field_location: string | null
  gps_coordinates: string | null
  acreage_treated: number | null
  crop_type: string | null
  application_type: ApplicationType | null
  mission_status: MissionStatus

  // Product / Application Information
  product_name: string | null
  epa_registration_number: string | null
  product_type: string | null
  target_pest: string | null
  rate_applied: string | null
  total_quantity_used: string | null
  carrier_type: string | null
  carrier_rate: string | null
  tank_mix_notes: string | null
  restricted_use_pesticide: boolean
  label_restriction_notes: string | null

  // Weather / Conditions
  wind_speed: string | null
  wind_direction: string | null
  temperature: string | null
  humidity: string | null
  sky_conditions: string | null
  inversion_concern_notes: string | null
  weather_notes: string | null

  // Operational Notes
  nozzle_equipment_notes: string | null
  swath_width: string | null
  flight_altitude_notes: string | null
  drift_mitigation_notes: string | null
  incident_notes: string | null
  general_remarks: string | null

  // Metadata
  created_at: string
  updated_at: string
}

// Form data type — all fields optional except required ones
export type SprayLogFormData = Omit<SprayLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>

// Filters used on the logs list page
export interface LogFilters {
  search: string
  status: MissionStatus | ''
  aircraft: string
  crop: string
  from: string
  to: string
  sort: 'newest' | 'oldest'
}
