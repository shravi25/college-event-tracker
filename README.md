# College Event Registration Portal

Basic college event registration application built with Flask, SQLite, and plain HTML/CSS/JavaScript.

## Features

- Admin login with hardcoded credentials
- Student login with hardcoded sample accounts
- Admin can create events and view all event statistics
- Student can browse upcoming events and register if seats are available
- Event capacity is enforced and marked as "Full" when filled
- All API routes are prefixed with `/api/`

## Setup

1. Create a Python virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Run the application:

```powershell
python app.py
```

4. Open the site in your browser:

```
http://127.0.0.1:4731
```

## Database seeding

- The application creates `events.db` automatically on first startup and seeds it with sample students and events.
- If `events.db` already exists, the app keeps the existing data.
- To reset and reseed the database, stop the app, delete `events.db`, then restart with `python app.py`.

## Credentials

Admin:
- Username: `admin`
- Password: `inspirante2026`

Student example:
- Username: `asha.rao`
- Password: `student123`

## Notes

- The database file `events.db` is created automatically on first run.
- If you need to reset the database, delete `events.db` and restart the app.
