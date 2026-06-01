const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const studentSection = document.getElementById('studentSection');
const adminEvents = document.getElementById('adminEvents');
const studentEvents = document.getElementById('studentEvents');
const myRegistrations = document.getElementById('myRegistrations');
const eventForm = document.getElementById('eventForm');
const eventCreateMessage = document.getElementById('eventCreateMessage');
const eventCreateError = document.getElementById('eventCreateError');
const eventRegisterError = document.getElementById('eventRegisterError');
const eventRegisterSuccess = document.getElementById('eventRegisterSuccess');

async function apiFetch(url, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'x-insp-client': 'riverstone',
        },
        credentials: 'same-origin',
        ...options,
    };

    try {
        const response = await fetch(url, config);
        const result = await response.json();
        if (!response.ok || result.status === 'error') {
            throw new Error(result.payload?.message || 'Request failed');
        }
        return result.payload;
    } catch (error) {
        console.log('insp-err', error);
        throw error;
    }
}

function showSection(section) {
    loginSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    studentSection.classList.add('hidden');
    section.classList.remove('hidden');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function capacityColor(percent) {
    if (percent < 50) return 'capacity-green';
    if (percent < 80) return 'capacity-amber';
    return 'capacity-red';
}

function renderAdminEvents(events) {
    if (!events.length) {
        adminEvents.innerHTML = '<p>No events yet.</p>';
        return;
    }
    adminEvents.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-row">
                <strong>${event.name}</strong>
                <span>${formatDate(event.date)}</span>
            </div>
            <div>${event.venue}</div>
            <div>Capacity: ${event.registered} / ${event.capacity}</div>
            <div class="${capacityColor(event.fillPercent)}">Fill: ${event.fillPercent}%</div>
        </div>
    `).join('');
}

function renderStudentEvents(events) {
    if (!events.length) {
        studentEvents.innerHTML = '<p>No upcoming events.</p>';
        return;
    }
    studentEvents.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-row"><strong>${event.name}</strong><span>${formatDate(event.date)}</span></div>
            <div>${event.venue}</div>
            <div>Capacity: ${event.registered} / ${event.capacity}</div>
            <div>${event.isFull ? '<strong class="full-tag">Full</strong>' : ''}</div>
            <button ${event.isFull ? 'disabled' : ''} data-event-id="${event.id}">${event.isFull ? 'Full' : 'Register'}</button>
        </div>
    `).join('');
    studentEvents.querySelectorAll('button[data-event-id]').forEach(button => {
        button.addEventListener('click', async () => {
            const eventId = button.dataset.eventId;
            await registerEvent(eventId);
        });
    });
}

function renderMyRegistrations(registrations) {
    if (!registrations.length) {
        myRegistrations.innerHTML = '<p>No registrations yet.</p>';
        return;
    }
    myRegistrations.innerHTML = registrations.map(reg => `
        <div class="event-card">
            <div class="event-row"><strong>${reg.event_name}</strong><span>${formatDate(reg.event_date)}</span></div>
            <div>${reg.venue}</div>
            <div>Registered: ${new Date(reg.registered_at).toLocaleString()}</div>
        </div>
    `).join('');
}

async function loadDashboard() {
    try {
        const payload = await apiFetch('/api/me');
        const user = payload.user;
        logoutBtn.classList.remove('hidden');
        if (user.role === 'admin') {
            showSection(adminSection);
            const events = (await apiFetch('/api/events')).events;
            renderAdminEvents(events);
        } else {
            showSection(studentSection);
            const events = (await apiFetch('/api/events')).events;
            renderStudentEvents(events);
            const regs = (await apiFetch('/api/registrations')).registrations;
            renderMyRegistrations(regs);
        }
    } catch (error) {
        showSection(loginSection);
    }
}

async function registerEvent(eventId) {
    eventRegisterError.textContent = '';
    eventRegisterSuccess.textContent = '';
    try {
        await apiFetch('/api/register', {
            method: 'POST',
            body: JSON.stringify({ eventId }),
        });
        eventRegisterSuccess.textContent = 'Registered successfully.';
        await loadDashboard();
    } catch (error) {
        eventRegisterError.textContent = error.message;
    }
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.textContent = '';
    try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await apiFetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        loginForm.reset();
        await loadDashboard();
    } catch (error) {
        loginError.textContent = error.message;
    }
});

logoutBtn.addEventListener('click', async () => {
    await apiFetch('/api/logout', { method: 'POST' });
    logoutBtn.classList.add('hidden');
    showSection(loginSection);
});

eventForm.addEventListener('submit', async event => {
    event.preventDefault();
    eventCreateMessage.textContent = '';
    eventCreateError.textContent = '';
    try {
        const name = document.getElementById('eventName').value;
        const date = document.getElementById('eventDate').value;
        const venue = document.getElementById('eventVenue').value;
        const capacity = document.getElementById('eventCapacity').value;
        await apiFetch('/api/events', {
            method: 'POST',
            body: JSON.stringify({ name, date, venue, capacity }),
        });
        eventCreateMessage.textContent = 'Event created successfully.';
        eventForm.reset();
        const events = (await apiFetch('/api/events')).events;
        renderAdminEvents(events);
    } catch (error) {
        eventCreateError.textContent = error.message;
    }
});

loadDashboard();
