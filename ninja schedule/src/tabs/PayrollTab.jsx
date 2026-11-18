import { useMemo, useState } from "react";
import { addDays, fmtLong, fmtShort, todayISO, weekStart, dateAtNoon, toISO } from "../helpers";
import {
  copyText, downloadText, fmtHours, fmtTime, getLaborCodes, getUkgConfig, laborRows, reportCSV, ukgCSV,
} from "../payroll";

const monthStart = (iso, delta = 0) => { const d = dateAtNoon(iso); d.setDate(1); d.setMonth(d.getMonth() + delta); return toISO(d); };
const PRESETS = [
  ["This week", (t) => [weekStart(t), addDays(weekStart(t), 6)]],
  ["Last week", (t) => [addDays(weekStart(t), -7), addDays(weekStart(t), -1)]],
  ["Last 2 weeks", (t) => [addDays(weekStart(t), -14), addDays(weekStart(t), -1)]],
  ["This month", (t) => [monthStart(t), addDays(monthStart(t, 1), -1)]],
  ["Last month", (t) => [monthStart(t, -1), addDays(monthStart(t), -1)]],
];

export default function PayrollTab({ data, setTab }) {
  const today = todayISO();
  const [[from, to], setRange] = useState(() => PRESETS[1][1](today));
  const [coach, setCoach] = useState("");
  const [team, setTeam] = useState("");
  const [note, setNote] = useState("");

  const laborCodes = getLaborCodes(data.settings);
  const cfg = getUkgConfig(data.settings);
  const all = useMemo(() => (from && to && from <= to ? laborRows(from, to, data, laborCodes) : []),
    [from, to, data, laborCodes]);
  const rows = all.filter((r) => (!coach || r.coach === coach) && (!team || r.labor_id === team));

  // Summary: coach × team hours
  const teams = laborCodes.filter((l) => rows.some((r) => r.team && r.labor_id === l.id));
  const hasNone = rows.some((r) => !r.team);
  const cols = [...teams.map((l) => ({ id: l.id, label: l.team, code: l.code })), ...(hasNone ? [{ id: "", label: "No team", code: "" }] : [])];
  const coaches = [...new Set(rows.map((r) => r.coach))].sort();
  const key = (r) => (r.team ? r.labor_id : "");
  const sum = (pred) => rows.filter(pred).reduce((s, r) => s + r.hours, 0);
  const total = sum(() => true);

  const missingEmp = coaches.filter((n) => !rows.find((r) => r.coach === n)?.employee_id);
  const missingCode = [...new Set(rows.filter((r) => !r.labor_code).map((r) => r.class_name))];
  const future = to > today;
  const rangeLabel = `${fmtShort(from)} – ${fmtShort(to)}`;
  const tag = `${from}_to_${to}`;

  const flash = (m) => { setNote(m); setTimeout(() => setNote(""), 3000); };
  const ukg = () => ukgCSV(rows, cfg);

  return (
    <div className="stack">
      <section className="card no-print">
        <div className="row">
          <div className="seg">
            {PRESETS.map(([label, fn]) => {
              const [f, t] = fn(today);
              return <button key={label} className={f === from && t === to ? "active" : ""} onClick={() => setRange([f, t])}>{label}</button>;
            })}
          </div>
          <input type="date" value={from} onChange={(e) => setRange([e.target.value, to])} aria-label="From" />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setRange([from, e.target.value])} aria-label="To" />
          <select value={coach} onChange={(e) => setCoach(e.target.value)}>
            <option value="">All coaches</option>
            {data.coaches.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">All teams</option>
            {laborCodes.map((l) => <option key={l.id} value={l.id}>{l.team}</option>)}
          </select>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={!rows.length} onClick={() => { const u = ukg(); downloadText(`${cfg.fileName || "ninja_ukg"}_${tag}.csv`, u.text); flash(`UKG file downloaded · ${u.count} rows`); }}>⬇ UKG export (.csv)</button>
          <button className="btn" disabled={!rows.length} onClick={async () => flash(await copyText(ukg().text) ? "UKG rows copied" : "Copy blocked by browser")}>Copy UKG rows</button>
          <button className="btn" disabled={!rows.length} onClick={() => downloadText(`ninja_coaching_report_${tag}.csv`, reportCSV(rows))}>⬇ Owner report (.csv)</button>
          <button className="btn" disabled={!rows.length} onClick={() => window.print()}>🖨 Print owner report</button>
          <button className="btn ghost small" onClick={() => setTab("settings")}>Export layout & labor codes →</button>
          {note && <span className="pill green">{note}</span>}
        </div>
        {(missingEmp.length > 0 || missingCode.length > 0 || future) && (
          <div className="warn-list">
            {missingEmp.length > 0 && <div>⚠ No UKG employee ID for: <b>{missingEmp.join(", ")}</b> (add it in Coaches)</div>}
            {missingCode.length > 0 && <div>⚠ No labor code for: <b>{missingCode.join(", ")}</b> (set the team in Classes and the code in Settings)</div>}
            {future && <div>ℹ This range includes future dates. Those rows are scheduled, not yet worked.</div>}
          </div>
        )}
      </section>

      <div className="report">
        <header className="report-head">
          <h2>Ninja coaching report</h2>
          <div className="muted">{fmtLong(from)} – {fmtLong(to)}{coach && ` · ${coach}`}{team && ` · ${laborCodes.find((l) => l.id === team)?.team}`}</div>
          <div className="report-kpis">
            <div><b>{fmtHours(total)}</b><span>coaching hours</span></div>
            <div><b>{rows.length}</b><span>classes coached</span></div>
            <div><b>{coaches.length}</b><span>coaches</span></div>
            <div><b>{rows.filter((r) => r.sub).length}</b><span>sub assignments</span></div>
          </div>
        </header>

        {!rows.length ? <div className="empty">No coached classes in {rangeLabel}.</div> : (
          <>
            <section className="card">
              <h3>Hours by coach and labor code</h3>
              <div className="scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Coach</th><th>Emp ID</th>
                      {cols.map((c) => <th key={c.id} className="num">{c.label}<div className="code">{c.code || "—"}</div></th>)}
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coaches.map((n) => (
                      <tr key={n}>
                        <td><b>{n}</b></td>
                        <td>{rows.find((r) => r.coach === n)?.employee_id || "—"}</td>
                        {cols.map((c) => { const h = sum((r) => r.coach === n && key(r) === c.id); return <td key={c.id} className="num">{h ? fmtHours(h) : ""}</td>; })}
                        <td className="num"><b>{fmtHours(sum((r) => r.coach === n))}</b></td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={2}>Total</td>
                      {cols.map((c) => <td key={c.id} className="num">{fmtHours(sum((r) => key(r) === c.id))}</td>)}
                      <td className="num">{fmtHours(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>Detail — who coached what</h3>
              <div className="scroll">
                <table className="table detail">
                  <thead>
                    <tr><th>Date</th><th>Coach</th><th>Class</th><th>Time</th><th className="num">Hours</th><th>Team</th><th>Labor code</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="nowrap">{fmtShort(r.date)}</td>
                        <td>{r.coach}{r.sub && <span className="pill amber">sub</span>}</td>
                        <td>{r.class_name}</td>
                        <td className="nowrap">{fmtTime(r.start_min, "h:mm AM")} – {fmtTime(r.end_min, "h:mm AM")}</td>
                        <td className="num">{fmtHours(r.hours)}</td>
                        <td>{r.team || <span className="pill red">none</span>}</td>
                        <td className="nowrap">{r.labor_code || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <p className="muted small print-only">Generated {fmtLong(today)} from the ninja schedule (subs applied, cancellations excluded).</p>
          </>
        )}
      </div>
    </div>
  );
}
