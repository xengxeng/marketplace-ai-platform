"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";

/**
 * Loads data from the API with the load/error/pending-row state every dashboard
 * panel needs, plus `mutate` for row actions that refresh the list afterwards.
 * `load` must be referentially stable (declare it outside the component).
 */
export function useApiResource<T>(load: () => Promise<T>, fallbackError: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const runLoad = useCallback(async () => {
    try {
      setData(await load());
      setError("");
    } catch (err) {
      setError(errorMessage(err, fallbackError));
    } finally {
      setLoading(false);
    }
  }, [load, fallbackError]);

  useEffect(() => {
    // Fetching on mount is the point of this hook; state only settles after the
    // request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runLoad();
  }, [runLoad]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    await runLoad();
  }, [runLoad]);

  const mutate = useCallback(
    async (id: string, action: () => Promise<unknown>, actionError: string) => {
      setPendingId(id);

      try {
        await action();
        await reload();
      } catch (err) {
        setError(errorMessage(err, actionError));
      } finally {
        setPendingId(null);
      }
    },
    [reload],
  );

  return { data, setData, loading, error, setError, refresh: runLoad, reload, pendingId, mutate };
}
