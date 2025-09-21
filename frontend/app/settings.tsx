import { StyleSheet, View, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import { BackButton } from '@/components/ui/back-button';

export default function SettingsScreen() {
  const palette = Colors.light;
  const { logout, user, updateDisplayName } = useAuthContext();
  const name = user?.name ?? 'neighbor';
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string>('');

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <Stack.Screen options={{ title: 'Settings', headerLeft: () => <BackButton /> }} />
      <View style={styles.content}>
        <SurfaceCard tone="default" style={{ gap: 12 }}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Display name</ThemedText>
            <TextInput
              defaultValue={name}
              onChangeText={(text) => updateDisplayName(text)}
              placeholder="Your name"
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholderTextColor={palette.subtleText}
            />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Dietary restrictions</ThemedText>
            <TextInput
              value={dietaryRestrictions}
              onChangeText={setDietaryRestrictions}
              placeholder="e.g., vegetarian; no nuts"
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholderTextColor={palette.subtleText}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard tone="default" style={{ gap: 12 }}>
          <ThemedText type="subtitle">Account</ThemedText>
          <Pressable style={styles.row} onPress={() => { void logout(); }}>
            <ThemedText style={{ color: palette.danger }}>Log out</ThemedText>
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
  inputGroup: {
    gap: 8,
  },
  label: {
    color: Colors.light.subtleText,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
