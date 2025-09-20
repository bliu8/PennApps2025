import { StyleSheet, View, Pressable } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import { BackButton } from '@/components/ui/back-button';

export default function SettingsScreen() {
  const palette = Colors.light;
  const { logout } = useAuthContext();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <Stack.Screen options={{ title: '', headerLeft: () => <BackButton /> }} />
      <View style={styles.content}>
        <SurfaceCard tone="highlight" style={{ gap: 12 }}>
          <ThemedText type="subtitle">Profile</ThemedText>
          <Pressable style={styles.row} onPress={() => { /* TODO: change name */ }}>
            <IconSymbol name="person.fill" size={18} color={palette.tint} />
            <ThemedText>Change name</ThemedText>
          </Pressable>
          <Pressable style={styles.row} onPress={() => { /* TODO: change pfp */ }}>
            <IconSymbol name="camera.fill" size={18} color={palette.tint} />
            <ThemedText>Change profile photo</ThemedText>
          </Pressable>
        </SurfaceCard>

        <SurfaceCard tone="default" style={{ gap: 12 }}>
          <ThemedText type="subtitle">Account</ThemedText>
          <Pressable style={styles.row} onPress={() => { void logout(); }}>
            <IconSymbol name="clock.arrow.circlepath" size={18} color={palette.tint} />
            <ThemedText>Log out</ThemedText>
          </Pressable>
        </SurfaceCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
});


