import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

// ensure WebBrowser can complete pending auth sessions on native
WebBrowser.maybeCompleteAuthSession();

import { AuthStatus, AuthUser } from '@/types/auth';
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '@/utils/env';

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  error: string | null;
  loginWithApple: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (name: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  USER: 'auth_user',
  EXPIRES_AT: 'auth_expires_at',
};

function randomString(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

async function storeSession(accessToken: string, user: AuthUser, expiresAt: number) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
    await SecureStore.setItemAsync(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  } catch (error) {
    console.warn('Failed to store session:', error);
  }
}

async function getStoredSession(): Promise<{ accessToken: string; user: AuthUser; expiresAt: number } | null> {
  try {
    const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    const userString = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
    const expiresAtString = await SecureStore.getItemAsync(STORAGE_KEYS.EXPIRES_AT);

    if (!accessToken || !userString || !expiresAtString) {
      return null;
    }

    const user = JSON.parse(userString) as AuthUser;
    const expiresAt = parseInt(expiresAtString, 10);

    if (Date.now() >= expiresAt) {
      await clearStoredSession();
      return null;
    }

    return { accessToken, user, expiresAt };
  } catch (error) {
    console.warn('Failed to get stored session:', error);
    return null;
  }
}

async function clearStoredSession() {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.EXPIRES_AT);
  } catch (error) {
    console.warn('Failed to clear stored session:', error);
  }
}

