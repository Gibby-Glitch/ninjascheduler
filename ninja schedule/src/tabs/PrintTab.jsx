import { useState } from "react";
import { addDays, classesForDate, fmt, fmtLong, fmtShort, todayISO, weekStart } from "../helpers";
import { DAYS } from "../constants";
import { getLaborCodes } from "../payroll";

// Printable weekly schedules: whole-gym grid, or one page per coach.
export default function PrintTab({ data }) {
  const [ws, setWs] = useState(() => weekStart(todayISO()));
  const [mode, setMode] = useState("week");
  const [coach, setCoach] = useState("");
  const [showCodes, setShowCodes] = useState(false);

  const laborCodes = getLaborCodes(data.settings);
  const teamOf = (id) => laborCodes.find((l) => l.id === id);
  const dates = DAYS.map((_, i) => addDays(ws, i));
  const byDate = dates.map((iso) => ({ iso, list: classesForDate(iso, data.classes, data.overrideMap) }));
  const weekLabel = `${fmtShort(dates[0])} – ${fmtShort(dates[6])}`;

  const coachNames = [...new Set(byDate.flatMap((d) => d.list.filter((c) => !c.canceled).flatMap((c) => c.coaches)))].sort();
  const printCoaches = coach ? [coach] : coachNames;

  return (
    <div>
      <div className="board-controls no-print">
        <div className="seg">
          <button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Whole week</button>
          <button className={mode === "coach" ? "active" : ""} onClick={() => setMode("coach")}>By coach</button>
        </div>
        <button className="btn ghost" onClick={() => setWs(addDays(ws, -7))} aria-label="Previous week">‹</button>
        <b>{weekLabel}</b>
        <button className="btn ghost" onClick={() => setWs(addDays(ws, 7))} aria-label="Next week">›</button>
        <button className="btn ghost" onClick={() => setWs(weekStart(todayISO()))}>This week</button>
        {mode === "coach" && (
          <select value={coach} onChange={(e) => setCoach(e.target.value)}>
            <option value="">All coaches (one page each)</option>
            {coachNames.map((n) => <option key={n}>{n}</option>)}
          </select>
        )}
        <label className="check small"><input type="checkbox" checked={showCodes} onChange={(e) => setShowCodes(e.target.checked)} /> Show team / labor code</label>
        <button className="btn primary" onClick={() => window.print()}>🖨 Print</button>
      </div>

      {mode === "week" ? (
        <div className="print-sheet">
          <h2>Ninja schedule · {weekLabel}</h2>
          <div className="week-grid">
            {byDate.map(({ iso, list }) => (
              <div key={iso} className="week-col">
                <div className="week-col-head">{fmtShort(iso)}</div>
                {!list.length && <div className="muted small">—</div>}
                {list.map((c) => (
                  <div key={c.id} className={`wk-item${c.canceled ? " canceled" : ""}`}>
                    <div className="wk-time">{fmt(c.start_min)}–{fmt(c.end_min)}</div>
                    <div className="wk-name">{c.class_name}</div>
                    <div className="wk-coach">{c.canceled ? `Canceled${c.cancel_reason ? `: ${c.cancel_reason}` : ""}` : (c.coaches.join(", ") || "NO COACH")}</div>
                    {showCodes && teamOf(c.labor_id) && <div className="wk-code">{teamOf(c.labor_id).team} · {teamOf(c.labor_id).code}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        printCoaches.map((n) => {
          const days = byDate.map(({ iso, list }) => ({ iso, list: list.filter((c) => !c.canceled && c.coaches.includes(n)) }))
            .filter((d) => d.list.length);
          const hours = days.reduce((s, d) => s + d.list.reduce((t, c) => t + (c.end_min - c.start_min) / 60, 0), 0);
          return (
            <div key={n} className="print-sheet coach-sheet">
              <h2>{n} · {weekLabel}</h2>
              <p className="muted">{days.reduce((s, d) => s + d.list.length, 0)} classes · {hours.toFixed(2)} hours</p>
              <table className="table">
                <thead><tr><th>Day</th><th>Time</th><th>Class</th><th>Station</th><th>With</th>{showCodes && <th>Labor code</th>}</tr></thead>
                <tbody>
                  {days.flatMap(({ iso, list }) => list.map((c, i) => (
                    <tr key={`${iso}${c.id}`}>
                      <td className="nowrap">{i === 0 ? fmtLong(iso).split(",").slice(0, 2).join(",") : ""}</td>
                      <td className="nowrap">{fmt(c.start_min)}–{fmt(c.end_min)}</td>
                      <td>{c.class_name}</td>
                      <td>{c.station}</td>
                      <td>{c.coaches.filter((x) => x !== n).join(", ")}</td>
                      {showCodes && <td>{teamOf(c.labor_id)?.code || ""}</td>}
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
      {mode === "coach" && !printCoaches.length && <div className="empty">No coached classes this week.</div>}
    </div>
  );
}
