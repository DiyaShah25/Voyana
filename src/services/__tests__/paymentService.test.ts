import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiryDate,
  generateTransactionReference,
  initiatePayment,
  confirmPayment,
  getTransactionHistory,
} from '../paymentService';
import * as alertService from '../alertService';

vi.mock('../alertService', () => ({
  createAlert: vi.fn().mockResolvedValue(true),
}));

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Card formatting and detection utilities', () => {
    it('detects Visa card brand starting with 4', () => {
      expect(detectCardBrand('4111 2222 3333 4444')).toBe('visa');
    });

    it('detects Mastercard brand starting with 51-55', () => {
      expect(detectCardBrand('5105 1051 0510 5105')).toBe('mastercard');
      expect(detectCardBrand('5500 0000 0000 0004')).toBe('mastercard');
    });

    it('detects Amex brand starting with 34 or 37', () => {
      expect(detectCardBrand('3400 0000 0000 000')).toBe('amex');
      expect(detectCardBrand('3782 8224 6310 005')).toBe('amex');
    });

    it('detects Discover brand starting with 6011 or 65', () => {
      expect(detectCardBrand('6011 0000 0000 0000')).toBe('discover');
      expect(detectCardBrand('6500 0000 0000 0000')).toBe('discover');
    });

    it('returns generic for unrecognized card prefixes', () => {
      expect(detectCardBrand('9999 0000 0000 0000')).toBe('generic');
    });

    it('formats card numbers into 4-digit groups up to 16 digits', () => {
      expect(formatCardNumber('4111222233334444')).toBe('4111 2222 3333 4444');
      expect(formatCardNumber('411122')).toBe('4111 22');
      expect(formatCardNumber('abc411122')).toBe('4111 22'); // strips non-digits
    });

    it('formats expiry date as MM/YY', () => {
      expect(formatExpiryDate('1228')).toBe('12/28');
      expect(formatExpiryDate('12')).toBe('12');
      expect(formatExpiryDate('1')).toBe('1');
    });

    it('generates compliant transaction reference (TXN-YYYYMMDD-XXXXXX)', () => {
      const ref = generateTransactionReference();
      expect(ref).toMatch(/^TXN-\d{8}-[A-Z0-9]{6}$/);
    });
  });

  describe('Payment workflow (offline / preview fallback)', () => {
    it('initiates a payment and returns paymentId and transactionReference', async () => {
      const result = await initiatePayment({
        bookingId: 'bkg-test-001',
        amount: 850,
        currency: 'USD',
        paymentMethod: 'credit_card',
      });

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(result.paymentId).toMatch(/^pay-/);
      expect(result.transactionReference).toMatch(/^TXN-/);
    });

    it('confirms payment, settles status, and triggers alert notification', async () => {
      const result = await confirmPayment('pay-123', 'bkg-test-001', {
        bookingReference: 'VOY-FL-881204',
        bookingType: 'flight',
        title: 'Flight Confirmed',
        description: 'New York (JFK) to Paris (CDG)',
        userId: 'usr-traveler-03',
      });

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('pay-123');
      expect(result.transactionReference).toMatch(/^TXN-/);

      expect(alertService.createAlert).toHaveBeenCalledTimes(1);
      const alertCall = (alertService.createAlert as any).mock.calls[0][0];
      expect(alertCall.title).toBe('Flight Booking Confirmed');
      expect(alertCall.severity).toBe('success');
      expect(alertCall.new_status).toBe('confirmed');
    });

    it('retrieves default demo transaction history in offline mode', async () => {
      const history = await getTransactionHistory('usr-test');
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0]).toHaveProperty('transaction_reference');
      expect(history[0]).toHaveProperty('amount');
    });
  });
});

