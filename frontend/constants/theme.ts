import { Platform } from 'react-native';

const brand = '#146C60';
const brandBright = '#2EB88A';
const warmHighlight = '#FFF4E5';

export const Colors = {
  light: {
    text: '#1A1F1C',
    subtleText: '#5F6C66',
    background: '#FAFAF7',
    backgroundMuted: '#F1F4F2',
    tint: brand,
    icon: '#86968F',
    tabIconDefault: '#BAC6C0',
    tabIconSelected: brand,
    card: '#FFFFFF',
    cardMuted: '#F6F9F7',
    cardHighlight: '#EEF7F2',
    border: '#E3E8E5',
    success: brand,
    successSurface: '#E6F5F0',
    info: '#2D6DB0',
    infoSurface: '#E8F1FC',
    warning: '#C87A2B',
    warningSurface: warmHighlight,
    accent: brandBright,
  },
  dark: {
    text: '#F5F7F6',
    subtleText: '#BAC7C2',
    background: '#161A18',
    backgroundMuted: '#1E2421',
    tint: '#58C39C',
    icon: '#89A297',
    tabIconDefault: '#55635D',
    tabIconSelected: '#58C39C',
    card: '#1F2622',
    cardMuted: '#232B26',
    cardHighlight: '#26332C',
    border: '#2E3833',
    success: '#58C39C',
    successSurface: '#1C2923',
    info: '#7FA6E4',
    infoSurface: '#192435',
    warning: '#E0B059',
    warningSurface: '#2B2218',
    accent: '#58C39C',
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
