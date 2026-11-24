export default {
  // Appsmith JS Object "Checker" (low-code track, Practice #13).
  // Pasted into Appsmith's JS editor; this file is the version-controlled copy.
  // Appsmith requires the file to start with `export default`.
  // Widgets used: StartTime (Input), Duration (Input, text), Blocked (Switch),
  // CheckBtn (Button), ResultText / MessageText (Text), BookingsTable (Table).
  currentTime: '08:00',
  maxMinutes: 120,
  bookings: [
    { id: 'b1', title: 'Physics Study Group', start: '09:00', end: '10:00' },
    { id: 'b2', title: 'Robotics Club', start: '13:30', end: '14:30' },
    { id: 'b3', title: 'Thesis Prep', start: '19:00', end: '20:00' },
  ],
  result: null,

  toMinutes(label) {
    const m = /^([0-9]{2}):([0-9]{2})$/.exec(String(label || '').trim());
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h > 23 || min > 59 ? null : h * 60 + min;
  },

  decide(startText, durationText, blocked) {
    const start = this.toMinutes(startText);
    if (start === null) {
      return { available: false, reasonCode: 'INVALID_TIME_FORMAT', message: 'Please enter a valid start time in HH:MM format.' };
    }
    const t = String(durationText ?? '').trim();
    const d = /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
    if (d === null || !Number.isInteger(d) || d <= 0) {
      return { available: false, reasonCode: 'INVALID_DURATION', message: 'Duration must be a whole number of minutes greater than 0.' };
    }
    const end = start + d;
    if (end > 1440) {
      return { available: false, reasonCode: 'OUT_OF_DAY_RANGE', message: 'Times must be between 00:00 and 24:00.' };
    }
    if (start <= this.toMinutes(this.currentTime)) {
      return { available: false, reasonCode: 'START_IN_PAST', message: 'The start time must be after the current time.' };
    }
    if (d > this.maxMinutes) {
      return { available: false, reasonCode: 'EXCEEDS_MAX_DURATION', message: 'Bookings may not exceed 120 minutes. This request is ' + d + ' minutes.' };
    }
    if (blocked) {
      return { available: false, reasonCode: 'ROOM_BLOCKED', message: 'Library Study Room A is currently blocked and cannot be booked.' };
    }
    const clash = this.bookings.find((b) => start < this.toMinutes(b.end) && end > this.toMinutes(b.start));
    if (clash) {
      return { available: false, reasonCode: 'OVERLAP', message: 'Overlaps an existing booking: "' + clash.title + '" (' + clash.start + '–' + clash.end + ').' };
    }
    return { available: true, reasonCode: 'AVAILABLE', message: 'Library Study Room A is available ' + startText + '–' + this.label(end) + '.' };
  },

  label(min) {
    return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  },

  check() {
    // Read-only: bookings are never modified (T8).
    this.result = this.decide(StartTime.text, Duration.text, Blocked.isSwitchedOn);
    return this.result;
  },
};
