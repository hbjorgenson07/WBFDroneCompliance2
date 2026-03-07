CREATE TABLE IF NOT EXISTS saved_products (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name              TEXT NOT NULL,
  epa_registration_number   TEXT,
  product_type              TEXT,
  target_pest               TEXT,
  rate_applied              TEXT,
  carrier_type              TEXT,
  restricted_use_pesticide  BOOLEAN DEFAULT false,
  label_restriction_notes   TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON saved_products
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_products_user_id_idx ON saved_products (user_id);

-- Unique constraint required for upsert on (user_id, product_name)
ALTER TABLE saved_products
  ADD CONSTRAINT saved_products_user_id_product_name_key UNIQUE (user_id, product_name);
