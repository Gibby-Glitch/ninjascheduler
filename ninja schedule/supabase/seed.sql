-- Optional sample data so the board isn't empty on first load.
-- Run AFTER schema.sql. Delete these rows whenever you're ready.

INSERT INTO ninja_coaches (name, phone, color) VALUES
  ('Alex',   '(555) 111-2222', '#2563eb'),
  ('Jordan', '(555) 333-4444', '#16a34a'),
  ('Sam',    '(555) 555-6666', '#db2777')
ON CONFLICT (name) DO NOTHING;

INSERT INTO ninja_classes (day, class_name, belt_level, age_band, start_min, end_min, coaches, station) VALUES
  ('Mon', 'White Belt 4-6',  'White',  '4-6',   960, 1005, '{Alex}',        'Floor'),
  ('Mon', 'Yellow Belt 7-9', 'Yellow', '7-9',  1020, 1080, '{Jordan}',      'Obstacle Zone'),
  ('Mon', 'Green Belt 10-12','Green',  '10-12',1080, 1155, '{Sam,Alex}',    'Warped Wall'),
  ('Wed', 'White Belt 7-9',  'White',  '7-9',   990, 1050, '{Jordan}',      'Trampoline'),
  ('Sat', 'Open Gym',        NULL,     NULL,    600,  720, '{Sam}',         'Obstacle Zone');

INSERT INTO ninja_availability (coach, days) VALUES
  ('Alex',   '{"Mon":[[900,1200]],"Wed":[[900,1200]]}'),
  ('Jordan', '{"Mon":[[960,1140]],"Wed":[[960,1140]],"Sat":[[540,780]]}'),
  ('Sam',    '{"Mon":[[1020,1200]],"Sat":[[540,780]]}')
ON CONFLICT (coach) DO NOTHING;
