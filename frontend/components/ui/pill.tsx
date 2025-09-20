import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

type PillTone = 'default' | 'brand' | 'success' | 'warning' | 'info';

type PillProps = PropsWithChildren<
  ViewProps & {
    tone?: PillTone;
    iconName?: Parameters<typeof IconSymbol>[0]['name'];
    compact?: boolean;
  }
>;

export function Pill({
  children,
  tone = 'default',
  iconName,
  style,
  compact = false,
  ...rest
}: PillProps) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  const backgroundByTone: Record<PillTone, string> = {
    default: palette.cardMuted,
    brand: palette.cardHighlight,
    success: palette.successSurface,
    warning: palette.warningSurface,
    info: palette.infoSurface,
  };

  const textColorByTone: Record<PillTone, string> = {
    default: palette.subtleText,
    brand: palette.success,
    success: palette.success,
    warning: palette.warning,
    info: palette.info,
  };

  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        { backgroundColor: backgroundByTone[tone] },
        style,
      ]}
      {...rest}>
      {iconName ? (
        <IconSymbol name={iconName} size={16} color={textColorByTone[tone]} />
      ) : null}
      <ThemedText
        style={[
          styles.label,
          compact && styles.labelCompact,
          { color: textColorByTone[tone] },
        ]}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  compact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 12,
  },
});
