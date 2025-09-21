import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

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
  const [modalVisible, setModalVisible] = useState(false);

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
    <SurfaceCard
      tone="default"
      onPress={() => setModalVisible(true)}
      style={[styles.card, { backgroundColor: palette.dangerSurface, borderColor: palette.danger }]}
    >
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
      <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}> 
            <ThemedText type="subtitle">About these alerts</ThemedText>
            <ThemedText style={{ color: Colors.light.subtleText }}>
              Placeholder details. We’ll show more info about what’s expiring soon here.
            </ThemedText>
            <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <ThemedText style={{ color: Colors.light.tint, fontWeight: '700' }}>Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.cardMuted,
    borderRadius: 10,
  },
});
