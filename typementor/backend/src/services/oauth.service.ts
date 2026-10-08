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
  const targetClientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

  const ticket = await client.verifyIdToken({
    idToken,
    audience: targetClientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new Error('Google token payload is invalid or empty.');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: !!payload.email_verified,
    name: payload.name || 'Google User',
    picture: payload.picture,
  };
};
