import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { SurfaceCard } from '@/components/ui/surface-card';
import { NotificationCard } from '@/components/account/notification-card';
import { InventoryCard } from '@/components/account/inventory-card';
import { useAccountOverview } from '@/hooks/use-account-overview';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AccountScreen() {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];
  const { overview, loading, error, refresh } = useAccountOverview();

  const totals = overview?.account.totals;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={palette.tint} />}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="title">Account & inventory</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>Track expiry dates, nudges, and climate wins in one place.</ThemedText>
          </View>
          <Pill tone="brand" compact iconName="sparkles">
            {overview?.account.shareRatePercent ? `${overview.account.shareRatePercent}% shared` : 'Impact preview'}
          </Pill>
        </View>

        {totals ? (
          <SurfaceCard tone="highlight" style={styles.totalsCard}>
            <ThemedText type="subtitle">Climate impact summary</ThemedText>
            <View style={styles.totalsRow}>
              <View style={styles.totalItem}>
                <ThemedText type="defaultSemiBold">{totals.foodWasteDivertedLbs.toFixed(1)} lbs</ThemedText>
                <ThemedText style={[styles.helper, { color: palette.subtleText }]}>Food waste diverted</ThemedText>
              </View>
              <View style={styles.totalItem}>
                <ThemedText type="defaultSemiBold">{totals.co2AvoidedLbs.toFixed(1)} lbs</ThemedText>
                <ThemedText style={[styles.helper, { color: palette.subtleText }]}>CO₂ prevented</ThemedText>
              </View>
            </View>
            <View style={styles.totalsRow}>
              <View style={styles.totalItem}>
                <ThemedText type="defaultSemiBold">{totals.methaneAvoidedLbs.toFixed(1)} lbs</ThemedText>
                <ThemedText style={[styles.helper, { color: palette.subtleText }]}>Methane avoided</ThemedText>
              </View>
              <View style={styles.totalItem}>
                <ThemedText type="defaultSemiBold">{totals.waterSavedGallons.toLocaleString()} gal</ThemedText>
                <ThemedText style={[styles.helper, { color: palette.subtleText }]}>Water saved</ThemedText>
              </View>
            </View>
          </SurfaceCard>
        ) : null}

        {overview?.notifications.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Smart nudges</ThemedText>
              <Pill tone="info" compact iconName="bell.badge.fill">
                {overview.notifications.length} insights
              </Pill>
            </View>
            <View style={styles.notificationList}>
              {overview.notifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Inventory & expiry</ThemedText>
            {overview?.account.expiringSoon.length ? (
              <Pill tone="warning" compact iconName="bell.badge.fill">
                {overview.account.expiringSoon.length} expiring soon
              </Pill>
            ) : null}
          </View>

          {overview?.account.inventory.length ? (
            <View style={styles.inventoryList}>
              {overview.account.inventory.map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </View>
          ) : (
            <SurfaceCard tone="info">
              <ThemedText type="subtitle">No items tracked yet</ThemedText>
              <ThemedText style={[styles.helper, { color: palette.subtleText }]}>Scan a label or post an item to populate your inventory.</ThemedText>
            </SurfaceCard>
          )}
        </View>

        {error ? (
          <SurfaceCard tone="warning">
            <ThemedText type="subtitle">We couldn&apos;t refresh your inventory</ThemedText>
            <ThemedText style={[styles.helper, { color: palette.subtleText }]}>{error}</ThemedText>
          </SurfaceCard>
        ) : null}

        {loading && !overview ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.tint} />
            <ThemedText style={[styles.helper, { color: palette.subtleText }]}>Loading account overview…</ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
  },
  totalsCard: {
    gap: 16,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  totalItem: {
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationList: {
    gap: 12,
  },
  inventoryList: {
    gap: 12,
  },
  loadingState: {
    gap: 12,
    alignItems: 'center',
  },
});
