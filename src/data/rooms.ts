import { deepFreeze } from '@/domain/immutable';
import type { Room } from '@/domain/types';

export const ROOMS: readonly Room[] = deepFreeze([
  {
    id: 'r1',
    name: 'Library Study Room A',
    building: 'Main Library · 2F',
    capacity: 8,
    blocked: false,
    bookings: [
      { id: 'b1', title: 'Physics Study Group', start: 540, end: 600, owner: 'A. Chen' },
      { id: 'b2', title: 'Robotics Club', start: 810, end: 870, owner: 'M. Patel' },
      { id: 'b3', title: 'Thesis Prep', start: 1140, end: 1200, owner: 'J. López' },
    ],
  },
  {
    id: 'r2',
    name: 'Engineering Lab 3',
    building: 'Engineering Block · B1',
    capacity: 20,
    blocked: false,
    bookings: [
      { id: 'b4', title: 'Circuits Workshop', start: 720, end: 780, owner: 'Dr. Kim' },
      { id: 'b5', title: 'Capstone Review', start: 990, end: 1050, owner: 'S. Rao' },
    ],
  },
  {
    id: 'r3',
    name: 'Design Studio 2',
    building: 'Arts Wing · 3F',
    capacity: 12,
    blocked: true,
    bookings: [
      { id: 'b6', title: 'Equipment Maintenance', start: 0, end: 1440, owner: 'Facilities' },
    ],
  },
]);
