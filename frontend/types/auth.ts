export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export type AuthUser = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};
