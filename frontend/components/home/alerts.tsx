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
  const expiringSoon = useMemo<ExpiringItem[]>(() => {
    const items: ExpiringItem[] = [
      { id: '1', name: 'Spinach', est_expiry_date: new Date().toISOString(), daysRemaining: 0 },
      { id: '2', name: 'Greek yogurt', est_expiry_date: new Date(Date.now() + 2*86400000).toISOString(), daysRemaining: 2 },
    ];
    // Only include items expiring within the next 24h
    return items.filter((it) => it.daysRemaining <= 1);
  }, []);

  if (!expiringSoon.length) {
    return null;
  }

  return (
    <SurfaceCard tone="warning" style={styles.card}>
      <View style={styles.headerRow}>
        <IconSymbol name="exclamationmark.triangle.fill" size={18} color={palette.warning} />
        <ThemedText type="subtitle">Expiring Soon</ThemedText>
      </View>
      <View style={styles.list}>
        {expiringSoon.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
            <ThemedText style={{ color: palette.warning, fontWeight: '600' }}>
              {item.daysRemaining <= 0 ? 'Today' : 'Tomorrow'}
            </ThemedText>
          </View>
        ))}
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