async function fetchUserProfile(accessToken: string): Promise<AuthUser> {
  if (!AUTH0_DOMAIN) {
    throw new Error('Missing Auth0 domain configuration.');
  }

  const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load user profile from Auth0.');
  }

  const data = (await response.json()) as Partial<AuthUser> & { sub: string };
  return {
    sub: data.sub,
    name: data.name,
    email: data.email,
    picture: data.picture,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading'); // Start with loading to check stored session
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expectedStateRef = useRef<string | null>(null);
  const pendingSilentRenewRef = useRef<boolean>(false);

  const resetTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    resetTimer();
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    void clearStoredSession(); // clear from secure storage
  }, [resetTimer]);

  const scheduleExpiry = useCallback(
    (expiresAt: number) => {
      resetTimer();
      const now = Date.now();
      const ttl = expiresAt - now;
      if (ttl <= 0) {
        clearSession();
        return;
      }
      // Try a silent renew a bit before expiry to extend sessions seamlessly
      const renewLeewayMs = 2 * 60 * 1000; // 2 minutes
      const renewInMs = Math.max(ttl - renewLeewayMs, 5_000);
      logoutTimerRef.current = setTimeout(async () => {
        // If renew fails, set a final timer to hard-expire at real expiry
        const hardExpiryIn = Math.max(expiresAt - Date.now(), 0);
        try {
          await silentRenew();
        } catch {
          // fallback to hard-expiry so we don't log the user out prematurely
          resetTimer();
          logoutTimerRef.current = setTimeout(() => {
            clearSession();
            setError('Session expired — please sign in again.');
          }, hardExpiryIn);
        }
      }, renewInMs);
    },
    [clearSession, resetTimer],
  );

  const silentRenew = useCallback(async () => {
    if (pendingSilentRenewRef.current) return; // de-dupe
    pendingSilentRenewRef.current = true;
    try {
      if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
        throw new Error('Auth0 environment not configured.');
      }

      const redirectUri = Linking.createURL('/auth/callback');
      const state = randomString(32);
      const nonce = randomString(32);
      expectedStateRef.current = state;

      const authorizeUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
      authorizeUrl.searchParams.set('response_type', 'token');
      authorizeUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);
      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
      authorizeUrl.searchParams.set('scope', 'openid profile email');
      authorizeUrl.searchParams.set('state', state);
      authorizeUrl.searchParams.set('nonce', nonce);
      authorizeUrl.searchParams.set('prompt', 'none'); // critical for silent renew

      const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), redirectUri);
      if (result.type !== 'success' || !result.url) {
        throw new Error('Silent renew did not succeed.');
      }

      const combined = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1] ?? '';
      const params = new URLSearchParams(combined);
      const errorParam = params.get('error');
      if (errorParam) {
        throw new Error(errorParam);
      }

      const returnedState = params.get('state');
      if (!returnedState || returnedState !== expectedStateRef.current) {
        throw new Error('State mismatch during silent renew.');
      }
      expectedStateRef.current = null;

      const token = params.get('access_token');
      const expiresIn = params.get('expires_in');
      if (!token || !expiresIn) {
        throw new Error('Silent renew missing token.');
      }

      const profile = await fetchUserProfile(token);
      // Add a max cap to prevent tiny TTLs; Auth0 usually returns 24h, but just in case
      const expiresAt = Date.now() + Math.max(Number(expiresIn) * 1000, 30 * 60 * 1000); // at least 30m
      await storeSession(token, profile, expiresAt);
      setAccessToken(token);
      setUser(profile);
      setStatus('authenticated');
      scheduleExpiry(expiresAt);
    } finally {
      pendingSilentRenewRef.current = false;
    }
  }, [scheduleExpiry]);

  // CHECK IF WE HAVE A STORED SESSION
  useEffect(() => {
    async function restoreSession() {
      const storedSession = await getStoredSession();
      if (storedSession) {
        setAccessToken(storedSession.accessToken);
        setUser(storedSession.user);
        setStatus('authenticated');
        scheduleExpiry(storedSession.expiresAt);
      } else {
        setStatus('unauthenticated');
      }
    }
    void restoreSession();
  }, [scheduleExpiry]);

  const performLogin = useCallback(async (connection?: string) => {
    setError(null);

    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
      setStatus('error');
      setError('Auth0 environment variables are missing.');
      return;
    }

    const redirectUri = Linking.createURL('/auth/callback');
    console.log('🔗 DEBUG: Redirect URI =', redirectUri);
    const state = randomString(32);
    const nonce = randomString(32);
    expectedStateRef.current = state;

    const authorizeUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
    // Request only an access token via implicit flow
    authorizeUrl.searchParams.set('response_type', 'token');
    authorizeUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', 'openid profile email');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('nonce', nonce);
    // Do NOT set audience here to maximize compatibility across providers
    if (connection) {
      authorizeUrl.searchParams.set('connection', connection);
    }

    setStatus('loading');
    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), redirectUri);

    if (result.type !== 'success' || !result.url) {
      setStatus('unauthenticated');
      if (result.type === 'cancel') {
        setError('Login was cancelled.');
      } else if (result.type === 'dismiss') {
        setError('Login flow was dismissed before completion.');
      } else {
        setError('Login did not complete successfully.');
      }
      return;
    }

    // Handle error responses returned by Auth0 (either in query or fragment)
    const combined = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1] ?? '';
    const params = new URLSearchParams(combined);

    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');
    if (errorParam) {
      setStatus('unauthenticated');
      setError(errorDescription || errorParam || 'Authentication failed.');
      return;
    }

    const returnedState = params.get('state');
    if (!returnedState || returnedState !== expectedStateRef.current) {
      setStatus('unauthenticated');
      setError('State mismatch detected during login.');
      return;
    }

    expectedStateRef.current = null;

    const token = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (!token || !expiresIn) {
      setStatus('unauthenticated');
      setError('Access token was missing from the Auth0 response.');
      return;
    }

    try {
      const profile = await fetchUserProfile(token);
      // Ensure a reasonable minimum TTL to reduce overly frequent expiries from providers with small windows
      const expiresAt = Date.now() + Math.max(Number(expiresIn) * 1000, 60 * 60 * 1000); // at least 1h
      
      // Store session persistently
      await storeSession(token, profile, expiresAt);
      
      setAccessToken(token);
      setUser(profile);
      setStatus('authenticated');
      scheduleExpiry(expiresAt);
    } catch (profileError) {
      clearSession();
      setError(
        profileError instanceof Error
          ? profileError.message
          : 'Unable to complete Auth0 login — profile fetch failed.',
      );
    }
  }, [scheduleExpiry, clearSession]);

  const loginWithApple = useCallback(async () => {
    await performLogin();
  }, [performLogin]);

  const loginWithGoogle = useCallback(async () => {
    await performLogin();
  }, [performLogin]);

  const logout = useCallback(async () => {
    clearSession();
    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
      return;
    }

    // Web: redirect to Auth0 logout to clear hosted session
    if (Platform.OS === 'web') {
      const returnTo = Linking.createURL('/');
      const logoutUrl = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
      logoutUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);
      logoutUrl.searchParams.set('returnTo', returnTo);
      if (typeof window !== 'undefined') {
        window.location.href = logoutUrl.toString();
      }
      return;
    }

    // SILENT LOGOUT
    return;
  }, [clearSession]);

  const value = useMemo(
    () => ({
      status,
      accessToken,
      user,
      error,
      loginWithApple,
      loginWithGoogle,
      logout,
      updateDisplayName: (name: string) => setUser((prev) => (prev ? { ...prev, name } : prev)),
    }),
    [status, accessToken, user, error, loginWithApple, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
