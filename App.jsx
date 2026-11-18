import { useEffect, useState } from "react";
import { isConfigured } from "./supabase";
import Scheduler from "./Scheduler";
import CoachHub from "./CoachHub";

const coachRoute = () =>
  new URLSearchParams(window.location.search).has("coach") || window.location.hash === "#coach";

export default function App() {
  const [isCoach, setIsCoach] = useState(coachRoute);
  useEffect(() => {
    const onHash = () => setIsCoach(coachRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!isConfigured) {
    return (
      <div className="setup">
        <h1>🥷 Ninja Scheduler</h1>
        <p>Supabase isn't connected yet.</p>
        <p>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Netlify
          (Site configuration → Environment variables) and redeploy — or in <code>.env.local</code> for local dev.
        </p>
      </div>
    );
  }
  return isCoach ? <CoachHub /> : <Scheduler />;
}
