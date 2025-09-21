import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

type ExpiringItem = {
  id: string;
  name: string;
  est_expiry_date: string; // ISO
  daysRemaining: number; // derived client-side
};

export default function Alerts() {
  const palette = Colors.light;

  // TODO: wire to backend inventory soon; using tasteful placeholders for MVP
  function daysUntil(dateIso: string): number {
    const today = new Date();
    const target = new Date(dateIso);
    const ms = target.setHours(0,0,0,0) - today.setHours(0,0,0,0);
    return Math.floor(ms / 86400000);
  }

  const expiringSoon = useMemo<ExpiringItem[]>(() => {
    const items: ExpiringItem[] = [
      { id: '1', name: 'Spinach', est_expiry_date: new Date().toISOString(), daysRemaining: 0 },
      { id: '2', name: 'Greek yogurt', est_expiry_date: new Date(Date.now() + 2*86400000).toISOString(), daysRemaining: 2 },
      { id: '3', name: 'Leftover rice', est_expiry_date: new Date(Date.now() - 1*86400000).toISOString(), daysRemaining: -1 },
    ];
    // Only include items expiring today or tomorrow; exclude expired
    return items
      .map((it) => ({ ...it, daysRemaining: daysUntil(it.est_expiry_date) }))
      .filter((it) => it.daysRemaining === 0 || it.daysRemaining === 1);
  }, []);

  if (!expiringSoon.length) {
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
          const color = isToday ? palette.danger : palette.warning;
          const label = isToday ? 'Today' : 'Tomorrow';
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
});
