// Payroll report + UKG export helpers.
import { supabase } from "./supabase";
import { addDays, classesForDate, dayKeyOf } from "./helpers";
import { DEFAULT_LABOR_CODES, DEFAULT_UKG } from "./constants";

const pad = (n) => String(n).padStart(2, "0");

export const getSetting = (settings, key) => settings.find((s) => s.key === key)?.value;
export const getLaborCodes = (settings) => getSetting(settings, "labor_codes") ?? DEFAULT_LABOR_CODES;
export const getUkgConfig = (settings) => ({ ...DEFAULT_UKG, ...(getSetting(settings, "ukg_export") || {}) });
export const saveSetting = (key, value) =>
  supabase.from("ninja_settings").upsert({ key, value }, { onConflict: "key" });

// One row per coach per class actually taught (subs applied, cancellations skipped).
export function laborRows(from, to, data, laborCodes) {
  const byId = new Map(laborCodes.map((l) => [l.id, l]));
  const emp = new Map(data.coaches.map((c) => [c.name, c.employee_id || ""]));
  const rows = [];
  for (let iso = from, g = 0; iso <= to && g < 900; iso = addDays(iso, 1), g++) {
    for (const c of classesForDate(iso, data.classes, data.overrideMap)) {
      if (c.canceled) continue;
      const lab = byId.get(c.labor_id);
      for (const coach of c.coaches) {
        rows.push({
          date: iso, day: dayKeyOf(iso), coach, employee_id: emp.get(coach) || "",
          class_id: c.id, class_name: c.class_name, station: c.station || "",
          start_min: c.start_min, end_min: c.end_min, hours: (c.end_min - c.start_min) / 60,
          labor_id: c.labor_id || "", team: lab?.team || "", labor_code: lab?.code || "",
          sub: !!c.override && !(c.templateCoaches || []).includes(coach),
        });
      }
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.coach.localeCompare(b.coach) || a.start_min - b.start_min);
}

// Join back-to-back / overlapping classes for the same coach + labor code into one shift.
export function mergeShifts(rows) {
  const out = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    if (prev && prev.date === r.date && prev.coach === r.coach && prev.labor_code === r.labor_code
        && prev.team === r.team && r.start_min <= prev.end_min) {
      prev.end_min = Math.max(prev.end_min, r.end_min);
      prev.hours = (prev.end_min - prev.start_min) / 60;
      prev.class_name = `${prev.class_name} + ${r.class_name}`;
    } else out.push({ ...r });
  }
  return out;
}

export function fmtDate(iso, f) {
  const [y, m, d] = iso.split("-");
  if (f === "YYYY-MM-DD") return iso;
  if (f === "M/D/YYYY") return `${+m}/${+d}/${y}`;
  return `${m}/${d}/${y}`;
}
export function fmtTime(min, f) {
  const h = Math.floor(min / 60), m = min % 60;
  if (f === "HH:mm") return `${pad(h)}:${pad(m)}`;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${f === "hh:mm AM" ? pad(h12) : h12}:${pad(m)} ${ap}`;
}
export const fmtHours = (h) => (Math.round(h * 100) / 100).toFixed(2);

function fieldValue(r, col, cfg) {
  switch (col.field) {
    case "date": return fmtDate(r.date, cfg.dateFormat);
    case "start": return fmtTime(r.start_min, cfg.timeFormat);
    case "end": return fmtTime(r.end_min, cfg.timeFormat);
    case "hours": return fmtHours(r.hours);
    case "fixed": return col.value || "";
    default: return r[col.field] ?? "";
  }
}

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (rows2d) => rows2d.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

export function ukgCSV(rows, cfg) {
  const src = cfg.merge ? mergeShifts(rows) : rows;
  const out = cfg.includeHeader ? [cfg.columns.map((c) => c.header)] : [];
  src.forEach((r) => out.push(cfg.columns.map((c) => fieldValue(r, c, cfg))));
  return { text: toCSV(out), count: src.length };
}

export function reportCSV(rows) {
  const out = [["Date", "Day", "Coach", "Employee ID", "Class", "Start", "End", "Hours", "Team", "Labor Code", "Sub?"]];
  rows.forEach((r) => out.push([
    r.date, r.day, r.coach, r.employee_id, r.class_name,
    fmtTime(r.start_min, "h:mm AM"), fmtTime(r.end_min, "h:mm AM"), fmtHours(r.hours),
    r.team, r.labor_code, r.sub ? "Yes" : "",
  ]));
  return toCSV(out);
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
