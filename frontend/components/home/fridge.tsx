import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Modal, FlatList, Pressable, StyleSheet, View, RefreshControl, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { API_BASE_URL } from '@/utils/env';
import { useInventoryRefresh } from '@/context/InventoryRefreshContext';

// TODO: make sure that this data makes sense
type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
//   NOTE: base unit and display unit may differ? This can change
  baseUnit: 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'L' | 'pieces';
  displayUnit?: string; // e.g., 'tub', 'carton', 'clamshell'
  unitsPerDisplay?: number; // how many base units per display unit
  input_date: string; // ISO
  est_expiry_date: string; // ISO
};

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

// Animated item component that can use hooks
function AnimatedInventoryItem({ 
  item, 
  onDecrement, 
  onConfirm,
  isAnimating = false
}: { 
  item: InventoryItem; 
  onDecrement: (id: string) => void;
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
  
  // Trigger fade out animation when item is marked for removal
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
            <AnimatedIconButton name="minus.circle" onPress={() => onDecrement(item.id)} />
            <View style={styles.quantityValueBox}>
              <ThemedText type="title" style={styles.quantityText}>{item.quantity}</ThemedText>
            </View>
            <ThemedText style={[styles.unit]}>{capitalize(item.displayUnit ?? item.baseUnit)}</ThemedText>
          </View>

          <View style={styles.actionsGroup}>
            {/* Single remove icon opens confirmation to choose Used vs Discarded */}
            <AnimatedIconButton name="trash.fill" onPress={() => onConfirm(item.id)} />
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export function Fridge({ accessToken, onEditQuantity, onConsume, onDelete }: FridgeProps) {
  const palette = Colors.light;
  const { triggerRefresh } = useInventoryRefresh();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  // Fetch real inventory data from API
  const fetchInventory = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      // Fallback to empty array on error
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory when component mounts or accessToken changes
  useEffect(() => {
    fetchInventory();
  }, [accessToken]);

  // Refresh inventory when user performs actions
  const refreshInventory = useCallback(async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  }, []);

  // Refresh inventory when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [])
  );

  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);

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


  async function handleDecrement(itemId: string) {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    
    // Add satisfying haptic feedback like Duolingo
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newQty = Math.max(0, target.quantity - 1);
    updateQuantityLocal(itemId, newQty);
    
    try { 
      // Always consume 1 item when decrementing (treat as "used")
      await onConsume?.(itemId, 1, 'used');
      
      // If quantity reaches 0, animate item out
      if (newQty === 0) {
        // Add to animating items for fade out
        setAnimatingItems(prev => new Set(prev).add(itemId));
        
        // Extra satisfying haptic when item is completely used up
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Delay removal to allow animation to complete
        setTimeout(() => {
          setItems((prev) => prev.filter((i) => i.id !== itemId));
          setAnimatingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }, 300);
      }
      
      // Refresh inventory to get latest data from server
      refreshInventory();
      // Notify other components of inventory change
      triggerRefresh();
    } catch (error) {
      console.error('Error decrementing item:', error);
    }
  }

  async function handleUse(itemId: string) {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    
    // Satisfying haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const delta = target.quantity; // Use all remaining quantity
    updateQuantityLocal(itemId, 0);
    
    // Add to animating items for fade out
    setAnimatingItems(prev => new Set(prev).add(itemId));
    
    try { 
      await onConsume?.(itemId, delta, 'used');
      // Success haptic when item is used up
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Delay removal to allow animation to complete
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setAnimatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 300);
      
      // Refresh inventory to get latest data from server
      refreshInventory();
      // Notify other components of inventory change
      triggerRefresh();
    } catch (error) {
      console.error('Error using item:', error);
    }
  }

  async function handleUseAll(itemId: string) {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    
    // Satisfying haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const delta = target.quantity;
    updateQuantityLocal(itemId, 0);
    
    // Add to animating items for fade out
    setAnimatingItems(prev => new Set(prev).add(itemId));
    
    try { 
      await onConsume?.(itemId, delta, 'used');
      // Success haptic when item is used up
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Delay removal to allow animation to complete
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setAnimatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 300);
      
      // Refresh inventory to get latest data from server
      refreshInventory();
      // Notify other components of inventory change
      triggerRefresh();
    } catch (error) {
      console.error('Error using all items:', error);
    }
  }

  async function handleDiscard(itemId: string) {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    
    // Different haptic for discard (warning feel)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const delta = target.quantity; // discard remaining
    updateQuantityLocal(itemId, 0);
    
    // Add to animating items for fade out
    setAnimatingItems(prev => new Set(prev).add(itemId));
    
    try { 
      await onConsume?.(itemId, delta, 'discarded');
      // Warning haptic for discard
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      // Delay removal to allow animation to complete
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setAnimatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 300);
      
      // Refresh inventory to get latest data from server
      refreshInventory();
      // Notify other components of inventory change
      triggerRefresh();
    } catch (error) {
      console.error('Error discarding item:', error);
    }
  }

  async function handleDelete(itemId: string) {
    // Haptic feedback for delete
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Add to animating items for fade out
    setAnimatingItems(prev => new Set(prev).add(itemId));
    
    try { 
      await onDelete?.(itemId);
      // Success haptic for successful delete
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Delay removal to allow animation to complete
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setAnimatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 300);
      
      // Refresh inventory to get latest data from server
      refreshInventory();
      // Notify other components of inventory change
      triggerRefresh();
    } catch {}
  }

  function openConfirm(itemId: string) {
    setConfirmItemId(itemId);
  }

  function renderItem({ item }: { item: InventoryItem }) {
    const isAnimating = animatingItems.has(item.id);
    return (
      <AnimatedInventoryItem
        item={item}
        onDecrement={handleDecrement}
        onConfirm={openConfirm}
        isAnimating={isAnimating}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText>Loading inventory...</ThemedText>
      </View>
    );
  }

  if (sorted.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <ThemedText style={styles.emptyTitle}>Your fridge is empty</ThemedText>
        <ThemedText style={styles.emptySubtitle}>Add some food items to get started!</ThemedText>
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshInventory}
            tintColor={Colors.light.tint}
          />
        }
      />
      {confirmItemId && (
        <Modal transparent animationType="fade" visible={!!confirmItemId} onRequestClose={() => setConfirmItemId(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Pressable onPress={() => setConfirmItemId(null)} hitSlop={10} style={({ pressed }) => [styles.modalClose, pressed ? { opacity: 0.75 } : undefined]}> 
                <IconSymbol name="xmark" size={18} color={Colors.light.icon} />
              </Pressable>
              <ThemedText type="subtitle">Before we remove it…</ThemedText>
              <ThemedText style={styles.modalText}>Where'd it end up?</ThemedText>
              <View style={styles.modalActionsRow}>
                <AnimatedIconButton
                  name="trash.fill"
                  onPress={() => { const id = confirmItemId; setConfirmItemId(null); if (id) { void handleDiscard(id); } }}
                  style={[styles.modalChoiceSmall, styles.modalDiscard]}
                >
                  <ThemedText style={[styles.modalChoiceText, { color: Colors.light.danger }]}>Trash</ThemedText>
                </AnimatedIconButton>
                <AnimatedIconButton
                  name="checkmark.circle.fill"
                  onPress={() => { const id = confirmItemId; setConfirmItemId(null); if (id) { void handleUseAll(id); } }}
                  style={[styles.modalChoiceLarge, styles.modalUsed]}
                >
                  <ThemedText style={[styles.modalChoiceText, { color: Colors.light.success }]}>Used it!</ThemedText>
                </AnimatedIconButton>
              </View>
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
    gap: 12,
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
    paddingBottom: 8,
  },
  card: {
    gap: 12,
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
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.light.subtleText,
    textAlign: 'center',
  },
});

export default Fridge;


