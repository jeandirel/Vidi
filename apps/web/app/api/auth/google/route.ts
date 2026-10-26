import { cookies } from 'next/headers';
import {
  generatePkcePair,
  getGoogleAuthorizationUrl,
  getGoogleRedirectUri,
  isGoogleAuthAvailable,
} from '@/lib/google-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/app';

  if (!isGoogleAuthAvailable()) {
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set(
      'oauth_error',
      'Configuration Google OAuth requise : Renseignez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans votre .env.',
    );
    return Response.redirect(loginUrl.toString(), 302);
  }

  const { codeVerifier, codeChallenge, state } = generatePkcePair();
  const host = request.headers.get('host') || undefined;
  const redirectUri = getGoogleRedirectUri(host);

  const authUrl = getGoogleAuthorizationUrl(state, codeChallenge, redirectUri);

  const cookieJar = await cookies();
  const oauthSessionData = JSON.stringify({
    state,
    codeVerifier,
    returnTo,
  });

  cookieJar.set('vidi_google_oauth', oauthSessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return Response.redirect(authUrl, 302);
}
