import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
            <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>
              Items you have at home, {displayName}
            </ThemedText>
          </View>
        </View>

        <SurfaceCard tone="default" style={styles.fridgeCard}>
          <ThemedText type="subtitle">Your items</ThemedText>
          <ThemedText style={{ color: palette.subtleText }}>
            Placeholder list of items in your fridge.
          </ThemedText>
        </SurfaceCard>

        <SurfaceCard tone="highlight" style={styles.settingsCard}>
          <ThemedText type="subtitle">Settings</ThemedText>
          <View style={styles.settingsList}>
            <Pressable style={styles.settingsRow} onPress={() => { /* TODO: change name */ }}>
              <IconSymbol name="person.fill" size={18} color={palette.tint} />
              <ThemedText style={styles.settingsText}>Change name</ThemedText>
            </Pressable>
            <Pressable style={styles.settingsRow} onPress={() => { /* TODO: change pfp */ }}>
              <IconSymbol name="camera.fill" size={18} color={palette.tint} />
              <ThemedText style={styles.settingsText}>Change profile photo</ThemedText>
            </Pressable>
            <Pressable style={styles.settingsRow} onPress={() => { /* TODO: logout */ }}>
              <IconSymbol name="arrowshape.turn.up.left.fill" size={18} color={palette.tint} />
              <ThemedText style={styles.settingsText}>Log out</ThemedText>
            </Pressable>
          </View>
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
  fridgeCard: {
    gap: 12,
  },
  settingsCard: {
    gap: 12,
  },
  settingsList: {
    gap: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  settingsText: {
    fontSize: 16,
  },
});
