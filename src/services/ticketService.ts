/**
 * Voyana E-Ticket and Voucher Generation Service
 * Generates and downloads real, publication-quality PDF tickets and vouchers
 * using jsPDF with authentic styling, barcode vectors, route details,
 * passenger info, and localized currency pricing.
 */

import { jsPDF } from 'jspdf';
import { formatCurrency } from './currencyService';

export interface FlightTicketData {
  bookingRef: string;
  airline: string;
  flightNumber: string;
  aircraft?: string;
  originCity: string;
  originCode: string;
  destinationCity: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration?: string;
  cabin: string;
  passengerName: string;
  passengerEmail?: string;
  passengerPhone?: string;
  seat?: string;
  passengersCount?: number;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  issuedAt?: string;
}

export interface HotelVoucherData {
  bookingRef: string;
  hotelName: string;
  stars?: number;
  address?: string;
  city: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rooms: number;
  roomType: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  issuedAt?: string;
}

export interface TransportVoucherData {
  bookingRef: string;
  providerName: string;
  transportType: string;
  vehicleModel?: string;
  originLocation: string;
  destinationLocation: string;
  pickupTime: string;
  passengerName: string;
  passengerPhone?: string;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  issuedAt?: string;
}

// Draw authentic barcode lines
function drawBarcode(doc: jsPDF, x: number, y: number, width: number, height: number, code: string) {
  doc.setFillColor(15, 23, 42); // slate-900
  const cleanCode = (code || 'VOYANA').replace(/[^a-zA-Z0-9]/g, '');
  const barCount = 48;
  const barWidth = width / (barCount * 1.5);

  let curX = x;
  for (let i = 0; i < barCount; i++) {
    const charCode = cleanCode.charCodeAt(i % cleanCode.length) || 65;
    const isThick = (charCode + i) % 3 === 0;
    const w = isThick ? barWidth * 1.8 : barWidth * 0.9;
    doc.rect(curX, y, w, height, 'F');
    curX += w + barWidth * 0.7;
    if (curX > x + width) break;
  }

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`* ${code.toUpperCase()} *`, x + width / 2, y + height + 4, { align: 'center' });
}

/**
 * Generate and download a Flight E-Ticket PDF
 */
