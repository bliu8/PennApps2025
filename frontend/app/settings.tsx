import { StyleSheet, View, Pressable, TextInput } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import { BackButton } from '@/components/ui/back-button';

export default function SettingsScreen() {
  const palette = Colors.light;
  const { logout, user, updateDisplayName } = useAuthContext();
  const name = user?.name ?? 'neighbor';

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <Stack.Screen options={{ title: '', headerLeft: () => <BackButton /> }} />
      <View style={styles.content}>
        <SurfaceCard tone="highlight" style={{ gap: 12 }}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <IconSymbol name="person.fill" size={28} color={palette.tint} />
            </View>
            <ThemedText type="subtitle">Settings</ThemedText>
          </View>
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
            <ThemedText style={styles.label}>Dietary preference (placeholder)</ThemedText>
            <View style={styles.pillRow}>
              <Pill label="None" selected />
              <Pill label="Vegetarian" />
              <Pill label="Vegan" />
              <Pill label="Halal" />
            </View>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.cardMuted,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

function Pill({ label, selected = false }: { label: string; selected?: boolean }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: selected ? Colors.light.cardHighlight : Colors.light.cardMuted, borderColor: Colors.light.border }]}> 
      <ThemedText style={[pillStyles.pillText]}>{label}</ThemedText>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: {
    fontWeight: '600',
  },
});


