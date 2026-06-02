# Decision

## Add database seed instructions to README

- Decision: Document the app's automatic SQLite database creation and seeding behavior in `README.md`.
- Rationale: Users need clear setup guidance for how the sample data appears and how to reset the database.
- Implementation: Added a dedicated "Database seeding" section explaining that `events.db` is created on first run, seeded automatically, and can be reset by deleting `events.db` before restarting the app.
