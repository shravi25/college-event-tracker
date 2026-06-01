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
const registrationsModal = document.getElementById('registrationsModal');
const modalEventTitle = document.getElementById('modalEventTitle');
const modalRegistrations = document.getElementById('modalRegistrations');
const closeBtn = document.querySelector('.close');

// Modal controls
closeBtn.addEventListener('click', () => {
    registrationsModal.classList.add('hidden');
});

registrationsModal.addEventListener('click', (e) => {
    if (e.target === registrationsModal) {
        registrationsModal.classList.add('hidden');
    }
});

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
            <button class="view-registrations" data-event-id="${event.id}" data-event-name="${event.name}">View Registrations (${event.registered})</button>
        </div>
    `).join('');
    
    adminEvents.querySelectorAll('.view-registrations').forEach(button => {
        button.addEventListener('click', () => {
            const eventId = button.dataset.eventId;
            const eventName = button.dataset.eventName;
            viewEventRegistrations(eventId, eventName);
        });
    });
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
            <button class="register-btn" ${event.isFull ? 'disabled' : ''} data-event-id="${event.id}" data-event-name="${event.name}">${event.isFull ? 'Full' : 'Register'}</button>
        </div>
    `).join('');
    studentEvents.querySelectorAll('.register-btn:not(:disabled)').forEach(button => {
        button.addEventListener('click', async () => {
            const eventId = button.dataset.eventId;
            const eventName = button.dataset.eventName;
            button.disabled = true;
            button.textContent = 'Registering...';
            await registerEvent(eventId, eventName);
            button.disabled = false;
            button.textContent = 'Register';
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
            adminEvents.innerHTML = '<p>Loading events...</p>';
            const events = (await apiFetch('/api/events')).events;
            renderAdminEvents(events);
        } else {
            showSection(studentSection);
            studentEvents.innerHTML = '<p>Loading events...</p>';
            const events = (await apiFetch('/api/events')).events;
            renderStudentEvents(events);
            myRegistrations.innerHTML = '<p>Loading your registrations...</p>';
            const regs = (await apiFetch('/api/registrations')).registrations;
            renderMyRegistrations(regs);
        }
    } catch (error) {
        showSection(loginSection);
        loginError.textContent = 'Session expired. Please log in again.';
    }
}

async function registerEvent(eventId, eventName) {
    eventRegisterError.textContent = '';
    eventRegisterSuccess.textContent = '';
    try {
        await apiFetch('/api/register', {
            method: 'POST',
            body: JSON.stringify({ eventId }),
        });
        eventRegisterSuccess.textContent = `Successfully registered for ${eventName}!`;
        await loadDashboard();
    } catch (error) {
        eventRegisterError.textContent = error.message;
    }
}

async function viewEventRegistrations(eventId, eventName) {
    modalEventTitle.textContent = `${eventName} - Registrations`;
    modalRegistrations.innerHTML = '<p>Loading...</p>';
    registrationsModal.classList.remove('hidden');
    
    try {
        const payload = await apiFetch(`/api/events/${eventId}/registrations`);
        const registrations = payload.registrations;
        
        if (!registrations.length) {
            modalRegistrations.innerHTML = '<p>No registrations yet.</p>';
            return;
        }
        
        modalRegistrations.innerHTML = registrations.map(reg => `
            <div class="registration-item">
                <strong>${reg.student_name} (${reg.student_username})</strong>
                <div class="registration-time">Registered: ${new Date(reg.registered_at).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (error) {
        modalRegistrations.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.textContent = '';
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            throw new Error('Username and password are required');
        }
        
        await apiFetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        loginForm.reset();
        await loadDashboard();
    } catch (error) {
        loginError.textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
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
    
    const createBtn = document.getElementById('createEventBtn');
    const originalText = createBtn.textContent;
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    
    try {
        const name = document.getElementById('eventName').value.trim();
        const date = document.getElementById('eventDate').value;
        const venue = document.getElementById('eventVenue').value.trim();
        const capacity = document.getElementById('eventCapacity').value;
        
        if (!name || !date || !venue || !capacity) {
            throw new Error('All fields are required');
        }
        
        await apiFetch('/api/events', {
            method: 'POST',
            body: JSON.stringify({ name, date, venue, capacity }),
        });
        eventCreateMessage.textContent = `Event "${name}" created successfully.`;
        eventForm.reset();
        const events = (await apiFetch('/api/events')).events;
        renderAdminEvents(events);
    } catch (error) {
        eventCreateError.textContent = error.message;
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = originalText;
    }
});

loadDashboard();
