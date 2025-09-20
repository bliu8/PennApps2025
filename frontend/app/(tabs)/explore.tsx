import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
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
  const { postings } = usePostings();
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

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
        <View style={styles.heroHeader}>
          <ThemedText type="title">Map</ThemedText>
        </View>

        <SurfaceCard tone="info" style={styles.mapCard}>
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
          <Pressable
            onPress={() => { /* TODO: navigate to a dedicated fullscreen map view */ }}
            style={({ pressed }) => [styles.fullscreenButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <ThemedText style={styles.fullscreenButtonText}>Open fullscreen</ThemedText>
          </Pressable>
        </SurfaceCard>

        {/* Future: error card, loading indicator, filters, and feed will return here */}
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
  mapPreview: {
    borderRadius: 24,
    height: 260,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  fullscreenButton: {
    alignSelf: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fullscreenButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
