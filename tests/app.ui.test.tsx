// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '@/App';
import { ROOMS } from '@/data/rooms';

afterEach(cleanup);

function roomCards(): string[] {
  const list = screen.queryByRole('list', { name: 'Matching rooms' });
  if (!list) return [];
  return within(list)
    .getAllByRole('button')
    .map((b) => b.querySelector('p')?.textContent ?? '');
}

function resultText(): string {
  return screen.getByText(/^(Available|Unavailable)$/).parentElement?.textContent ?? '';
}

describe('UI integration (React + jsdom)', () => {
  it('shows all rooms, then updates the DOM list when filters change (F1, F2)', () => {
    render(<App />);
    expect(roomCards()).toHaveLength(ROOMS.length);

    fireEvent.change(screen.getByLabelText('Attendees'), { target: { value: '20' } });
    expect(roomCards()).toEqual(['Engineering Lab 3', 'Seminar Room 101']);

    fireEvent.click(screen.getByLabelText('Video conference'));
    expect(roomCards()).toEqual(['Seminar Room 101']);
  });

  it('shows a clear empty state and can clear the filters (F4)', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Attendees'), { target: { value: '500' } });
    expect(screen.getByTestId('empty-state').textContent).toContain('No rooms match your requirements');
    expect(roomCards()).toEqual([]);

    fireEvent.click(within(screen.getByTestId('empty-state')).getByRole('button', { name: 'Clear filters' }));
    expect(roomCards()).toHaveLength(ROOMS.length);
  });

  it('re-checks the selected room when the user switches rooms (F5, F3)', () => {
    render(<App />);
    // default: Library Study Room A, 09:00–10:00 clashes with "Physics Study Group"
    fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    expect(resultText()).toContain('Unavailable');
    expect(resultText()).toContain('Physics Study Group');

    fireEvent.click(screen.getByRole('button', { name: /Engineering Lab 3/ }));
    expect(resultText()).toContain('Engineering Lab 3 is available 09:00–10:00');

    fireEvent.click(screen.getByRole('button', { name: /Design Studio 2/ }));
    expect(resultText()).toContain('blocked');
  });

  it('shows an inline message for invalid attendee input', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Attendees'), { target: { value: '0' } });
    expect(screen.getByRole('alert').textContent).toContain('whole number of 1 or more');
  });
});
