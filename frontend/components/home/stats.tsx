import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export function Stats() {
  const palette = Colors.light;
  return (
    <View style={styles.ctaRow}>
      <ThemedText type="subtitle">You saved</ThemedText>
      <ThemedText type="title">$113</ThemedText>
      <ThemedText style={{ color: palette.subtleText }}>this month — nice work!</ThemedText>
    </View>
  );
}

export default Stats;

const styles = StyleSheet.create({
  ctaRow: {
    gap: 6,
  },
});


