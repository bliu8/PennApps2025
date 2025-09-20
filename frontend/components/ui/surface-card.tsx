import { PropsWithChildren } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SurfaceTone = 'default' | 'highlight' | 'success' | 'info' | 'warning';

type SurfaceCardProps = PropsWithChildren<
  Omit<PressableProps, 'style'> & {
    tone?: SurfaceTone;
    style?: StyleProp<ViewStyle>;
  }
>;

export function SurfaceCard({
  children,
  tone = 'default',
  style,
  onPress,
  disabled,
  ...rest
}: SurfaceCardProps) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  const backgroundByTone: Record<SurfaceTone, string> = {
    default: palette.card,
    highlight: palette.cardHighlight,
    success: palette.successSurface,
    info: palette.infoSurface,
    warning: palette.warningSurface,
  };

  const interactive = typeof onPress === 'function' && !disabled;
  const baseStyle = [
    styles.card,
    {
      backgroundColor: backgroundByTone[tone],
      borderColor: palette.border,
      shadowColor: theme === 'light' ? '#0F1A1414' : '#00000070',
    },
    style,
  ];

  return (
    <Pressable
      accessibilityRole={interactive ? 'button' : undefined}
      {...rest}
      onPress={onPress}
      disabled={!interactive}
      style={({ pressed }) => [
        ...baseStyle,
        interactive && pressed ? styles.pressed : undefined,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 3,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
});
