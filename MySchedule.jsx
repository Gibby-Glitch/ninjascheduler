import { addDays, classesForDate, fmt, fmtShort, todayISO } from "../helpers";

const DAYS_AHEAD = 21;

export default function MySchedule({ data, me }) {
  const today = todayISO();
  const days = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const iso = addDays(today, i);
    const all = classesForDate(iso, data.classes, data.overrideMap);
    const mine = all.filter((c) => c.coaches.includes(me) || (c.canceled && c.templateCoaches.includes(me)));
    // Classes I'm normally on but someone else is covering
    const subbedOut = all.filter((c) => !c.canceled && c.templateCoaches.includes(me) && !c.coaches.includes(me));
    const off = data.timeOff.find((t) => t.coach === me && t.on_date === iso && t.status !== "denied");
    if (mine.length || subbedOut.length || off) days.push({ iso, mine, subbedOut, off });
  }

  const myRequests = [
    ...data.timeOff.filter((t) => t.coach === me && t.on_date >= today).map((t) => ({ ...t, kind: "Day off" })),
    ...data.coverage.filter((c) => c.absent === me && c.on_date >= today).map((c) => ({ ...c, kind: `Coverage by ${c.covering}` })),
  ].sort((a, b) => a.on_date.localeCompare(b.on_date));

  return (
    <div className="stack">
      {!days.length && <div className="empty">No classes in the next 3 weeks.</div>}
      {days.map(({ iso, mine, subbedOut, off }) => (
        <section key={iso} className={`card day-card${iso === today ? " today" : ""}`}>
          <h3>{iso === today ? "Today · " : ""}{fmtShort(iso)}</h3>
          {off && <div className={`pill ${off.status === "approved" ? "green" : "amber"}`}>Day off {off.status}</div>}
          {mine.map((c) => {
            const others = c.coaches.filter((n) => n !== me);
            return (
              <div key={c.id} className={`hub-class${c.canceled ? " canceled" : ""}`}>
                <div className="nowrap"><b>{fmt(c.start_min)}</b> – {fmt(c.end_min)}</div>
                <div>
                  <div><b>{c.class_name}</b>{c.canceled && <span className="pill red">Canceled</span>}</div>
                  <div className="muted small">
                    {[c.station, others.length && `with ${others.join(", ")}`, c.note].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            );
          })}
          {subbedOut.map((c) => (
            <div key={c.id} className="hub-class faded">
              <div className="nowrap">{fmt(c.start_min)}</div>
              <div>{c.class_name} <span className="muted small">— covered by {c.coaches.join(", ") || "TBD"}</span></div>
            </div>
          ))}
        </section>
      ))}

      {myRequests.length > 0 && (
        <section className="card">
          <h3>My requests</h3>
          {myRequests.map((r) => (
            <div key={r.id} className="row spread">
              <span>{fmtShort(r.on_date)} · {r.kind}</span>
              <span className={`pill ${r.status === "approved" ? "green" : r.status === "denied" ? "red" : "amber"}`}>{r.status}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
