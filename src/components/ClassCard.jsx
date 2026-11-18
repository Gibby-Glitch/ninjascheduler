import { classMeta, fmt, needsCoverage } from "../helpers";
import { LEVEL_COLORS } from "../constants";

export default function ClassCard({ cls, colorOf, outReason, onClick }) {
  const needs = needsCoverage(cls, outReason);
  const cn = ["class-card", cls.canceled && "canceled", needs && "needs"].filter(Boolean).join(" ");
  return (
    <button
      className={cn}
      onClick={onClick}
      disabled={!onClick}
      style={{ "--level": LEVEL_COLORS[cls.belt_level] || "#94a3b8" }}
    >
      <div className="cc-time">{fmt(cls.start_min)} – {fmt(cls.end_min)}</div>
      <div className="cc-name">{cls.class_name}</div>
      <div className="cc-meta">
        {classMeta(cls)}
      </div>
      <div className="cc-coaches">
        {cls.coaches.length ? cls.coaches.map((n) => {
          const out = outReason(n);
          return (
            <span key={n} className={`chip${out ? " chip-out" : ""}`} style={{ "--chip": colorOf(n) }} title={out?.label}>
              {n}{out ? " ⚠" : ""}
            </span>
          );
        }) : <span className="chip chip-empty">No coach</span>}
      </div>
      {needs && <div className="cc-flag need">Needs coverage</div>}
      {cls.canceled && <div className="cc-flag">Canceled{cls.cancel_reason ? `: ${cls.cancel_reason}` : ""}</div>}
      {cls.override && !cls.canceled && <div className="cc-flag sub">Changed for this date</div>}
      {cls.note && <div className="cc-note">{cls.note}</div>}
    </button>
  );
}
