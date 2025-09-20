import { useCallback, useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { PostCard } from '@/components/ui/post-card';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MetricTile } from '@/components/ui/metric-tile';
import { Colors } from '@/constants/theme';
import { allergenFriendlyFilters, fallbackHeroMessages } from '@/constants/mock-data';
import { QuickPostComposer } from '@/components/home/quick-post-composer';
import { usePostings } from '@/hooks/use-postings';
import { useImpactMetrics } from '@/hooks/use-impact-metrics';
import { useNudges } from '@/hooks/use-nudges';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationCard } from '@/components/account/notification-card';

import { AiNudge } from '@/types/nudge';

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);
}

export default function HomeScreen() {
  const palette = Colors.light;
  const greeting = useGreeting();
  const { postings, loading, error, refresh } = usePostings();
  const [refreshing, setRefreshing] = useState(false);
  const nudgeParams = useMemo(() => ({ persona: 'Alex', focus: 'sustainable food sharing', count: 4 }), []);
  const { nudges, source: nudgeSource, loading: nudgesLoading, refresh: refreshNudges } = useNudges(nudgeParams);
  const { metrics, source: metricsSource, loading: metricsLoading, refresh: refreshMetrics } = useImpactMetrics();
  const {
    notifications,
    shareRatePercent,
    loading: notificationsLoading,
    refresh: refreshNotifications,
  } = useNotifications();
  const [activeNudgeIndex, setActiveNudgeIndex] = useState(0);

  const heroNudge: AiNudge = nudges[activeNudgeIndex % (nudges.length || 1)] ?? fallbackHeroMessages[0];
  const supportingNudges = nudges
    .filter((nudge) => nudge.id !== heroNudge.id)
    .slice(0, 2);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshMetrics(), refreshNudges(), refreshNotifications()]);
    setRefreshing(false);
  }, [refresh, refreshMetrics, refreshNudges, refreshNotifications]);

  const handleNextNudge = useCallback(() => {
    setActiveNudgeIndex((prev) => (nudges.length > 0 ? (prev + 1) % nudges.length : prev));
  }, [nudges.length]);

  useEffect(() => {
    if (activeNudgeIndex >= nudges.length && nudges.length > 0) {
      setActiveNudgeIndex(0);
    }
  }, [activeNudgeIndex, nudges.length]);

  const handlePostCreated = useCallback(async () => {
    await refresh();
    await refreshMetrics();
  }, [refresh, refreshMetrics]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title">Leftys</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>
              {greeting}, Alex. Thanks for keeping food out of the bin.
            </ThemedText>
            <Pill tone="info" compact iconName="megaphone.fill">
              {shareRatePercent ? `${shareRatePercent}% neighbors shared this week` : 'Share to unlock nudges'}
            </Pill>
          </View>
          <Pill tone="brand" iconName="sparkles" compact>
            Nearby radius · 2 km
          </Pill>
        </View>

        <SurfaceCard tone="highlight" style={styles.heroCard} onPress={handleNextNudge}>
          <Pill tone="brand" iconName="heart.fill" compact>
            Tap to refresh your nudge
          </Pill>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            {heroNudge.headline}
          </ThemedText>
          <ThemedText style={{ color: palette.subtleText }}>{heroNudge.supportingCopy}</ThemedText>

          {nudgesLoading ? (
            <View style={styles.nudgeLoading}>
              <ActivityIndicator size="small" color={palette.tint} />
              <ThemedText style={{ color: palette.subtleText }}>Fetching Gemini nudges…</ThemedText>
            </View>
          ) : null}

          {supportingNudges.map((prompt, index) => (
            <View key={prompt.id} style={styles.promptRow}>
              <View style={[styles.promptIcon, { backgroundColor: palette.card }]}>
                <IconSymbol
                  name={index === 0 ? 'clock.fill' : 'mappin.circle.fill'}
                  size={18}
                  color={palette.success}
                />
              </View>
              <View style={styles.promptCopy}>
                <ThemedText type="defaultSemiBold">{prompt.headline}</ThemedText>
                <ThemedText style={[styles.promptText, { color: palette.subtleText }]}>
                  {prompt.supportingCopy}
                </ThemedText>
              </View>
              <Pill tone="brand" compact>
                {prompt.defaultLabel}
              </Pill>
            </View>
          ))}

          <Pill tone={nudgeSource === 'live' ? 'success' : 'info'} compact iconName="sparkles">
            {nudgeSource === 'live' ? 'Gemini powered' : 'Sample nudges'}
          </Pill>
        </SurfaceCard>

        {notificationsLoading && notifications.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.tint} />
            <ThemedText style={{ color: palette.subtleText }}>Loading smart nudges…</ThemedText>
          </View>
        ) : null}

        {notifications.length > 0 ? <NotificationCard notification={notifications[0]} /> : null}

        <QuickPostComposer onPostCreated={handlePostCreated} />

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
            <Pill
              tone={metricsSource === 'live' ? 'success' : 'info'}
              compact
              iconName={metricsSource === 'live' ? 'checkmark.seal.fill' : 'sparkles'}>
              {metricsSource === 'live' ? 'Live from MongoDB' : 'Sample metrics'}
            </Pill>
          </View>
          <View style={styles.metricsGrid}>
            {metrics.map((metric) => (
              <View key={metric.id} style={styles.metricWrapper}>
                <MetricTile metric={metric} />
              </View>
            ))}
          </View>
        </SurfaceCard>

        {error ? (
          <SurfaceCard tone="warning" style={styles.errorCard}>
            <ThemedText type="subtitle">We couldn&apos;t refresh postings</ThemedText>
            <ThemedText style={{ color: palette.subtleText }}>
              {error}. Pull to refresh to try again once you&apos;re back online.
            </ThemedText>
          </SurfaceCard>
        ) : null}

        {loading || metricsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.tint} />
            <ThemedText style={{ color: palette.subtleText }}>Loading nearby postings…</ThemedText>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Open postings in your orbit</ThemedText>
          <Pill tone="info" compact iconName="bell.fill">
            Nudging {postings.length} givers
          </Pill>
        </View>
        <View style={styles.postsList}>
          {postings.map((post) => (
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
  nudgeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  loadingState: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  safetyCard: {
    gap: 12,
  },
  errorCard: {
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
