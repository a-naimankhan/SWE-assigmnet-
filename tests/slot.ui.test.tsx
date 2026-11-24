// @vitest-environment jsdom
/** Practice #13 Task #05: T1–T8 driven through the real UI (code-based track). */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import contract from '../practice13/shared/contract.json';
import SingleRoomChecker from '@/SingleRoomChecker';

afterEach(cleanup);

const cases = contract.cases.filter(
  (c): c is (typeof contract.cases)[number] & {
    startTime: string;
    durationMinutes: number;
    roomBlocked: boolean;
    expected: { available: boolean; reasonCode: string };
  } => 'startTime' in c
);

function fill(start: string, duration: string, blocked: boolean) {
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: duration } });
  const box = screen.getByRole('checkbox');
  if ((box as HTMLInputElement).checked !== blocked) fireEvent.click(box);
  fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
}

const bookingRows = () => screen.getByTestId('booking-list').textContent;

describe('Single-room checker UI (T1–T8)', () => {
  it.each(cases.map((c) => [c.id, c.title, c] as const))('%s %s', (_id, _t, c) => {
    render(<SingleRoomChecker />);
    fill(c.startTime, String(c.durationMinutes), c.roomBlocked);
    expect(screen.getByTestId('slot-decision').textContent).toBe(
      c.expected.available ? 'Available' : 'Unavailable'
    );
    expect(screen.getByTestId('slot-code').textContent).toBe(c.expected.reasonCode);
    expect(screen.getByTestId('slot-message').textContent).not.toBe('');
  });

  it('T8 bookings shown are unchanged after running T1–T7 in one session', () => {
    render(<SingleRoomChecker />);
    const before = bookingRows();
    for (const c of cases) fill(c.startTime, String(c.durationMinutes), c.roomBlocked);
    expect(bookingRows()).toBe(before);
    expect(before).toContain('Physics Study Group09:00–10:00');
  });

  it('editing an input clears the old result (no stale decision)', () => {
    render(<SingleRoomChecker />);
    fill('10:30', '60', false);
    expect(screen.getByTestId('slot-decision').textContent).toBe('Available');
    fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: '121' } });
    expect(screen.queryByTestId('slot-decision')).toBeNull();
  });

  it('a preset button fills the form with the shared test input', () => {
    render(<SingleRoomChecker />);
    fireEvent.click(screen.getByRole('button', { name: /^T3:/ }));
    expect((screen.getByLabelText('Start time') as HTMLInputElement).value).toBe('10:30');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });
});
