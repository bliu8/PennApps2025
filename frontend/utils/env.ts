const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
export const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
export const AUTH0_AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;

// Optional: explicit Auth0 connection identifiers, e.g., 'apple' or 'google-oauth2' or a custom id like 'con_...'
export const AUTH0_APPLE_CONNECTION = process.env.EXPO_PUBLIC_AUTH0_APPLE_CONNECTION ?? 'apple';
export const AUTH0_GOOGLE_CONNECTION = process.env.EXPO_PUBLIC_AUTH0_GOOGLE_CONNECTION ?? 'google-oauth2';
