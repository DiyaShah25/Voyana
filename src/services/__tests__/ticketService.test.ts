import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadFlightTicket,
  downloadHotelVoucher,
  downloadTransportVoucher,
  FlightTicketData,
  HotelVoucherData,
  TransportVoucherData,
} from '../ticketService';
import { jsPDF } from 'jspdf';

const saveMock = vi.fn();
const textMock = vi.fn();
const rectMock = vi.fn();
const roundedRectMock = vi.fn();
const circleMock = vi.fn();
const lineMock = vi.fn();
const setFillColorMock = vi.fn();
const setTextColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setLineWidthMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      save: saveMock,
      text: textMock,
      rect: rectMock,
      roundedRect: roundedRectMock,
      circle: circleMock,
      line: lineMock,
      setFillColor: setFillColorMock,
      setTextColor: setTextColorMock,
      setDrawColor: setDrawColorMock,
      setLineWidth: setLineWidthMock,
      setFont: setFontMock,
      setFontSize: setFontSizeMock,
    })),
  };
});

describe('ticketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates and downloads a flight e-ticket with authentic structure and metadata', () => {
    const flightData: FlightTicketData = {
      bookingRef: 'VOY-FL-991283',
      airline: 'Swiss International Air Lines',
      flightNumber: 'LX-18',
      originCity: 'New York',
      originCode: 'JFK',
      destinationCity: 'Zurich',
      destinationCode: 'ZRH',
      departureTime: '2026-11-09T21:10:00Z',
      arrivalTime: '2026-11-10T11:05:00Z',
      cabin: 'Economy',
      passengerName: 'Bhavika Sainani',
      passengerEmail: 'bhavika@voyana.com',
      totalAmount: 784.5,
      currency: 'USD',
    };

    downloadFlightTicket(flightData);

    expect(jsPDF).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledWith('Voyana_Flight_Ticket_VOY-FL-991283.pdf');
    expect(textMock).toHaveBeenCalledWith('VOYANA', 14, 18);
  });

  it('generates and downloads a hotel voucher with guest information and stay dates', () => {
    const hotelData: HotelVoucherData = {
      bookingRef: 'VOY-HT-551922',
      hotelName: 'The Chedi Andermatt',
      city: 'Andermatt',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-15',
      nights: 5,
      rooms: 1,
      roomType: 'Deluxe Alpine Suite',
      guestName: 'Bhavika Sainani',
      totalAmount: 3200,
      currency: 'CHF',
    };

    downloadHotelVoucher(hotelData);

    expect(jsPDF).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledWith('Voyana_Hotel_Voucher_VOY-HT-551922.pdf');
  });

  it('generates and downloads a transport voucher with route and vehicle details', () => {
    const transportData: TransportVoucherData = {
      bookingRef: 'VOY-TR-182736',
      providerName: 'Swiss Executive Limousine',
      transportType: 'Private Transfer',
      vehicleModel: 'Mercedes-Benz V-Class',
      originLocation: 'Zurich Airport (ZRH)',
      destinationLocation: 'Andermatt',
      pickupTime: '2026-11-10 11:45 AM',
      passengerName: 'Bhavika Sainani',
      totalAmount: 260,
      currency: 'CHF',
    };

    downloadTransportVoucher(transportData);

    expect(jsPDF).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledWith('Voyana_Transport_Voucher_VOY-TR-182736.pdf');
  });
});
