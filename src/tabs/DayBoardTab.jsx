import { useMemo, useState } from "react";
import {
  addDays, classesForDate, coachOutReason, dayKeyOf, fmtLong, isActiveCoach,
  isAvailable, needsCoverage, todayISO, weekStart, dateAtNoon,
} from "../helpers";
import { DAYS } from "../constants";
import ClassCard from "../components/ClassCard";
import OverrideModal from "../components/OverrideModal";

export default function DayBoardTab({ data, canEdit, guard, iso, setIso }) {
  const [editingId, setEditingId] = useState(null);
  const ws = weekStart(iso);
  const dk = dayKeyOf(iso);

  const list = useMemo(
    () => classesForDate(iso, data.classes, data.overrideMap),
    [iso, data.classes, data.overrideMap],
  );
  const outReason = (n) => coachOutReason(n, iso, data.absences, data.timeOff);
  const colorOf = (n) => data.coaches.find((c) => c.name === n)?.color || "#64748b";
  const activeNames = data.coaches.filter((c) => isActiveCoach(c, iso)).map((c) => c.name);
  const outToday = data.coaches.map((c) => [c.name, outReason(c.name)]).filter(([, r]) => r);
  const uncovered = list.filter((c) => needsCoverage(c, outReason)).length;
  const editing = list.find((c) => c.id === editingId);

  // Short status shown next to each name in the sub picker.
  const hintFor = (cls) => (n) => {
    const out = outReason(n);
    if (out) return out.label;
    const busy = list.some((o) => o.id !== cls.id && !o.canceled && o.coaches.includes(n)
      && o.start_min < cls.end_min && o.end_min > cls.start_min);
    if (busy) return "teaching another class";
    const av = isAvailable(n, dk, cls.start_min, cls.end_min, data.availability);
    return av === true ? "available" : av === false ? "outside availability" : "";
  };

  return (
    <div>
      <div className="board-controls no-print">
        <button className="btn ghost" onClick={() => setIso(addDays(iso, -7))} aria-label="Previous week">‹</button>
        <div className="week-strip">
          {DAYS.map((d, i) => {
            const dayIso = addDays(ws, i);
            return (
              <button key={d} className={dayIso === iso ? "active" : ""} onClick={() => setIso(dayIso)}>
                <b>{d}</b><span>{dateAtNoon(dayIso).getDate()}</span>
              </button>
            );
          })}
        </div>
        <button className="btn ghost" onClick={() => setIso(addDays(iso, 7))} aria-label="Next week">›</button>
        <input type="date" value={iso} onChange={(e) => e.target.value && setIso(e.target.value)} />
        <button className="btn ghost" onClick={() => setIso(todayISO())}>Today</button>
        <button className="btn ghost" onClick={() => window.print()}>🖨 Print</button>
      </div>

      <h2 className="board-title">
        {fmtLong(iso)}
        <span className="muted small">
          {" "}· {list.filter((c) => !c.canceled).length} classes
          {uncovered > 0 && <span className="pill red">{uncovered} need coverage</span>}
        </span>
      </h2>

      {outToday.length > 0 && (
        <div className="out-row">
          Out: {outToday.map(([n, r]) => <span key={n} className="pill">{n} — {r.label}</span>)}
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">No classes on {fmtLong(iso)}. Add some in the Classes tab.</div>
      ) : (
        <div className="board">
          {list.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              colorOf={colorOf}
              outReason={outReason}
              onClick={canEdit ? () => setEditingId(cls.id) : undefined}
            />
          ))}
        </div>
      )}

      {editing && (
        <OverrideModal
          cls={editing}
          iso={iso}
          coachNames={activeNames}
          hint={hintFor(editing)}
          onClose={() => setEditingId(null)}
          onSaved={guard(() => { setEditingId(null); data.refresh(); })}
        />
      )}
    </div>
  );
}
