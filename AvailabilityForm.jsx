import { useState } from "react";
import { supabase } from "../supabase";
import { hhmmToMin, minToHHMM } from "../helpers";
import { DAYS, DAY_FULL } from "../constants";

export default function AvailabilityForm({ data, me }) {
  const existing = data.availability.find((a) => a.coach === me)?.days || {};
  const [days, setDays] = useState(() => Object.fromEntries(DAYS.map((d) => [d, existing[d] || []])));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const change = (d, windows) => { setSaved(false); setDays({ ...days, [d]: windows }); };
  const setWin = (d, i, j, v) => change(d, days[d].map((w, k) => (k === i ? (j === 0 ? [v, w[1]] : [w[0], v]) : w)));

  const save = async () => {
    for (const d of DAYS) {
      if (days[d].some(([s, e]) => e <= s)) return alert(`${DAY_FULL[d]}: end time must be after start time.`);
    }
    setBusy(true);
    const clean = Object.fromEntries(DAYS.map((d) => [d, [...days[d]].sort((a, b) => a[0] - b[0])]));
    const { error } = await supabase.from("ninja_availability").upsert({ coach: me, days: clean }, { onConflict: "coach" });
    setBusy(false);
    if (error) return alert(`Save failed: ${error.message}`);
    setSaved(true);
    data.refresh();
  };

  return (
    <div className="stack">
      <p className="muted">When can you usually coach each week? Add one or more time windows per day.</p>
      {DAYS.map((d) => (
        <section key={d} className="card avail-day">
          <div className="row spread">
            <b>{DAY_FULL[d]}</b>
            <button className="btn ghost small" onClick={() => change(d, [...days[d], [15 * 60, 20 * 60]])}>+ Window</button>
          </div>
          {!days[d].length && <div className="muted small">Not available</div>}
          {days[d].map(([s, e], i) => (
            <div key={i} className="row">
              <input type="time" step="900" value={minToHHMM(s)} onChange={(ev) => setWin(d, i, 0, hhmmToMin(ev.target.value))} />
              <span>to</span>
              <input type="time" step="900" value={minToHHMM(e)} onChange={(ev) => setWin(d, i, 1, hhmmToMin(ev.target.value))} />
              <button className="btn ghost small" onClick={() => change(d, days[d].filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
        </section>
      ))}
      <button className="btn primary block" disabled={busy} onClick={save}>{saved ? "✓ Saved" : "Save availability"}</button>
    </div>
  );
}
