import { useCallback, useEffect, useState } from 'react';

import { fetchAccountOverview } from '@/services/api';
import { AccountOverview } from '@/types/account';

type AccountOverviewState = {
  data: AccountOverview | null;
  loading: boolean;
  error: string | null;
};

const initialState: AccountOverviewState = {
  data: null,
  loading: true,
  error: null,
};

export function useAccountOverview() {
  const [state, setState] = useState<AccountOverviewState>(initialState);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const overview = await fetchAccountOverview();
      setState({ data: overview, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unable to load account overview' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    overview: state.data,
    loading: state.loading,
    error: state.error,
    refresh: load,
  };
}
