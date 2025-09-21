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
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
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

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(index);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        {pages.map((m, i) => (
          <SurfaceCard key={m.id} style={[styles.card, { width: cardWidth, marginRight: i < pages.length - 1 ? GAP : 0 }]}> 
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
    paddingVertical: 10, // even shorter
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


// import { useMemo, useRef, useState, useCallback } from 'react';
// import {
//   Dimensions,
//   NativeScrollEvent,
//   NativeSyntheticEvent,
//   ScrollView,
//   StyleSheet,
//   View,
//   Pressable,
// } from 'react-native';
// import * as Haptics from 'expo-haptics';

// import { ThemedText } from '@/components/themed-text';
// import { SurfaceCard } from '@/components/ui/surface-card';
// import { Colors } from '@/constants/theme';
// import { IconSymbol } from '@/components/ui/icon-symbol';
// import { useColorScheme } from '@/hooks/use-color-scheme';

// export function Stats() {
//   const theme = useColorScheme() ?? 'light';
//   const palette = Colors[theme];

//   const screenWidth = Dimensions.get('window').width;
//   const horizontalPadding = 20; // matches home content padding
//   const GAP = 12;

//   const cardWidth = useMemo(
//     () => screenWidth - horizontalPadding * 2,
//     [screenWidth]
//   );

//   const [activeIndex, setActiveIndex] = useState(0);
//   const scrollRef = useRef<ScrollView | null>(null);

//   const pages = useMemo(() => [
//     { id: 'items-rescued', label: 'Items rescued (all-time)', value: '8',  helperText: 'Used on their last day — great job!', icon: 'checkmark.seal.fill' as const },
//     { id: 'waste-reduced', label: 'Waste reduced (est.)',     value: '12 lbs', helperText: 'Category heuristics × rescued items', icon: 'leaf.fill' as const },
//     { id: 'active-items',  label: 'Active items',              value: '14', helperText: 'In your pantry & fridge', icon: 'archivebox.fill' as const },
//     { id: 'due-soon',      label: 'Due soon (next 3 days)',    value: '3',  helperText: 'We’ll nudge at lunch/dinner', icon: 'clock.fill' as const },
//   ], []);

//   const itemSpan = cardWidth + GAP;

//   const handleMomentumEnd = useCallback(
//     (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//       const index = Math.round(e.nativeEvent.contentOffset.x / itemSpan);
//       setActiveIndex(index);
//     },
//     [itemSpan]
//   );

//   const scrollToIndex = useCallback(
//     (index: number) => {
//       scrollRef.current?.scrollTo({ x: index * itemSpan, animated: true });
//     },
//     [itemSpan]
//   );

//   const handleCardPress = useCallback(async () => {
//     // smooth, subtle haptic
//     await Haptics.selectionAsync();
//     const next = (activeIndex + 1) % pages.length;
//     setActiveIndex(next);           // update dots immediately
//     scrollToIndex(next);            // animate carousel
//   }, [activeIndex, pages.length, scrollToIndex]);

//   return (
//     <View style={styles.container}>
//       <ScrollView
//         ref={scrollRef}
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         snapToInterval={itemSpan}
//         snapToAlignment="start"
//         decelerationRate="fast"
//         disableIntervalMomentum
//         onMomentumScrollEnd={handleMomentumEnd}
//         contentContainerStyle={{ paddingHorizontal: 0 }}
//       >
//         {pages.map((m, i) => (
//           <SurfaceCard
//             key={m.id}
//             style={[
//               styles.card,
//               { width: cardWidth, marginRight: i < pages.length - 1 ? GAP : 0 },
//             ]}
//           >
//             <Pressable
//               onPress={handleCardPress}
//               android_ripple={{ borderless: true }}
//               accessibilityRole="button"
//               accessibilityLabel={`${m.label}. Tap to see next stat.`}
//               style={{ flex: 1 }}
//             >
//               <View style={styles.row}>
//                 <IconSymbol name={m.icon} size={20} color={palette.tint} />
//                 <ThemedText style={[styles.metricLabel, { color: palette.subtleText }]}>
//                   {m.label}
//                 </ThemedText>
//               </View>
//               <ThemedText type="title">{m.value}</ThemedText>
//               {!!m.helperText && (
//                 <ThemedText style={{ color: palette.subtleText }}>
//                   {m.helperText}
//                 </ThemedText>
//               )}
//             </Pressable>
//           </SurfaceCard>
//         ))}
//       </ScrollView>

//       <View style={styles.dots}>
//         {pages.map((_, i) => (
//           <View
//             key={i}
//             accessibilityLabel={`page ${i + 1}`}
//             style={[
//               styles.dot,
//               {
//                 backgroundColor: i === activeIndex ? palette.tint : palette.tabIconDefault,
//                 opacity: i === activeIndex ? 1 : 0.45,
//               },
//             ]}
//           />
//         ))}
//       </View>
//     </View>
//   );
// }

// export default Stats;

// const styles = StyleSheet.create({
//   container: { gap: 8 },
//   card: { paddingVertical: 10 },
//   row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   metricLabel: { fontSize: 14 },
//   dots: { alignSelf: 'center', flexDirection: 'row', gap: 8, marginTop: 2 },
//   dot: { width: 8, height: 8, borderRadius: 4 },
// });
