import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { PostCard } from '@/components/ui/post-card';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { usePostings } from '@/hooks/use-postings';
import { Posting } from '@/types/posting';
import { getMapsConfigErrorMessage } from '@/utils/maps-config';

const DEFAULT_REGION: Region = {
  latitude: 39.9526,
  longitude: -75.1652,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function createRegionFromPosting(posting: Posting): Region {
  if (!posting.coordinates) {
    return DEFAULT_REGION;
  }

  return {
    latitude: posting.coordinates.latitude,
    longitude: posting.coordinates.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };
}

export default function ExploreScreen() {
  const palette = Colors.light;
  const { postings, loading, error, refresh } = usePostings();
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // Check for Google Maps configuration issues
  const mapsConfigError = getMapsConfigErrorMessage();

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationDenied(true);
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setUserRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    })();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const mapRegion = useMemo(() => {
    if (userRegion) {
      return userRegion;
    }
    const firstWithCoordinates = postings.find((posting) => posting.coordinates);
    if (firstWithCoordinates) {
      return createRegionFromPosting(firstWithCoordinates);
    }
    return DEFAULT_REGION;
  }, [userRegion, postings]);

  const mapKey = `${mapRegion.latitude.toFixed(3)}-${mapRegion.longitude.toFixed(3)}`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <ThemedText type="title">Discover nearby</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>
            Browse the map-first view to claim sealed extras while keeping locations private until accepted.
          </ThemedText>
        </View>

        <SurfaceCard tone="info" style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <ThemedText type="subtitle">Live neighborhood map</ThemedText>
            <Pill tone="info" iconName="map.fill" compact>
              Showing approximate pins until a claim is accepted
            </Pill>
          </View>
          <View style={styles.mapPreview}>
            <MapView
              key={mapKey}
              style={StyleSheet.absoluteFill}
              initialRegion={mapRegion}
              showsUserLocation={!locationDenied}
              provider={PROVIDER_GOOGLE}
              customMapStyle={LIGHT_MAP_STYLE}
              showsPointsOfInterest={false}
            >
              {postings
                .filter((posting) => posting.coordinates)
                .map((posting) => (
                  <Marker
                    key={posting.id}
                    coordinate={{
                      latitude: posting.coordinates!.latitude,
                      longitude: posting.coordinates!.longitude,
                    }}
                    title={posting.title}
                    description={posting.pickupLocationHint}
                  />
                ))}
            </MapView>
          </View>
          {locationDenied ? (
            <Pill tone="warning" iconName="location.slash" compact>
              Enable location to center the map around you
            </Pill>
          ) : null}
        </SurfaceCard>

        {error || mapsConfigError ? (
          <SurfaceCard tone="warning" style={styles.errorCard}>
            <ThemedText type="subtitle">
              {mapsConfigError?.title || 'We can&apos;t load the map data'}
            </ThemedText>
            <ThemedText style={{ color: palette.subtleText }}>
              {mapsConfigError?.message || error || 'An unknown error occurred.'}
            </ThemedText>
            {mapsConfigError?.suggestion && (
              <ThemedText style={[styles.errorSuggestion, { color: palette.subtleText }]}>
                💡 {mapsConfigError.suggestion}
              </ThemedText>
            )}
            {error && !mapsConfigError && (
              <ThemedText style={[styles.errorSuggestion, { color: palette.subtleText }]}>
                Pull to refresh or check the API base URL in your Expo env variables.
              </ThemedText>
            )}
          </SurfaceCard>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.tint} />
            <ThemedText style={{ color: palette.subtleText }}>Fetching updated map pins…</ThemedText>
          </View>
        ) : null}

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
            {postings.length > 0 ? (
              postings.slice(0, 3).map((post) => (
                <Pill key={post.id} tone="brand" compact iconName="map.fill">
                  {post.distanceLabel ?? 'Nearby'}
                </Pill>
              ))
            ) : (
              <Pill tone="brand" compact>
                Waiting for nearby postings
              </Pill>
            )}
          </View>
          <ThemedText style={[styles.filterHelper, { color: palette.subtleText }]}>
            Adjust filters anytime to include allergen details or extend the search radius.
          </ThemedText>
        </SurfaceCard>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Trending handoffs</ThemedText>
          <Pill tone="info" compact iconName="person.3.fill">
            {postings.length} neighbors ready
          </Pill>
        </View>
        <View style={styles.postsList}>
          {postings.map((post) => (
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
            Meet at well-lit, public spots and keep communication inside the app. If something feels off, use the report option
            so moderators can step in.
          </ThemedText>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const LIGHT_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f1f4f2' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5f6c66' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
];

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
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  mapPreview: {
    borderRadius: 24,
    height: 260,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
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
    alignItems: 'center',
    gap: 12,
  },
  bulletCopy: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  filterCard: {
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    fontSize: 15,
    lineHeight: 22,
  },
  loadingState: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  errorCard: {
    gap: 12,
  },
  errorSuggestion: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
