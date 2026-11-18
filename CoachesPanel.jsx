import { useState } from "react";
import { dayKeyOf, fmt, isActiveCoach, phoneDigits } from "../helpers";

const ORDER = { available: 0, teaching: 1, out: 2, off: 3, unknown: 4 };
const FILTERS = [["all", "All"], ["available", "Available"], ["teaching", "Teaching"], ["out", "Out"]];

// Who's around on this date: teaching, free to sub, out, or off — with phone numbers.
export default function CoachesPanel({ iso, list, data, outReason }) {
  const [filter, setFilter] = useState("all");
  const dk = dayKeyOf(iso);

  const rows = data.coaches.filter((c) => isActiveCoach(c, iso)).map((c) => {
    const teaching = list.filter((k) => !k.canceled && k.coaches.includes(c.name));
    const out = outReason(c.name);
    const av = data.availability.find((a) => a.coach === c.name);
    const windows = av?.days?.[dk] || [];
    const status = out ? "out" : teaching.length ? "teaching" : windows.length ? "available" : av ? "off" : "unknown";
    return { c, teaching, out, windows, status };
  }).sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.c.name.localeCompare(b.c.name));

  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const count = (s) => rows.filter((r) => r.status === s).length;
  const win = (w) => w.map(([s, e]) => `${fmt(s)}–${fmt(e)}`).join(", ");

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Coaches</h3>
        <span className="muted small">{count("available")} free · {count("teaching")} teaching · {count("out")} out</span>
      </div>
      <div className="seg seg-sm">
        {FILTERS.map(([k, label]) => (
          <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      <ul className="coach-rows">
        {shown.map(({ c, teaching, out, windows, status }) => (
          <li key={c.id} className={`coach-row st-${status}`}>
            <span className="avatar" style={{ background: c.color || "#64748b" }}>{c.name.slice(0, 1).toUpperCase()}</span>
            <div className="coach-info">
              <div className="coach-name">
                {c.name}
                <span className={`status-tag ${status}`}>
                  {{ available: "Available", teaching: "Teaching", out: "Out", off: "Off today", unknown: "No availability set" }[status]}
                </span>
              </div>
              <div className="muted small">
                {status === "out" && out.label}
                {status === "teaching" && teaching.map((k) => `${fmt(k.start_min)} ${k.class_name}`).join(" · ")}
                {status === "available" && `Free ${win(windows)}`}
                {status === "teaching" && windows.length > 0 && <div>Available {win(windows)}</div>}
              </div>
              {c.phone ? (
                <a className="phone" href={`tel:+1${phoneDigits(c.phone)}`}>📞 {c.phone}</a>
              ) : <span className="muted small">No phone on file</span>}
            </div>
          </li>
        ))}
        {!shown.length && <li className="muted small">Nobody in this group.</li>}
      </ul>
    </section>
  );
}
