import { Image, ImageSourcePropType, StyleProp, View, ViewStyle } from 'react-native';

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

type AppIconProps = {
  name?: IconSymbolName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  // Future: allow custom SVGs or images
  source?: ImageSourcePropType | null;
};

/**
 * AppIcon: a single entry point for rendering icons throughout the app.
 * Today it renders platform icons; in the future it can render custom SVGs via `source`.
 */
export function AppIcon({ name, size = 24, color = '#000000', style, source = null }: AppIconProps) {
  if (source) {
    return (
      <View style={[{ width: size, height: size, justifyContent: 'center' }, style]}>
        <Image source={source} resizeMode="contain" style={{ width: size, height: size }} />
      </View>
    );
  }
  if (!name) return null;
  return <IconSymbol name={name} size={size} color={color} style={[{ transform: [{ translateY: 1 }] }, style]} />;
}


