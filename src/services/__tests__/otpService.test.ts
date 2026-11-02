import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendOtp,
  verifyOtp,
  maskDestination,
} from '../otpService';
import * as alertService from '../alertService';

// Mock alertService.createAlert so tests don't make network calls
vi.mock('../alertService', () => ({
  createAlert: vi.fn().mockResolvedValue(true),
}));

describe('otpService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('maskDestination', () => {
    it('masks phone numbers leaving the last 4 digits visible', () => {
      expect(maskDestination('+91 98765 43210', 'sms')).toBe('••••••3210');
      expect(maskDestination('1234567890', 'sms')).toBe('••••••7890');
    });

    it('masks emails preserving the first 2 characters and the domain', () => {
      expect(maskDestination('bhavika@voyana.com', 'email')).toBe('bh••••••@voyana.com');
      expect(maskDestination('alex.morgan@gmail.com', 'email')).toBe('al••••••@gmail.com');
    });

    it('returns default fallback when destination is empty or invalid', () => {
      expect(maskDestination('', 'sms')).toBe('••••••4321');
      expect(maskDestination('', 'email')).toBe('••••••@voyana.com');
    });
  });

  describe('sendOtp and verifyOtp lifecycle', () => {
    it('successfully sends an OTP and notifies alertService', async () => {
      const userId = 'usr-test-lifecycle-1';
      const result = await sendOtp(userId, 'sms', '+1 (555) 123-4567');

      expect(result.success).toBe(true);
      expect(result.maskedDestination).toBe('••••••4567');
      expect(result.cooldownSeconds).toBe(30);
      expect(result.expiresInSeconds).toBe(300);

      expect(alertService.createAlert).toHaveBeenCalledTimes(1);
      const alertCall = (alertService.createAlert as any).mock.calls[0][0];
      expect(alertCall.title).toBe('Payment Authorization Code');
      expect(alertCall.message).toMatch(/\d{6}/); // Contains 6-digit code
    });

    it('enforces 30-second cooldown on consecutive requests', async () => {
      const userId = 'usr-test-cooldown-2';
      const first = await sendOtp(userId, 'sms', '+1 (555) 123-4567');
      expect(first.success).toBe(true);

      const second = await sendOtp(userId, 'sms', '+1 (555) 123-4567');
      expect(second.success).toBe(false);
      expect(second.message).toContain('Please wait');
      expect(second.cooldownSeconds).toBeGreaterThan(0);
    });

    it('verifies a valid OTP code and clears the session', async () => {
      const userId = 'usr-test-verify-3';
      await sendOtp(userId, 'sms', '+1 (555) 123-4567');
      const alertCall = (alertService.createAlert as any).mock.calls[0][0];
      const match = alertCall.message.match(/(\d{6})/);
      const code = match ? match[1] : '';

      expect(code).toHaveLength(6);

      const verifyResult = verifyOtp(userId, code);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.message).toBe('Code verified successfully.');

      // Second verification should fail as session is cleared
      const secondVerify = verifyOtp(userId, code);
      expect(secondVerify.success).toBe(false);
      expect(secondVerify.message).toContain('No active OTP verification session found');
    });

    it('decrements remaining attempts on wrong code and blocks after 3 failures', async () => {
      const userId = 'usr-test-attempts-4';
      await sendOtp(userId, 'sms', '+1 (555) 123-4567');

      // Attempt 1 (wrong)
      const res1 = verifyOtp(userId, '000000');
      expect(res1.success).toBe(false);
      expect(res1.attemptsRemaining).toBe(2);

      // Attempt 2 (wrong)
      const res2 = verifyOtp(userId, '111111');
      expect(res2.success).toBe(false);
      expect(res2.attemptsRemaining).toBe(1);

      // Attempt 3 (wrong - should lock out)
      const res3 = verifyOtp(userId, '222222');
      expect(res3.success).toBe(false);
      expect(res3.attemptsRemaining).toBe(0);
      expect(res3.maxAttemptsExceeded).toBe(true);

      // Subsequent attempt
      const res4 = verifyOtp(userId, '333333');
      expect(res4.success).toBe(false);
      expect(res4.message).toContain('No active OTP verification session found');
    });

    it('handles verification when no active session exists', () => {
      const result = verifyOtp('non-existent-user', '123456');
      expect(result.success).toBe(false);
      expect(result.message).toContain('No active OTP verification session found');
    });
  });
});
