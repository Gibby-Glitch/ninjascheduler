import { supabase } from "./supabase";
import { DAYS } from "./constants";

// ---------- time ----------
export const fmt = (min) => {
  let h = Math.floor(min / 60), m = min % 60;
  const ap = h >= 12 ? "p" : "a";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")}${ap}`;
};
export const minToHHMM = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const hhmmToMin = (s) => {
  const [h, m] = String(s || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// ---------- dates (always ISO YYYY-MM-DD strings) ----------
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayISO = () => toISO(new Date());
export const dateAtNoon = (iso) => new Date(`${iso}T12:00:00`);
export const addDays = (iso, n) => {
  const d = dateAtNoon(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const dayKeyOf = (iso) => DAYS[(dateAtNoon(iso).getDay() + 6) % 7];
export const weekStart = (iso) => addDays(iso, -DAYS.indexOf(dayKeyOf(iso)));
export const fmtLong = (iso) =>
  dateAtNoon(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const fmtShort = (iso) =>
  dateAtNoon(iso).toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" });

// Rolling horizon — never hardcode a season end.
export const horizonEnd = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d;
};

// ---------- phone ----------
export function formatPhone(input) {
  const d = String(input || "").replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
export const phoneDigits = (s) => String(s || "").replace(/\D/g, "").slice(-10);

// ---------- data ----------
// Supabase caps select() at 1000 rows silently. Always paginate.
export async function fetchAllRows(table, orderCol = null, ascending = true, tiebreak = null) {
  const PAGE = 1000;
  let all = [], from = 0;
  for (let guard = 0; guard < 50; guard++) {
    let q = supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (orderCol) q = q.order(orderCol, { ascending });
    if (tiebreak) q = q.order(tiebreak, { ascending: true });
    const { data, error } = await q;
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return { data: all, error: null };
}

export const cleanList = (arr) => [...new Set((arr || []).map((s) => String(s).trim()).filter(Boolean))];

export const isActiveCoach = (c, iso = todayISO()) => !c.departure_date || c.departure_date >= iso;

// Resolve the template + overrides into the classes that actually run on a date.
export function classesForDate(iso, classes, overrideMap) {
  const dk = dayKeyOf(iso);
  return classes
    .filter((c) => c.day === dk
      && (!c.start_date || c.start_date <= iso)
      && (!c.end_date || c.end_date >= iso))
    .map((c) => {
      const o = overrideMap.get(`${iso}|${c.id}`) || null;
      return {
        ...c,
        templateCoaches: c.coaches || [],
        coaches: o?.coaches ?? c.coaches ?? [],
        canceled: !!o?.canceled,
        cancel_reason: o?.cancel_reason || "",
        note: o?.note || "",
        override: o,
      };
    })
    .sort((a, b) => a.start_min - b.start_min || a.class_name.localeCompare(b.class_name));
}

// Is this coach out on this date? Returns { kind, label } or null.
export function coachOutReason(name, iso, absences, timeOff) {
  const a = absences.find((x) => x.coach === name && x.start_date <= iso && x.end_date >= iso);
  if (a) return { kind: "absence", label: a.reason ? `Out: ${a.reason}` : "Out" };
  const t = timeOff.find((x) => x.coach === name && x.on_date === iso && x.status !== "denied");
  if (t) return { kind: "timeoff", label: t.status === "approved" ? "Day off (approved)" : "Day off requested" };
  return null;
}

// true / false, or null if the coach never submitted availability.
export function isAvailable(name, dayKey, start, end, availability) {
  const row = availability.find((a) => a.coach === name);
  if (!row) return null;
  const windows = row.days?.[dayKey] || [];
  return windows.some(([s, e]) => s <= start && e >= end);
}

export const needsCoverage = (cls, outReason) =>
  !cls.canceled && (cls.coaches.length === 0 || cls.coaches.some((n) => outReason(n)));

// Write a date override. Every field falls through to existing override, then
// template — never to null (lesson #3).
export function saveOverride(cls, iso, patch) {
  const ex = cls.override;
  const row = {
    on_date: iso,
    class_id: cls.id,
    coaches: "coaches" in patch ? patch.coaches : (ex?.coaches ?? cls.templateCoaches ?? []),
    canceled: "canceled" in patch ? patch.canceled : (ex?.canceled ?? false),
    cancel_reason: "cancel_reason" in patch ? patch.cancel_reason : (ex?.cancel_reason ?? ""),
    note: "note" in patch ? patch.note : (ex?.note ?? ""),
  };
  return supabase.from("ninja_overrides").upsert(row, { onConflict: "on_date,class_id" });
}

// Apply an approved coverage report: swap absent → covering on the affected
// classes in one parallel batch (lesson #4), then caller refreshes once.
export async function applyCoverage(req, classesOnDate) {
  const targets = classesOnDate.filter((c) =>
    c.coaches.includes(req.absent)
    && (req.scope !== "classes" || (req.classes || []).includes(c.id)));
  const results = await Promise.all(targets.map((c) =>
    saveOverride(c, req.on_date, {
      coaches: cleanList(c.coaches.map((n) => (n === req.absent ? req.covering : n))),
      note: c.note || `${req.covering} covering for ${req.absent}`,
    })));
  const failed = results.find((r) => r.error);
  return { count: targets.length, error: failed?.error || null };
}

export function availabilitySummary(days) {
  if (!days) return "Not submitted";
  const parts = DAYS
    .filter((d) => (days[d] || []).length)
    .map((d) => `${d} ${days[d].map(([s, e]) => `${fmt(s)}–${fmt(e)}`).join(", ")}`);
  return parts.length ? parts.join(" · ") : "No availability";
}

export const storage = {
  get(k) { try { return localStorage.getItem(k) || ""; } catch { return ""; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
