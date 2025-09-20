import { useCallback, useEffect, useState } from 'react';

import { fetchNudges } from '@/services/api';
import { AiNudge, NudgesResponse } from '@/types/nudge';
import { fallbackPickupPrompts, fallbackHeroMessages } from '@/constants/mock-data';
import { useAuthContext } from '@/context/AuthContext';

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
  const { accessToken, status } = useAuthContext();

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
      const response = await fetchNudges(accessToken, params);
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
  }, [accessToken, status, params]);

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    } else if (status === 'unauthenticated') {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [status, load]);

  return {
    nudges: state.nudges,
    source: state.source,
    loading: state.loading,
    error: state.error,
    refresh: load,
  };
}
