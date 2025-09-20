import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { usePostings } from '@/hooks/use-postings';
import { Posting } from '@/types/posting';
import { BackButton } from '@/components/ui/back-button';

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

export default function FullscreenMap() {
  const palette = Colors.light;
  const { postings } = usePostings();

  const mapRegion = useMemo(() => {
    const firstWithCoordinates = postings.find((p) => p.coordinates);
    if (firstWithCoordinates) return createRegionFromPosting(firstWithCoordinates);
    return DEFAULT_REGION;
  }, [postings]);

  const mapKey = `${mapRegion.latitude.toFixed(3)}-${mapRegion.longitude.toFixed(3)}`;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: '', headerLeft: () => <BackButton /> }} />
      <MapView
        key={mapKey}
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsPointsOfInterest={false}
        customMapStyle={LIGHT_MAP_STYLE}
      >
        {postings
          .filter((p) => p.coordinates)
          .map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.coordinates!.latitude, longitude: p.coordinates!.longitude }}
              title={p.title}
              description={p.pickupLocationHint}
            />
          ))}
      </MapView>
    </View>
  );
}

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f1f4f2' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5f6c66' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});


