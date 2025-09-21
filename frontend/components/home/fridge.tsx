import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Modal, FlatList, Pressable, StyleSheet, View, Animated, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import Recipes from '../fridge/recipes';
import { sampleRecipes } from '@/constants/mock-data';
import { fetchInventoryItems, InventoryItem as APIInventoryItem } from '@/services/api';
import { useInventoryRefresh } from '@/context/InventoryRefreshContext';

// Use the API type directly
type InventoryItem = APIInventoryItem;

type ConsumeReason = 'used' | 'discarded';

type FridgeProps = {
  accessToken?: string;
  onEditQuantity?: (itemId: string, newQuantity: number) => Promise<void> | void;
  onConsume?: (itemId: string, quantityDelta: number, reason: ConsumeReason) => Promise<void> | void;
  onDelete?: (itemId: string) => Promise<void> | void;
};

function daysUntil(dateIso: string): number {
  const today = new Date();
  const target = new Date(dateIso);
  const ms = target.setHours(0,0,0,0) - today.setHours(0,0,0,0);
  // Use floor for future dates, negative for past days
  return Math.floor(ms / 86400000);
}

function expiryLabel(daysDiff: number): string {
  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Tomorrow';
  if (daysDiff === -1) return 'yesterday';
  if (daysDiff < -1) return `${Math.abs(daysDiff)}d ago`;
  return `${daysDiff}d`;
}

function capitalize(label: string): string {
  if (!label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Animated button component for satisfying press feedback
function AnimatedIconButton({ name, onPress, style, children, ...props }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.iconButton, style]}
        {...props}
      >
        {children || <IconSymbol name={name} size={24} color={Colors.light.tint} />}
      </Pressable>
    </Animated.View>
  );
}

