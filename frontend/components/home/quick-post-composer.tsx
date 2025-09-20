import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Pill } from '@/components/ui/pill';
import { Colors } from '@/constants/theme';
import { createPosting, requestListingAssist, ListingAssistPayload } from '@/services/api';
import { Posting } from '@/types/posting';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthContext } from '@/context/AuthContext';

type QuickPostComposerProps = {
  onPostCreated?: (posting: Posting) => void;
};

export function QuickPostComposer({ onPostCreated }: QuickPostComposerProps) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];
  const [title, setTitle] = useState('');
  const [quantityLabel, setQuantityLabel] = useState('');
  const [pickupWindowLabel, setPickupWindowLabel] = useState('Within 30 minutes');
  const [pickupLocationHint, setPickupLocationHint] = useState('Public lobby shelf near the entrance');
  const [allergens, setAllergens] = useState('');
  const [impactNarrative, setImpactNarrative] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [aiSource, setAiSource] = useState<'live' | 'fallback' | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { accessToken } = useAuthContext();

  const parsedAllergens = useMemo(
    () =>
      allergens
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    [allergens],
  );

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        backgroundColor: palette.card,
        borderColor: palette.border,
        color: palette.text,
      },
    ],
    [palette.card, palette.border, palette.text],
  );

  const handleListingAssist = useCallback(async () => {
    if (!accessToken) {
      setError('Session expired. Sign in again to use Gemini assist.');
      return;
    }

    setAiLoading(true);
    setError(null);
    try {
      const payload: ListingAssistPayload = {
        title,
        quantityLabel,
        allergens: parsedAllergens,
      };
      const result = await requestListingAssist(payload, accessToken);
      const suggestion = result.suggestion;
      setTitle((current) => (current.trim().length > 0 ? current : suggestion.titleSuggestion));
      setQuantityLabel(suggestion.quantityLabel);
      setPickupWindowLabel(suggestion.pickupWindowLabel);
      setPickupLocationHint(suggestion.pickupLocationHint);
      setImpactNarrative(suggestion.impactNarrative);
      setTags(suggestion.tags);
      setAiSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gemini assist failed. Try again.');
    } finally {
      setAiLoading(false);
    }
  }, [title, quantityLabel, parsedAllergens, accessToken]);

  const resetForm = useCallback(() => {
    setTitle('');
    setQuantityLabel('');
    setPickupWindowLabel('Within 30 minutes');
    setPickupLocationHint('Public lobby shelf near the entrance');
    setAllergens('');
    setImpactNarrative('');
    setTags([]);
    setAiSource(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Add a quick headline so neighbors know what is available.');
      return;
    }
    if (!quantityLabel.trim()) {
      setError('Let people know what quantity to expect — sealed units or servings.');
      return;
    }

    if (!accessToken) {
      setError('Session expired. Please sign in again before posting.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const posting = await createPosting({
        title: title.trim(),
        quantityLabel: quantityLabel.trim(),
        pickupWindowLabel: pickupWindowLabel.trim(),
        pickupLocationHint: pickupLocationHint.trim(),
        allergens: parsedAllergens,
        impactNarrative: impactNarrative.trim() || undefined,
        tags,
      }, accessToken);
      onPostCreated?.(posting);
      setSuccess('Posted! We will nudge nearby verified neighbors.');
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish this posting.');
    } finally {
      setLoading(false);
    }
  }, [
    title,
    quantityLabel,
    pickupWindowLabel,
    pickupLocationHint,
    parsedAllergens,
    impactNarrative,
    tags,
    onPostCreated,
    resetForm,
    accessToken,
  ]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SurfaceCard tone="highlight" style={styles.card}>
        <View style={styles.headerRow}>
          <Pill tone="brand" compact iconName="sparkles">
            2-step posting
          </Pill>
          {aiSource ? (
            <Pill tone={aiSource === 'live' ? 'success' : 'info'} compact iconName="wand.and.stars">
              {aiSource === 'live' ? 'Gemini live assist' : 'Sample assist loaded'}
            </Pill>
          ) : null}
        </View>
        <ThemedText type="subtitle">Quick share composer</ThemedText>
        <ThemedText style={[styles.helper, { color: palette.subtleText }]}>Tap “Gemini assist” to auto-fill defaults and keep pickup friction low.</ThemedText>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Headline</ThemedText>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="Sealed snack box ready now"
            placeholderTextColor={palette.subtleText}
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Quantity</ThemedText>
          <TextInput
            style={inputStyle}
            value={quantityLabel}
            onChangeText={setQuantityLabel}
            placeholder="4 packs · sealed"
            placeholderTextColor={palette.subtleText}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <ThemedText style={styles.label}>Pickup window</ThemedText>
            <TextInput
              style={inputStyle}
              value={pickupWindowLabel}
              onChangeText={setPickupWindowLabel}
              placeholder="Within 30 minutes"
              placeholderTextColor={palette.subtleText}
              returnKeyType="next"
            />
          </View>
          <View style={styles.inlineField}>
            <ThemedText style={styles.label}>Handoff hint</ThemedText>
            <TextInput
              style={inputStyle}
              value={pickupLocationHint}
              onChangeText={setPickupLocationHint}
              placeholder="Public lobby shelf"
              placeholderTextColor={palette.subtleText}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Allergens</ThemedText>
          <TextInput
            style={inputStyle}
            value={allergens}
            onChangeText={setAllergens}
            placeholder="gluten, dairy (comma separated)"
            placeholderTextColor={palette.subtleText}
            autoCapitalize="none"
          />
        </View>

        {impactNarrative ? (
          <SurfaceCard tone="success" style={styles.assistCard}>
            <ThemedText style={styles.assistTitle}>Impact highlight</ThemedText>
            <ThemedText style={[styles.helper, { color: palette.subtleText }]}>{impactNarrative}</ThemedText>
            {tags.length > 0 ? (
              <View style={styles.tagRow}>
                {tags.map((tag) => (
                  <Pill key={`composer-tag-${tag}`} tone="success" compact>
                    #{tag.replace(/^#/, '')}
                  </Pill>
                ))}
              </View>
            ) : null}
          </SurfaceCard>
        ) : null}

        <View style={styles.actions}>
          <Pill
            tone="info"
            iconName="wand.and.stars"
            onPress={() => {
              if (!aiLoading) {
                void handleListingAssist();
              }
            }}
            disabled={aiLoading || loading}>
            {aiLoading ? 'Asking Gemini…' : 'Gemini assist'}
          </Pill>
          <Pill tone="brand" iconName="paperplane.fill" onPress={() => void handleSubmit()} disabled={loading || aiLoading}>
            {loading ? 'Publishing…' : 'Post now'}
          </Pill>
        </View>

        {error ? (
          <ThemedText style={[styles.feedback, { color: palette.warning }]}>{error}</ThemedText>
        ) : null}
        {success ? (
          <ThemedText style={[styles.feedback, { color: palette.success }]}>{success}</ThemedText>
        ) : null}
      </SurfaceCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  inlineField: {
    flex: 1,
    minWidth: 160,
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  assistCard: {
    gap: 8,
    padding: 16,
  },
  assistTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedback: {
    fontSize: 14,
    lineHeight: 20,
  },
});
