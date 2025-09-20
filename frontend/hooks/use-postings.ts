import { useCallback, useEffect, useState } from 'react';

import { fetchPostings } from '@/services/api';
import { Posting } from '@/types/posting';

export function usePostings() {
  const [postings, setPostings] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPostings();
      setPostings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    postings,
    loading,
    error,
    refresh: load,
  };
}
