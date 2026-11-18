import { useState } from "react";
import { supabase } from "../supabase";
import { availabilitySummary, formatPhone, isActiveCoach } from "../helpers";
import { COACH_PALETTE } from "../constants";

export default function CoachesTab({ data, canEdit, guard }) {
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", employee_id: "" });
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});
  const [showFormer, setShowFormer] = useState(false);
  const hubUrl = `${window.location.origin}${window.location.pathname}?coach`;

  const add = guard(async () => {
    const name = draft.name.trim();
    if (!name) return;
    if (data.coaches.some((c) => c.name.toLowerCase() === name.toLowerCase())) return alert("That coach already exists.");
    const color = COACH_PALETTE[data.coaches.length % COACH_PALETTE.length];
    const { error } = await supabase.from("ninja_coaches").insert({ ...draft, name, color });
    if (error) return alert(`Save failed: ${error.message}`);
    setDraft({ name: "", phone: "", email: "", employee_id: "" });
    data.refresh();
  });

  const saveEdit = guard(async () => {
    const { error } = await supabase.from("ninja_coaches").update({
      phone: edit.phone, email: edit.email, employee_id: (edit.employee_id || "").trim(), color: edit.color, departure_date: edit.departure_date || null,
    }).eq("id", editId);
    if (error) return alert(`Save failed: ${error.message}`);
    setEditId(null);
    data.refresh();
  });

  const remove = guard(async (c) => {
    const used = data.classes.filter((k) => (k.coaches || []).includes(c.name)).length;
    const msg = used
      ? `${c.name} is on ${used} template class(es). Tip: set a departure date instead to keep history. Delete anyway?`
      : `Delete ${c.name}?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("ninja_coaches").delete().eq("id", c.id);
    if (error) alert(`Delete failed: ${error.message}`);
    data.refresh();
  });

  const shown = data.coaches.filter((c) => showFormer || isActiveCoach(c));
  const availOf = (name) => data.availability.find((a) => a.coach === name)?.days;
  const classCount = (name) => data.classes.filter((k) => (k.coaches || []).includes(name)).length;

  return (
    <div>
      <section className="card">
        <div className="toolbar">
          <h3>Coach roster</h3>
          <div className="row">
            <label className="check small"><input type="checkbox" checked={showFormer} onChange={(e) => setShowFormer(e.target.checked)} /> Show former coaches</label>
            <button className="btn ghost small" onClick={() => { navigator.clipboard?.writeText(hubUrl); alert(`Coach hub link copied:\n${hubUrl}`); }}>
              Copy coach hub link
            </button>
          </div>
        </div>

        {canEdit && (
          <form className="row add-row" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value) })} />
            <input placeholder="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <input placeholder="UKG employee ID" value={draft.employee_id} onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })} />
            <button className="btn primary" type="submit">+ Add coach</button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr><th>Coach</th><th>Emp ID</th><th>Phone</th><th>Email</th><th>Classes</th><th>Availability</th><th /></tr>
          </thead>
          <tbody>
            {shown.map((c) => editId === c.id ? (
              <tr key={c.id} className="editing">
                <td>
                  <input type="color" value={edit.color || "#64748b"} onChange={(e) => setEdit({ ...edit, color: e.target.value })} />
                  {" "}<b>{c.name}</b>
                </td>
                <td><input value={edit.employee_id || ""} onChange={(e) => setEdit({ ...edit, employee_id: e.target.value })} placeholder="UKG ID" /></td>
                <td><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: formatPhone(e.target.value) })} /></td>
                <td><input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></td>
                <td colSpan={2}>
                  <label className="small">Departure date{" "}
                    <input type="date" value={edit.departure_date || ""} onChange={(e) => setEdit({ ...edit, departure_date: e.target.value })} />
                  </label>
                </td>
                <td className="nowrap right">
                  <button className="btn primary small" onClick={saveEdit}>Save</button>
                  <button className="btn ghost small" onClick={() => setEditId(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={c.id} className={isActiveCoach(c) ? "" : "faded"}>
                <td className="nowrap">
                  <span className="swatch" style={{ background: c.color || "#64748b" }} /> <b>{c.name}</b>
                  {c.departure_date && <div className="muted small">Leaves {c.departure_date}</div>}
                </td>
                <td>{c.employee_id || <span className="pill red">missing</span>}</td>
                <td className="nowrap">{c.phone}</td>
                <td>{c.email}</td>
                <td>{classCount(c.name)}</td>
                <td className="small">{availabilitySummary(availOf(c.name))}</td>
                <td className="nowrap right">
                  {canEdit && <>
                    <button className="btn ghost small" onClick={() => { setEditId(c.id); setEdit({ ...c }); }}>Edit</button>
                    <button className="btn ghost small danger" onClick={() => remove(c)}>Delete</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="muted">No coaches yet.</p>}
        <p className="muted small">Names are the link between coaches, classes and requests, so they can't be renamed here. Coaches set their own availability in the coach hub.</p>
      </section>
    </div>
  );
}
