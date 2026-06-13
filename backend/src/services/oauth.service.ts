import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GooglePayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export const verifyGoogleToken = async (idToken: string): Promise<GooglePayload> => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in backend environment.');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
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
