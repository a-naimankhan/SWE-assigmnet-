export interface Booking {
  id: string;
  title: string;
  start: number; // minutes from 00:00
  end: number; // minutes from 00:00
  owner: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  blocked: boolean;
  bookings: Booking[];
}

export interface CheckResult {
  decision: 'available' | 'unavailable';
  reason: string;
}
