import { useState } from "react";
import { supabase } from "../supabase";
import {
  addDays, applyCoverage, classesForDate, coachOutReason, fmt, fmtShort,
  isActiveCoach, needsCoverage, todayISO,
} from "../helpers";
import { TIME_OFF_REASONS } from "../constants";

const reasonLabel = (r) => TIME_OFF_REASONS.find((x) => x.value === r)?.label || r || "";
const STATUS_PILL = { pending: "amber", approved: "green", denied: "red" };

export default function CoverageTab({ data, canEdit, guard, openDate }) {
  const today = todayISO();
  const [showPast, setShowPast] = useState(false);
  const [absence, setAbsence] = useState({ coach: "", start_date: today, end_date: today, reason: "" });
  const keep = (iso) => showPast || iso >= today;
  const classesOn = (iso) => classesForDate(iso, data.classes, data.overrideMap);
  const myClassesOn = (name, iso) => classesOn(iso).filter((c) => !c.canceled && c.coaches.includes(name));

  const upd = (table, id, patch) => supabase.from(table).update(patch).eq("id", id);
  const act = (fn) => guard(async (...a) => {
    const err = await fn(...a);
    if (err) alert(`Save failed: ${err.message}`);
    data.refresh();
  });

  // ---------- time off ----------
  const setTimeOff = act(async (t, patch) => (await upd("ninja_time_off", t.id, patch)).error);

  // ---------- coverage reports ----------
  const approveCoverage = act(async (req) => {
    const { count, error } = await applyCoverage(req, classesOn(req.on_date));
    if (error) return error;
    if (count === 0 && !confirm(`${req.absent} isn't on any matching class that day — nothing to swap. Mark approved anyway?`)) return null;
    const r1 = await upd("ninja_coverage_requests", req.id, { status: "approved" });
    if (r1.error) return r1.error;
    const r2 = await supabase.from("ninja_time_off").update({ covered: true })
      .eq("coach", req.absent).eq("on_date", req.on_date);
    return r2.error;
  });
  const denyCoverage = act(async (req) => (await upd("ninja_coverage_requests", req.id, { status: "denied" })).error);

  // ---------- absences ----------
  const addAbsence = act(async () => {
    if (!absence.coach) return { message: "Pick a coach." };
    if (absence.end_date < absence.start_date) return { message: "End date is before start date." };
    const { error } = await supabase.from("ninja_absences").insert(absence);
    if (!error) setAbsence({ ...absence, coach: "", reason: "" });
    return error;
  });
  const delAbsence = act(async (a) => (await supabase.from("ninja_absences").delete().eq("id", a.id)).error);

  // ---------- open shifts: next 14 days ----------
  const open = [];
  for (let i = 0; i < 14; i++) {
    const iso = addDays(today, i);
    const out = (n) => coachOutReason(n, iso, data.absences, data.timeOff);
    classesOn(iso).filter((c) => needsCoverage(c, out)).forEach((c) => open.push({ iso, c, out }));
  }

  const timeOff = data.timeOff.filter((t) => keep(t.on_date))
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || a.on_date.localeCompare(b.on_date));
  const coverage = data.coverage.filter((c) => keep(c.on_date))
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || a.on_date.localeCompare(b.on_date));
  const absences = data.absences.filter((a) => showPast || a.end_date >= today);
  const coachNames = data.coaches.filter((c) => isActiveCoach(c)).map((c) => c.name);

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>Coverage</h2>
        <label className="check small"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past</label>
      </div>

      <section className="card">
        <h3>Open shifts — next 14 days {open.length > 0 && <span className="pill red">{open.length}</span>}</h3>
        {!open.length ? <p className="muted">Everything's covered. 🎉</p> : (
          <table className="table">
            <tbody>
              {open.map(({ iso, c, out }) => (
                <tr key={`${iso}|${c.id}`}>
                  <td className="nowrap">{fmtShort(iso)}</td>
                  <td className="nowrap">{fmt(c.start_min)}–{fmt(c.end_min)}</td>
                  <td>{c.class_name}</td>
                  <td>{c.coaches.length
                    ? c.coaches.map((n) => out(n) ? `${n} (${out(n).label})` : n).join(", ")
                    : "No coach assigned"}</td>
                  <td className="right"><button className="btn ghost small" onClick={() => openDate(iso)}>Open day →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h3>Day-off requests</h3>
        {!timeOff.length ? <p className="muted">None.</p> : (
          <table className="table">
            <thead><tr><th>Date</th><th>Coach</th><th>Reason</th><th>Their classes</th><th>Status</th><th>Admin note</th><th /></tr></thead>
            <tbody>
              {timeOff.map((t) => {
                const mine = myClassesOn(t.coach, t.on_date);
                return (
                  <tr key={t.id}>
                    <td className="nowrap">{fmtShort(t.on_date)}</td>
                    <td>{t.coach}</td>
                    <td>{reasonLabel(t.reason)}{t.reason_note && <div className="muted small">{t.reason_note}</div>}</td>
                    <td className="small">{mine.length ? mine.map((c) => `${fmt(c.start_min)} ${c.class_name}`).join(", ") : "None (or already subbed)"}</td>
                    <td className="nowrap">
                      <span className={`pill ${STATUS_PILL[t.status]}`}>{t.status}</span>
                      {t.status === "approved" && <span className={`pill ${t.covered ? "green" : "red"}`}>{t.covered ? "covered" : "uncovered"}</span>}
                    </td>
                    <td>
                      <input
                        className="small-input"
                        defaultValue={t.admin_note}
                        disabled={!canEdit}
                        onBlur={(e) => e.target.value !== t.admin_note && setTimeOff(t, { admin_note: e.target.value })}
                      />
                    </td>
                    <td className="nowrap right">
                      {canEdit && <>
                        {t.status !== "approved" && <button className="btn small primary" onClick={() => setTimeOff(t, { status: "approved" })}>Approve</button>}
                        {t.status !== "denied" && <button className="btn ghost small" onClick={() => setTimeOff(t, { status: "denied" })}>Deny</button>}
                        {t.status === "approved" && <button className="btn ghost small" onClick={() => setTimeOff(t, { covered: !t.covered })}>{t.covered ? "Mark uncovered" : "Mark covered"}</button>}
                        <button className="btn ghost small" onClick={() => openDate(t.on_date)}>Day →</button>
                      </>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h3>Coverage reports</h3>
        <p className="muted small">Approving swaps the covering coach onto the absent coach's classes for that date.</p>
        {!coverage.length ? <p className="muted">None.</p> : (
          <table className="table">
            <thead><tr><th>Date</th><th>Out</th><th>Covering</th><th>Scope</th><th>Reason</th><th>Status</th><th /></tr></thead>
            <tbody>
              {coverage.map((r) => {
                const named = (r.classes || []).map((id) => data.classes.find((c) => c.id === id)?.class_name).filter(Boolean);
                return (
                  <tr key={r.id}>
                    <td className="nowrap">{fmtShort(r.on_date)}</td>
                    <td>{r.absent}</td>
                    <td><b>{r.covering}</b></td>
                    <td className="small">{r.scope === "classes" ? named.join(", ") || "selected classes" : "Whole day"}</td>
                    <td>{reasonLabel(r.reason)}{r.reason_note && <div className="muted small">{r.reason_note}</div>}</td>
                    <td><span className={`pill ${STATUS_PILL[r.status]}`}>{r.status}</span></td>
                    <td className="nowrap right">
                      {canEdit && r.status === "pending" && <>
                        <button className="btn small primary" onClick={() => approveCoverage(r)}>Approve</button>
                        <button className="btn ghost small" onClick={() => denyCoverage(r)}>Deny</button>
                      </>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h3>Absences</h3>
        <p className="muted small">Multi-day outages (injury, trip). Their classes show “Needs coverage” on the board.</p>
        {canEdit && (
          <form className="row add-row" onSubmit={(e) => { e.preventDefault(); addAbsence(); }}>
            <select value={absence.coach} onChange={(e) => setAbsence({ ...absence, coach: e.target.value })}>
              <option value="">— coach —</option>
              {coachNames.map((n) => <option key={n}>{n}</option>)}
            </select>
            <input type="date" value={absence.start_date} onChange={(e) => setAbsence({ ...absence, start_date: e.target.value })} />
            <input type="date" value={absence.end_date} onChange={(e) => setAbsence({ ...absence, end_date: e.target.value })} />
            <input placeholder="Reason" value={absence.reason} onChange={(e) => setAbsence({ ...absence, reason: e.target.value })} />
            <button className="btn primary" type="submit">+ Add</button>
          </form>
        )}
        {!absences.length ? <p className="muted">None.</p> : (
          <table className="table">
            <tbody>
              {absences.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.coach}</b></td>
                  <td className="nowrap">{fmtShort(a.start_date)} → {fmtShort(a.end_date)}</td>
                  <td>{a.reason}</td>
                  <td className="right">{canEdit && <button className="btn ghost small danger" onClick={() => delAbsence(a)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
