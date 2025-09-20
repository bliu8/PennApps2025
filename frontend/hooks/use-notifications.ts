import { useCallback, useEffect, useState } from 'react';

import { fetchNotifications } from '@/services/api';
import { NotificationPayload } from '@/types/account';

type NotificationsState = {
  notifications: NotificationPayload[];
  shareRatePercent: number | null;
  loading: boolean;
  error: string | null;
};

const initialState: NotificationsState = {
  notifications: [],
  shareRatePercent: null,
  loading: true,
  error: null,
};

export function useNotifications() {
  const [state, setState] = useState<NotificationsState>(initialState);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchNotifications();
      setState({
        notifications: response.notifications,
        shareRatePercent: response.shareRatePercent,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        notifications: [],
        shareRatePercent: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load notifications',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    notifications: state.notifications,
    shareRatePercent: state.shareRatePercent,
    loading: state.loading,
    error: state.error,
    refresh: load,
  };
}