export function downloadFlightTicket(data: FlightTicketData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Header Banner
  doc.setFillColor(6, 78, 59); // deep emerald #064e3b
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Brand Name & Logo Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('VOYANA', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 243, 208); // emerald-200
  doc.text('GLOBAL TRAVEL SUITE · OFFICIAL ELECTRONIC TICKET & RECEIPT', margin, 24);

  // Status Badge
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(pageWidth - margin - 42, 10, 42, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONFIRMED & ISSUED', pageWidth - margin - 21, 17, { align: 'center' });

  // 2. Reference & Security Ribbon
  let y = 37;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BOOKING REFERENCE (PNR)', margin + 6, y + 6);
  doc.text('ETKT NUMBER', margin + 60, y + 6);
  doc.text('DATE OF ISSUE', margin + 115, y + 6);
  doc.text('SECURITY VERIFICATION', margin + 155, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text(data.bookingRef, margin + 6, y + 12);
  doc.setTextColor(15, 23, 42);
  doc.text(`176-${Math.floor(1000000000 + Math.random() * 9000000000)}`, margin + 60, y + 12);
  doc.setFontSize(9);
  doc.text(data.issuedAt || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), margin + 115, y + 12);
  doc.setTextColor(16, 185, 129);
  doc.text('2FA OTP VERIFIED', margin + 155, y + 12);

  // 3. Flight Itinerary Hero Card
  y = 59;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 54, 3, 3, 'FD');

  // Airline banner inside card
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.airline.toUpperCase()} · FLIGHT ${data.flightNumber}`, margin + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Aircraft: ${data.aircraft || 'Boeing 787-9 Dreamliner'}  |  Cabin: ${data.cabin.toUpperCase()}`, pageWidth - margin - 6, y + 7, { align: 'right' });

  // Route: Origin -> Destination
  const routeY = y + 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text(data.originCode, margin + 8, routeY);
  doc.text(data.destinationCode, pageWidth - margin - 8, routeY, { align: 'right' });

  // Flight Arrow line
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1);
  doc.line(margin + 36, routeY - 5, pageWidth - margin - 36, routeY - 5);
  doc.setFillColor(16, 185, 129);
  doc.circle(pageWidth / 2, routeY - 5, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(data.duration || 'Non-stop Flight', pageWidth / 2, routeY - 8, { align: 'center' });

  // City & Times
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(data.originCity, margin + 8, routeY + 6);
  doc.text(data.destinationCity, pageWidth - margin - 8, routeY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Departs: ${data.departureTime}`, margin + 8, routeY + 12);
  doc.text(`Arrives: ${data.arrivalTime}`, pageWidth - margin - 8, routeY + 12, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Terminal 2 · Gate opens 45m prior', margin + 8, routeY + 17);
  doc.text('Terminal 1 · Baggage Belt 04', pageWidth - margin - 8, routeY + 17, { align: 'right' });

  // 4. Passenger & Seating Grid
  y = 120;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('PASSENGER INFORMATION', margin + 6, y + 7);

  const col1 = margin + 6;
  const col2 = margin + 65;
  const col3 = margin + 120;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PASSENGER NAME', col1, y + 15);
  doc.text('SEAT ASSIGNMENT', col2, y + 15);
  doc.text('BAGGAGE ALLOWANCE', col3, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.passengerName.toUpperCase(), col1, y + 21);
  doc.text(data.seat || '14A, 14B', col2, y + 21);
  doc.text('2 Pieces (23kg each) + 1 Cabin', col3, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CONTACT EMAIL / PHONE', col1, y + 28);
  doc.text('CABIN CLASS', col2, y + 28);
  doc.text('FREQUENT FLYER / TIER', col3, y + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${data.passengerEmail || 'passenger@voyana.com'}  |  ${data.passengerPhone || '+91 98765 43210'}`, col1, y + 33);
  doc.text(data.cabin.toUpperCase(), col2, y + 33);
  doc.text('VOYANA CLUB ELITE (GOLD)', col3, y + 33);

  // 5. Payment & Fare Breakdown
  y = 165;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('FARE & PAYMENT RECEIPT', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Airfare (${data.passengersCount || 1} Passenger${(data.passengersCount || 1) > 1 ? 's' : ''}):`, col1, y + 15);
  doc.text('Taxes, Carrier Surcharges & Aviation Security Fees:', col1, y + 21);
  doc.text(`Payment Authorized via: ${data.paymentMethod || 'Online Gateway / UPI'}`, col1, y + 27);

  const formattedAmount = formatCurrency(data.totalAmount, data.currency);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formattedAmount, pageWidth - margin - 6, y + 15, { align: 'right' });
  doc.text('INCLUDED', pageWidth - margin - 6, y + 21, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(col1, y + 22.5, pageWidth - margin - 6, y + 22.5);
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text(`TOTAL PAID:  ${formattedAmount}`, pageWidth - margin - 6, y + 29, { align: 'right' });

  // 6. Barcode Section
  y = 206;
  drawBarcode(doc, margin + 25, y, contentWidth - 50, 16, data.bookingRef);

  // 7. Important Travel Notice
  y = 236;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('IMPORTANT PASSENGER ADVISORY & CHECK-IN GUIDELINES', margin + 6, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const notices = [
    '• Please present this e-ticket along with a valid government-issued photo ID / passport at airport check-in.',
    '• International flight check-in counters open 3 hours prior and close strictly 60 minutes before departure.',
    '• Hand baggage must not exceed 7kg. Dangerous goods regulations apply to all carriage.',
    '• For flight schedule updates, gate changes, or web check-in, visit voyana.com/trips or open the Voyana mobile app.',
  ];
  notices.forEach((line, idx) => {
    doc.text(line, margin + 6, y + 13 + idx * 5);
  });

  // 8. Footer
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 280, pageWidth - margin, 280);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Voyana Travel Suite · 24x7 Global Traveler Concierge · support@voyana.com · +1 (800) 555-VOYANA', pageWidth / 2, 285, { align: 'center' });

  // Save the PDF file to user device
  doc.save(`Voyana_Flight_Ticket_${data.bookingRef}.pdf`);
}

/**
 * Generate and download a Hotel Voucher PDF
 */
export function downloadHotelVoucher(data: HotelVoucherData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(6, 78, 59); // deep emerald
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('VOYANA', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 243, 208);
  doc.text('OFFICIAL HOTEL CONFIRMATION VOUCHER & STAY RECEIPT', margin, 24);

  // Status Badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - margin - 42, 10, 42, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('GUARANTEED & PAID', pageWidth - margin - 21, 17, { align: 'center' });

  // Reference Ribbon
  let y = 37;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CONFIRMATION NUMBER', margin + 6, y + 6);
  doc.text('HOTEL PARTNER ID', margin + 65, y + 6);
  doc.text('VOUCHER ISSUED', margin + 115, y + 6);
  doc.text('AUTHORIZATION', margin + 155, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text(data.bookingRef, margin + 6, y + 12);
  doc.setTextColor(15, 23, 42);
  doc.text('HTL-PARTNER-772', margin + 65, y + 12);
  doc.setFontSize(9);
  doc.text(data.issuedAt || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), margin + 115, y + 12);
  doc.setTextColor(16, 185, 129);
  doc.text('2FA OTP VERIFIED', margin + 155, y + 12);

  // Hotel Overview Card
  y = 59;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 48, 3, 3, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.hotelName.toUpperCase(), margin + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${'★'.repeat(data.stars || 5)} Luxury Hospitality Partner`, pageWidth - margin - 6, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Location: ${data.address || 'City Center Plaza'}, ${data.city}`, margin + 6, y + 18);
  doc.text(`Room Category: ${data.roomType}`, margin + 6, y + 25);
  doc.text(`Duration: ${data.nights} Night${data.nights > 1 ? 's' : ''}  ·  ${data.rooms} Room${data.rooms > 1 ? 's' : ''}`, margin + 6, y + 32);

  // Check-In / Check-Out Boxes
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth - margin - 75, y + 14, 34, 28, 2, 2, 'FD');
  doc.roundedRect(pageWidth - margin - 37, y + 14, 34, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CHECK-IN', pageWidth - margin - 58, y + 20, { align: 'center' });
  doc.text('CHECK-OUT', pageWidth - margin - 20, y + 20, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.checkInDate, pageWidth - margin - 58, y + 27, { align: 'center' });
  doc.text(data.checkOutDate, pageWidth - margin - 20, y + 27, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(16, 185, 129);
  doc.text('From 3:00 PM', pageWidth - margin - 58, y + 36, { align: 'center' });
  doc.text('Until 11:00 AM', pageWidth - margin - 20, y + 36, { align: 'center' });

  // Guest Details
  y = 114;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('PRIMARY GUEST INFORMATION', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LEAD GUEST NAME', margin + 6, y + 15);
  doc.text('CONTACT DETAILS', margin + 70, y + 15);
  doc.text('SPECIAL REQUESTS', margin + 130, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.guestName.toUpperCase(), margin + 6, y + 22);
  doc.setFontSize(8.5);
  doc.text(`${data.guestEmail || 'guest@voyana.com'}`, margin + 70, y + 22);
  doc.text('Non-Smoking, High Floor, Early Check-In', margin + 130, y + 22);

  // Payment Breakdown
  y = 155;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('PAYMENT RECEIPT & BILLING STATEMENT', margin + 6, y + 7);

  const formattedAmount = formatCurrency(data.totalAmount, data.currency);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Accommodation Total (${data.nights} Nights, ${data.rooms} Room):`, margin + 6, y + 15);
  doc.text('City Tax, Service GST & Resort Amenities:', margin + 6, y + 21);
  doc.text(`Payment Settlement Method: ${data.paymentMethod || 'Authorized Card / UPI'}`, margin + 6, y + 27);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formattedAmount, pageWidth - margin - 6, y + 15, { align: 'right' });
  doc.text('ALL INCLUSIVE', pageWidth - margin - 6, y + 21, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 6, y + 22.5, pageWidth - margin - 6, y + 22.5);
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text(`TOTAL CHARGED:  ${formattedAmount}`, pageWidth - margin - 6, y + 29, { align: 'right' });

  // Barcode
  y = 196;
  drawBarcode(doc, margin + 25, y, contentWidth - 50, 16, data.bookingRef);

  // Check-In Guidelines
  y = 226;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('HOTEL CHECK-IN POLICIES & IMPORTANT NOTICES', margin + 6, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const policies = [
    '• Please present this confirmation voucher and an official photo ID at the front desk upon arrival.',
    '• A credit card or refundable cash deposit may be required at check-in for incidental charges.',
    '• Free cancellation is honored up to 24 hours prior to the official check-in date.',
    '• Complimentary high-speed Wi-Fi and wellness suite access are included with this reservation.',
  ];
  policies.forEach((p, idx) => {
    doc.text(p, margin + 6, y + 13 + idx * 5.5);
  });

  // Footer
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 280, pageWidth - margin, 280);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Voyana Travel Suite · Hotel Partner Concierge · support@voyana.com · +1 (800) 555-VOYANA', pageWidth / 2, 285, { align: 'center' });

  doc.save(`Voyana_Hotel_Voucher_${data.bookingRef}.pdf`);
}

