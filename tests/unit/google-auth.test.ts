import {
  generatePkcePair,
  getGoogleAuthorizationUrl,
  getGoogleRedirectUri,
  isGoogleAuthAvailable,
} from '../../apps/web/lib/google-auth';

describe('Google OAuth Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('detects when Google credentials are not configured', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(isGoogleAuthAvailable()).toBe(false);
  });

  test('detects when Google credentials are fully configured', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    expect(isGoogleAuthAvailable()).toBe(true);
  });

  test('generates expected redirect URI default and explicit override', () => {
    delete process.env.GOOGLE_REDIRECT_URI;
    process.env.APP_URL = 'https://vidi.ad';
    expect(getGoogleRedirectUri()).toBe('https://vidi.ad/api/auth/google/callback');

    process.env.GOOGLE_REDIRECT_URI = 'https://custom.vidi.ad/callback';
    expect(getGoogleRedirectUri()).toBe('https://custom.vidi.ad/callback');
  });

  test('generates cryptographic PKCE pair with valid S256 challenge', () => {
    const { codeVerifier, codeChallenge, state } = generatePkcePair();
    expect(codeVerifier).toBeDefined();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(40);
    expect(codeChallenge).toBeDefined();
    expect(state).toBeDefined();
    expect(codeChallenge).not.toBe(codeVerifier);
  });

  test('constructs valid Google OAuth authorization URL', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-123.apps.googleusercontent.com';
    const authUrl = getGoogleAuthorizationUrl(
      'test-state-abc',
      'test-challenge-xyz',
      'https://vidi.ad/api/auth/google/callback',
    );

    const parsed = new URL(authUrl);
    expect(parsed.hostname).toBe('accounts.google.com');
    expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-123.apps.googleusercontent.com');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toContain('openid');
    expect(parsed.searchParams.get('scope')).toContain('email');
    expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge-xyz');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('state')).toBe('test-state-abc');
  });
});
