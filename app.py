import os
import sqlite3
from flask import Flask, request, jsonify, render_template, session, g

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'change-me-please')
DATABASE = os.path.join(os.path.dirname(__file__), 'events.db')

# insp-verified
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

# insp-verified
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# insp-verified
def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        venue TEXT NOT NULL,
        capacity INTEGER NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, event_id),
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(event_id) REFERENCES events(id)
    )
    ''')

    conn.commit()
    seed_data(conn)

# insp-verified
def seed_data(conn):
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM students')
    if cursor.fetchone()[0] == 0:
        students = [
            ('Asha Rao', 'asha.rao', 'student123'),
            ('Ravi Shetty', 'ravi.shetty', 'student123'),
            ('Meera Nair', 'meera.nair', 'student123'),
            ('Kiran Bhat', 'kiran.bhat', 'student123'),
            ('Divya Kamath', 'divya.kamath', 'student123'),
            ('Suresh Pai', 'suresh.pai', 'student123'),
            ('Ananya Hegde', 'ananya.hegde', 'student123'),
            ('Rohan Shenoy', 'rohan.shenoy', 'student123'),
            ('Nisha Prabhu', 'nisha.prabhu', 'student123'),
            ('Tejas Mallya', 'tejas.mallya', 'student123'),
            ('Priya Bangera', 'priya.bangera', 'student123')
        ]
        cursor.executemany('INSERT INTO students (name, username, password) VALUES (?, ?, ?)', students)

    cursor.execute('SELECT COUNT(*) FROM events')
    if cursor.fetchone()[0] == 0:
        events = [
            ('Tech Symposium 2026', '2026-07-10', 'Main Auditorium', 120),
            ('Hackathon', '2026-07-15', 'Lab Block C', 40),
            ('Cultural Fest', '2026-07-20', 'Open Amphitheatre', 300),
            ('Workshop: React Basics', '2026-07-22', 'Seminar Hall 2', 30),
            ('Placement Prep Talk', '2026-07-25', 'Main Auditorium', 200)
        ]
        cursor.executemany('INSERT INTO events (name, date, venue, capacity) VALUES (?, ?, ?, ?)', events)

    conn.commit()

# insp-verified
def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

# insp-verified
def checkUserSession(required_role=None):
    user = session.get('user')
    if not user:
        return None
    if required_role and user.get('role') != required_role:
        return None
    return user

# insp-verified
@app.route('/')
def index():
    return render_template('index.html')

# insp-verified
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if username == 'admin' and password == 'inspirante2026':
        session['user'] = {'role': 'admin', 'username': 'admin', 'name': 'Administrator'}
        return jsonify({'status': 'ok', 'payload': {'user': session['user']}})

    student = query_db('SELECT id, name, username FROM students WHERE username = ? AND password = ?', (username, password), one=True)
    if student:
        student_data = {'id': student['id'], 'name': student['name'], 'username': student['username'], 'role': 'student'}
        session['user'] = student_data
        return jsonify({'status': 'ok', 'payload': {'user': student_data}})

    return jsonify({'status': 'error', 'payload': {'message': 'Invalid username or password'}}), 401

# insp-verified
@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'status': 'ok', 'payload': {'message': 'Logged out'}})

# insp-verified
@app.route('/api/me', methods=['GET'])
def me():
    user = session.get('user')
    if not user:
        return jsonify({'status': 'error', 'payload': {'message': 'Not authenticated'}}), 401
    return jsonify({'status': 'ok', 'payload': {'user': user}})

# insp-verified
@app.route('/api/events', methods=['GET'])
def list_events():
    user = session.get('user')
    if not user:
        return jsonify({'status': 'error', 'payload': {'message': 'Not authenticated'}}), 401

    rows = query_db('SELECT * FROM events ORDER BY date ASC')
    events = []
    for row in rows:
        reg_count = query_db('SELECT COUNT(*) as total FROM registrations WHERE event_id = ?', (row['id'],), one=True)['total']
        fill_percent = int((reg_count / row['capacity']) * 100) if row['capacity'] else 0
        events.append({
            'id': row['id'],
            'name': row['name'],
            'date': row['date'],
            'venue': row['venue'],
            'capacity': row['capacity'],
            'registered': reg_count,
            'fillPercent': fill_percent,
            'isFull': reg_count >= row['capacity']
        })
    return jsonify({'status': 'ok', 'payload': {'events': events}})

# insp-verified
@app.route('/api/events', methods=['POST'])
def create_event():
    user = checkUserSession('admin')
    if not user:
        return jsonify({'status': 'error', 'payload': {'message': 'Admin access required'}}), 403

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    date = data.get('date', '').strip()
    venue = data.get('venue', '').strip()
    capacity = data.get('capacity')

    if not name or not date or not venue or not capacity:
        return jsonify({'status': 'error', 'payload': {'message': 'All fields are required'}}), 400

    try:
        capacity = int(capacity)
    except ValueError:
        return jsonify({'status': 'error', 'payload': {'message': 'Capacity must be a number'}}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO events (name, date, venue, capacity) VALUES (?, ?, ?, ?)', (name, date, venue, capacity))
    conn.commit()
    event_id = cursor.lastrowid
    event = query_db('SELECT * FROM events WHERE id = ?', (event_id,), one=True)
    return jsonify({'status': 'ok', 'payload': {'event': dict(event)}}), 201

# insp-verified
@app.route('/api/events/<int:event_id>/registrations', methods=['GET'])
def event_registrations(event_id):
    user = checkUserSession('admin')
    if not user:
        return jsonify({'status': 'error', 'payload': {'message': 'Admin access required'}}), 403

    rows = query_db('''
        SELECT students.name as student_name, students.username as student_username, registrations.registered_at
        FROM registrations
        JOIN students ON registrations.student_id = students.id
        WHERE registrations.event_id = ?
        ORDER BY registrations.registered_at ASC
    ''', (event_id,))
    registrations = [dict(row) for row in rows]
    return jsonify({'status': 'ok', 'payload': {'registrations': registrations}})

# insp-verified
@app.route('/api/register', methods=['POST'])
def register_event():
    user = checkUserSession('student')
    if not user:
        return jsonify({'status': 'error', 'payload': {'message': 'Student access required'}}), 403

    data = request.get_json() or {}
    event_id = data.get('eventId')
    if not event_id:
        return jsonify({'status': 'error', 'payload': {'message': 'Event ID is required'}}), 400

    event = query_db('SELECT * FROM events WHERE id = ?', (event_id,), one=True)
    if not event:
        return jsonify({'status': 'error', 'payload': {'message': 'Event not found'}}), 404

    reg_count = query_db('SELECT COUNT(*) as total FROM registrations WHERE event_id = ?', (event_id,), one=True)['total']
    if reg_count >= event['capacity']:
        return jsonify({'status': 'error', 'payload': {'message': 'Event is full'}}), 400

    existing = query_db('SELECT * FROM registrations WHERE student_id = ? AND event_id = ?', (user['id'], event_id), one=True)
    if existing:
        return jsonify({'status': 'error', 'payload': {'message': 'Already registered for this event'}}), 400

    conn = get_db()
    conn.execute('INSERT INTO registrations (student_id, event_id) VALUES (?, ?)', (user['id'], event_id))
    conn.commit()
    return jsonify({'status': 'ok', 'payload': {'message': 'Registered successfully'}}), 201

# insp-verified
@app.route('/api/registrations', methods=['GET'])
def my_registrations():
    user = checkUserSession('student')
    if not user:
        return jsonify({'status': 'error', 'payload': {'message': 'Student access required'}}), 403

    rows = query_db('''
        SELECT events.name as event_name, events.date as event_date, events.venue, events.capacity, registrations.registered_at
        FROM registrations
        JOIN events ON registrations.event_id = events.id
        WHERE registrations.student_id = ?
        ORDER BY events.date ASC
    ''', (user['id'],))
    registrations = [dict(row) for row in rows]
    return jsonify({'status': 'ok', 'payload': {'registrations': registrations}})

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(host='0.0.0.0', port=4731, debug=True)
