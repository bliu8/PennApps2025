import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Pill } from '@/components/ui/pill';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const principles = [
  {
    title: 'Only share sealed, shelf-stable items',
    copy: 'Packaged snacks, pantry staples, and sealed beverages fit the MVP rules. Skip home-cooked meals for now.',
    icon: 'checkmark.seal.fill' as const,
  },
  {
    title: 'Privacy is default',
    copy: 'Exact pickup coordinates unlock only when you accept a claim. Choose public, well-lit meetup spots.',
    icon: 'map.fill' as const,
  },
  {
    title: 'Use in-app messaging',
    copy: 'Keep communication inside Leftys so moderators can help if something feels off. Reporting adds a quiet strike.',
    icon: 'bell.fill' as const,
  },
];

export default function ModalScreen() {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText type="title">Before you post or claim</ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>
          A quick reminder of the trust and safety guardrails that keep the community comfortable.
        </ThemedText>

        {principles.map((principle) => (
          <SurfaceCard key={principle.title} tone="default">
            <View style={styles.cardHeader}>
              <IconSymbol name={principle.icon} size={22} color={palette.success} />
              <ThemedText type="subtitle" style={styles.cardTitle}>
                {principle.title}
              </ThemedText>
            </View>
            <ThemedText style={[styles.cardCopy, { color: palette.subtleText }]}>
              {principle.copy}
            </ThemedText>
          </SurfaceCard>
        ))}

        <SurfaceCard tone="highlight" style={styles.nudgeCard}>
          <Pill tone="brand" compact iconName="sparkles">
            Nudges from behavioral science
          </Pill>
          <ThemedText style={[styles.cardCopy, { color: palette.subtleText }]}>
            Defaults remove friction. We pre-fill the most effective pickup windows, send gentle reminders, and spotlight your
            impact stats so it feels rewarding to keep sharing.
          </ThemedText>
        </SurfaceCard>

        <Link href="/" style={styles.link} asChild>
          <SurfaceCard tone="success">
            <View style={styles.linkRow}>
              <ThemedText type="subtitle">Got it — take me back</ThemedText>
              <Pill tone="brand" compact iconName="sparkles">
                Start helping neighbors
              </Pill>
            </View>
          </SurfaceCard>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
  },
  cardCopy: {
    fontSize: 15,
    lineHeight: 22,
  },
  nudgeCard: {
    gap: 12,
  },
  link: {
    textDecorationLine: 'none',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
