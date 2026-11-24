# Low-code track (Appsmith Community Edition, self-hosted)

- Platform: Appsmith CE `latest` (v2.7.2 at the time of the run), Docker image `appsmith/appsmith-ce`, bound to `127.0.0.1:8080` only.
- `appsmith-export.json` – full application export (File → Export). Import it with *Create new → Import → Import from file*.
- `Checker.jsobject.js` – the only script in the app (Appsmith JS Object `Checker`), kept here so it is under version control.

Run it locally:

```bash
docker run -d --name appsmith-p13 -p 127.0.0.1:8080:80 -v appsmith-p13-stacks:/appsmith-stacks appsmith/appsmith-ce:latest
```

Then open http://127.0.0.1:8080, create the first (local) admin user and import `appsmith-export.json`.
The local test credentials used for this practice are in `appsmith-local.env`, which is git-ignored.

Widgets: `StartTime` (Input), `Duration` (Input), `Blocked` (Switch), `CheckBtn` (Button, onClick `{{Checker.check()}}`),
`ResultText` / `MessageText` (Text bound to `Checker.result`), `BookingsTable` (Table bound to `Checker.bookings`).
