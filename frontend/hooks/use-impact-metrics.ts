import { useCallback, useEffect, useState } from 'react';

import { fetchImpactMetrics } from '@/services/api';
import { ImpactMetric, ImpactResponse } from '@/types/impact';
import { fallbackImpactMetrics } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';

type ImpactState = {
  metrics: ImpactMetric[];
  source: ImpactResponse['source'];
  loading: boolean;
  error: string | null;
};

const initialState: ImpactState = {
  metrics: fallbackImpactMetrics,
  source: 'fallback',
  loading: true,
  error: null,
};

export function useImpactMetrics() {
  const [state, setState] = useState<ImpactState>(initialState);
  const { accessToken, status } = useAuth();

  const load = useCallback(async () => {
    if (!accessToken) {
      if (status === 'authenticated') {
        setState((prev) => ({ ...prev, loading: false, error: 'Session expired. Please sign in again.' }));
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchImpactMetrics(accessToken);
      setState({
        metrics: response.metrics,
        source: response.source,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load impact metrics',
      }));
    }
  }, [accessToken, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    } else if (status === 'unauthenticated') {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [status, load]);

  return {
    metrics: state.metrics,
    source: state.source,
    loading: state.loading,
    error: state.error,
    refresh: load,
  };
}
