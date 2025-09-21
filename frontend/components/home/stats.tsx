import { useMemo, useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Stats() {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 20; // matches home content padding
  const GAP = 12;
  const cardWidth = useMemo(() => screenWidth - horizontalPadding * 2, [screenWidth]);
  const [virtualIndex, setVirtualIndex] = useState(1); // account for leading clone
  const scrollRef = useRef<ScrollView | null>(null);
  
  const basePages = useMemo(() => {
    // Tailored to MVP personal inventory goals (no neighborhood sharing)
    return [
      {
        id: 'items-rescued',
        label: 'Items rescued (all‑time)',
        value: '8',
        helperText: 'Used on their last day — great job!',
        icon: 'checkmark.seal.fill' as const,
      },
      {
        id: 'waste-reduced',
        label: 'Waste reduced (est.)',
        value: '12 lbs',
        helperText: 'Category heuristics × rescued items',
        icon: 'leaf.fill' as const,
      },
      {
        id: 'active-items',
        label: 'Active items',
        value: '14',
        helperText: 'In your pantry & fridge',
        icon: 'archivebox.fill' as const,
      },
      {
        id: 'due-soon',
        label: 'Due soon (next 3 days)',
        value: '3',
        helperText: 'We’ll nudge at lunch/dinner',
        icon: 'clock.fill' as const,
      },
    ];
  }, []);

  const pages = useMemo(() => {
    if (basePages.length === 0) return [] as typeof basePages;
    const head = basePages[0];
    const tail = basePages[basePages.length - 1];
    return [
      { ...tail, id: `${tail.id}__clone_head` },
      ...basePages,
      { ...head, id: `${head.id}__clone_tail` },
    ];
  }, [basePages]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    const lastVirtual = basePages.length + 1; // includes trailing clone
    if (index === 0) {
      // jumped to leading clone -> snap (no animation) to last real
      const target = basePages.length;
      scrollRef.current?.scrollTo({ x: target * (cardWidth + GAP), y: 0, animated: false });
      setVirtualIndex(target);
    } else if (index === lastVirtual) {
      // jumped to trailing clone -> snap (no animation) to first real
      scrollRef.current?.scrollTo({ x: 1 * (cardWidth + GAP), y: 0, animated: false });
      setVirtualIndex(1);
    } else {
      setVirtualIndex(index);
    }
  }

  function scrollToIndex(nextIndex: number) {
    const totalVirtual = basePages.length + 2; // with two clones
    if (totalVirtual === 0) return;
    const clamped = Math.max(0, Math.min(nextIndex, totalVirtual - 1));
    const x = clamped * (cardWidth + GAP);
    scrollRef.current?.scrollTo({ x, y: 0, animated: true });
    setActiveIndex(clamped);
  }

  const setActiveIndex = (vi: number) => {
    setVirtualIndex(vi);
  };

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
        contentOffset={{ x: (cardWidth + GAP) * 1, y: 0 }}
      >
        {pages.map((m, i) => (
          <SurfaceCard
            key={m.id}
            onPress={() => scrollToIndex(virtualIndex + 1)}
            style={[styles.card, { width: cardWidth, marginRight: i < pages.length - 1 ? GAP : 0 }]}
          > 
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
        {basePages.map((_, i) => (
          <View
            key={i}
            accessibilityLabel={`page ${i + 1}`}
            style={[
              styles.dot,
              {
                backgroundColor: i === ((virtualIndex - 1 + basePages.length) % basePages.length) ? palette.tint : palette.tabIconDefault,
                opacity: i === ((virtualIndex - 1 + basePages.length) % basePages.length) ? 1 : 0.45,
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
