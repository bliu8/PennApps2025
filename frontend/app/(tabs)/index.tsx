import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import Stats from '../../components/home/stats';
import Alerts from '../../components/home/alerts';
import Fridge from '../../components/home/fridge';
import { consumeInventoryItem, deleteInventoryItem, updateInventoryQuantity } from '@/services/api';
import { submitBarcode } from '@/services/api';

export default function HomeScreen() {
  const palette = Colors.light;
  // const greeting = useGreeting();
  const { user, accessToken } = useAuthContext();
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const displayName = useMemo(() => {
    if (user?.name) return user.name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'neighbor';
  }, [user]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}> 
      <View style={[styles.container, { backgroundColor: palette.background }]}> 
        <View style={styles.header}>
            <ThemedText type="title">Hey {displayName}!</ThemedText>
        </View>
        <Alerts />
        <Stats />
        
        <SurfaceCard
          onPress={() => { if (permission?.granted) { setShowScanner(true); } else { void requestPermission().then(() => setShowScanner(true)); } }}
          style={[
            styles.uploadCard,
            styles.uploadShadow,
            {
              backgroundColor: palette.cardHighlight,
              borderColor: palette.tint,
              borderWidth: 1.25,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <View style={styles.uploadHero}>
            <View style={[styles.uploadIcon]}> 
              <IconSymbol name="camera.fill" size={50} color={palette.tint} />
            </View>
            <ThemedText type="subtitle">Upload your food</ThemedText>
            {scannedValue && (
              <ThemedText style={{ marginTop: 8 }}>Scanned: {scannedValue}</ThemedText>
            )}
          </View>
        </SurfaceCard>
        
        <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={({ data }: any) => {
                if (!data) return;
                const value = String(data);
                setScannedValue(value);
                setShowScanner(false);
                if (accessToken && !submitting) {
                  setSubmitting(true);
                  submitBarcode(accessToken, value).catch(() => {}).finally(() => setSubmitting(false));
                }
              }}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
              } as any}
            />
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16, zIndex: 10 }}>
              <Pressable 
                onPress={() => setShowScanner(false)} 
                style={({ pressed }) => [{ 
                  width: 44, 
                  height: 44, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 22
                }]}
              >
                <IconSymbol name="xmark.circle.fill" size={30} color={'white'} />
              </Pressable>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 20,
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
    flex: 1,
    minHeight: 220,
  },
  uploadHero: {
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    marginTop: 4,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  uploadShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
});


