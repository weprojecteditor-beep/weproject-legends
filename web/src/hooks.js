import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Poll an async function on an interval.
 * Keeps the LAST successful data when a refresh fails, so the UI never
 * white-screens — it shows stale data + an error flag instead (per SPEC).
 */
export function usePolling(fetchFn, intervalMs, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const savedFn = useRef(fetchFn);
  savedFn.current = fetchFn;

  const load = useCallback(async () => {
    try {
      const d = await savedFn.current();
      setData(d);
      setError(false);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (alive) await load();
    };
    run();
    const t = setInterval(run, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [load, intervalMs]);

  return { data, error, loading, refresh: load };
}
