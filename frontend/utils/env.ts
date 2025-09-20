const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
export const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
export const AUTH0_AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;
