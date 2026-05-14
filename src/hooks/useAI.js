import { useState, useCallback } from 'react';

/**
 * React hook for AI API calls with loading/error/data states.
 *
 * Usage:
 *   const { data, loading, error, run } = useAI(ai.dashboardBriefing)
 *   // then call run({ date: '...', ... }) to trigger
 */
export function useAI(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(params);
      // result shape: { text, latencyMs } or { data, latencyMs } for structured
      setData(result);
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, run, reset };
}
