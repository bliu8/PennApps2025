import { Platform } from 'react-native';

const brand = '#2F6B4F';
const brandBright = '#3BAF74';
const warmHighlight = '#F8F1E3';

export const Colors = {
  light: {
    text: '#1F2A24',
    subtleText: '#5A635B',
    background: '#F7F4EE',
    backgroundMuted: '#F0EDE6',
    tint: brand,
    icon: '#6C7A71',
    tabIconDefault: '#A0A6A1',
    tabIconSelected: brand,
    card: '#FFFFFF',
    cardMuted: '#F8F4ED',
    cardHighlight: '#EDF7F0',
    border: '#E1E0DA',
    success: brand,
    successSurface: '#E4F4EB',
    info: '#2D5DA8',
    infoSurface: '#E6EEF8',
    warning: '#B77B2B',
    warningSurface: warmHighlight,
    accent: brandBright,
  },
  dark: {
    text: '#F2F5F3',
    subtleText: '#B5C2BA',
    background: '#121513',
    backgroundMuted: '#1C211D',
    tint: '#70D5A1',
    icon: '#8DA297',
    tabIconDefault: '#59655E',
    tabIconSelected: '#70D5A1',
    card: '#1E2420',
    cardMuted: '#222823',
    cardHighlight: '#27342B',
    border: '#2F3A33',
    success: '#6CD49F',
    successSurface: '#1B2A22',
    info: '#82A7FF',
    infoSurface: '#1A2334',
    warning: '#E0B059',
    warningSurface: '#2B2218',
    accent: '#70D5A1',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
