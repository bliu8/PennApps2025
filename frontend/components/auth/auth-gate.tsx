import { PropsWithChildren, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export function AuthGate({ children }: PropsWithChildren) {
  const { status, login } = useAuth();

  const handleLogin = useCallback(() => {
    void login();
  }, [login]);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <ThemedText type="title">Leftys</ThemedText>
      <Pressable style={styles.button} onPress={handleLogin}>
        <ThemedText style={styles.buttonText}>Sign In</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  button: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.dark.background,
    fontSize: 16,
  },
});
