import { PropsWithChildren } from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

type PillTone = 'default' | 'brand' | 'success' | 'warning' | 'info';

type PillProps = PropsWithChildren<
  PressableProps & {
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
  disabled,
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

  const interactive = typeof rest.onPress === 'function' && !disabled;
  const Component = interactive ? Pressable : View;

  return (
    <Component
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityState={interactive ? { disabled } : undefined}
      style={[
        styles.container,
        compact && styles.compact,
        { backgroundColor: backgroundByTone[tone], opacity: disabled ? 0.6 : 1 },
        style,
      ]}
      disabled={disabled}
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
    </Component>
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
