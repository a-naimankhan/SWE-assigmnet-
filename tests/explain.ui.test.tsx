// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '@/App';
import { ROOMS } from '@/data/rooms';
import { createMockAdapter } from '@/ai/mockAdapter';
import { createFaultyAdapter, type FaultMode } from '@/ai/faults';
import { mockExplanation } from '@/ai/templates';
import type { ExplainAdapter } from '@/ai/explain';

afterEach(cleanup);

const fast = createMockAdapter(0);

const decision = () =>
  screen.getByText(/^(Available|Unavailable)$/).parentElement?.textContent ?? '';
const timeInputs = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type="time"]'));
const setTimes = (start: string, end: string) => {
  const [s, e] = timeInputs();
  fireEvent.change(s, { target: { value: start } });
  fireEvent.change(e, { target: { value: end } });
};
const check = () => fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
const explain = () => fireEvent.click(screen.getByRole('button', { name: /Explain availability/ }));

function setup(adapter: ExplainAdapter = fast) {
  return render(<App explainAdapter={adapter} />);
}

describe('Explain availability UI (AC1-AC5)', () => {
  it('has no explain button before a check', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Explain availability/ })).toBeNull();
  });

  const cases: Array<[string, () => void, RegExp, RegExp]> = [
    ['overlap', () => {}, /^Unavailable/, /not free/],
    ['available', () => fireEvent.click(screen.getByRole('button', { name: /Engineering Lab 3/ })), /^Available/, /is free/],
    ['blocked room', () => fireEvent.click(screen.getByRole('button', { name: /Design Studio 2/ })), /^Unavailable/, /closed for booking/],
    ['past time', () => setTimes('07:00', '08:30'), /^Unavailable/, /already passed/],
    ['invalid time', () => setTimes('', '10:00'), /^Unavailable/, /HH:MM format/],
    ['too long', () => setTimes('09:00', '12:00'), /^Unavailable/, /120-minute limit/],
  ];

  it.each(cases)('%s: explanation shown, decision unchanged, labelled as mock and not a booking', async (_n, arrange, status, expected) => {
    setup();
    arrange();
    check();
    const before = decision();
    expect(before).toMatch(status);

    explain();
    const box = await screen.findByTestId('explain-generated');
    expect(decision()).toBe(before); // AC1/AC5: checker's text is untouched
    expect(box.textContent).toContain('Mock explanation');
    expect(box.textContent).toMatch(/not a booking confirmation/i);
    expect(box.textContent?.length).toBeGreaterThan(20);
    expect(box.textContent).toMatch(expected); // right wording for this reason code
  });

  it('shows the exact mock sentence for the overlap case', async () => {
    setup();
    check();
    explain();
    const box = await screen.findByTestId('explain-generated');
    expect(box.textContent).toContain(
      mockExplanation({ roomLabel: ROOMS[0].name, start: '09:00', end: '10:00', isAvailable: false, reasonCode: 'OVERLAP' })
    );
    // no invented booking details: the clashing booking's title/owner never reach the text
    expect(box.textContent).not.toMatch(/Physics|Chen/);
  });

  const CAUSE: Record<FaultMode, RegExp> = {
    timeout: /took too long/,
    error: /service is unavailable/,
    contradict: /safety checks/,
    invented: /safety checks/,
    long: /safety checks/,
    malformed: /safety checks/,
  };
  it.each<FaultMode>(['timeout', 'error', 'contradict', 'invented', 'long', 'malformed'])(
    'adapter fault "%s": safe fallback, decision unchanged',
    async (mode) => {
      render(<App explainAdapter={createFaultyAdapter(mode)} explainTimeoutMs={40} />);
      check();
      const before = decision();
      explain();
      const box = await screen.findByTestId('explain-fallback');
      expect(box.textContent).toContain('Standard explanation (AI not used)');
      expect(box.textContent).toContain('overlaps an existing booking');
      expect(box.textContent).toMatch(CAUSE[mode]);
      expect(decision()).toBe(before);
    }
  );

  it('disables the button while loading (no double submit)', async () => {
    let calls = 0;
    const slow: ExplainAdapter = {
      label: 'slow', isMock: true,
      explain: async (i) => { calls++; await new Promise((r) => setTimeout(r, 30)); return { explanation: mockExplanation(i) }; },
    };
    setup(slow);
    check();
    explain();
    const btn = screen.getByRole('button', { name: /Explaining/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    await screen.findByTestId('explain-generated');
    expect(calls).toBe(1);
  });

  it('drops a stale explanation when room or time changes', async () => {
    setup();
    check();
    explain();
    await screen.findByTestId('explain-generated');

    fireEvent.click(screen.getByRole('button', { name: /Engineering Lab 3/ }));
    expect(screen.queryByTestId('explain-generated')).toBeNull();

    explain();
    await screen.findByTestId('explain-generated');
    setTimes('10:00', '11:00');
    expect(screen.queryByTestId('explain-generated')).toBeNull();
    expect(screen.queryByTestId('explain-panel')).toBeNull(); // result cleared until re-check
  });

  it('never mutates the fictional catalog (AC1)', async () => {
    const before = JSON.stringify(ROOMS);
    setup();
    check();
    explain();
    await screen.findByTestId('explain-generated');
    await waitFor(() => expect(JSON.stringify(ROOMS)).toBe(before));
  });
});
