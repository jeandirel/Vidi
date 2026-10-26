import { createHash, randomBytes } from 'node:crypto';

export interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  picture?: string;
}

export function isGoogleAuthAvailable(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleRedirectUri(requestHost?: string): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const appUrl =
    process.env.APP_URL || (requestHost ? `http://${requestHost}` : 'http://localhost:3000');
  return `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
}

export function generatePkcePair() {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state = randomBytes(24).toString('base64url');
  return { codeVerifier, codeChallenge, state };
}

export function getGoogleAuthorizationUrl(
  state: string,
  codeChallenge: string,
  redirectUri: string,
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID_MISSING');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ accessToken: string; idToken: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CONFIG_MISSING');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google token exchange error', { status: response.status, body: errorBody });
    throw new Error('GOOGLE_TOKEN_EXCHANGE_FAILED');
  }

  const data = (await response.json()) as { access_token: string; id_token: string };
  return { accessToken: data.access_token, idToken: data.id_token };
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('GOOGLE_USERINFO_FAILED');
  }

  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
    picture?: string;
  };

  if (!data.email || !data.sub) {
    throw new Error('GOOGLE_INVALID_PROFILE');
  }

  return {
    sub: data.sub,
    email: data.email.toLowerCase(),
    name: data.name || data.email.split('@')[0] || 'Utilisateur Google',
    email_verified: Boolean(data.email_verified),
    picture: data.picture,
  };
}
