import { useCallback, useEffect, useState } from 'react';

import { fetchPostings } from '@/services/api';
import { Posting } from '@/types/posting';
import { useAuthContext } from '@/context/AuthContext';

export function usePostings() {
  const [postings, setPostings] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, status } = useAuthContext();

  const load = useCallback(async () => {
    if (!accessToken) {
      if (status === 'authenticated') {
        setError('Your session expired. Please sign in again.');
      }
      setLoading(false);
      setPostings([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPostings(accessToken);
      setPostings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setPostings([]);
    }
  }, [status, load]);

  return {
    postings,
    loading,
    error,
    refresh: load,
  };
}
