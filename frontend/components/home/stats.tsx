import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useImpactMetrics } from '@/hooks/use-impact-metrics';
import { useAuthContext } from '@/context/AuthContext';
import { useInventoryRefresh } from '@/context/InventoryRefreshContext';
import { API_BASE_URL } from '@/utils/env';

export function Stats() {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 20; // matches home content padding
  const GAP = 12;
  const cardWidth = useMemo(() => screenWidth - horizontalPadding * 2, [screenWidth]);
  const itemWidth = cardWidth + GAP;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const lastOffsetXRef = useRef(0);
  const { addRefreshListener } = useInventoryRefresh();

  // Get real impact metrics from the database
  const { metrics: impactMetrics, loading: impactLoading } = useImpactMetrics();
  const { accessToken } = useAuthContext();
  
  // State for additional inventory stats
  const [inventoryStats, setInventoryStats] = useState({
    activeItems: 0,
    dueSoonItems: 0,
    loading: true
  });

  // Fetch inventory stats
  const fetchInventoryStats = useCallback(async () => {
    if (!accessToken) {
      setInventoryStats({ activeItems: 0, dueSoonItems: 0, loading: false });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        const activeItems = items.length;
        const dueSoonItems = items.filter((item: any) => {
          const expiryDate = new Date(item.est_expiry_date);
          return expiryDate <= threeDaysFromNow && expiryDate >= now;
        }).length;
        
        setInventoryStats({ activeItems, dueSoonItems, loading: false });
      } else {
        setInventoryStats({ activeItems: 0, dueSoonItems: 0, loading: false });
      }
    } catch (error) {
      setInventoryStats({ activeItems: 0, dueSoonItems: 0, loading: false });
    }
  }, [accessToken]);

  // Fetch stats when component mounts
  useEffect(() => {
    fetchInventoryStats();
  }, [fetchInventoryStats]);

  // Refresh stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchInventoryStats();
    }, [fetchInventoryStats])
  );

  // Listen for inventory changes
  useEffect(() => {
    const handleInventoryChange = () => {
      fetchInventoryStats();
    };

    const removeListener = addRefreshListener(handleInventoryChange);
    return removeListener;
  }, [fetchInventoryStats, addRefreshListener]);

  const pages = useMemo(() => {
    // Combine impact metrics with inventory stats
    const stats = [
      ...(impactMetrics || []),
      {
        id: 'active-items',
        label: 'Active items',
        value: inventoryStats.loading ? '...' : inventoryStats.activeItems.toString(),
        helperText: 'In your pantry & fridge',
        icon: 'archivebox.fill' as const,
      },
      {
        id: 'due-soon',
        label: 'Due soon (next 3 days)',
        value: inventoryStats.loading ? '...' : inventoryStats.dueSoonItems.toString(),
        helperText: 'We\'ll nudge at lunch/dinner',
        icon: 'clock.fill' as const,
      },
    ];
    
    return stats;
  }, [impactMetrics, inventoryStats]);

  // Build looped pages: [last, ...pages, first]
  const carouselItems = useMemo(() => {
    if (!pages.length) return [] as typeof pages;
    const first = pages[0];
    const last = pages[pages.length - 1];
    return [last, ...pages, first];
  }, [pages]);

  // Jump to the first real item on mount/when data changes
  useEffect(() => {
    if (!scrollRef.current || pages.length === 0) return;
    const x = itemWidth; // index 1 (first real)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x, animated: false });
      lastOffsetXRef.current = x;
    });
  }, [itemWidth, pages.length]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetX = e.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / itemWidth); // index in carouselItems

    // If we hit the clones, jump without animation to the mirrored real item
    if (pageIndex === 0) {
      // jumped to leading clone → go to last real item
      const x = itemWidth * pages.length;
      scrollRef.current?.scrollTo({ x, animated: false });
      lastOffsetXRef.current = x;
      setActiveIndex(pages.length - 1);
      return;
    }
    if (pageIndex === pages.length + 1) {
      // jumped to trailing clone → go to first real item
      const x = itemWidth; // index 1
      scrollRef.current?.scrollTo({ x, animated: false });
      lastOffsetXRef.current = x;
      setActiveIndex(0);
      return;
    }

    // Normal case
    const realIndex = pageIndex - 1;
    setActiveIndex(realIndex);
    lastOffsetXRef.current = offsetX;
  }

  const handleAdvance = useCallback(() => {
    if (!scrollRef.current) return;
    const nextOffset = lastOffsetXRef.current + itemWidth;
    scrollRef.current.scrollTo({ x: nextOffset, animated: true });
  }, [itemWidth]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        {carouselItems.map((m, i) => (
          <SurfaceCard key={`${m.id}-${i}`} onPress={handleAdvance} style={[styles.card, { width: cardWidth, marginRight: i < carouselItems.length - 1 ? GAP : 0 }]}> 
            <View style={styles.row}>
              <IconSymbol name={m.icon} size={20} color={palette.tint} />
              <ThemedText style={[styles.metricLabel, { color: palette.subtleText }]}>{m.label}</ThemedText>
            </View>
            <ThemedText type="title">{m.value}</ThemedText>
            {!!m.helperText && (
              <ThemedText style={{ color: palette.subtleText }}>{m.helperText}</ThemedText>
            )}
          </SurfaceCard>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {pages.map((_, i) => (
          <View
            key={i}
            accessibilityLabel={`page ${i + 1}`}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? palette.tint : palette.tabIconDefault,
                opacity: i === activeIndex ? 1 : 0.45,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default Stats;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  card: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontSize: 14,
  },
  dots: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});