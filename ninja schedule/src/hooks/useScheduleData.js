import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { fetchAllRows } from "../helpers";
import { TABLES } from "../constants";

// [orderCol, tiebreak]
const ORDER = {
  classes: ["start_min", "id"],
  overrides: ["on_date", "id"],
  coaches: ["name", "id"],
  availability: ["coach", null],
  absences: ["start_date", "id"],
  timeOff: ["on_date", "id"],
  coverage: ["created_at", "id"],
  settings: ["key", null],
};

const EMPTY = Object.fromEntries(Object.keys(TABLES).map((k) => [k, []]));

// All loading + realtime in one place.
export function useScheduleData() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    const entries = await Promise.all(
      Object.entries(TABLES).map(async ([k, table]) => {
        const [col, tie] = ORDER[k];
        return [k, table, await fetchAllRows(table, col, true, tie)];
      }),
    );
    const next = {};
    let err = null;
    for (const [k, table, res] of entries) {
      next[k] = res.data;
      if (res.error && !err) err = `${table}: ${res.error.message}`;
    }
    setData(next);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    let timer;
    const kick = () => { clearTimeout(timer); timer = setTimeout(fetchAll, 250); };
    // Subscribe per table so the gymnastics tables in the same project don't trigger reloads.
    let ch = supabase.channel("ninja-live");
    Object.values(TABLES).forEach((table) => {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, kick);
    });
    ch.subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [fetchAll]);

  const overrideMap = useMemo(
    () => new Map(data.overrides.map((o) => [`${o.on_date}|${o.class_id}`, o])),
    [data.overrides],
  );

  return { ...data, overrideMap, loading, error, refresh: fetchAll };
}
