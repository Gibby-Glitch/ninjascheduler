import { useState } from "react";
import { DATE_FORMATS, TIME_FORMATS, UKG_FIELDS } from "../constants";
import { getLaborCodes, getUkgConfig, saveSetting, ukgCSV } from "../payroll";
import { todayISO } from "../helpers";

const SAMPLE = [
  { date: todayISO(), day: "Mon", coach: "Alex", employee_id: "10234", class_name: "White Belt 4-6", station: "Floor",
    start_min: 960, end_min: 1005, hours: 0.75, team: "Recreational", labor_code: "NINJA-REC" },
  { date: todayISO(), day: "Mon", coach: "Alex", employee_id: "10234", class_name: "Green Belt 10-12", station: "Warped Wall",
    start_min: 1005, end_min: 1080, hours: 1.25, team: "Recreational", labor_code: "NINJA-REC" },
];
const newId = () => Math.random().toString(36).slice(2, 9);

export default function SettingsTab({ data, canEdit, guard }) {
  const [codes, setCodes] = useState(() => getLaborCodes(data.settings).map((l) => ({ ...l })));
  const [cfg, setCfg] = useState(() => structuredClone(getUkgConfig(data.settings)));
  const [saved, setSaved] = useState("");

  const flash = (what) => { setSaved(what); setTimeout(() => setSaved(""), 2500); };

  const saveCodes = guard(async () => {
    const clean = codes.map((l) => ({ ...l, team: l.team.trim(), code: l.code.trim() })).filter((l) => l.team);
    const { error } = await saveSetting("labor_codes", clean);
    if (error) return alert(`Save failed: ${error.message}`);
    setCodes(clean); flash("codes"); data.refresh();
  });
  const removeCode = (l) => {
    const used = data.classes.filter((c) => c.labor_id === l.id).length;
    if (used && !confirm(`${used} class(es) use “${l.team}”. Remove it anyway? They'll show as having no team.`)) return;
    setCodes(codes.filter((x) => x.id !== l.id));
  };
  const setCode = (i, k, v) => setCodes(codes.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const saveUkg = guard(async () => {
    const { error } = await saveSetting("ukg_export", cfg);
    if (error) return alert(`Save failed: ${error.message}`);
    flash("ukg"); data.refresh();
  });
  const setCol = (i, patch) => setCfg({ ...cfg, columns: cfg.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const moveCol = (i, d) => {
    const cols = [...cfg.columns]; const j = i + d;
    if (j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    setCfg({ ...cfg, columns: cols });
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>Teams & labor codes</h3>
        <p className="muted small">Each class is assigned a team. Its labor code is what goes to UKG and onto the owner report.</p>
        <table className="table">
          <thead><tr><th>Team</th><th>UKG labor code</th><th>Classes</th><th /></tr></thead>
          <tbody>
            {codes.map((l, i) => (
              <tr key={l.id}>
                <td><input value={l.team} disabled={!canEdit} onChange={(e) => setCode(i, "team", e.target.value)} /></td>
                <td><input value={l.code} disabled={!canEdit} placeholder="e.g. NINJA-REC" onChange={(e) => setCode(i, "code", e.target.value)} /></td>
                <td>{data.classes.filter((c) => c.labor_id === l.id).length}</td>
                <td className="right">{canEdit && <button className="btn ghost small danger" onClick={() => removeCode(l)}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && (
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn ghost" onClick={() => setCodes([...codes, { id: newId(), team: "", code: "" }])}>+ Add team</button>
            <button className="btn primary" onClick={saveCodes}>{saved === "codes" ? "✓ Saved" : "Save teams"}</button>
          </div>
        )}
      </section>

      <section className="card">
        <h3>UKG export layout</h3>
        <p className="muted small">
          Match these columns to your UKG import template (headers, order, date/time format). If UKG needs a
          constant like a pay code, add a “Fixed text” column.
        </p>
        <table className="table">
          <thead><tr><th /><th>Column header</th><th>Value</th><th /></tr></thead>
          <tbody>
            {cfg.columns.map((c, i) => (
              <tr key={i}>
                <td className="nowrap">
                  <button className="btn ghost small" disabled={!canEdit || i === 0} onClick={() => moveCol(i, -1)} aria-label="Move up">↑</button>
                  <button className="btn ghost small" disabled={!canEdit || i === cfg.columns.length - 1} onClick={() => moveCol(i, 1)} aria-label="Move down">↓</button>
                </td>
                <td><input value={c.header} disabled={!canEdit} onChange={(e) => setCol(i, { header: e.target.value })} /></td>
                <td>
                  <div className="row">
                    <select value={c.field} disabled={!canEdit} onChange={(e) => setCol(i, { field: e.target.value })}>
                      {UKG_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    {c.field === "fixed" && <input value={c.value || ""} disabled={!canEdit} placeholder="Text" onChange={(e) => setCol(i, { value: e.target.value })} />}
                  </div>
                </td>
                <td className="right">{canEdit && <button className="btn ghost small danger" onClick={() => setCfg({ ...cfg, columns: cfg.columns.filter((_, j) => j !== i) })}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && <button className="btn ghost small" onClick={() => setCfg({ ...cfg, columns: [...cfg.columns, { header: "New column", field: "fixed", value: "" }] })}>+ Add column</button>}

        <div className="grid2" style={{ marginTop: 14 }}>
          <label className="field"><span>Date format</span>
            <select value={cfg.dateFormat} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, dateFormat: e.target.value })}>
              {DATE_FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field"><span>Time format</span>
            <select value={cfg.timeFormat} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, timeFormat: e.target.value })}>
              {TIME_FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field"><span>File name</span>
            <input value={cfg.fileName} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, fileName: e.target.value })} />
          </label>
          <div className="field">
            <label className="check"><input type="checkbox" checked={cfg.merge} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, merge: e.target.checked })} /> Merge back-to-back classes with the same labor code into one shift</label>
            <label className="check"><input type="checkbox" checked={cfg.includeHeader} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, includeHeader: e.target.checked })} /> Include header row</label>
          </div>
        </div>

        <div className="field">
          <span>Sample output</span>
          <pre className="csv-preview">{ukgCSV(SAMPLE, cfg).text}</pre>
        </div>
        {canEdit && <button className="btn primary" onClick={saveUkg}>{saved === "ukg" ? "✓ Saved" : "Save export layout"}</button>}
      </section>
    </div>
  );
}
