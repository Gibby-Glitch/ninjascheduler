// Program levels (stored in ninja_classes.belt_level).
export const LEVELS = [
  "Ninjanators", "Ninja 1", "Ninja 2", "Ninja 3",
  "Team Ninja 1", "Team Ninja 2", "Ninja Open Gym", "Ninja Homeschool",
];

export const LEVEL_COLORS = {
  "Ninjanators": "#facc15", "Ninja 1": "#22c55e", "Ninja 2": "#3b82f6", "Ninja 3": "#a855f7",
  "Team Ninja 1": "#e11d48", "Team Ninja 2": "#9f1239", "Ninja Open Gym": "#f97316", "Ninja Homeschool": "#0d9488",
};

// Default team (labor code id) suggested when a level is picked.
export const LEVEL_TEAM = (level) =>
  /^Team/.test(level) ? "team" : /Open Gym/.test(level) ? "open" : level ? "rec" : "";

export const AGE_BANDS = ["4-6", "7-9", "10-12", "13+", "Adult"];

export const DEFAULT_STATIONS = [
  "Floor", "Trampoline", "Warped Wall", "Salmon Ladder",
  "Quad Steps", "Cliff Hanger", "Obstacle Zone", "Conditioning",
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_FULL = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

export const TIME_OFF_REASONS = [
  { value: "sick", label: "Sick" },
  { value: "family", label: "Family" },
  { value: "school", label: "School / work" },
  { value: "vacation", label: "Vacation" },
  { value: "other", label: "Other" },
];

export const COACH_PALETTE = [
  "#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed",
  "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#059669",
];

// Teams and their UKG labor codes. Edited in Settings, stored in
// ninja_settings key 'labor_codes'. `id` is stable; team/code can change.
export const DEFAULT_LABOR_CODES = [
  { id: "rec", team: "Recreational", code: "" },
  { id: "team", team: "Competition Team", code: "" },
  { id: "open", team: "Open Gym", code: "" },
];

// Fields a UKG export column can pull from.
export const UKG_FIELDS = [
  { value: "employee_id", label: "Employee ID" },
  { value: "coach", label: "Coach name" },
  { value: "date", label: "Date" },
  { value: "day", label: "Weekday" },
  { value: "start", label: "Start time" },
  { value: "end", label: "End time" },
  { value: "hours", label: "Hours" },
  { value: "labor_code", label: "Labor code" },
  { value: "team", label: "Team" },
  { value: "class_name", label: "Class name" },
  { value: "station", label: "Station" },
  { value: "fixed", label: "Fixed text…" },
];

// Generic time-entry layout. Adjust in Settings to match your UKG import.
export const DEFAULT_UKG = {
  columns: [
    { header: "Employee Id", field: "employee_id" },
    { header: "Date", field: "date" },
    { header: "Start Time", field: "start" },
    { header: "End Time", field: "end" },
    { header: "Hours", field: "hours" },
    { header: "Labor Code", field: "labor_code" },
  ],
  dateFormat: "MM/DD/YYYY",
  timeFormat: "hh:mm AM",
  merge: true,
  includeHeader: true,
  fileName: "ninja_ukg",
};
export const DATE_FORMATS = ["MM/DD/YYYY", "M/D/YYYY", "YYYY-MM-DD"];
export const TIME_FORMATS = ["hh:mm AM", "h:mm AM", "HH:mm"];

export const TABLES = {
  classes: "ninja_classes",
  overrides: "ninja_overrides",
  coaches: "ninja_coaches",
  availability: "ninja_availability",
  absences: "ninja_absences",
  timeOff: "ninja_time_off",
  coverage: "ninja_coverage_requests",
  settings: "ninja_settings",
};