// Animated item wrapper for fade-out on removal
function AnimatedInventoryItem({ 
  item, 
  onDecrement,
  onIncrement, 
  onConfirm,
  isAnimating = false
}: { 
  item: InventoryItem; 
  onDecrement: (id: string) => void;
  onIncrement: (id: string) => void;
  onConfirm: (id: string) => void;
  isAnimating?: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const days = daysUntil(item.est_expiry_date);
  const isExpired = days < 0;
  const urgency = days === 0 ? 'today' : days === 1 ? 'tomorrow' : days <= 2 && days > 1 ? 'soon' : isExpired ? 'expired' : 'normal';
  const badgeColor =
    urgency === 'today' || urgency === 'expired'
      ? Colors.light.danger
      : urgency === 'tomorrow' || urgency === 'soon'
      ? Colors.light.warning
      : Colors.light.tabIconDefault;
  const badgeBackground = urgency === 'normal' ? Colors.light.cardMuted : `${badgeColor}22`;
  const badgeBorder = urgency === 'normal' ? Colors.light.border : `${badgeColor}55`;

  useEffect(() => {
    if (isAnimating) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isAnimating, fadeAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <SurfaceCard style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">{item.name}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeBackground, borderColor: badgeBorder }]}> 
            <IconSymbol name="clock.fill" size={14} color={badgeColor} />
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>{expiryLabel(days)}</ThemedText>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.quantityGroup}>
            <View style={styles.quantityValueBox}>
              <ThemedText type="title" style={styles.quantityText}>{item.quantity}</ThemedText>
            </View>
            <ThemedText style={[styles.unit]}>{capitalize(item.displayUnit ?? item.baseUnit)}</ThemedText>
          </View>

          <View style={styles.actionsGroup}>
            <AnimatedIconButton name="minus.circle" onPress={() => onDecrement(item.id)} />
            <AnimatedIconButton name="plus.circle" onPress={() => onIncrement(item.id)} />
            <AnimatedIconButton name="trash.fill" onPress={() => onConfirm(item.id)} />
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export function Fridge({ accessToken, onEditQuantity, onConsume, onDelete }: FridgeProps) {
  const palette = Colors.light;
  const { addRefreshListener } = useInventoryRefresh();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    if (!accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching inventory items...');
      const response = await fetchInventoryItems(accessToken);
      console.log('Fetched inventory items:', response.items);
      setItems(response.items);
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Listen for inventory refresh events
  useEffect(() => {
    const removeListener = addRefreshListener(fetchItems);
    return removeListener;
  }, [addRefreshListener, fetchItems]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = new Date(a.est_expiry_date).getTime();
      const db = new Date(b.est_expiry_date).getTime();
      return da - db;
    });
  }, [items]);

  function updateQuantityLocal(itemId: string, newQuantity: number) {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, quantity: Math.max(0, newQuantity) } : it)));
  }

  async function handleIncrement(itemId: string) {
    console.log('Incrementing item:', itemId);
    const target = items.find((i) => i.id === itemId);
    if (!target) {
      console.error('Item not found for increment:', itemId);
      return;
    }
    const newQty = target.quantity + 1;
    updateQuantityLocal(itemId, newQty);
    try { await onEditQuantity?.(itemId, newQty); } catch {}
  }

  async function handleDecrement(itemId: string) {
    console.log('Decrementing item:', itemId);
    const target = items.find((i) => i.id === itemId);
    if (!target) {
      console.error('Item not found for decrement:', itemId);
      return;
    }
    // If going from 1 to 0, treat as discard to capture reason
    if (target.quantity === 1) {
      openConfirm(itemId);
      return;
    }
    const newQty = Math.max(0, target.quantity - 1);
    updateQuantityLocal(itemId, newQty);
    try { await onEditQuantity?.(itemId, newQty); } catch {}
  }

  async function handleUseAll(itemId: string) {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    const delta = target.quantity;
    updateQuantityLocal(itemId, 0);
    try { await onConsume?.(itemId, delta, 'used'); } catch {}
    setAnimatingItems(prev => new Set(prev).add(itemId));
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setAnimatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 300);
  }

  async function handleDiscard(itemId: string) {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    const delta = target.quantity; // discard remaining
    updateQuantityLocal(itemId, 0);
    try { await onConsume?.(itemId, delta, 'discarded'); } catch {}
    setAnimatingItems(prev => new Set(prev).add(itemId));
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setAnimatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 300);
  }

  function openConfirm(itemId: string) {
    setConfirmItemId(itemId);
  }

  function openDetails(itemId: string) {
    setDetailItemId(itemId);
  }

  function renderItem({ item }: { item: InventoryItem }) {
    const isAnimating = animatingItems.has(item.id);
    return (
      <AnimatedInventoryItem
        item={item}
        onDecrement={handleDecrement}
        onIncrement={handleIncrement}
        onConfirm={openConfirm}
        isAnimating={isAnimating}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading your fridge...</ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SurfaceCard style={styles.errorCard}>
          <IconSymbol name="exclamationmark.triangle.fill" size={24} color={Colors.light.danger} />
          <ThemedText style={styles.errorText}>Failed to load inventory</ThemedText>
          <ThemedText style={styles.errorSubtext}>{error}</ThemedText>
          <Pressable onPress={fetchItems} style={styles.retryButton}>
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
        </SurfaceCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Recipes recipes={sampleRecipes} />}
        showsVerticalScrollIndicator={false}
      />
      {confirmItemId && (
        <Modal transparent animationType="fade" visible={!!confirmItemId} onRequestClose={() => setConfirmItemId(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Pressable onPress={() => setConfirmItemId(null)} hitSlop={10} style={({ pressed }) => [styles.modalClose, pressed ? { opacity: 0.75 } : undefined]}> 
                <IconSymbol name="xmark" size={18} color={Colors.light.icon} />
              </Pressable>
              <ThemedText type="subtitle">Before we remove it…</ThemedText>
              <ThemedText style={styles.modalText}>Where&apos;d it end up?</ThemedText>
              <View style={styles.modalActionsRow}>
                <Pressable
                  onPress={() => { const id = confirmItemId; setConfirmItemId(null); if (id) { void handleDiscard(id); } }}
                  style={({ pressed }) => [styles.modalChoiceSmall, styles.modalDiscard, pressed ? { opacity: 0.9 } : undefined]}
                >
                  <IconSymbol name="trash.fill" size={18} color={Colors.light.danger} />
                  <ThemedText style={[styles.modalChoiceText, { color: Colors.light.danger }]}>Trash</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => { const id = confirmItemId; setConfirmItemId(null); if (id) { void handleUseAll(id); } }}
                  style={({ pressed }) => [styles.modalChoiceLarge, styles.modalUsed, pressed ? { opacity: 0.95 } : undefined]}
                >
                  <IconSymbol name="checkmark.circle.fill" size={18} color={Colors.light.success} />
                  <ThemedText style={[styles.modalChoiceText, { color: Colors.light.success }]}>Used it!</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {detailItemId && (
        <Modal transparent animationType="fade" visible={!!detailItemId} onRequestClose={() => setDetailItemId(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Pressable onPress={() => setDetailItemId(null)} hitSlop={10} style={({ pressed }) => [styles.modalClose, pressed ? { opacity: 0.75 } : undefined]}> 
                <IconSymbol name="xmark" size={18} color={Colors.light.icon} />
              </Pressable>
              {(() => {
                const detail = items.find((i) => i.id === detailItemId);
                return (
                  <>
                    <ThemedText type="subtitle">{detail?.name ?? 'Item'}</ThemedText>
                    <ThemedText style={styles.modalText}>Placeholder info</ThemedText>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function IconButton({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed ? { opacity: 0.7 } : undefined]}> 
      <IconSymbol name={name as any} size={22} color={Colors.light.tint} />
    </Pressable>
  );
}

function ActionIcon({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.actionIcon, pressed ? { opacity: 0.7 } : undefined]}> 
      <IconSymbol name={name as any} size={20} color={Colors.light.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 0,
  },
  card: {
    gap: 12,
  },
  placeholderText: {
    fontSize: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtle: {
    color: Colors.light.subtleText,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    // borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityText: {
    minWidth: 24,
    textAlign: 'center',
  },
  quantityValueBox: {
    height: 28,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unit: {
    marginLeft: 4,
    color: Colors.light.subtleText,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    zIndex: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  modalChoiceSmall: {
    flex: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.dangerSurface,
  },
  modalChoiceLarge: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.successSurface,
  },
  modalChoiceText: {
    fontWeight: '700',
  },
  iconButton: {
    padding: 6,
    borderRadius: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: {
    fontWeight: '600',
    fontSize: 12,
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
    borderRadius: 12,
    backgroundColor: Colors.light.card,
    padding: 16,
    gap: 12,
    borderColor: Colors.light.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalText: {
    color: Colors.light.subtleText,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.light.cardMuted,
  },
  modalButtonText: {
    fontWeight: '600',
  },
  modalUsed: {
    backgroundColor: Colors.light.successSurface,
  },
  modalDiscard: {
    backgroundColor: Colors.light.dangerSurface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  loadingText: {
    color: Colors.light.subtleText,
    fontSize: 16,
  },
  errorCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    marginVertical: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.danger,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.light.subtleText,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default Fridge;


