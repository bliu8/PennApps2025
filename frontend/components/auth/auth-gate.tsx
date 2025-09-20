import { PropsWithChildren, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';

export function AuthGate({ children }: PropsWithChildren) {
  const { status, error, login } = useAuth();
  const palette = Colors.light;

  const handleLogin = useCallback(() => {
    void login();
  }, [login]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}> 
        <View style={styles.centerContent}>
          <ActivityIndicator size="small" color={palette.tint} />
          <ThemedText style={[styles.message, { color: palette.subtleText }]}>Preparing secure session…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <SurfaceCard tone="highlight" style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Welcome to Leftys
        </ThemedText>
        <ThemedText style={[styles.message, { color: palette.subtleText }]}>
          Sign in with Auth0 to publish postings, run impact nudges, and keep your scan history synced.
        </ThemedText>
        {error ? (
          <ThemedText style={[styles.error, { color: palette.warning }]}>{error}</ThemedText>
        ) : null}
        <Pressable style={[styles.button, { backgroundColor: palette.tint }]} onPress={handleLogin}>
          <ThemedText style={styles.buttonLabel}>Continue with Auth0</ThemedText>
        </Pressable>
      </SurfaceCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    gap: 12,
  },
  card: {
    width: '90%',
    maxWidth: 420,
    padding: 24,
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
