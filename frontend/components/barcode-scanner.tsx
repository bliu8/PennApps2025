import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { BarcodeScanResult, addBarcodeToInventory } from '@/services/api';
import { useAuthContext } from '@/context/AuthContext';

interface BarcodeScannerProps {
  onScan?: (result: BarcodeScanResult) => void;
  onError?: (error: Error) => void;
  style?: any;
}

export function BarcodeScanner({ onScan, onError, style }: BarcodeScannerProps) {
  const [isActive, setIsActive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { accessToken } = useAuthContext();

  const {
    isScanning,
    lastResult,
    error,
    scanFromCamera,
    scanFromUrl,
    clearError,
    clearResult,
  } = useBarcodeScanner({
    onScan: (result) => {
      console.log('Barcode scan result:', result);
      if (result.found) {
        console.log('Barcode found, showing modal');
        onScan?.(result);
        setIsActive(false);
        setShowAddModal(true);
      } else {
        console.log('No barcode found');
        Alert.alert('No Barcode Found', 'No barcode was detected in the image');
        setIsActive(false);
      }
    },
    onError: (err) => {
      onError?.(err);
      Alert.alert('Scan Error', err.message);
      setIsActive(false);
    },
  });

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const startScanning = async () => {
    if (!permission?.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to scan barcodes');
      return;
    }

    try {
      setIsActive(true);
      clearError();
      clearResult();

      // For now, we'll use a simple approach - take a photo and scan it
      // This is a simplified implementation for the MVP
      Alert.alert(
        'Camera Scanning', 
        'Camera scanning is in development. For now, please use the "Scan Test Image" button to test barcode functionality.',
        [
          { text: 'OK', onPress: () => setIsActive(false) }
        ]
      );
    } catch (err) {
      onError?.(err as Error);
    }
  };

  const stopScanning = () => {
    setIsActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleAddToInventory = async () => {
    console.log('handleAddToInventory called', { lastResult, accessToken: !!accessToken });
    if (!lastResult?.product_info || !accessToken) {
      Alert.alert('Error', 'No product information available or not authenticated');
      return;
    }

    setAddingToInventory(true);
    
    try {
      const response = await addBarcodeToInventory(accessToken, lastResult.barcode, lastResult.product_info);
      
      if (response.success) {
        Alert.alert(
          'Success!', 
          `Added "${lastResult.product_info.name || 'Unknown Product'}" to your inventory`
        );
        setShowAddModal(false);
        clearResult();
      } else {
        Alert.alert('Error', response.error || 'Failed to add to inventory');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to add to inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAddingToInventory(false);
    }
  };

  const handleCloseModal = () => {
    console.log('handleCloseModal called');
    setShowAddModal(false);
    clearResult();
  };

  const handleTestScan = async () => {
    try {
      clearError();
      clearResult();
      
      // Use a test barcode image
      const testImageUrl = 'https://images.openfoodfacts.org/images/products/003/800/035/9217/front_en.46.400.jpg';
      await scanFromUrl(testImageUrl);
    } catch (err) {
      onError?.(err as Error);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, style]}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, style]}>
        <Text>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Debug logging
  console.log('BarcodeScanner render:', { showAddModal, lastResult: !!lastResult, isScanning });

  return (
    <View style={[styles.container, style]}>
      {isActive ? (
        <View style={styles.scannerContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onCameraReady={() => {
              // Camera is ready, start scanning
              startScanning();
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
            <Text style={styles.instructionText}>
              Position the barcode within the frame
            </Text>
          </View>
          <TouchableOpacity style={styles.stopButton} onPress={stopScanning}>
            <Text style={styles.buttonText}>Stop Scanning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.startContainer}>
          <Text style={styles.title}>Barcode Scanner</Text>
          <Text style={styles.description}>
            Tap the button below to start scanning barcodes
          </Text>
          <TouchableOpacity style={styles.button} onPress={startScanning}>
            <Text style={styles.buttonText}>
              {isScanning ? 'Scanning...' : 'Start Camera Scan'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.testButton]} 
            onPress={handleTestScan}
            disabled={isScanning}
          >
            <Text style={styles.buttonText}>
              {isScanning ? 'Scanning...' : 'Test with Sample Image'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {lastResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Scan Result:</Text>
          <Text style={styles.resultText}>
            Barcode: {lastResult.barcode}
          </Text>
          {lastResult.product_info && (
            <>
              <Text style={styles.resultText}>
                Product: {lastResult.product_info.name}
              </Text>
              <Text style={styles.resultText}>
                Brand: {lastResult.product_info.brand}
              </Text>
            </>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
          <TouchableOpacity style={styles.button} onPress={clearError}>
            <Text style={styles.buttonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add to Inventory Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to Inventory</Text>
            
            {lastResult?.product_info && (
              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {lastResult.product_info.name || 'Unknown Product'}
                </Text>
                {lastResult.product_info.brand && (
                  <Text style={styles.productBrand}>
                    Brand: {lastResult.product_info.brand}
                  </Text>
                )}
                {lastResult.product_info.quantity && (
                  <Text style={styles.productDetail}>
                    Quantity: {lastResult.product_info.quantity}
                  </Text>
                )}
                {lastResult.product_info.categories && lastResult.product_info.categories.length > 0 && (
                  <Text style={styles.productDetail}>
                    Category: {lastResult.product_info.categories.join(', ')}
                  </Text>
                )}
                {lastResult.product_info.allergens && lastResult.product_info.allergens.length > 0 && (
                  <Text style={styles.productDetail}>
                    Allergens: {lastResult.product_info.allergens.join(', ')}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton, addingToInventory && styles.addButtonDisabled]} 
                onPress={handleAddToInventory}
                disabled={addingToInventory}
              >
                <Text style={styles.addButtonText}>
                  {addingToInventory ? 'Adding...' : 'Add to Inventory'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 8,
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  productInfo: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  productBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
