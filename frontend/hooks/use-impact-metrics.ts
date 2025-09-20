import { useCallback, useEffect, useState } from 'react';

import { fetchImpactMetrics } from '@/services/api';
import { ImpactMetric, ImpactResponse } from '@/types/impact';
import { fallbackImpactMetrics } from '@/constants/mock-data';

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

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchImpactMetrics();
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    metrics: state.metrics,
    source: state.source,
    loading: state.loading,
    error: state.error,
    refresh: load,
  };
}
