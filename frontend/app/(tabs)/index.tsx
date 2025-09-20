import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';

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
  const { user } = useAuthContext();
  const displayName = useMemo(() => {
    if (user?.name) return user.name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'neighbor';
  }, [user]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <ThemedText type="title">Hi </ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}> 
              {greeting}, {displayName}!
            </ThemedText>
          </View>
        </View>

        <SurfaceCard tone="highlight" style={styles.uploadCard}>
          <View style={styles.uploadHero}>
            <View style={[styles.uploadIcon, { backgroundColor: palette.card }]}>
              <IconSymbol name="camera.fill" size={28} color={palette.tint} />
            </View>
            <ThemedText type="subtitle">Upload a photo to get started</ThemedText>
            <ThemedText style={{ color: palette.subtleText }}>
              Snap a quick picture of what you want to share.
            </ThemedText>
            <Pressable
              onPress={() => { console.log("UPLOAD PHOTO") }}
              style={({ pressed }) => [styles.uploadButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <ThemedText style={styles.uploadButtonText}>Upload a photo</ThemedText>
            </Pressable>
          </View>
        </SurfaceCard>

        {/* Future: quick composer, nudges, metrics, and feed will live here */}
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
  uploadCard: {
    gap: 16,
  },
  uploadHero: {
    gap: 12,
    alignItems: 'center',
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    marginTop: 4,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});


