import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationPayload } from '@/types/account';

const ICON_BY_ACCENT: Record<NotificationPayload['accent'], Parameters<typeof IconSymbol>[0]['name']> = {
  warning: 'bell.badge.fill',
  success: 'sparkles',
  info: 'megaphone.fill',
};

const TONE_BY_ACCENT: Record<NotificationPayload['accent'], Parameters<typeof SurfaceCard>[0]['tone']> = {
  warning: 'warning',
  success: 'success',
  info: 'info',
};

type NotificationCardProps = {
  notification: NotificationPayload;
};

export function NotificationCard({ notification }: NotificationCardProps) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];
  const iconName = ICON_BY_ACCENT[notification.accent];
  const tone = TONE_BY_ACCENT[notification.accent];
  const accentColor =
    notification.accent === 'warning'
      ? palette.warning
      : notification.accent === 'success'
      ? palette.success
      : palette.info;

  return (
    <SurfaceCard tone={tone} style={styles.card}>
      <View style={styles.headerRow}>
        <IconSymbol name={iconName} size={20} color={accentColor} />
        <ThemedText type="subtitle" style={styles.title}>
          {notification.title}
        </ThemedText>
      </View>
      <ThemedText style={styles.body}>{notification.body}</ThemedText>
      {notification.ctaLabel ? (
        <View style={styles.ctaPill}>
          <ThemedText style={styles.ctaText}>{notification.ctaLabel}</ThemedText>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF66',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
