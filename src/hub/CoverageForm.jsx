import { useState } from "react";
import { supabase } from "../supabase";
import { classesForDate, fmt, isActiveCoach, todayISO } from "../helpers";
import { TIME_OFF_REASONS } from "../constants";

// "I'm out on date X and Y is covering for me."
export default function CoverageForm({ data, me }) {
  const today = todayISO();
  const [date, setDate] = useState("");
  const [covering, setCovering] = useState("");
  const [scope, setScope] = useState("day");
  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = date
    ? classesForDate(date, data.classes, data.overrideMap).filter((c) => !c.canceled && c.coaches.includes(me))
    : [];
  const others = data.coaches.filter((c) => c.name !== me && isActiveCoach(c, date || today)).map((c) => c.name);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (!date) return alert("Pick a date.");
    if (!covering) return alert("Who's covering for you?");
    if (!mine.length) return alert("You don't have any classes that day.");
    if (scope === "classes" && !picked.length) return alert("Pick at least one class.");
    setBusy(true);
    const { error } = await supabase.from("ninja_coverage_requests").insert({
      on_date: date, absent: me, covering, scope,
      classes: scope === "classes" ? picked : [],
      reason, reason_note: note.trim(), status: "pending",
    });
    setBusy(false);
    if (error) return alert(`Submit failed: ${error.message}`);
    setDate(""); setCovering(""); setPicked([]); setNote(""); setScope("day");
    data.refresh();
    alert("Thanks! Your admin will confirm the swap.");
  };

  return (
    <section className="card stack">
      <h3>Report coverage</h3>
      <p className="muted small">Found someone to cover your class? Tell us who.</p>
      <label className="field"><span>Date</span>
        <input type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setPicked([]); }} />
      </label>
      {date && !mine.length && <div className="muted small">You have no classes that day.</div>}
      {mine.length > 0 && (
        <>
          <label className="field"><span>Covering coach</span>
            <select value={covering} onChange={(e) => setCovering(e.target.value)}>
              <option value="">— pick coach —</option>
              {others.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <div className="field">
            <span>Covering</span>
            <label className="check"><input type="radio" checked={scope === "day"} onChange={() => setScope("day")} /> All my classes that day ({mine.length})</label>
            <label className="check"><input type="radio" checked={scope === "classes"} onChange={() => setScope("classes")} /> Only some classes</label>
            {scope === "classes" && mine.map((c) => (
              <label key={c.id} className="check indent">
                <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
                {fmt(c.start_min)} {c.class_name}
              </label>
            ))}
          </div>
          <label className="field"><span>Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {TIME_OFF_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button className="btn primary block" disabled={busy} onClick={submit}>Submit</button>
        </>
      )}
    </section>
  );
}
