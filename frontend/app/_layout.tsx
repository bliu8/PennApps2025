import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import { InventoryRefreshProvider } from '@/context/InventoryRefreshContext';
import { AuthGate } from '@/components/auth/auth-gate';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InventoryRefreshProvider>
        <SafeAreaProvider>
          <ThemeProvider value={DefaultTheme}>
            <AuthGate>
              <>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                  <Stack.Screen name="camera" options={{ presentation: 'modal', headerShown: false }} />
                </Stack>
                <StatusBar style="dark" />
              </>
            </AuthGate>
          </ThemeProvider>
        </SafeAreaProvider>
      </InventoryRefreshProvider>
    </AuthProvider>
  );
}
