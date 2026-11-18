-- ============================================================
-- Migration 002 — payroll / UKG export
-- Run once in Supabase → SQL Editor if you already ran schema.sql.
-- (New installs: schema.sql already includes these columns.)
-- ============================================================

-- UKG employee number per coach
ALTER TABLE ninja_coaches ADD COLUMN IF NOT EXISTS employee_id text DEFAULT '';

-- Which team / labor code a class is paid under.
-- Holds the id of an entry in ninja_settings key 'labor_codes'.
ALTER TABLE ninja_classes ADD COLUMN IF NOT EXISTS labor_id text DEFAULT '';
