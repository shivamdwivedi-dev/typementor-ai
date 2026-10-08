import { OAuth2Client } from 'google-auth-library';

const DEFAULT_CLIENT_ID = '1034864032860-5h45uu3mjde019p1v43crq2inksns867.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GooglePayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export const verifyGoogleToken = async (idToken: string): Promise<GooglePayload> => {
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const audiences = Array.from(new Set([envClientId, DEFAULT_CLIENT_ID].filter(Boolean))) as string[];

  const ticket = await client.verifyIdToken({
    idToken,
    audience: audiences,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new Error('Google token payload is invalid or empty.');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    email_verified: !!payload.email_verified,
    name: payload.name || 'Google User',
    picture: payload.picture,
  };
};
