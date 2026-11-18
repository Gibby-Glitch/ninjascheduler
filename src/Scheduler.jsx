import { useState } from "react";
import { useScheduleData } from "./hooks/useScheduleData";
import { storage, todayISO } from "./helpers";
import DayBoardTab from "./tabs/DayBoardTab";
import EditClassesTab from "./tabs/EditClassesTab";
import CoachesTab from "./tabs/CoachesTab";
import CoverageTab from "./tabs/CoverageTab";
import PrintTab from "./tabs/PrintTab";
import PayrollTab from "./tabs/PayrollTab";
import SettingsTab from "./tabs/SettingsTab";
import TimeOffBadge from "./components/TimeOffBadge";

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "";
const TABS = [
  ["board", "Day Board"],
  ["classes", "Classes"],
  ["coaches", "Coaches"],
  ["coverage", "Coverage"],
  ["print", "Print"],
  ["payroll", "Payroll"],
  ["settings", "Settings"],
];

export default function Scheduler() {
  const data = useScheduleData();
  const [tab, setTab] = useState("board");
  const [boardDate, setBoardDate] = useState(todayISO());
  const [canEdit, setCanEdit] = useState(() => !ADMIN_PIN || storage.get("ninja_admin_pin") === ADMIN_PIN);

  const guard = (fn) => (...args) => {
    if (canEdit) return fn(...args);
    alert("Admin PIN required — click 🔒 Unlock in the top bar.");
  };

  const unlock = () => {
    const pin = prompt("Admin PIN");
    if (pin === null) return;
    if (pin === ADMIN_PIN) { storage.set("ninja_admin_pin", pin); setCanEdit(true); }
    else alert("Wrong PIN");
  };
  const lock = () => { storage.del("ninja_admin_pin"); setCanEdit(false); };

  const openDate = (iso) => { setBoardDate(iso); setTab("board"); };
  const ctx = { data, canEdit, guard };

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">🥷 <span>Ninja</span><span className="brand-full"> Scheduler</span></div>
        <nav className="tabs">
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? "active" : ""} onClick={(e) => { setTab(k); e.currentTarget.scrollIntoView({ inline: "center", block: "nearest" }); window.scrollTo(0, 0); }}>{label}</button>
          ))}
        </nav>
        <div className="topbar-right">
          <TimeOffBadge data={data} onClick={() => setTab("coverage")} />
          <a className="btn ghost small" href="?coach" target="_blank" rel="noreferrer">Coach hub<span className="hide-phone"> ↗</span></a>
          {ADMIN_PIN && (canEdit
            ? <button className="btn ghost small" onClick={lock} aria-label="Lock">🔓<span className="hide-phone"> Lock</span></button>
            : <button className="btn ghost small" onClick={unlock}>🔒 Unlock</button>)}
        </div>
      </header>

      {data.error && <div className="banner error no-print">Database error — {data.error}</div>}
      {!canEdit && <div className="banner no-print">View-only mode. Unlock to make changes.</div>}

      <main className="content">
        {data.loading ? <div className="empty">Loading…</div> : (
          <>
            {tab === "board" && <DayBoardTab {...ctx} iso={boardDate} setIso={setBoardDate} />}
            {tab === "classes" && <EditClassesTab {...ctx} />}
            {tab === "coaches" && <CoachesTab {...ctx} />}
            {tab === "coverage" && <CoverageTab {...ctx} openDate={openDate} />}
            {tab === "print" && <PrintTab {...ctx} />}
            {tab === "payroll" && <PayrollTab {...ctx} setTab={setTab} />}
            {tab === "settings" && <SettingsTab {...ctx} />}
          </>
        )}
      </main>
    </div>
  );
}
