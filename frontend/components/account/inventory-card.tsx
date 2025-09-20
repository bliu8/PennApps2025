import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Pill } from '@/components/ui/pill';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { InventoryItem } from '@/types/account';

type InventoryCardProps = {
  item: InventoryItem;
};

export function InventoryCard({ item }: InventoryCardProps) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  const expiryLabel = (() => {
    if (item.expiresInDays === null) {
      return 'Expiry to be confirmed';
    }
    if (item.expiresInDays <= 0) {
      return 'Expires today';
    }
    return `Expires in ${item.expiresInDays} day${item.expiresInDays === 1 ? '' : 's'}`;
  })();

  const impactSummary = `Keeps ${item.impact.foodWasteDivertedLbs.toFixed(1)} lbs of food in circulation · ${item.impact.co2AvoidedLbs.toFixed(
    1,
  )} lbs CO₂ avoided`;

  return (
    <SurfaceCard tone="default" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle" style={styles.title}>
          {item.title}
        </ThemedText>
        <Pill tone={item.status === 'open' ? 'success' : 'info'} compact>
          {item.status === 'archived-scan' ? 'Scan stored' : item.status}
        </Pill>
      </View>
      {item.quantityLabel ? (
        <ThemedText style={[styles.helper, { color: palette.subtleText }]}>{item.quantityLabel}</ThemedText>
      ) : null}
      <View style={styles.metaRow}>
        <IconSymbol name="calendar" size={18} color={palette.icon} />
        <ThemedText style={styles.metaText}>{expiryLabel}</ThemedText>
      </View>
      <View style={styles.metaRow}>
        <IconSymbol name="tag.fill" size={18} color={palette.info} />
        <ThemedText style={styles.metaText}>{item.priceLabel ?? 'Free · pay it forward'}</ThemedText>
      </View>
      <ThemedText style={[styles.helper, { color: palette.subtleText }]}>{impactSummary}</ThemedText>
      {item.allergens.length > 0 ? (
        <View style={styles.allergenRow}>
          {item.allergens.map((allergen) => (
            <Pill key={`${item.id}-${allergen}`} tone="warning" compact>
              {allergen}
            </Pill>
          ))}
        </View>
      ) : (
        <Pill tone="success" compact>
          Allergen friendly
        </Pill>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 15,
  },
  allergenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
