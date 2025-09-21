import { PropsWithChildren, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export function AuthGate({ children }: PropsWithChildren) {
  const { status, loginWithApple, loginWithGoogle, error } = useAuthContext();

  const handleAppleLogin = useCallback(() => {
    void loginWithApple();
  }, [loginWithApple]);

  const handleGoogleLogin = useCallback(() => {
    void loginWithGoogle();
  }, [loginWithGoogle]);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Logo placeholder in the middle */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
          accessible
          accessibilityLabel="Leftys logo"
        />
      </View>
      
      {/* Error message if any */}
      {error && (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      )}
      
      {/* Auth buttons fixed at the bottom */}
      <View style={styles.bottomBar}>
        <View style={styles.buttonContainer}>
          <Pressable style={[styles.button, styles.appleButton]} onPress={handleAppleLogin} accessibilityRole="button" accessibilityLabel="Continue with Apple">
            <View style={styles.leftIcon}>
              <FontAwesome name="apple" size={22} color="#ffffff" />
            </View>
            <ThemedText style={[styles.buttonText, styles.appleButtonText]}>Continue with Apple</ThemedText>
          </Pressable>
          
          <Pressable style={[styles.button, styles.googleButton]} onPress={handleGoogleLogin} accessibilityRole="button" accessibilityLabel="Continue with Google">
            <View style={styles.leftIcon}>
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.googleLogo}
                contentFit="contain"
                accessibilityLabel="Google logo"
              />
            </View>
            <ThemedText style={[styles.buttonText, styles.googleButtonText]}>Continue with Google</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 28,
    marginBottom: 16,
  },
  logoPlaceholder: {
    fontSize: 20,
    color: '#666',
    borderWidth: 1,
    borderColor: '#666',
    padding: 20,
    borderRadius: 8,
    marginBottom: 30 + 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    height: 22,
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  appleButton: {
    backgroundColor: '#000000', // Apple black
  },
  googleButton: {
    backgroundColor: '#ffffff', // Google white background per branding
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 16,
  },
  appleButtonText: {
    color: '#ffffff',
  },
  googleButtonText: {
    color: '#1F1F1F',
  },
});
