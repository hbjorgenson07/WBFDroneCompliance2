-- ============================================================
-- Spray Log Tracker — Supabase Database Schema
-- ============================================================
-- To apply: paste this entire file into the Supabase SQL Editor
-- and click "Run". You only need to do this once.
-- ============================================================

-- Main spray log table
-- All operational fields are stored flat in one table.
-- The user_id ties each record to a Supabase auth user.
CREATE TABLE IF NOT EXISTS spray_logs (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Job / Mission Information
  job_id                    TEXT NOT NULL,
  date                      DATE NOT NULL,
  start_time                TIME,
  end_time                  TIME,
  operator_name             TEXT,
  aircraft_tail_number      TEXT,
  customer_name             TEXT,
  field_name                TEXT,
  field_location            TEXT,
  gps_coordinates           TEXT,
  acreage_treated           DECIMAL(10,2),
  crop_type                 TEXT,
  application_type          TEXT CHECK (application_type IN ('spray', 'spread')),
  mission_status            TEXT DEFAULT 'planned' CHECK (mission_status IN ('planned', 'completed', 'canceled')),

  -- Product / Application Information
  product_name              TEXT,
  epa_registration_number   TEXT,
  product_type              TEXT,
  target_pest               TEXT,
  rate_applied              TEXT,
  total_quantity_used       TEXT,
  carrier_type              TEXT,
  carrier_rate              TEXT,
  tank_mix_notes            TEXT,
  restricted_use_pesticide  BOOLEAN DEFAULT false,
  label_restriction_notes   TEXT,
  products                  JSONB DEFAULT '[]',

  -- Weather / Conditions
  wind_speed                TEXT,
  wind_direction            TEXT,
  temperature               TEXT,
  humidity                  TEXT,
  sky_conditions            TEXT,
  inversion_concern_notes   TEXT,
  weather_notes             TEXT,

  -- Operational Notes
  nozzle_equipment_notes    TEXT,
  swath_width               TEXT,
  flight_altitude_notes     TEXT,
  drift_mitigation_notes    TEXT,
  incident_notes            TEXT,
  general_remarks           TEXT,

  -- Record Metadata (managed automatically)
  created_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at                TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- Row Level Security (RLS)
-- This ensures each user can ONLY see and modify their own records,
-- even if someone had your API key.
-- ============================================================
ALTER TABLE spray_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own logs"
  ON spray_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Auto-update the updated_at timestamp on every row change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spray_logs_updated_at
  BEFORE UPDATE ON spray_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Helpful indexes for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS spray_logs_user_id_idx ON spray_logs (user_id);
CREATE INDEX IF NOT EXISTS spray_logs_date_idx ON spray_logs (date DESC);
CREATE INDEX IF NOT EXISTS spray_logs_status_idx ON spray_logs (mission_status);

-- ============================================================
-- User Profiles — stores pilot/operator defaults (one row per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  operator_name         TEXT,
  aircraft_tail_number  TEXT,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own profile"
  ON user_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
