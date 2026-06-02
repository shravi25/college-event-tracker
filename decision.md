# DECISIONS

# Why this stack?
I chose Flask with SQLite because the current repository already used Flask for the backend, and SQLite avoids the need for any external database service during development. This keeps the app lightweight and easier to run locally while still meeting the assignment requirements.

## One decision not specified in the brief
I implemented token-based session authentication with a simple SQLite-backed `sessions` table. This provides a clean reusable auth pattern and avoids storing sensitive state in `localStorage`, while keeping the backend stateless enough for this demo.

## One thing I would improve with more time
I would add stronger session expiry and refresh handling, plus a small admin event deletion flow with confirmation. That would make the app more production-ready while preserving the core student/admin workflows.
