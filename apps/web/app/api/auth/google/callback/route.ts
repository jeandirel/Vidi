import { cookies } from 'next/headers';
import { db } from '@vidi/db';
import { randomBytes } from 'node:crypto';
import { hashPassword, newSession } from '@/lib/auth';
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getGoogleRedirectUri,
} from '@/lib/google-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const cookieJar = await cookies();
  const oauthCookie = cookieJar.get('vidi_google_oauth')?.value;

  // Clear the OAuth handshake cookie
  cookieJar.delete('vidi_google_oauth');

  if (errorParam) {
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set('oauth_error', `Connexion Google refusée ou annulée : ${errorParam}`);
    return Response.redirect(loginUrl.toString(), 302);
  }

  if (!code || !state || !oauthCookie) {
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set(
      'oauth_error',
      'Session de connexion Google expirée ou invalide. Veuillez réessayer.',
    );
    return Response.redirect(loginUrl.toString(), 302);
  }

  let cookieData: { state: string; codeVerifier: string; returnTo?: string };
  try {
    cookieData = JSON.parse(oauthCookie);
  } catch {
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set('oauth_error', 'Données de session corrompues.');
    return Response.redirect(loginUrl.toString(), 302);
  }

  if (cookieData.state !== state) {
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set('oauth_error', 'Échec de vérification CSRF (état invalide).');
    return Response.redirect(loginUrl.toString(), 302);
  }

  try {
    const host = request.headers.get('host') || undefined;
    const redirectUri = getGoogleRedirectUri(host);

    // 1. Exchange authorization code for Google tokens
    const { accessToken } = await exchangeGoogleCode(
      code,
      cookieData.codeVerifier,
      redirectUri,
    );

    // 2. Fetch authenticated profile
    const profile = await fetchGoogleUserInfo(accessToken);

    if (!process.env.DATABASE_URL) {
      const loginUrl = new URL('/login', url.origin);
      loginUrl.searchParams.set(
        'oauth_error',
        'Base de données indisponible. Impossible de créer la session.',
      );
      return Response.redirect(loginUrl.toString(), 302);
    }

    // 3. Find or create user
    let user = await db.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      const randomSecret = randomBytes(32).toString('hex');
      const passwordHash = await hashPassword(randomSecret);

      user = await db.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          passwordHash,
          memberships: {
            create: {
              role: 'OWNER',
              workspace: {
                create: {
                  name: `${profile.name} Studio`,
                  credits: 15,
                },
              },
            },
          },
        },
      });
    }

    // 4. Issue session cookie
    await newSession(user.id);

    // 5. Redirect to destination
    const destination = cookieData.returnTo && cookieData.returnTo.startsWith('/')
      ? cookieData.returnTo
      : '/app';

    return Response.redirect(new URL(destination, url.origin).toString(), 302);
  } catch (error) {
    console.error('Google OAuth callback error', error);
    const loginUrl = new URL('/login', url.origin);
    loginUrl.searchParams.set(
      'oauth_error',
      'Une erreur est survenue lors de l’authentification Google. Veuillez réessayer.',
    );
    return Response.redirect(loginUrl.toString(), 302);
  }
}
