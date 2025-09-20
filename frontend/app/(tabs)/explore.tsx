import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { usePostings } from '@/hooks/use-postings';
import { Posting } from '@/types/posting';
import { getMapsConfigErrorMessage } from '@/utils/maps-config';
import { AppIcon } from '@/components/ui/app-icon';
import { PostCard } from '@/components/ui/post-card';

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

function MapToggle({ onSelect, viewMode }: { onSelect: (viewMode: 'map' | 'list') => void; viewMode: 'map' | 'list' }) {
  return (
    <View style={styles.toggleGroup}>
      <Pressable onPress={() => onSelect('map')} style={[styles.toggleItem, viewMode === 'map' && styles.toggleItemActive]}>
        <ThemedText style={[styles.toggleLabel, viewMode === 'map' && styles.toggleLabelActive]}>Map</ThemedText>
      </Pressable>
      <Pressable onPress={() => onSelect('list')} style={[styles.toggleItem, viewMode === 'list' && styles.toggleItemActive]}>
        <ThemedText style={[styles.toggleLabel, viewMode === 'list' && styles.toggleLabelActive]}>List</ThemedText>
      </Pressable>
    </View>
  );
}
  
  


export default function ExploreScreen() {
  const palette = Colors.light;
  const { postings } = usePostings();
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Check for Google Maps configuration issues (kept for future error surfacing)
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
        showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <ThemedText type="title">Explore</ThemedText>
            <MapToggle 
            onSelect={setViewMode}
            viewMode={viewMode}
          />
          </View>
        

        {viewMode === 'map' ? (
          <View style={styles.mapContainer}>
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
            <Pressable
              accessibilityLabel="Open fullscreen map"
              onPress={() => router.push('/map-fullscreen')}
              style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.8 : 1 }]}
            >
              <AppIcon name="arrow.up.left.and.arrow.down.right" size={22} color="#000" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <View style={{ gap: 12 }}>
              {postings.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </View>
          </View>
        )}

        {/* Future: error card, loading indicator will return here */}
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 999,
    padding: 4,
  },
  toggleItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleItemActive: {
    backgroundColor: '#ffffff',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#55645E',
  },
  toggleLabelActive: {
    color: '#000000',
    fontWeight: '600',
  },
  mapContainer: {
    height: 360,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  listContainer: {
    gap: 12,
  },
  dropdown: {
    position: 'relative',
  },
  dropdownButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dropdownItemLabel: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemLabelActive: {
    fontWeight: '700',
    color: '#000',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#55645E',
  },
  sliderTrack: {
    flex: 1,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
  },
  sliderValue: {
    fontSize: 12,
    color: '#000',
    fontWeight: '700',
    marginLeft: 4,
  },
});
