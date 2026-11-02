import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env.js';

const client = new OAuth2Client();

export async function verifyGoogleCredential(credential: string, nonce: string) {
  const ticket = await client.verifyIdToken({ idToken: credential, audience: config.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified || (payload as typeof payload & { nonce?: string }).nonce !== nonce) {
    throw new Error('Google identity could not be verified.');
  }
  return payload;
}
