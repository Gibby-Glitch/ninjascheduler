import { useState } from "react";
import { useScheduleData } from "./hooks/useScheduleData";
import { formatPhone, phoneDigits, storage } from "./helpers";
import MySchedule from "./hub/MySchedule";
import AvailabilityForm from "./hub/AvailabilityForm";
import DayOffForm from "./hub/DayOffForm";
import CoverageForm from "./hub/CoverageForm";

const TABS = [
  ["schedule", "📅 Schedule"],
  ["dayoff", "🌴 Day off"],
  ["coverage", "🤝 Coverage"],
  ["availability", "🕒 Availability"],
];

export default function CoachHub() {
  const data = useScheduleData();
  const [me, setMe] = useState(() => storage.get("ninja_coach"));
  const [tab, setTab] = useState("schedule");
  const coach = data.coaches.find((c) => c.name === me);

  const signOut = () => { storage.del("ninja_coach"); setMe(""); };

  if (data.loading) return <div className="hub"><div className="empty">Loading…</div></div>;

  if (!coach) {
    return (
      <div className="hub">
        <SignIn coaches={data.coaches} onSignIn={(n) => { storage.set("ninja_coach", n); setMe(n); }} />
      </div>
    );
  }

  const props = { data, me: coach.name };
  return (
    <div className="hub">
      <header className="hub-head">
        <div>
          <div className="muted small">🥷 Coach hub</div>
          <h2>Hi, {coach.name}</h2>
        </div>
        <button className="btn ghost small" onClick={signOut}>Not you?</button>
      </header>
      {data.error && <div className="banner error">Database error — {data.error}</div>}
      <nav className="hub-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
      {tab === "schedule" && <MySchedule {...props} />}
      {tab === "dayoff" && <DayOffForm {...props} />}
      {tab === "coverage" && <CoverageForm {...props} />}
      {tab === "availability" && <AvailabilityForm {...props} />}
    </div>
  );
}

function SignIn({ coaches, onSignIn }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Guard against a SyntheticEvent being passed in as the name (lesson #5).
  const submit = (nameArg) => {
    const nm = (typeof nameArg === "string" ? nameArg : name).trim().toLowerCase();
    const match = coaches.find((c) => c.name.toLowerCase() === nm);
    if (!match) return alert("Name not found on the roster. Check spelling or ask your admin.");
    if (match.phone && phoneDigits(match.phone) !== phoneDigits(phone)) {
      return alert("That phone number doesn't match what's on file.");
    }
    onSignIn(match.name);
  };

  return (
    <form className="card signin" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <h2>🥷 Coach hub</h2>
      <p className="muted">Enter your name and phone number to see your schedule.</p>
      <label className="field"><span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
      </label>
      <label className="field"><span>Phone</span>
        <input value={phone} inputMode="tel" onChange={(e) => setPhone(formatPhone(e.target.value))} autoComplete="tel" />
      </label>
      <button className="btn primary block" type="submit">Continue</button>
    </form>
  );
}
