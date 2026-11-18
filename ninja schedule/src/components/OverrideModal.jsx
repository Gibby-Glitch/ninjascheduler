import { useState } from "react";
import { supabase } from "../supabase";
import { cleanList, fmt, fmtLong, saveOverride, dayKeyOf } from "../helpers";
import { DAY_FULL } from "../constants";
import Modal from "./Modal";
import { CoachListEditor } from "./CoachDropdown";

// Sub / cancel a class on one date, or push the coach change into the template.
export default function OverrideModal({ cls, iso, coachNames, hint, onClose, onSaved }) {
  const [coaches, setCoaches] = useState(cls.coaches.length ? cls.coaches : [""]);
  const [canceled, setCanceled] = useState(cls.canceled);
  const [reason, setReason] = useState(cls.cancel_reason);
  const [note, setNote] = useState(cls.note);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    if (err) return alert(`Save failed: ${err.message}`);
    onSaved();
  };

  const saveThisDate = () => run(async () => {
    const { error } = await saveOverride(cls, iso, {
      coaches: cleanList(coaches),
      canceled,
      cancel_reason: canceled ? reason : "",
      note,
    });
    return error;
  });

  const saveTemplate = () => run(async () => {
    const list = cleanList(coaches);
    const { error } = await supabase.from("ninja_classes").update({ coaches: list }).eq("id", cls.id);
    if (error) return error;
    // Keep this date consistent with the new template.
    if (cls.override) {
      const r = (cls.override.canceled || cls.override.note)
        ? await saveOverride(cls, iso, { coaches: list })
        : await supabase.from("ninja_overrides").delete().eq("id", cls.override.id);
      return r.error;
    }
    return null;
  });

  const clearOverride = () => run(async () => {
    const { error } = await supabase.from("ninja_overrides").delete().eq("id", cls.override.id);
    return error;
  });

  const dayName = DAY_FULL[dayKeyOf(iso)];

  return (
    <Modal title={cls.class_name} onClose={onClose}>
      <p className="muted">{fmtLong(iso)} · {fmt(cls.start_min)} – {fmt(cls.end_min)}</p>
      {cls.override && (
        <p className="muted small">Template coach(es): {cls.templateCoaches.join(", ") || "none"}</p>
      )}

      <label className="field">
        <span>Coach(es)</span>
        <CoachListEditor value={coaches} onChange={setCoaches} options={coachNames} hint={hint} />
      </label>

      <label className="check">
        <input type="checkbox" checked={canceled} onChange={(e) => setCanceled(e.target.checked)} />
        Cancel this class on this date
      </label>
      {canceled && (
        <label className="field">
          <span>Cancel reason</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Holiday, low enrollment" />
        </label>
      )}

      <label className="field">
        <span>Note (this date)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </label>

      <div className="modal-actions">
        <button className="btn primary" disabled={busy} onClick={saveThisDate}>Just this date</button>
        <button
          className="btn"
          disabled={busy || canceled}
          title={canceled ? "Cancellations only apply to one date" : ""}
          onClick={saveTemplate}
        >
          Update template (every {dayName})
        </button>
        {cls.override && <button className="btn ghost" disabled={busy} onClick={clearOverride}>Reset to template</button>}
      </div>
    </Modal>
  );
}
