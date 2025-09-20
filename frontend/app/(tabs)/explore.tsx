import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { PostCard } from '@/components/ui/post-card';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { demoPostings } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

const mapPins = [
  { top: '18%', left: '72%' },
  { top: '52%', left: '36%' },
  { top: '70%', left: '18%' },
];

const discoveryFilters = [
  { label: '≤ 2 km', tone: 'brand' as const, icon: 'map.fill' },
  { label: 'Quick pickup', tone: 'info' as const, icon: 'clock.fill' },
  { label: 'Allergen friendly', tone: 'brand' as const, icon: 'sparkles' },
];

export default function ExploreScreen() {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <ThemedText type="title">Discover nearby</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>
            Browse the map-first view to claim sealed extras while keeping locations private until accepted.
          </ThemedText>
        </View>

        <SurfaceCard tone="info" style={styles.mapCard}>
          <View style={[styles.mapPreview, { backgroundColor: palette.backgroundMuted }]}> 
            <View style={styles.mapGrid}>
              {[...Array(3)].map((_, index) => (
                <View key={`grid-h-${index}`} style={[styles.gridLine, { top: `${(index + 1) * 25}%` }]} />
              ))}
              {[...Array(3)].map((_, index) => (
                <View key={`grid-v-${index}`} style={[styles.gridLineVertical, { left: `${(index + 1) * 25}%` }]} />
              ))}
              {mapPins.map((pin, index) => (
                <View
                  key={`pin-${index}`}
                  style={[styles.pin, { top: pin.top, left: pin.left, backgroundColor: palette.tint }]}>
                  <IconSymbol name="sparkles" size={16} color="#ffffff" />
                </View>
              ))}
            </View>
          </View>
          <Pill tone="info" iconName="map.fill" compact>
            Showing approximate pins until a claim is accepted
          </Pill>
        </SurfaceCard>

        <SurfaceCard tone="highlight" style={styles.planningCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Plan before you claim</ThemedText>
            <Pill tone="brand" compact iconName="clock.fill">
              Recommended default
            </Pill>
          </View>
          <View style={styles.bulletRow}>
            <IconSymbol name="clock.fill" size={18} color={palette.success} />
            <ThemedText style={[styles.bulletCopy, { color: palette.subtleText }]}>
              Choose a 30-minute pickup window so the giver knows you&apos;re on the way.
            </ThemedText>
          </View>
          <View style={styles.bulletRow}>
            <IconSymbol name="bell.fill" size={18} color={palette.success} />
            <ThemedText style={[styles.bulletCopy, { color: palette.subtleText }]}>
              Turn on reminders 15 minutes before pickup to stay on track.
            </ThemedText>
          </View>
          <Pill tone="brand" compact>
            Set reminder · 15 minutes before
          </Pill>
        </SurfaceCard>

        <SurfaceCard tone="default" style={styles.filterCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Smart filters</ThemedText>
            <Pill tone="brand" compact iconName="sparkles">
              Pre-selected for you
            </Pill>
          </View>
          <View style={styles.filterRow}>
            {discoveryFilters.map((filter) => (
              <Pill key={filter.label} tone={filter.tone} iconName={filter.icon} compact>
                {filter.label}
              </Pill>
            ))}
          </View>
          <ThemedText style={[styles.filterHelper, { color: palette.subtleText }]}>
            Adjust filters anytime to include allergen details or extend the search radius.
          </ThemedText>
        </SurfaceCard>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Trending handoffs</ThemedText>
          <Pill tone="info" compact iconName="person.3.fill">
            {demoPostings.length} neighbors ready
          </Pill>
        </View>
        <View style={styles.postsList}>
          {demoPostings.map((post) => (
            <PostCard key={`explore-${post.id}`} post={post} />
          ))}
        </View>

        <SurfaceCard tone="warning" style={styles.footerCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Pickups stay public, never private</ThemedText>
            <Pill tone="warning" compact iconName="checkmark.seal.fill">
              Safety cue
            </Pill>
          </View>
          <ThemedText style={[styles.footerCopy, { color: palette.subtleText }]}>
            Meet at well-lit, public spots and keep communication inside the app. If something feels off, use the report option so
            moderators can step in.
          </ThemedText>
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
  heroHeader: {
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  mapCard: {
    gap: 16,
  },
  mapPreview: {
    borderRadius: 24,
    height: 220,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mapGrid: {
    flex: 1,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  pin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planningCard: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bulletCopy: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  filterCard: {
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterHelper: {
    fontSize: 14,
    lineHeight: 20,
  },
  postsList: {
    gap: 16,
  },
  footerCard: {
    gap: 12,
  },
  footerCopy: {
    fontSize: 14,
    lineHeight: 20,
  },
});
