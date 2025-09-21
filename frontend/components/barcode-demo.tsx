import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { BarcodeScanResult, addBarcodeToInventory } from '@/services/api';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useAuthContext } from '@/context/AuthContext';

export function BarcodeDemo() {
  const [scanResults, setScanResults] = useState<BarcodeScanResult[]>([]);
  const [addingToInventory, setAddingToInventory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<BarcodeScanResult | null>(null);
  const { accessToken } = useAuthContext();
  
  const {
    isScanning,
    lastResult,
    error,
    scanFromFile,
    scanFromUrl,
    clearError,
    clearResult,
  } = useBarcodeScanner({
    onScan: (result) => {
      console.log('BarcodeDemo onScan:', result);
      if (result.found) {
        setScanResults(prev => [result, ...prev]);
        setSelectedResult(result);
        setShowAddModal(true);
      } else {
        Alert.alert('No Barcode Found', 'No barcode was detected in the image');
      }
    },
    onError: (err) => {
      Alert.alert('Scan Error', err.message);
    },
  });

  const handleFileUpload = () => {
    // This would typically open a file picker
    // For demo purposes, we'll use a test image URL
    const testImageUrl = 'https://images.openfoodfacts.org/images/products/003/800/035/9217/front_en.46.400.jpg';
    scanFromUrl(testImageUrl);
  };

  const clearResults = () => {
    setScanResults([]);
    clearResult();
  };

  const handleAddToInventory = async () => {
    if (!selectedResult?.product_info || !accessToken) {
      Alert.alert('Error', 'No product information available or not authenticated');
      return;
    }

    setAddingToInventory(selectedResult.barcode);
    
    try {
      console.log('Adding to inventory:', selectedResult);
      const response = await addBarcodeToInventory(accessToken, selectedResult.barcode, selectedResult.product_info);
      
      if (response.success) {
        Alert.alert(
          'Success!', 
          `Added "${selectedResult.product_info.name || 'Unknown Product'}" to your inventory`
        );
        setShowAddModal(false);
        setSelectedResult(null);
      } else {
        Alert.alert('Error', response.error || 'Failed to add to inventory');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to add to inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAddingToInventory(null);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedResult(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barcode Scanner Demo</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isScanning && styles.buttonDisabled]} 
          onPress={handleFileUpload}
          disabled={isScanning}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Scanning...' : 'Scan Test Image'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={clearResults}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
          <TouchableOpacity style={styles.button} onPress={clearError}>
            <Text style={styles.buttonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Scan Results ({scanResults.length})</Text>
          {scanResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={styles.resultBarcode}>Barcode: {result.barcode}</Text>
              {result.product_info && (
                <>
                  <Text style={styles.resultText}>
                    Product: {result.product_info.name || 'Unknown'}
                  </Text>
                  <Text style={styles.resultText}>
                    Brand: {result.product_info.brand || 'Unknown'}
                  </Text>
                  <Text style={styles.resultText}>
                    Category: {result.product_info.categories?.join(', ') || 'Unknown'}
                  </Text>
                  {result.product_info.allergens && result.product_info.allergens.length > 0 && (
                    <Text style={styles.resultText}>
                      Allergens: {result.product_info.allergens.join(', ')}
                    </Text>
                  )}
                  {result.product_info.quantity && (
                    <Text style={styles.resultText}>
                      Quantity: {result.product_info.quantity}
                    </Text>
                  )}
                  {result.product_info.serving_size && (
                    <Text style={styles.resultText}>
                      Serving Size: {result.product_info.serving_size}
                    </Text>
                  )}
                  {result.product_info.net_weight && (
                    <Text style={styles.resultText}>
                      Net Weight: {result.product_info.net_weight}
                    </Text>
                  )}
                  {result.product_info.gross_weight && (
                    <Text style={styles.resultText}>
                      Gross Weight: {result.product_info.gross_weight}
                    </Text>
                  )}
                </>
              )}
              <TouchableOpacity
                style={styles.addToInventoryButton}
                onPress={() => {
                  setSelectedResult(result);
                  setShowAddModal(true);
                }}
                disabled={addingToInventory === result.barcode}
              >
                <Text style={styles.addToInventoryButtonText}>
                  {addingToInventory === result.barcode ? 'Adding...' : 'Add to Inventory'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
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
            
            {selectedResult?.product_info && (
              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {selectedResult.product_info.name || 'Unknown Product'}
                </Text>
                {selectedResult.product_info.brand && (
                  <Text style={styles.productBrand}>
                    Brand: {selectedResult.product_info.brand}
                  </Text>
                )}
                {selectedResult.product_info.quantity && (
                  <Text style={styles.productDetail}>
                    Quantity: {selectedResult.product_info.quantity}
                  </Text>
                )}
                {selectedResult.product_info.categories && selectedResult.product_info.categories.length > 0 && (
                  <Text style={styles.productDetail}>
                    Category: {selectedResult.product_info.categories.join(', ')}
                  </Text>
                )}
                {selectedResult.product_info.allergens && selectedResult.product_info.allergens.length > 0 && (
                  <Text style={styles.productDetail}>
                    Allergens: {selectedResult.product_info.allergens.join(', ')}
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
                disabled={!!addingToInventory}
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 10,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultBarcode: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 3,
    color: '#333',
  },
  addToInventoryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  addToInventoryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
