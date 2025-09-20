import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Pill } from '@/components/ui/pill';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { fetchScans, uploadScan, requestListingAssist, ListingAssistPayload, ListingAssistantResponse } from '@/services/api';
import { ScanRecord } from '@/types/scans';

const palette = Colors.light;

export default function ScanScreen() {
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [scanResult, setScanResult] = useState<ScanRecord | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAssist, setAiAssist] = useState<ListingAssistantResponse | null>(null);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiAssistError, setAiAssistError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const records = await fetchScans();
        setHistory(records);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load scan history');
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  const allergenDisplay = useMemo(() => scanResult?.allergens ?? [], [scanResult]);

  useEffect(() => {
    if (!scanResult) {
      setAiAssist(null);
      setAiAssistError(null);
      return;
    }

    const payload: ListingAssistPayload = {
      title: scanResult.title,
      quantityLabel: scanResult.rawText || scanResult.notes || undefined,
      allergens: scanResult.allergens,
      notes: scanResult.notes ?? null,
      expiryDate: scanResult.expiryDate ?? null,
    };

    setAiAssistLoading(true);
    setAiAssistError(null);
    void requestListingAssist(payload)
      .then((response) => {
        setAiAssist(response);
      })
      .catch((err) => {
        setAiAssist(null);
        setAiAssistError(err instanceof Error ? err.message : 'Unable to fetch Gemini listing defaults');
      })
      .finally(() => {
        setAiAssistLoading(false);
      });
  }, [scanResult]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    setError(null);
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== ImagePicker.PermissionStatus.GRANTED) {
          Alert.alert('Camera permission needed', 'Enable camera access to capture labels.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
        });
        if (!result.canceled) {
          setSelectedImage(result.assets[0]);
          setScanResult(null);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== ImagePicker.PermissionStatus.GRANTED) {
          Alert.alert('Library permission needed', 'Allow photo access to upload existing packaging labels.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.8,
        });
        if (!result.canceled) {
          setSelectedImage(result.assets[0]);
          setScanResult(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to launch camera or library');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert('Select an image', 'Capture a label or choose one from your library first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const fileName = selectedImage.fileName ?? `scan-${Date.now()}.jpg`;
      const mimeType = selectedImage.mimeType ?? 'image/jpeg';
      const record = await uploadScan(selectedImage.uri, fileName, mimeType);
      setScanResult(record);
      setHistory((prev) => [record, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process scan');
    } finally {
      setSubmitting(false);
    }
  }, [selectedImage]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title">Scan & capture</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.subtleText }]}>
              Snap a packaged item or upload a receipt—we&apos;ll parse the label and store it securely in MongoDB.
            </ThemedText>
          </View>
          <Pill tone="brand" compact iconName="archivebox.fill">
            Stored automatically
          </Pill>
        </View>

        <SurfaceCard tone="highlight" style={styles.uploadCard}>
          <ThemedText type="subtitle">1. Choose a source</ThemedText>
          <ThemedText style={{ color: palette.subtleText }}>
            Use your camera for a quick capture or select an existing image for a higher resolution scan.
          </ThemedText>
          <View style={styles.buttonRow}>
            <Pill tone="brand" iconName="camera.fill" onPress={() => void pickImage('camera')}>
              Use camera
            </Pill>
            <Pill tone="info" iconName="photo" onPress={() => void pickImage('library')}>
              Pick from library
            </Pill>
          </View>

          {selectedImage ? (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} contentFit="cover" />
              <ThemedText style={[styles.previewLabel, { color: palette.subtleText }]}>Ready to scan</ThemedText>
            </View>
          ) : null}

          <Pill
            tone="brand"
            iconName="wand.and.stars"
            compact
            disabled={submitting}
            onPress={() => {
              if (!submitting) {
                void handleSubmit();
              }
            }}>
            {submitting ? 'Scanning…' : '2. Parse this label'}
          </Pill>

          {error ? (
            <ThemedText style={[styles.errorText, { color: palette.warning }]}>{error}</ThemedText>
          ) : null}
        </SurfaceCard>

        {submitting ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.tint} />
            <ThemedText style={{ color: palette.subtleText }}>Uploading image to the API…</ThemedText>
          </View>
        ) : null}

        {scanResult ? (
          <SurfaceCard tone="success" style={styles.resultCard}>
            <ThemedText type="subtitle">Parsed details</ThemedText>
            <ThemedText style={{ color: palette.subtleText }}>
              We stored this record in MongoDB. Edit it in the dashboard or use it to fast-fill a posting.
            </ThemedText>
            <View style={styles.resultRow}>
              <IconSymbol name="text.book.closed" size={18} color={palette.success} />
              <ThemedText style={styles.resultText}>{scanResult.title}</ThemedText>
            </View>
            {scanResult.expiryDate ? (
              <View style={styles.resultRow}>
                <IconSymbol name="calendar" size={18} color={palette.success} />
                <ThemedText style={styles.resultText}>Expiry detected: {scanResult.expiryDate}</ThemedText>
              </View>
            ) : null}
            <View style={styles.allergenRow}>
              {allergenDisplay.length > 0 ? (
                allergenDisplay.map((item) => (
                  <Pill key={item} tone="warning" compact>
                    {item}
                  </Pill>
                ))
              ) : (
                <Pill tone="brand" compact>
                  No allergens detected
                </Pill>
              )}
            </View>
            {scanResult.notes ? (
              <ThemedText style={{ color: palette.subtleText }}>{scanResult.notes}</ThemedText>
            ) : null}
          </SurfaceCard>
        ) : null}

        {aiAssistLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.tint} />
            <ThemedText style={{ color: palette.subtleText }}>Coaching with Gemini…</ThemedText>
          </View>
        ) : null}

        {aiAssist ? (
          <SurfaceCard tone={aiAssist.source === 'live' ? 'success' : 'info'} style={styles.aiAssistCard}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Gemini-ready listing defaults</ThemedText>
              <Pill tone={aiAssist.source === 'live' ? 'success' : 'info'} compact iconName="sparkles">
                {aiAssist.source === 'live' ? 'Live Gemini' : 'Sample assist'}
              </Pill>
            </View>
            <ThemedText style={[styles.helperText, { color: palette.subtleText }]}>
              Drop these into the quick post composer to publish in seconds.
            </ThemedText>
            <View style={styles.detailRow}>
              <IconSymbol name="text.book.closed" size={18} color={palette.success} />
              <ThemedText style={styles.detailText}>{aiAssist.suggestion.titleSuggestion}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <IconSymbol name="clock.fill" size={18} color={palette.success} />
              <ThemedText style={styles.detailText}>{aiAssist.suggestion.pickupWindowLabel}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <IconSymbol name="map.fill" size={18} color={palette.success} />
              <ThemedText style={styles.detailText}>{aiAssist.suggestion.pickupLocationHint}</ThemedText>
            </View>
            <ThemedText style={[styles.helperText, { color: palette.subtleText }]}>
              {aiAssist.suggestion.impactNarrative}
            </ThemedText>
            <View style={styles.allergenRow}>
              {aiAssist.suggestion.tags.map((tag) => (
                <Pill key={`ai-tag-${tag}`} tone="success" compact>
                  #{tag.replace(/^#/, '')}
                </Pill>
              ))}
            </View>
            {aiAssistError ? (
              <ThemedText style={{ color: palette.warning }}>{aiAssistError}</ThemedText>
            ) : null}
          </SurfaceCard>
        ) : aiAssistError ? (
          <SurfaceCard tone="warning" style={styles.aiAssistCard}>
            <ThemedText type="subtitle">We couldn&apos;t reach Gemini</ThemedText>
            <ThemedText style={{ color: palette.subtleText }}>{aiAssistError}</ThemedText>
          </SurfaceCard>
        ) : null}

        <SurfaceCard tone="default" style={styles.historyCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Scan history</ThemedText>
            <Pill tone="brand" compact iconName="clock.arrow.circlepath">
              {history.length} stored
            </Pill>
          </View>
          {loadingHistory ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={palette.tint} />
              <ThemedText style={{ color: palette.subtleText }}>Fetching stored scans…</ThemedText>
            </View>
          ) : history.length === 0 ? (
            <ThemedText style={{ color: palette.subtleText }}>
              Your future scans will show up here so you can reuse them when creating postings.
            </ThemedText>
          ) : (
            history.map((record) => (
              <View key={record.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <ThemedText type="defaultSemiBold">{record.title}</ThemedText>
                  <ThemedText style={[styles.historyTimestamp, { color: palette.subtleText }]}>
                    {new Date(record.createdAt).toLocaleString()}
                  </ThemedText>
                </View>
                {record.expiryDate ? (
                  <ThemedText style={{ color: palette.subtleText }}>Expiry: {record.expiryDate}</ThemedText>
                ) : null}
                {record.allergens.length > 0 ? (
                  <View style={styles.allergenRow}>
                    {record.allergens.map((item) => (
                      <Pill key={`${record.id}-${item}`} tone="warning" compact>
                        {item}
                      </Pill>
                    ))}
                  </View>
                ) : null}
                {record.notes ? (
                  <ThemedText style={{ color: palette.subtleText }}>{record.notes}</ThemedText>
                ) : null}
              </View>
            ))
          )}
        </SurfaceCard>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
  },
  uploadCard: {
    gap: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewWrapper: {
    gap: 8,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
  previewLabel: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingState: {
    alignItems: 'center',
    gap: 12,
  },
  resultCard: {
    gap: 12,
  },
  aiAssistCard: {
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 16,
  },
  allergenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyCard: {
    gap: 16,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyItem: {
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTimestamp: {
    fontSize: 12,
  },
});
