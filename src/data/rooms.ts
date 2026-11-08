import { deepFreeze } from '@/domain/immutable';
import type { Room } from '@/domain/types';

/**
 * Fictional campus room catalog. Every room has its own bookings (minutes
 * from 00:00). The whole graph is deep-frozen (AC5).
 */
export const ROOMS: readonly Room[] = deepFreeze([
  {
    id: 'r1',
    name: 'Library Study Room A',
    building: 'Main Library · 2F',
    capacity: 8,
    equipment: ['whiteboard'],
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
    equipment: ['projector', 'whiteboard', 'computers'],
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
    equipment: ['projector', 'whiteboard'],
    blocked: true,
    bookings: [
      { id: 'b6', title: 'Equipment Maintenance', start: 0, end: 1440, owner: 'Facilities' },
    ],
  },
  {
    id: 'r4',
    name: 'Seminar Room 101',
    building: 'Humanities Hall · 1F',
    capacity: 30,
    equipment: ['projector', 'whiteboard', 'video-conference'],
    blocked: false,
    bookings: [
      { id: 'b7', title: 'History Seminar', start: 540, end: 660, owner: 'Prof. Novak' },
      { id: 'b8', title: 'Guest Lecture (remote)', start: 900, end: 1020, owner: 'Dean Office' },
    ],
  },
  {
    id: 'r5',
    name: 'Quiet Pod 4',
    building: 'Student Center · 2F',
    capacity: 2,
    equipment: [],
    blocked: false,
    bookings: [
      { id: 'b9', title: 'Language Exchange', start: 600, end: 660, owner: 'L. Haddad' },
    ],
  },
]);
