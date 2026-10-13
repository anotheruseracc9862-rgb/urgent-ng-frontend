/**
 * Google OAuth 2.0 configuration and utilities
 */

// Google OAuth config - should come from environment variables
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  redirectUri:
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
    (typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : ''),
  scope: 'openid email profile',
  responseType: 'code',
  accessType: 'online',
  prompt: 'select_account',
};

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    response_type: GOOGLE_OAUTH_CONFIG.responseType,
    scope: GOOGLE_OAUTH_CONFIG.scope,
    access_type: GOOGLE_OAUTH_CONFIG.accessType,
    prompt: GOOGLE_OAUTH_CONFIG.prompt,
  });

  // Add state parameter for CSRF protection
  if (state) {
    params.append('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Generate a random state token for CSRF protection
 */
export function generateStateToken(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store state token in sessionStorage for verification
 */
export function storeStateToken(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('google_oauth_state', token);
  }
}

/**
 * Verify state token matches stored value
 */
export function verifyStateToken(token: string): boolean {
  if (typeof window === 'undefined') return false;

  const stored = sessionStorage.getItem('google_oauth_state');
  sessionStorage.removeItem('google_oauth_state');

  return stored === token;
}

/**
 * Initiate Google OAuth flow
 */
export function initiateGoogleAuth(): void {
  const state = generateStateToken();
  storeStateToken(state);

  const authUrl = getGoogleAuthUrl(state);
  window.location.href = authUrl;
}
