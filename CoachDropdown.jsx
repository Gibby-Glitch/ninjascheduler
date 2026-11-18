// Single coach picker. `hint(name)` adds a short status after each name.
export default function CoachDropdown({ value, onChange, options, hint, placeholder = "— pick coach —" }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {value && !options.includes(value) && <option value={value}>{value} (inactive)</option>}
      {options.map((n) => {
        const h = hint?.(n);
        return <option key={n} value={n}>{n}{h ? ` — ${h}` : ""}</option>;
      })}
    </select>
  );
}

// One or more coaches (ninja classes are usually 1, occasionally 2).
// Value may contain "" placeholders; callers run cleanList() before saving.
export function CoachListEditor({ value, onChange, options, hint, max = 3 }) {
  const list = value.length ? value : [""];
  const setAt = (i, v) => onChange(list.map((x, j) => (j === i ? v : x)));
  const removeAt = (i) => onChange(list.filter((_, j) => j !== i));
  return (
    <div className="coach-list">
      {list.map((n, i) => (
        <div className="row" key={i}>
          <CoachDropdown value={n} onChange={(v) => setAt(i, v)} options={options} hint={hint} />
          {list.length > 1 && <button type="button" className="btn ghost small" onClick={() => removeAt(i)}>✕</button>}
        </div>
      ))}
      {list.length < max && (
        <button type="button" className="btn ghost small" onClick={() => onChange([...list, ""])}>+ Add coach</button>
      )}
    </div>
  );
}
