-- ============================================================
-- Migration 003: merge "Team Ninja 1" and "Team Ninja 2" into "Ninja Team"
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- Class names that are just the old level ("Team Ninja 2", "Team Ninja 1 10-12")
UPDATE ninja_classes
SET class_name = regexp_replace(class_name, '^Team Ninja [12]', 'Ninja Team')
WHERE class_name ~ '^Team Ninja [12]';

-- The level itself
UPDATE ninja_classes
SET belt_level = 'Ninja Team'
WHERE belt_level IN ('Team Ninja 1', 'Team Ninja 2');

-- Check the result
SELECT day, class_name, belt_level FROM ninja_classes
WHERE belt_level = 'Ninja Team' ORDER BY day, start_min;
