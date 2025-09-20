import { useCallback, useEffect, useState } from 'react';

import { fetchNudges } from '@/services/api';
import { AiNudge, NudgesResponse } from '@/types/nudge';
import { fallbackPickupPrompts, fallbackHeroMessages } from '@/constants/mock-data';

type NudgeState = {
  nudges: AiNudge[];
  source: NudgesResponse['source'];
  loading: boolean;
  error: string | null;
};

const initialNudges: AiNudge[] = [...fallbackHeroMessages, ...fallbackPickupPrompts].slice(0, 4);

const initialState: NudgeState = {
  nudges: initialNudges,
  source: 'fallback',
  loading: true,
  error: null,
};

export function useNudges(params?: { persona?: string; focus?: string; count?: number }) {
  const [state, setState] = useState<NudgeState>(initialState);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchNudges(params);
      setState({
        nudges: response.nudges,
        source: response.source,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load nudges',
      }));
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    nudges: state.nudges,
    source: state.source,
    loading: state.loading,
    error: state.error,
    refresh: load,
  };
}
