import { quoteReservation } from '../services/reservation-quote.service.js';
import { generateMockFlights } from '../catalog/flights.js';
import { generateMockHotels } from '../catalog/hotels.js';
import { generateTransportOptions } from '../catalog/transport.js';
const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const checkout = new Date(Date.parse(date) + 3 * 86400000).toISOString().slice(0, 10);
const base = { destination: 'Ahmedabad', contactEmail: 'test@example.com' };
const hotel = generateMockHotels({ location: 'Ahmedabad', checkInDate: date, checkOutDate: checkout, rooms: 1, guests: 1 })[0];

describe('Server-owned INR reservation quotes', () => {
  it('calculates flight pricing once per passenger using the server catalog', () => {
    const flights = generateMockFlights({ originCode: 'JFK', destinationCode: 'AMD', departureDate: date, cabinClass: 'economy', passengers: 2 });
    const choice = { type: 'flight', id: flights[0].id, origin: 'JFK', destination: 'AMD', date, cabin: 'economy', passengers: 2 };
    const result = quoteReservation({ ...base, bookingType: 'flight', totalAmount: 1, currency: 'USD', choices: [choice] });
    expect(result.currency).toBe('INR');
    expect(result.totalAmount).toBe(flights[0].prices.economy * 2);
    expect(generateMockFlights({ originCode: 'JFK', destinationCode: 'AMD', departureDate: date, cabinClass: 'economy', passengers: 1 })[0].prices.economy).toBe(flights[0].prices.economy);
  });
  it('prices hotel nights and rooms without trusting a browser amount or location', () => {
    const result = quoteReservation({ ...base, bookingType: 'hotel', totalAmount: 1, hotelDetails: { city: 'Paris', nightlyRate: 1 }, choices: [{ type: 'hotel', id: hotel.id, checkIn: date, checkOut: checkout, roomType: 'Standard', rooms: 2, guests: 3 }] });
    expect(result.totalAmount).toBe(hotel.baseNightlyRate * 3 * 2);
    expect(result.hotelDetails?.city).toBe('Ahmedabad');
  });
  it('uses stable transport IDs and correct passenger quantities', () => {
    const options = generateTransportOptions(undefined, 'Pune', date, 'all');
    const transport = options.find(item => item.transportType === 'train')!;
    const result = quoteReservation({ ...base, destination: 'Pune', bookingType: 'transport', choices: [{ type: 'transport', id: transport.id, origin: transport.originCity, date, passengers: 2 }] });
    expect(result.totalAmount).toBe(transport.basePrice * 2);
    expect(result.transportDetails?.destinationCity).toBe('Pune');
  });
  it('rejects unavailable inventory, different destinations and invalid date ranges', () => {
    const valid = { ...base, bookingType: 'hotel', choices: [{ type: 'hotel', id: hotel.id, checkIn: date, checkOut: checkout, roomType: 'Standard', rooms: 1, guests: 1 }] };
    expect(() => quoteReservation({ ...valid, destination: 'Paris' })).toThrow();
    expect(() => quoteReservation({ ...valid, choices: [{ ...valid.choices[0], checkOut: date }] })).toThrow();
    expect(() => quoteReservation({ ...valid, choices: [{ ...valid.choices[0], rooms: -1 }] })).toThrow();
  });
  it('offers incoming sample trains for Ahmedabad and keeps overnight arrival dates correct', () => {
    const date = new Date(Date.now()+30*86400000).toISOString().slice(0,10);
    const incoming = generateTransportOptions('Mumbai','Ahmedabad',date,'train');
    expect(incoming.some(item => item.destinationCity === 'Ahmedabad' && item.transportType === 'train')).toBe(true);
    const options = generateTransportOptions('Ahmedabad','Ahmedabad',date,'all');
    for(const item of options) expect(Date.parse(item.scheduledArrival!)-Date.parse(item.scheduledDeparture)).toBe(item.durationMinutes*60000);
  });

  it('prices transport by service, route and date instead of one fixed fare', () => {
    const short=generateTransportOptions('Mumbai','Pune',date,'train')[0];
    const long=generateTransportOptions('New Delhi','Pune',date,'train')[0];
    expect(short.basePrice).not.toBe(long.basePrice);
    const fares=new Set(Array.from({length:7},(_,day)=>generateTransportOptions('Mumbai','Pune',new Date(Date.parse(date)+day*86400000).toISOString().slice(0,10),'train')[0].basePrice));
    expect(fares.size).toBeGreaterThan(1);
  });
  it('keeps filtered transport mode, image and full-inventory checkout price consistent', () => {
    const all=generateTransportOptions('Pune','Ahmedabad',date,'all');
    for(const mode of ['train','bus','car_rental','private_transfer'] as const){
      const filtered=generateTransportOptions('Pune','Ahmedabad',date,mode);
      expect(filtered.length).toBeGreaterThan(0);
      for(const item of filtered){
        expect(item.transportType).toBe(mode);
        expect(all.find(option=>option.id===item.id)?.basePrice).toBe(item.basePrice);
        expect(item.imageUrl).toMatch(/\/images\/booking\/(train|bus|car|suv)\.jpg$/);
        const quote=quoteReservation({...base,bookingType:'transport',choices:[{type:'transport',id:item.id,origin:item.originCity,date,passengers:2}]});
        expect(quote.totalAmount).toBe(item.basePrice*(['train','bus'].includes(mode)?2:1));
      }
    }
  });
  it('uses selected hotel dates and room type in the verified nightly total',()=>{
    const stay=generateMockHotels({location:'Ahmedabad',checkInDate:date,checkOutDate:checkout,rooms:2,guests:3})[0];
    const quote=quoteReservation({...base,bookingType:'hotel',choices:[{type:'hotel',id:stay.id,checkIn:date,checkOut:checkout,roomType:'Deluxe',rooms:2,guests:3}]});
    expect(quote.totalAmount).toBe(stay.roomRates.Deluxe*3*2);
    expect(stay.imageUrl).toMatch(/^\/images\/booking\/hotel-/);
  });
  it('estimates unlisted flight routes from distance and cabin class',()=>{
    const near=generateMockFlights({originCode:'DEL',destinationCode:'AMD',departureDate:date,passengers:1,cabinClass:'economy'})[0];
    const far=generateMockFlights({originCode:'DEL',destinationCode:'SYD',departureDate:date,passengers:1,cabinClass:'economy'})[0];
    expect(far.prices.economy).toBeGreaterThan(near.prices.economy);
    expect(near.prices.business).toBeGreaterThan(near.prices.economy);
  });

  it('charges a package car rental for its selected rental days',()=>{
    const car=generateTransportOptions('Ahmedabad','Ahmedabad',date,'car_rental')[0];
    const quote=quoteReservation({...base,bookingType:'transport',choices:[{type:'transport',id:car.id,origin:car.originCity,date,passengers:2,days:5}]});
    expect(quote.totalAmount).toBe(car.basePrice*5);
    expect(quote.transportDetails?.rentalDays).toBe(5);
  });

});
