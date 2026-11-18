import { useMemo, useState } from "react";
import {
  addDays, classesForDate, coachOutReason, dayKeyOf, fmtLong, isActiveCoach,
  isAvailable, needsCoverage, todayISO, weekStart, dateAtNoon,
} from "../helpers";
import { DAYS } from "../constants";
import ClassCard from "../components/ClassCard";
import OverrideModal from "../components/OverrideModal";
import MonthCalendar from "../components/MonthCalendar";
import CoachesPanel from "../components/CoachesPanel";
import DayTimeline from "../components/DayTimeline";

export default function DayBoardTab({ data, canEdit, guard, iso, setIso }) {
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState("day");
  const ws = weekStart(iso);
  const dk = dayKeyOf(iso);

  const list = useMemo(
    () => classesForDate(iso, data.classes, data.overrideMap),
    [iso, data.classes, data.overrideMap],
  );
  const outReason = (n) => coachOutReason(n, iso, data.absences, data.timeOff);
  const colorOf = (n) => data.coaches.find((c) => c.name === n)?.color || "#64748b";
  const activeNames = data.coaches.filter((c) => isActiveCoach(c, iso)).map((c) => c.name);
  const running = list.filter((c) => !c.canceled);
  const uncovered = list.filter((c) => needsCoverage(c, outReason)).length;
  const hours = running.reduce((s, c) => s + ((c.end_min - c.start_min) / 60) * Math.max(c.coaches.length, 1), 0);
  const working = new Set(running.flatMap((c) => c.coaches)).size;
  const editing = list.find((c) => c.id === editingId);
  const pick = canEdit ? (c) => setEditingId(c.id) : undefined;

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

  const pickDate = (d) => { setIso(d); setView("day"); };

  return (
    <div>
      <div className="board-controls no-print">
        <div className="seg bc-view">
          <button className={view === "day" ? "active" : ""} onClick={() => setView("day")}>Day</button>
          <button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Month</button>
        </div>
        {view === "day" && (
          <div className="bc-week">
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
          </div>
        )}
        <div className="bc-date">
          <input type="date" value={iso} onChange={(e) => e.target.value && setIso(e.target.value)} aria-label="Pick a date" />
          <button className="btn ghost" onClick={() => setIso(todayISO())}>Today</button>
          {view === "day" && <button className="btn ghost hide-phone" onClick={() => window.print()}>🖨 Print day</button>}
        </div>
      </div>

      {view === "month" ? (
        <section className="panel">
          <MonthCalendar iso={iso} data={data} onPick={pickDate} />
          <p className="muted small">Click a day to open it.</p>
        </section>
      ) : (
        <>
          <h2 className="board-title">{fmtLong(iso)}</h2>
          <div className="stats no-print">
            <div><b>{running.length}</b><span>{running.length === 1 ? "class" : "classes"}</span></div>
            <div><b>{hours.toFixed(1)}</b><span>coaching hours</span></div>
            <div><b>{working}</b><span>{working === 1 ? "coach" : "coaches"} teaching</span></div>
            <div className={uncovered ? "alert" : "ok"}><b>{uncovered}</b><span>{uncovered ? "need coverage" : "all covered"}</span></div>
          </div>

          <div className="dash">
            <div className="dash-main">
              {list.length === 0 ? (
                <div className="panel empty">No classes on {fmtLong(iso)}. Add some in the Classes tab.</div>
              ) : (
                <div className="panel">
                  <DayTimeline list={list} colorOf={colorOf} outReason={outReason} onPick={pick} />
                  {/* Card list: used on phones and when printing */}
                  <div className="board board-list">
                    {list.map((cls) => (
                      <ClassCard key={cls.id} cls={cls} colorOf={colorOf} outReason={outReason} onClick={pick ? () => pick(cls) : undefined} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <aside className="dash-side no-print">
              <section className="panel">
                <MonthCalendar iso={iso} data={data} onPick={setIso} compact />
              </section>
              <CoachesPanel iso={iso} list={list} data={data} outReason={outReason} />
            </aside>
          </div>
        </>
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
