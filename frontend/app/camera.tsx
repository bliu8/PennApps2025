import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

export default function CameraModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const theme = 'light';
  const palette = Colors[theme];

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const onClose = () => {
    router.back();
  };

  const onCapture = async () => {
    if (isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current?.takePictureAsync({ quality: 1, skipProcessing: Platform.OS === 'ios' });
      if (photo?.uri) {
        const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
        if (returnTo) {
          router.replace({ pathname: returnTo as any, params: { imageUri: photo.uri } });
        } else {
          router.back();
        }
      }
    } catch (e) {
      // no-op for MVP
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={[]}>
        <Pressable onPress={requestPermission} style={({ pressed }) => [styles.permissionButton, { opacity: pressed ? 0.7 : 1 }] }>
          <IconSymbol name="camera.fill" size={22} color={palette.background} />
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={false} />

      <SafeAreaView style={styles.overlay} edges={[]}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}>
            <IconSymbol name="xmark.circle.fill" size={30} color={palette.background} />
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          <Pressable onPress={onCapture} style={({ pressed }) => [styles.captureButton, { opacity: pressed ? 0.7 : 1 }]}>
            {isCapturing ? (
              <ActivityIndicator color={palette.background} />
            ) : (
              <IconSymbol name="camera.circle.fill" size={64} color={palette.background} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  topBar: {
    alignItems: 'flex-start',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  permissionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


