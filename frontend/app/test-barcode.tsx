import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { BarcodeDemo } from '@/components/barcode-demo';

export default function TestBarcodeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <BarcodeDemo />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
});
