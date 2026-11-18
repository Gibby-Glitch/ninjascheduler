import { todayISO } from "../helpers";

// Pending time-off, approved-but-uncovered time-off, and pending coverage reports.
export default function TimeOffBadge({ data, onClick }) {
  const today = todayISO();
  const timeOff = data.timeOff.filter((t) => t.on_date >= today
    && (t.status === "pending" || (t.status === "approved" && !t.covered))).length;
  const coverage = data.coverage.filter((c) => c.on_date >= today && c.status === "pending").length;
  const total = timeOff + coverage;
  if (!total) return null;
  return (
    <button className="badge-btn" onClick={onClick} title={`${timeOff} time-off · ${coverage} coverage reports`}>
      🔔 <span className="badge">{total}</span>
    </button>
  );
}
