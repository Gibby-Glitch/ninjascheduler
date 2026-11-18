import { useEffect, useState } from "react";
import { addDays, classesForDate, coachOutReason, dateAtNoon, fmt, needsCoverage, todayISO, weekStart } from "../helpers";
import { DAYS } from "../constants";

const MAX_LINES = 4;

function monthTitle(ym) {
  return dateAtNoon(`${ym}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function shiftMonth(ym, n) {
  const d = dateAtNoon(`${ym}-01`);
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Month grid. `compact` = small navigator for the sidebar; otherwise the full calendar view.
export default function MonthCalendar({ iso, onPick, data, compact = false }) {
  const [ym, setYm] = useState(iso.slice(0, 7));
  useEffect(() => setYm(iso.slice(0, 7)), [iso]);

  const today = todayISO();
  const start = weekStart(`${ym}-01`);
  const lastOfMonth = addDays(`${shiftMonth(ym, 1)}-01`, -1);
  const span = Math.round((dateAtNoon(lastOfMonth) - dateAtNoon(start)) / 864e5) + 1;
  const weeks = Math.ceil(span / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const colorOf = (n) => data.coaches.find((c) => c.name === n)?.color || "#64748b";

  const summarize = (d) => {
    const list = classesForDate(d, data.classes, data.overrideMap);
    const out = (n) => coachOutReason(n, d, data.absences, data.timeOff);
    const running = list.filter((c) => !c.canceled);
    const outNames = data.coaches.map((c) => c.name).filter((n) => out(n));
    return { list, running, open: list.filter((c) => needsCoverage(c, out)).length, outNames };
  };

  return (
    <div className={`month${compact ? " compact" : ""}`}>
      <div className="month-head">
        <button className="btn ghost small" onClick={() => setYm(shiftMonth(ym, -1))} aria-label="Previous month">‹</button>
        <b>{monthTitle(ym)}</b>
        <button className="btn ghost small" onClick={() => setYm(shiftMonth(ym, 1))} aria-label="Next month">›</button>
      </div>
      <div className="month-grid">
        {DAYS.map((d) => <div key={d} className="month-dow">{compact ? d[0] : d}</div>)}
        {cells.map((d) => {
          const s = summarize(d);
          const cls = [
            "month-cell",
            d.slice(0, 7) !== ym && "other",
            d === iso && "selected",
            d === today && "today",
            s.open > 0 && "has-open",
          ].filter(Boolean).join(" ");
          return (
            <button key={d} className={cls} onClick={() => onPick(d)} title={`${s.running.length} classes${s.open ? ` · ${s.open} need coverage` : ""}`}>
              <span className="month-num">{dateAtNoon(d).getDate()}</span>
              {compact ? (
                <span className="month-dots">
                  {s.running.length > 0 && <i className={s.open ? "dot red" : "dot"} />}
                </span>
              ) : (
                <>
                  {s.list.slice(0, MAX_LINES).map((c) => (
                    <span key={c.id} className={`month-line${c.canceled ? " canceled" : ""}`}>
                      <i className="dot" style={{ background: c.coaches[0] ? colorOf(c.coaches[0]) : "var(--red)" }} />
                      <b>{fmt(c.start_min)}</b> {c.class_name}
                      <em>{c.canceled ? "canceled" : c.coaches.join(", ") || "no coach"}</em>
                    </span>
                  ))}
                  {s.list.length > MAX_LINES && <span className="month-more">+{s.list.length - MAX_LINES} more</span>}
                  {(s.open > 0 || s.outNames.length > 0) && (
                    <span className="month-flags">
                      {s.open > 0 && <span className="pill red">{s.open} open</span>}
                      {s.outNames.length > 0 && <span className="pill">Out: {s.outNames.join(", ")}</span>}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
