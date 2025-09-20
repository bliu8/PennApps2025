import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';

const palette = Colors.light;

export default function ScanScreen() {
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
            <ThemedText type="title">Fridge</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <IconSymbol name="gearshape.fill" size={22} color={palette.icon} />
          </Pressable>
        </View>

        <SurfaceCard tone="default" style={styles.fridgeCard}>
          <ThemedText type="subtitle">Your items</ThemedText>
          <ThemedText style={{ color: palette.subtleText }}>
            Nothing here yet — add something from the home screen.
          </ThemedText>
        </SurfaceCard>

        {/* Future: integrate scans/history back here if we want to keep it */}
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
    paddingTop: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
  fridgeCard: {
    gap: 12,
  },
  settingsCard: {
    gap: 12,
  },
});
