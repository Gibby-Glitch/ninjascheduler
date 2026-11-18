import { useState } from "react";
import { supabase } from "../supabase";
import { cleanList, fmt, hhmmToMin, isActiveCoach, minToHHMM } from "../helpers";
import { getLaborCodes } from "../payroll";
import { AGE_BANDS, BELT_COLORS, BELT_LEVELS, DAYS, DAY_FULL, DEFAULT_STATIONS } from "../constants";
import Modal from "../components/Modal";
import { CoachListEditor } from "../components/CoachDropdown";

const BLANK = {
  day: "Mon", class_name: "", belt_level: "", age_band: "",
  start_min: 16 * 60, end_min: 17 * 60, coaches: [""], station: "", start_date: "", end_date: "", labor_id: "",
};

export default function EditClassesTab({ data, canEdit, guard }) {
  const [form, setForm] = useState(null);
  const [dayFilter, setDayFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const coachNames = data.coaches.filter((c) => isActiveCoach(c)).map((c) => c.name);
  const laborCodes = getLaborCodes(data.settings);
  const teamOf = (id) => laborCodes.find((l) => l.id === id);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const open = (cls, copy = false) => setForm(cls ? {
    ...BLANK, ...cls,
    id: copy ? undefined : cls.id,
    coaches: cls.coaches?.length ? cls.coaches : [""],
    belt_level: cls.belt_level || "", age_band: cls.age_band || "", station: cls.station || "",
    start_date: cls.start_date || "", end_date: cls.end_date || "", labor_id: cls.labor_id || "",
  } : { ...BLANK, day: dayFilter === "All" ? "Mon" : dayFilter });

  const save = guard(async () => {
    const name = form.class_name.trim()
      || [form.belt_level && `${form.belt_level} Belt`, form.age_band].filter(Boolean).join(" ");
    if (!name) return alert("Give the class a name (or pick a belt level).");
    if (form.end_min <= form.start_min) return alert("End time must be after start time.");
    const payload = {
      day: form.day,
      class_name: name,
      belt_level: form.belt_level || null,
      age_band: form.age_band || null,
      start_min: form.start_min,
      end_min: form.end_min,
      coaches: cleanList(form.coaches),
      station: form.station.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      labor_id: form.labor_id || "",
    };
    setBusy(true);
    const { error } = form.id
      ? await supabase.from("ninja_classes").update(payload).eq("id", form.id)
      : await supabase.from("ninja_classes").insert(payload);
    setBusy(false);
    if (error) return alert(`Save failed: ${error.message}`);
    setForm(null);
    data.refresh();
  });

  const remove = guard(async (cls) => {
    if (!confirm(`Delete "${cls.class_name}" (${cls.day})? This also removes its date overrides.`)) return;
    const { error } = await supabase.from("ninja_classes").delete().eq("id", cls.id);
    if (error) alert(`Delete failed: ${error.message}`);
    data.refresh();
  });

  const days = dayFilter === "All" ? DAYS : [dayFilter];
  const noTeam = data.classes.filter((c) => !teamOf(c.labor_id));

  // One parallel batch, then a single refresh.
  const bulkTeam = guard(async (laborId) => {
    if (!laborId) return;
    const results = await Promise.all(noTeam.map((c) =>
      supabase.from("ninja_classes").update({ labor_id: laborId }).eq("id", c.id)));
    const failed = results.find((r) => r.error);
    if (failed) alert(`Save failed: ${failed.error.message}`);
    data.refresh();
  });

  return (
    <div>
      <div className="toolbar">
        <div className="seg">
          {["All", ...DAYS].map((d) => (
            <button key={d} className={dayFilter === d ? "active" : ""} onClick={() => setDayFilter(d)}>{d}</button>
          ))}
        </div>
        {canEdit && <button className="btn primary" onClick={() => open(null)}>+ Add class</button>}
      </div>
      {canEdit && noTeam.length > 0 && (
        <div className="card warn-card row">
          <span><b>{noTeam.length}</b> class{noTeam.length === 1 ? " has" : "es have"} no team / labor code, so they'll export without one.</span>
          <select value="" onChange={(e) => bulkTeam(e.target.value)}>
            <option value="">Set all of them to…</option>
            {laborCodes.map((l) => <option key={l.id} value={l.id}>{l.team}{l.code ? ` (${l.code})` : ""}</option>)}
          </select>
        </div>
      )}

      {days.map((d) => {
        const rows = data.classes.filter((c) => c.day === d)
          .sort((a, b) => a.start_min - b.start_min);
        if (!rows.length && dayFilter === "All") return null;
        return (
          <section key={d} className="card">
            <h3>{DAY_FULL[d]}</h3>
            {!rows.length ? <p className="muted">No classes.</p> : (
              <table className="table">
                <thead>
                  <tr><th>Time</th><th>Class</th><th>Station</th><th>Team / labor code</th><th>Coach(es)</th><th>Runs</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="nowrap">{fmt(c.start_min)}–{fmt(c.end_min)}</td>
                      <td>
                        {c.belt_level && <span className="belt-dot" style={{ background: BELT_COLORS[c.belt_level] }} />}
                        {c.class_name}
                        <div className="muted small">{[c.belt_level && `${c.belt_level} belt`, c.age_band].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td>{c.station}</td>
                      <td>{teamOf(c.labor_id)
                        ? <>{teamOf(c.labor_id).team}<div className="muted small">{teamOf(c.labor_id).code || "no code set"}</div></>
                        : <span className="pill red">none</span>}</td>
                      <td>{(c.coaches || []).join(", ") || <span className="pill red">none</span>}</td>
                      <td className="small">{c.start_date || c.end_date ? `${c.start_date || "…"} → ${c.end_date || "…"}` : "Always"}</td>
                      <td className="nowrap right">
                        {canEdit && <>
                          <button className="btn ghost small" onClick={() => open(c)}>Edit</button>
                          <button className="btn ghost small" onClick={() => open(c, true)}>Copy</button>
                          <button className="btn ghost small danger" onClick={() => remove(c)}>Delete</button>
                        </>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
      {!data.classes.length && <div className="empty">No classes yet. Click “+ Add class” to build your weekly template.</div>}

      {form && (
        <Modal title={form.id ? "Edit class" : "Add class"} onClose={() => setForm(null)}>
          <div className="grid2">
            <label className="field"><span>Day</span>
              <select value={form.day} onChange={(e) => set("day")(e.target.value)}>
                {DAYS.map((d) => <option key={d} value={d}>{DAY_FULL[d]}</option>)}
              </select>
            </label>
            <label className="field"><span>Class name</span>
              <input value={form.class_name} onChange={(e) => set("class_name")(e.target.value)} placeholder="e.g. White Belt 4-6" />
            </label>
            <label className="field"><span>Belt level</span>
              <select value={form.belt_level} onChange={(e) => set("belt_level")(e.target.value)}>
                <option value="">—</option>
                {BELT_LEVELS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="field"><span>Age band</span>
              <select value={form.age_band} onChange={(e) => set("age_band")(e.target.value)}>
                <option value="">—</option>
                {AGE_BANDS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <label className="field"><span>Start</span>
              <input type="time" step="300" value={minToHHMM(form.start_min)} onChange={(e) => set("start_min")(hhmmToMin(e.target.value))} />
            </label>
            <label className="field"><span>End</span>
              <input type="time" step="300" value={minToHHMM(form.end_min)} onChange={(e) => set("end_min")(hhmmToMin(e.target.value))} />
            </label>
            <label className="field"><span>Station</span>
              <input list="stations" value={form.station} onChange={(e) => set("station")(e.target.value)} placeholder="Optional" />
              <datalist id="stations">{DEFAULT_STATIONS.map((s) => <option key={s} value={s} />)}</datalist>
            </label>
            <label className="field"><span>Team / labor code</span>
              <select value={form.labor_id} onChange={(e) => set("labor_id")(e.target.value)}>
                <option value="">— none —</option>
                {laborCodes.map((l) => <option key={l.id} value={l.id}>{l.team}{l.code ? ` (${l.code})` : ""}</option>)}
              </select>
            </label>
            <label className="field"><span>Coach(es)</span>
              <CoachListEditor value={form.coaches} onChange={set("coaches")} options={coachNames} />
            </label>
            <label className="field"><span>First date (optional)</span>
              <input type="date" value={form.start_date} onChange={(e) => set("start_date")(e.target.value)} />
            </label>
            <label className="field"><span>Last date (optional)</span>
              <input type="date" value={form.end_date} onChange={(e) => set("end_date")(e.target.value)} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn primary" disabled={busy} onClick={save}>{form.id ? "Save changes" : "Add class"}</button>
            <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
