const feed = document.getElementById('audit-feed');
const status = document.getElementById('connection-status');
const cards = {
    total: document.querySelector('#card-total .stat-value'),
    success: document.querySelector('#card-success .stat-value'),
    error: document.querySelector('#card-error .stat-value'),
    sessions: document.querySelector('#card-active-sessions .stat-value')
};

let stats = { total: 0, success: 0, error: 0, sessions: new Set() };
let currentFilter = 'all';

function connect() {
    const eventSource = new EventSource('/api/stream');

    eventSource.onopen = () => {
        status.textContent = 'Monitoring Live';
        status.className = 'status-indicator online';
    };

    eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        status.textContent = 'Reconnecting...';
        status.className = 'status-indicator loading';
    };

    eventSource.addEventListener('heartbeat', () => {
        // Just keeping connection alive
        status.textContent = 'Monitoring Live';
        status.className = 'status-indicator online';
    });

    eventSource.onmessage = (event) => {
        if (!event.data) return;
        
        try {
            const entry = JSON.parse(event.data);
            processEntry(entry);
        } catch (e) {
            console.error('Failed to parse entry', e);
        }
    };
}

function processEntry(entry) {
    stats.total++;
    if (entry.result === 'error' || entry.error_code) {
        stats.error++;
        showGlobalAlert(entry);
    } else {
        stats.success++;
    }
    
    if (entry.session_id) stats.sessions.add(entry.session_id);

    updateStats();
    addEntryToUI(entry);
}

function updateStats() {
    cards.total.textContent = stats.total;
    cards.success.textContent = stats.success;
    cards.error.textContent = stats.error;
    cards.sessions.textContent = stats.sessions.size;
}

function addEntryToUI(entry) {
    const div = document.createElement('div');
    const isError = entry.result === 'error' || entry.error_code;
    
    div.className = `entry ${entry.role} ${isError ? 'error' : ''}`;
    div.dataset.role = entry.role;
    div.dataset.type = isError ? 'error' : 'success';

    const ts = new Date(entry.ts).toLocaleTimeString();
    
    div.innerHTML = `
        <div class="entry-header">
            <span class="role-tag">${entry.role}</span>
            <span class="ts">${ts}</span>
        </div>
        <div class="tool-name">${entry.tool || 'SYSTEM'}</div>
        <div class="entry-body">
            ${entry.notes || entry.intent || ''}
            ${isError ? `<div class="error-msg">ERROR: ${entry.error_code || 'Unknown Execution Failure'}</div>` : ''}
        </div>
    `;

    feed.appendChild(div);
    
    // Apply filter
    applyFilterToEntry(div);

    // Limit feed size
    if (feed.children.length > 200) {
        feed.removeChild(feed.firstChild);
    }
}

function applyFilterToEntry(el) {
    if (currentFilter === 'all') {
        el.classList.remove('hidden');
    } else if (currentFilter === 'error') {
        el.classList.toggle('hidden', !el.classList.contains('error'));
    } else {
        el.classList.toggle('hidden', el.dataset.role !== currentFilter);
    }
}

function showGlobalAlert(entry) {
    const alert = document.getElementById('active-alert');
    alert.querySelector('.message').textContent = `SECURITY ALERT: ${entry.tool} failed in ${entry.role}`;
    alert.classList.remove('hidden');
    
    setTimeout(() => {
        alert.classList.add('hidden');
    }, 5000);
}

// Doctor Feature Logic
const doctorBtn = document.getElementById('doctor-btn');
const doctorPanel = document.getElementById('doctor-results');
const doctorContent = document.getElementById('doctor-content');
const closeDoctor = document.getElementById('close-doctor');

doctorBtn.addEventListener('click', async () => {
    doctorBtn.disabled = true;
    doctorBtn.innerHTML = '<span class="icon">⏳</span> Scanning...';
    
    try {
        const response = await fetch('/api/doctor');
        const data = await response.json();
        
        doctorPanel.classList.remove('hidden');
        renderDoctorResults(data);
    } catch (e) {
        alert('Failed to run system check: ' + e.message);
    } finally {
        doctorBtn.disabled = false;
        doctorBtn.innerHTML = '<span class="icon">🩺</span> Run Doctor';
    }
});

closeDoctor.addEventListener('click', () => {
    doctorPanel.classList.add('hidden');
});

function renderDoctorResults(data) {
    const isHealthy = data.status === 'healthy';
    doctorContent.innerHTML = `
        <div class="health-summary ${isHealthy ? '' : 'issue'}" style="margin-bottom: 2rem;">
            <h4 style="font-size: 1.25rem;">${data.summary}</h4>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">Scan completed at ${new Date(data.timestamp).toLocaleString()}</p>
        </div>
        <div class="health-details">
            ${data.issues.length === 0 
                ? '<div class="health-item">✅ All core components are reachable and configured correctly.</div>'
                : data.issues.map(issue => `
                    <div class="health-item issue">
                        <strong>ISSUE DETECTED:</strong><br>
                        ${issue}
                    </div>
                  `).join('')
            }
        </div>
    `;
}

// Filters logic
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        
        document.querySelectorAll('.entry').forEach(applyFilterToEntry);
    });
});

connect();
