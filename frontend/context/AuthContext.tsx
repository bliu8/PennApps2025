import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { AuthStatus, AuthUser } from '@/types/auth';
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '@/utils/env';

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function randomString(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
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
  const [status, setStatus] = useState<AuthStatus>('unauthenticated');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expectedStateRef = useRef<string | null>(null);

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
  }, [resetTimer]);

  const scheduleExpiry = useCallback(
    (expiresAt: number) => {
      resetTimer();
      const ttl = expiresAt - Date.now();
      if (ttl <= 0) {
        clearSession();
        return;
      }
      logoutTimerRef.current = setTimeout(() => {
        clearSession();
        setError('Session expired — please sign in again.');
      }, ttl);
    },
    [clearSession, resetTimer],
  );

  const login = useCallback(async () => {
    setError(null);

    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_AUDIENCE) {
      setStatus('error');
      setError('Auth0 environment variables are missing.');
      return;
    }

    const redirectUri = Linking.createURL('/auth/callback');
    const state = randomString(32);
    expectedStateRef.current = state;

    const authorizeUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
    authorizeUrl.searchParams.set('response_type', 'token');
    authorizeUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', 'openid profile email');
    authorizeUrl.searchParams.set('audience', AUTH0_AUDIENCE);
    authorizeUrl.searchParams.set('state', state);

    setStatus('loading');
    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), redirectUri);

    if (result.type !== 'success' || !result.url) {
      setStatus('unauthenticated');
      if (result.type === 'cancel') {
        setError('Login was cancelled.');
      } else if (result.type === 'dismiss') {
        setError('Login flow was dismissed before completion.');
      }
      return;
    }

    const fragment = result.url.split('#')[1];
    if (!fragment) {
      setStatus('unauthenticated');
      setError('Auth0 did not return an access token.');
      return;
    }

    const params = new URLSearchParams(fragment);
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
      setAccessToken(token);
      setUser(profile);
      setStatus('authenticated');
      const expiresAt = Date.now() + Number(expiresIn) * 1000;
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

  const logout = useCallback(async () => {
    clearSession();
    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
      return;
    }
    const returnTo = Linking.createURL('/');
    const logoutUrl = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
    logoutUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);
    logoutUrl.searchParams.set('returnTo', returnTo);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = logoutUrl.toString();
      }
      return;
    }

    // Native platforms require opening the browser to clear the Auth0 session.
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await WebBrowser.openBrowserAsync(logoutUrl.toString());
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      status,
      accessToken,
      user,
      error,
      login,
      logout,
    }),
    [status, accessToken, user, error, login, logout],
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
