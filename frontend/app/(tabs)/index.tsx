import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { PostCard } from '@/components/ui/post-card';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MetricTile } from '@/components/ui/metric-tile';
import { Colors } from '@/constants/theme';
import {
  allergenFriendlyFilters,
  demoPostings,
  impactMetrics,
  pickupPrompts,
} from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);
}

export default function HomeScreen() {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];
  const greeting = useGreeting();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title">Leftys</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>
              {greeting}, Alex. Thanks for keeping food out of the bin.
            </ThemedText>
          </View>
          <Pill tone="brand" iconName="sparkles" compact>
            Nearby radius · 2 km
          </Pill>
        </View>

        <SurfaceCard tone="highlight" style={styles.heroCard}>
          <Pill tone="brand" iconName="heart.fill" compact>
            Today&apos;s nudge
          </Pill>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            Quick pickups start with clear defaults
          </ThemedText>
          <ThemedText style={{ color: palette.subtleText }}>
            Set your pickup window and handoff spot upfront—we&apos;ll ping verified neighbors who prefer swift exchanges.
          </ThemedText>

          {pickupPrompts.map((prompt, index) => (
            <View key={prompt.id} style={styles.promptRow}>
              <View style={[styles.promptIcon, { backgroundColor: palette.card }]}> 
                <IconSymbol
                  name={index === 0 ? 'clock.fill' : 'mappin.circle.fill'}
                  size={18}
                  color={palette.success}
                />
              </View>
              <View style={styles.promptCopy}>
                <ThemedText type="defaultSemiBold">{prompt.title}</ThemedText>
                <ThemedText style={[styles.promptText, { color: palette.subtleText }]}>
                  {prompt.supportingCopy}
                </ThemedText>
              </View>
              <Pill tone="brand" compact>
                {prompt.defaultLabel}
              </Pill>
            </View>
          ))}
        </SurfaceCard>

        <View style={styles.quickActions}>
          <SurfaceCard tone="success" style={styles.quickActionCard}>
            <View style={styles.quickIconRow}>
              <IconSymbol name="sparkles" size={24} color={palette.success} />
              <Pill tone="brand" compact>
                Average pickup: 22 min
              </Pill>
            </View>
            <ThemedText type="subtitle">Post a surplus item</ThemedText>
            <ThemedText style={[styles.quickCopy, { color: palette.subtleText }]}>
              Snap a photo, list sealed items, and default to a 30-minute window so neighbors can respond immediately.
            </ThemedText>
          </SurfaceCard>

          <SurfaceCard tone="info" style={styles.quickActionCard}>
            <View style={styles.quickIconRow}>
              <IconSymbol name="map.fill" size={24} color={palette.info} />
              <Pill tone="info" compact>
                Map-first discovery
              </Pill>
            </View>
            <ThemedText type="subtitle">Claim something nearby</ThemedText>
            <ThemedText style={[styles.quickCopy, { color: palette.subtleText }]}>
              Hold one active claim at a time. We&apos;ll reveal exact pickup spots once the giver accepts.
            </ThemedText>
          </SurfaceCard>
        </View>

        <SurfaceCard tone="default" style={styles.metricSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Impact nudges</ThemedText>
            <Pill tone="brand" compact iconName="heart.fill">
              Keep the streak alive
            </Pill>
          </View>
          <View style={styles.metricsGrid}>
            {impactMetrics.map((metric) => (
              <View key={metric.id} style={styles.metricWrapper}>
                <MetricTile metric={metric} />
              </View>
            ))}
          </View>
        </SurfaceCard>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Open postings in your orbit</ThemedText>
          <Pill tone="info" compact iconName="bell.fill">
            Nudging {demoPostings.length} givers
          </Pill>
        </View>
        <View style={styles.postsList}>
          {demoPostings.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </View>

        <SurfaceCard tone="warning" style={styles.safetyCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Safety & privacy defaults</ThemedText>
            <Pill tone="warning" compact iconName="checkmark.seal.fill">
              Policy reminder
            </Pill>
          </View>
          <ThemedText style={[styles.safetyText, { color: palette.subtleText }]}>
            Share packaged or sealed food only. Exact locations stay hidden until you accept a claim. Encourage public pickup spots
            like library entrances or grocery lobbies.
          </ThemedText>
          <View style={styles.filterRow}>
            {allergenFriendlyFilters.map((filter) => (
              <Pill key={filter} tone="brand" compact>
                {filter}
              </Pill>
            ))}
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
  },
  heroCard: {
    gap: 16,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptCopy: {
    flex: 1,
    gap: 4,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  quickActionCard: {
    flex: 1,
    minWidth: 220,
    gap: 12,
  },
  quickIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickCopy: {
    fontSize: 15,
    lineHeight: 22,
  },
  metricSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricWrapper: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  postsList: {
    gap: 16,
  },
  safetyCard: {
    gap: 12,
  },
  safetyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
