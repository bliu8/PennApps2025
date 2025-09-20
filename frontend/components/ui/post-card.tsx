import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Pill } from '@/components/ui/pill';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Posting } from '@/types/posting';

type PostCardProps = {
  post: Posting;
  onPress?: () => void;
};

export function PostCard({ post, onPress }: PostCardProps) {
  const palette = Colors.light;
  const distanceLabel = post.distanceLabel ?? (post.distanceKm !== null ? `${post.distanceKm.toFixed(1)} km away` : 'Distance pending');
  const pickupLabel = post.pickupWindowLabel ?? 'Pickup window pending';

  return (
    <SurfaceCard style={styles.card} onPress={onPress} tone="default">
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: palette.cardHighlight }]}> 
          <IconSymbol name="sparkles" size={20} color={palette.success} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="subtitle" style={styles.title}>
            {post.title}
          </ThemedText>
          <ThemedText style={[styles.quantity, { color: palette.subtleText }]}>{post.quantityLabel}</ThemedText>
        </View>
        <Pill tone={post.status === 'reserved' ? 'warning' : 'brand'} compact iconName={post.status === 'reserved' ? 'clock.fill' : 'checkmark.seal.fill'}>
          {post.status === 'reserved' ? 'Reserved' : 'Open now'}
        </Pill>
      </View>

      <View style={styles.detailRow}>
        <IconSymbol name="map.fill" size={18} color={palette.icon} />
        <ThemedText style={[styles.detailText, { color: palette.subtleText }]}>
          {distanceLabel} · {pickupLabel}
        </ThemedText>
      </View>

      <View style={styles.detailRow}>
        <IconSymbol name="checkmark.seal.fill" size={18} color={palette.success} />
        <ThemedText style={styles.detailText}>{post.pickupLocationHint}</ThemedText>
      </View>

      <View style={styles.tagRow}>
        {post.allergens.length === 0 ? (
          <Pill tone="brand" compact iconName="sparkles">
            Claimed allergen-friendly
          </Pill>
        ) : (
          post.allergens.map((allergen) => (
            <Pill key={allergen} tone="warning" compact>
              {allergen}
            </Pill>
          ))
        )}
      </View>

      <SurfaceCard tone="highlight" style={styles.socialCard}>
        <View style={styles.detailRow}>
          <IconSymbol name="person.3.fill" size={18} color={palette.success} />
          <ThemedText style={styles.detailText}>
            {post.socialProof ?? 'Neighbors love quick pickups and public meetups.'}
          </ThemedText>
        </View>
        {post.reserverCount > 0 ? (
          <ThemedText style={[styles.detailText, { color: palette.subtleText }]}>
            {post.reserverCount} neighbor{post.reserverCount > 1 ? 's' : ''} hoping for a pickup reminder.
          </ThemedText>
        ) : (
          <ThemedText style={[styles.detailText, { color: palette.subtleText }]}>
            Be the first to reserve and unlock exact pickup details.
          </ThemedText>
        )}
      </SurfaceCard>

      {post.impactNarrative ? (
        <SurfaceCard tone="success" style={styles.impactCard}>
          <View style={styles.detailRow}>
            <IconSymbol name="leaf.fill" size={18} color={palette.success} />
            <ThemedText style={styles.detailText}>{post.impactNarrative}</ThemedText>
          </View>
          {post.tags && post.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {post.tags.map((tag) => (
                <Pill key={`${post.id}-${tag}`} tone="success" compact>
                  #{tag.replace(/^#/, '')}
                </Pill>
              ))}
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    flexShrink: 1,
  },
  quantity: {
    fontSize: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialCard: {
    gap: 8,
    padding: 16,
  },
  impactCard: {
    gap: 12,
    padding: 16,
  },
});
