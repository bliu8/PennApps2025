import { useState, useCallback, useRef } from 'react';
import { 
  scanBarcodeFromImage, 
  scanBarcodeFromCamera, 
  createImageFromFile,
  createImageFromUrl,
  BarcodeScanResult,
  BarcodeScanOptions 
} from '@/services/api';

export interface UseBarcodeScannerOptions {
  onScan?: (result: BarcodeScanResult) => void;
  onError?: (error: Error) => void;
  autoScan?: boolean;
  scanInterval?: number;
}

export interface UseBarcodeScannerReturn {
  isScanning: boolean;
  lastResult: BarcodeScanResult | null;
  error: Error | null;
  scanFromImage: (imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) => Promise<void>;
  scanFromFile: (file: File) => Promise<void>;
  scanFromCamera: (videoElement: HTMLVideoElement) => Promise<void>;
  scanFromUrl: (url: string) => Promise<void>;
  clearError: () => void;
  clearResult: () => void;
}

export function useBarcodeScanner(options: UseBarcodeScannerOptions = {}): UseBarcodeScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<BarcodeScanResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { onScan, onError, autoScan = false, scanInterval = 1000 } = options;

  const handleScan = useCallback((result: BarcodeScanResult) => {
    setLastResult(result);
    onScan?.(result);
  }, [onScan]);

  const handleError = useCallback((err: Error) => {
    setError(err);
    onError?.(err);
  }, [onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  const scanFromImage = useCallback(async (
    imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    scanOptions: BarcodeScanOptions = {}
  ) => {
    try {
      setIsScanning(true);
      setError(null);

      const results = await scanBarcodeFromImage(imageElement, scanOptions);
      
      if (results.length > 0) {
        handleScan(results[0]);
      } else {
        handleScan({
          barcode: '',
          found: false,
        });
      }
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsScanning(false);
    }
  }, [handleScan, handleError]);

  const scanFromFile = useCallback(async (file: File, scanOptions: BarcodeScanOptions = {}) => {
    try {
      setIsScanning(true);
      setError(null);

      // Check if we're in a web environment
      if (typeof window === 'undefined') {
        throw new Error('File scanning is only available in web environments');
      }

      const imageElement = await createImageFromFile(file);
      await scanFromImage(imageElement, scanOptions);
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsScanning(false);
    }
  }, [scanFromImage, handleError]);

  const scanFromCamera = useCallback(async (
    videoElement: HTMLVideoElement,
    scanOptions: BarcodeScanOptions = {}
  ) => {
    try {
      setIsScanning(true);
      setError(null);

      const results = await scanBarcodeFromCamera(videoElement, scanOptions);
      
      if (results.length > 0) {
        handleScan(results[0]);
      } else {
        handleScan({
          barcode: '',
          found: false,
        });
      }
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsScanning(false);
    }
  }, [handleScan, handleError]);

  const scanFromUrl = useCallback(async (url: string, scanOptions: BarcodeScanOptions = {}) => {
    try {
      setIsScanning(true);
      setError(null);

      // Check if we're in a web environment
      if (typeof window === 'undefined') {
        throw new Error('URL scanning is only available in web environments');
      }

      const imageElement = await createImageFromUrl(url);
      await scanFromImage(imageElement, scanOptions);
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsScanning(false);
    }
  }, [scanFromImage, handleError]);

  return {
    isScanning,
    lastResult,
    error,
    scanFromImage,
    scanFromFile,
    scanFromCamera,
    scanFromUrl,
    clearError,
    clearResult,
  };
}
