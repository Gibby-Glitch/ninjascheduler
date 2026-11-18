import { useState } from "react";
import { supabase } from "../supabase";
import { classesForDate, fmt, fmtShort, todayISO } from "../helpers";
import { TIME_OFF_REASONS } from "../constants";

// Step 1 of the two-step workflow: flag the day off now, find coverage later.
export default function DayOffForm({ data, me }) {
  const today = todayISO();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = date
    ? classesForDate(date, data.classes, data.overrideMap).filter((c) => !c.canceled && c.coaches.includes(me))
    : [];
  const existing = data.timeOff.filter((t) => t.coach === me && t.on_date >= today)
    .sort((a, b) => a.on_date.localeCompare(b.on_date));

  const submit = async () => {
    if (!date) return alert("Pick a date.");
    if (date < today) return alert("Pick today or a future date.");
    setBusy(true);
    // UNIQUE (coach, on_date) → resubmitting updates instead of duplicating
    const { error } = await supabase.from("ninja_time_off").upsert({
      coach: me, on_date: date, reason, reason_note: note.trim(), status: "pending", covered: false,
    }, { onConflict: "coach,on_date" });
    setBusy(false);
    if (error) return alert(`Submit failed: ${error.message}`);
    setDate(""); setNote("");
    data.refresh();
    alert("Request sent. Once you find someone to cover, submit it on the Coverage tab.");
  };

  const cancel = async (t) => {
    if (!confirm(`Withdraw your request for ${fmtShort(t.on_date)}?`)) return;
    const { error } = await supabase.from("ninja_time_off").delete().eq("id", t.id);
    if (error) alert(`Failed: ${error.message}`);
    data.refresh();
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>Request a day off</h3>
        <p className="muted small">Let us know early. You can find a sub afterward and report it on the Coverage tab.</p>
        <label className="field"><span>Date</span>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {date && (
          <div className="muted small">
            {mine.length
              ? <>Your classes that day: {mine.map((c) => `${fmt(c.start_min)} ${c.class_name}`).join(", ")}</>
              : "You have no classes that day."}
          </div>
        )}
        <label className="field"><span>Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {TIME_OFF_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn primary block" disabled={busy} onClick={submit}>Send request</button>
      </section>

      {existing.length > 0 && (
        <section className="card">
          <h3>Upcoming requests</h3>
          {existing.map((t) => (
            <div key={t.id} className="row spread">
              <span>{fmtShort(t.on_date)}{t.admin_note && <span className="muted small"> — {t.admin_note}</span>}</span>
              <span className="row">
                <span className={`pill ${t.status === "approved" ? "green" : t.status === "denied" ? "red" : "amber"}`}>{t.status}</span>
                {t.status === "approved" && <span className={`pill ${t.covered ? "green" : "red"}`}>{t.covered ? "covered" : "needs sub"}</span>}
                {t.status === "pending" && <button className="btn ghost small" onClick={() => cancel(t)}>Withdraw</button>}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
