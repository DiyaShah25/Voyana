import { OAuth2Client } from 'google-auth-library';
import { verifyGoogleCredential } from '../services/google-auth.service.js';
import { config } from '../config/env.js';

describe('Google credential verification', () => {
  afterEach(() => jest.restoreAllMocks());
  it('uses the official verifier with the configured audience and checks the nonce', async () => {
    const payload = { sub: 'google-sub', email: 'test@gmail.com', email_verified: true, nonce: 'expected' };
    const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => payload } as never);
    expect(await verifyGoogleCredential('signed-token', 'expected')).toBe(payload);
    expect(verify).toHaveBeenCalledWith({ idToken: 'signed-token', audience: config.googleClientId });
    await expect(verifyGoogleCredential('signed-token', 'wrong-nonce')).rejects.toThrow();
  });
  it('rejects identities with an unverified email or missing Google subject', async () => {
    const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
    verify.mockResolvedValue({ getPayload: () => ({ sub: 'google-sub', email: 'test@gmail.com', email_verified: false, nonce: 'expected' }) } as never);
    await expect(verifyGoogleCredential('token', 'expected')).rejects.toThrow();
    verify.mockResolvedValue({ getPayload: () => undefined } as never);
    await expect(verifyGoogleCredential('token', 'expected')).rejects.toThrow();
  });
});
