-- ============================================================
-- Ninja Scheduler — Supabase schema
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- All tables are prefixed ninja_ so they can share a project
-- with the gymnastics app.
-- ============================================================

-- One row per class per weekday. No odd/even parity.
CREATE TABLE IF NOT EXISTS ninja_classes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day           text NOT NULL,        -- 'Mon' | 'Tue' | ... | 'Sun'
  class_name    text NOT NULL,
  belt_level    text,
  age_band      text,
  start_min     int NOT NULL,         -- minutes since midnight
  end_min       int NOT NULL,
  coaches       text[] DEFAULT '{}',
  station       text DEFAULT '',
  start_date    date,                 -- NULL = always
  end_date      date,                 -- NULL = always
  labor_id      text DEFAULT '',      -- team / labor code (id from ninja_settings 'labor_codes')
  created_at    timestamptz DEFAULT now()
);

-- Date-specific overrides (subs, cancellations)
CREATE TABLE IF NOT EXISTS ninja_overrides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  on_date       date NOT NULL,
  class_id      uuid REFERENCES ninja_classes(id) ON DELETE CASCADE,
  coaches       text[],               -- NULL = inherit template
  canceled      boolean DEFAULT false,
  cancel_reason text DEFAULT '',
  note          text DEFAULT '',
  UNIQUE (on_date, class_id)
);
CREATE INDEX IF NOT EXISTS ninja_overrides_on_date_idx  ON ninja_overrides (on_date);
CREATE INDEX IF NOT EXISTS ninja_overrides_class_id_idx ON ninja_overrides (class_id);

CREATE TABLE IF NOT EXISTS ninja_coaches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text UNIQUE NOT NULL,
  phone          text DEFAULT '',
  email          text DEFAULT '',
  color          text DEFAULT '',
  employee_id    text DEFAULT '',     -- UKG employee number
  departure_date date,                -- NULL = active
  created_at     timestamptz DEFAULT now()
);

-- Weekly availability: { "Mon": [[900, 1200]], "Tue": [], ... } (minutes)
CREATE TABLE IF NOT EXISTS ninja_availability (
  coach  text PRIMARY KEY,
  days   jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ninja_absences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach      text NOT NULL,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  reason     text DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ninja_absences_dates_idx ON ninja_absences (start_date, end_date);

CREATE TABLE IF NOT EXISTS ninja_time_off (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach       text NOT NULL,
  on_date     date NOT NULL,
  reason      text DEFAULT 'other',
  reason_note text DEFAULT '',
  status      text DEFAULT 'pending',  -- pending | approved | denied
  covered     boolean DEFAULT false,
  admin_note  text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (coach, on_date)
);
CREATE INDEX IF NOT EXISTS ninja_time_off_on_date_idx ON ninja_time_off (on_date);

CREATE TABLE IF NOT EXISTS ninja_coverage_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  on_date     date NOT NULL,
  absent      text NOT NULL,
  covering    text NOT NULL,
  scope       text DEFAULT 'day',      -- 'day' | 'classes'
  classes     jsonb DEFAULT '[]',      -- class ids when scope = 'classes'
  reason      text DEFAULT '',
  reason_note text DEFAULT '',
  status      text DEFAULT 'pending',  -- pending | approved | denied
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ninja_coverage_on_date_idx ON ninja_coverage_requests (on_date);

CREATE TABLE IF NOT EXISTS ninja_settings (
  key   text PRIMARY KEY,
  value jsonb
);

-- ------------------------------------------------------------
-- Permissive RLS (USING (true), no TO anon scoping), API grants,
-- and realtime for every ninja_ table.
-- ------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ninja_classes', 'ninja_overrides', 'ninja_coaches', 'ninja_availability',
    'ninja_absences', 'ninja_time_off', 'ninja_coverage_requests', 'ninja_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "full access" ON %I', t);
    EXECUTE format('CREATE POLICY "full access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT ALL ON TABLE %I TO anon, authenticated', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
