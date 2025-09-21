import { StyleSheet, View, Pressable, TextInput } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import { BackButton } from '@/components/ui/back-button';

export default function SettingsScreen() {
  const palette = Colors.light;
  const { logout, user, updateDisplayName } = useAuthContext();
  const name = user?.name ?? 'neighbor';

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => <BackButton />,
          headerTitle: () => (
            <ThemedText type="subtitle" style={{ fontWeight: '700' }}>Settings</ThemedText>
          ),
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.content, { paddingTop: 4 }]}> 
        <SurfaceCard tone="default" style={{ gap: 16 }}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Display name</ThemedText>
            <TextInput
              defaultValue={name}
              onChangeText={(text) => updateDisplayName(text)}
              placeholder="Your name"
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholderTextColor={palette.subtleText}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Dietary restrictions</ThemedText>
            <TextInput
              placeholder="e.g., vegetarian; no nuts"
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholderTextColor={palette.subtleText}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <ThemedText style={[styles.placeholder, { color: palette.subtleText }]}>Placeholders shown here match the card.</ThemedText>
        </SurfaceCard>

        <SurfaceCard onPress={() => { /* open modal from below row as well */ }} tone="highlight" style={{ gap: 12 }}>
          <ThemedText type="subtitle">More info</ThemedText>
          <ThemedText style={{ color: palette.subtleText }}>Open the details modal to learn about guidelines.</ThemedText>
          <Pressable style={styles.linkRow} onPress={() => { /* replaced below by router link */ }}>
            <IconSymbol name="sparkles" size={18} color={palette.success} />
            <ThemedText>Open modal</ThemedText>
          </Pressable>
        </SurfaceCard>

        <Pressable style={styles.row} onPress={() => { void logout(); }}>
          <View style={styles.rowIconWrap}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={palette.tint} />
          </View>
          <ThemedText>Log out</ThemedText>
        </Pressable>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.border,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.cardMuted,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: Colors.light.text,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionDivider: {
    height: 8,
  },
  placeholder: {
    fontSize: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});


