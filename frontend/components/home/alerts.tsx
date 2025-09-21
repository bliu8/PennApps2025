import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import { fetchInventoryItems, InventoryItem } from '@/services/api';

type ExpiringItem = {
  id: string;
  name: string;
  est_expiry_date: string; // ISO
  daysRemaining: number; // derived client-side
};

export default function Alerts() {
  const palette = Colors.light;
  const { accessToken } = useAuthContext();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function daysUntil(dateIso: string): number {
    const today = new Date();
    const target = new Date(dateIso);
    const ms = target.setHours(0,0,0,0) - today.setHours(0,0,0,0);
    return Math.floor(ms / 86400000);
  }

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    fetchInventoryItems(accessToken)
      .then((response) => {
        setInventoryItems(response.items);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to fetch inventory items:', err);
        setError(err.message);
        setInventoryItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessToken]);

  const expiringSoon = useMemo<ExpiringItem[]>(() => {
    // Show items expiring within the next 3 days (including today)
    return inventoryItems
      .map((item) => ({
        id: item.id,
        name: item.name,
        est_expiry_date: item.est_expiry_date,
        daysRemaining: daysUntil(item.est_expiry_date)
      }))
      .filter((it) => it.daysRemaining >= 0 && it.daysRemaining <= 3)
      .sort((a, b) => a.daysRemaining - b.daysRemaining); // Sort by urgency
  }, [inventoryItems]);

  // Debug logging
  useMemo(() => {
    console.log('Alerts Debug:', {
      inventoryCount: inventoryItems.length,
      expiringCount: expiringSoon.length,
      loading,
      error,
      expiringItems: expiringSoon.map(item => ({
        name: item.name,
        daysRemaining: item.daysRemaining,
        expiryDate: item.est_expiry_date
      }))
    });
  }, [inventoryItems, expiringSoon, loading, error]);

  if (loading) {
    return (
      <SurfaceCard tone="default" style={[styles.card, { backgroundColor: palette.warningSurface, borderColor: palette.warning }]}>
        <View style={styles.headerRow}>
          <IconSymbol name="clock.fill" size={18} color={palette.warning} />
          <ThemedText type="subtitle">Loading...</ThemedText>
        </View>
        <ThemedText style={styles.loadingText}>Checking for items that need attention...</ThemedText>
      </SurfaceCard>
    );
  }

  if (error) {
    return (
      <SurfaceCard tone="default" style={[styles.card, { backgroundColor: palette.dangerSurface, borderColor: palette.danger }]}>
        <View style={styles.headerRow}>
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color={palette.danger} />
          <ThemedText type="subtitle">Connection Error</ThemedText>
        </View>
        <ThemedText style={styles.errorText}>Unable to load inventory items</ThemedText>
      </SurfaceCard>
    );
  }

  if (!expiringSoon.length) {
    // Show debug info when no items are expiring
    if (inventoryItems.length === 0 && !loading && !error) {
      return (
        <SurfaceCard tone="default" style={[styles.card, { backgroundColor: palette.infoSurface, borderColor: palette.info }]}>
          <View style={styles.headerRow}>
            <IconSymbol name="info.circle.fill" size={18} color={palette.info} />
            <ThemedText type="subtitle">No Items</ThemedText>
          </View>
          <ThemedText style={styles.debugText}>
            No inventory items found. Scan some items to see alerts here!
          </ThemedText>
        </SurfaceCard>
      );
    }
    return null;
  }

  return (
    <SurfaceCard tone="default" style={[styles.card, { backgroundColor: palette.dangerSurface, borderColor: palette.danger }]}>
      <View style={styles.headerRow}>
        <IconSymbol name="exclamationmark.triangle.fill" size={18} color={palette.danger} />
        <ThemedText type="subtitle">Expiring Soon</ThemedText>
      </View>
      <View style={styles.list}>
        {expiringSoon.map((item) => {
          const isToday = item.daysRemaining === 0;
          const isTomorrow = item.daysRemaining === 1;
          const isSoon = item.daysRemaining === 2 || item.daysRemaining === 3;

          let color = palette.warning;
          let label = `${item.daysRemaining} days`;

          if (isToday) {
            color = palette.danger;
            label = 'Today';
          } else if (isTomorrow) {
            color = palette.warning;
            label = 'Tomorrow';
          } else if (isSoon) {
            label = `In ${item.daysRemaining} days`;
          }

          return (
            <View key={item.id} style={styles.itemRow}>
              <ThemedText style={styles.itemName}>{item.name}</ThemedText>
              <ThemedText style={{ color, fontWeight: '600' }}>{label}</ThemedText>
            </View>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  list: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontWeight: '600',
  },
  loadingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#d32f2f',
    fontStyle: 'italic',
  },
  debugText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
