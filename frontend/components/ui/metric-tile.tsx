import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ImpactMetric } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type MetricTileProps = {
  metric: ImpactMetric;
};

export function MetricTile({ metric }: MetricTileProps) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.cardMuted,
          borderColor: palette.border,
        },
      ]}>
      <View style={styles.iconBadge}>
        <IconSymbol name={metric.icon} size={18} color={palette.success} />
      </View>
      <ThemedText type="subtitle" style={styles.value}>
        {metric.value}
      </ThemedText>
      <ThemedText style={[styles.label, { color: palette.subtleText }]}>
        {metric.label}
      </ThemedText>
      <ThemedText style={styles.helper}>{metric.helperText}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 107, 79, 0.1)',
  },
  value: {
    fontSize: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
});