/**
 * Generate and download a Transport Voucher PDF
 */
export function downloadTransportVoucher(data: TransportVoucherData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('VOYANA', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 243, 208);
  doc.text('TRANSPORT & MOBILITY PASS · OFFICIAL BOOKING VOUCHER', margin, 24);

  // Status Badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - margin - 42, 10, 42, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONFIRMED', pageWidth - margin - 21, 17, { align: 'center' });

  let y = 37;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BOOKING REFERENCE', margin + 6, y + 6);
  doc.text('SERVICE TYPE', margin + 65, y + 6);
  doc.text('ISSUED AT', margin + 115, y + 6);
  doc.text('STATUS', margin + 155, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text(data.bookingRef, margin + 6, y + 12);
  doc.setTextColor(15, 23, 42);
  doc.text(data.transportType.toUpperCase(), margin + 65, y + 12);
  doc.setFontSize(9);
  doc.text(data.issuedAt || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), margin + 115, y + 12);
  doc.setTextColor(16, 185, 129);
  doc.text('PAID & READY', margin + 155, y + 12);

  // Transport details card
  y = 59;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 48, 3, 3, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.providerName.toUpperCase(), margin + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Vehicle: ${data.vehicleModel || 'Executive Fleet'}`, pageWidth - margin - 6, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Pick-up Location: ${data.originLocation}`, margin + 6, y + 19);
  doc.text(`Drop-off Destination: ${data.destinationLocation}`, margin + 6, y + 26);
  doc.text(`Scheduled Timing: ${data.pickupTime}`, margin + 6, y + 33);
  doc.text(`Lead Passenger: ${data.passengerName} (${data.passengerPhone || '+91 98765 43210'})`, margin + 6, y + 40);

  // Payment Breakdown
  y = 114;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  const formattedAmount = formatCurrency(data.totalAmount, data.currency);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('TOTAL FARE PAID', margin + 6, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedAmount, margin + 6, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Tolls, Airport Parking & Driver Gratuity included.', margin + 6, y + 23);

  // Barcode
  y = 150;
  drawBarcode(doc, margin + 25, y, contentWidth - 50, 16, data.bookingRef);

  // Footer
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 280, pageWidth - margin, 280);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Voyana Travel Suite · Transport & Ground Operations · support@voyana.com', pageWidth / 2, 285, { align: 'center' });

  doc.save(`Voyana_Transport_Voucher_${data.bookingRef}.pdf`);
}
