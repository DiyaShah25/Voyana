export function bookingServiceName(booking: { bookingType: string; transportDetails?: { transportType: string } }) {
  const kind = booking.bookingType === 'transport' ? booking.transportDetails?.transportType || 'transport' : booking.bookingType;
  return kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, ' ');
}
export function bookingStatusLabel(booking: { status: string }) {
  return ({ confirmed: 'Booked', pending: 'Pending payment', cancelled: 'Cancelled', delayed: 'Schedule delayed', completed: 'Completed' } as Record<string,string>)[booking.status] || booking.status;
}
