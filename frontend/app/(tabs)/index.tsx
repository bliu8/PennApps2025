import { useMemo, useState, useRef, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuthContext } from '@/context/AuthContext';
import { useInventoryRefresh } from '@/context/InventoryRefreshContext';
import Stats from '../../components/home/stats';
import Alerts from '../../components/home/alerts';
import { NotificationPopup } from '../../components/notifications/notification-popup';
import { scanBarcode, BarcodeScanResult, addBarcodeToInventory } from '@/services/api';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const palette = Colors.light;
  // const greeting = useGreeting();
  const { user, accessToken } = useAuthContext();
  const { triggerRefresh } = useInventoryRefresh();
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannedItems, setScannedItems] = useState<BarcodeScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  
  // Refs for robust scan handling
  const lastScanTimeRef = useRef(0);
  const lastBarcodeValueRef = useRef<string | null>(null);
  const lastBarcodeDetectionTimeRef = useRef(0);
  const frameTrackingIntervalRef = useRef<number | null>(null);
  const barcodeDetectionTimeoutRef = useRef<number | null>(null);
  const barcodeLostTimeoutRef = useRef<number | null>(null);

  // Success animation effect
  useEffect(() => {
    if (showSuccessAnimation) {
      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.delay(1500),
        Animated.timing(successScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessAnimation(false);
      });
    }
  }, [showSuccessAnimation, successScale]);

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
            <Pressable 
              onPress={() => setShowNotifications(true)}
              style={({ pressed }) => [styles.notificationButton, pressed ? { opacity: 0.7 } : undefined]}
            >
              <IconSymbol name="bell.fill" size={24} color={Colors.light.tint} />
            </Pressable>
        </View>
        <Alerts />
        <Stats />


        <SurfaceCard
          onPress={() => { 
            if (permission?.granted) { 
              setScannedItems([]);
              setShowScanner(true); 
            } else { 
              void requestPermission().then((res) => {
                if (res.granted) {
                  setScannedItems([]);
                  setShowScanner(true);
                }
              }); 
            } 
          }}
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
        
        <Modal visible={showScanner} animationType="slide"         onRequestClose={() => {
          // Clean up all tracking when closing scanner
          if (frameTrackingIntervalRef.current) {
            clearInterval(frameTrackingIntervalRef.current);
            frameTrackingIntervalRef.current = null;
          }
          if (barcodeDetectionTimeoutRef.current) {
            clearTimeout(barcodeDetectionTimeoutRef.current);
            barcodeDetectionTimeoutRef.current = null;
          }
          if (barcodeLostTimeoutRef.current) {
            clearTimeout(barcodeLostTimeoutRef.current);
            barcodeLostTimeoutRef.current = null;
          }
          setShowScanner(false);
        }}>
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onCameraReady={() => {
                // Reset barcode tracking when camera starts
                lastBarcodeValueRef.current = null;
                lastBarcodeDetectionTimeRef.current = 0;

                // Start frame tracking to detect when barcode is lost
                frameTrackingIntervalRef.current = setInterval(() => {
                  const now = Date.now();
                  // If no barcode detected for more than 1 second, consider it lost
                  if (now - lastBarcodeDetectionTimeRef.current > 1000) {
                    lastBarcodeValueRef.current = null;
                  }
                }, 200); // Check every 200ms
              }}
              onBarcodeScanned={({ data, bounds }: any) => {
                console.log('Barcode detected:', { data, bounds });

                const now = Date.now();
                lastBarcodeDetectionTimeRef.current = now;

                const value = String(data);

                // Clear any existing lost timeout
                if (barcodeLostTimeoutRef.current) {
                  clearTimeout(barcodeLostTimeoutRef.current);
                }

                // If this is the same barcode we just scanned, ignore it
                if (lastBarcodeValueRef.current === value && now - lastScanTimeRef.current < 2000) {
                  console.log('Barcode rejected - same barcode, too recent');
                  return;
                }

                // If we have a different barcode in view, consider the previous one lost
                if (lastBarcodeValueRef.current && lastBarcodeValueRef.current !== value) {
                  lastBarcodeValueRef.current = null;
                }

                // If this is a new barcode or the previous one was lost and found again
                if (lastBarcodeValueRef.current !== value) {
                  // Set a timeout to consider this barcode lost if we don't see it again
                  barcodeLostTimeoutRef.current = setTimeout(() => {
                    lastBarcodeValueRef.current = null;
                  }, 1500);

                  lastBarcodeValueRef.current = value;
                  lastScanTimeRef.current = now;
                  setScannedValue(value);

                  if (accessToken && !submitting) {
                    setSubmitting(true);
                    scanBarcode(accessToken, value)
                      .then(async (result) => {
                        if (result.found && result.product_info) {
                          setScannedItems(prev => [result, ...prev]);
                          console.log('Added to batch:', result.product_info.name);
                        } else {
                          console.log('Barcode not found in database');
                        }
                      })
                      .catch((error) => {
                        console.error('Barcode scan error:', error);
                      })
                      .finally(() => setSubmitting(false));
                  }
                }
              }}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
              } as any}
            />
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16, zIndex: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
                
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                    Items Scanned: {scannedItems.length}
                  </ThemedText>
                </View>
                
                {scannedItems.length > 0 && (
                  <Pressable 
                    onPress={async () => {
                      setShowScanner(false);
                      setIsProcessing(true);
                      
                      try {
                        for (const item of scannedItems) {
                          if (item.product_info && accessToken) {
                            await addBarcodeToInventory(accessToken, item.barcode, item.product_info);
                          }
                        }
                        console.log('All items processed successfully');
                        
                        // Trigger haptic feedback
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        
                        // Show success animation
                        setShowSuccessAnimation(true);
                        setTimeout(() => setShowSuccessAnimation(false), 2000);
                        
                        setScannedItems([]);
                        triggerRefresh();
                      } catch (e) {
                        console.error('Failed to process items:', e);
                        // Trigger error haptic feedback
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    style={({ pressed }) => [{ 
                      backgroundColor: Colors.light.tint,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      opacity: pressed ? 0.7 : 1
                    }]}
                  >
                    <ThemedText style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                      Done
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Processing Modal */}
        <Modal visible={isProcessing} transparent={true} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginBottom: 16 }} />
              <ThemedText style={styles.loadingTitle}>Processing Items</ThemedText>
              <ThemedText style={styles.loadingText}>
                Using AI to organize your {scannedItems.length} item{scannedItems.length !== 1 ? 's' : ''} with expiration dates...
              </ThemedText>
            </View>
          </View>
        </Modal>

        {/* Notification Popup */}
        {showNotifications && (
          <NotificationPopup
            accessToken={accessToken || undefined}
            onClose={() => setShowNotifications(false)}
          />
        )}

        {/* Success Animation */}
        {showSuccessAnimation && (
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successContent, { transform: [{ scale: successScale }] }]}>
              <View style={styles.successIcon}>
                <IconSymbol name="checkmark.circle.fill" size={80} color="#4CAF50" />
              </View>
              <ThemedText style={styles.successTitle}>Success!</ThemedText>
              <ThemedText style={styles.successMessage}>
                Item added to your fridge
              </ThemedText>
            </Animated.View>
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.cardMuted,
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
  scanResultContainer: {
    flex: 1,
    padding: 20,
  },
  scanResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  scanResultContent: {
    flex: 1,
  },
  barcodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#666',
  },
  productInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  productBrand: {
    fontSize: 16,
    marginBottom: 4,
    color: '#666',
  },
  productQuantity: {
    fontSize: 16,
    marginBottom: 4,
    color: '#666',
  },
  productCategory: {
    fontSize: 16,
    marginBottom: 4,
    color: '#666',
  },
  notFoundText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 300,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  successIcon: {
    marginBottom: 16,
    transform: [{ scale: 1.2 }],
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});


