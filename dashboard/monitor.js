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
let allEvents = [];
let allGovernanceEvents = [];
let allPolicyEvents = [];
let allCryptoEvents = [];
let allRemediationProposals = [];

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
        setTimeout(connect, 3000);
    };

    eventSource.addEventListener('heartbeat', () => {
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
    
    allEvents.push(entry);
    updateStats();
    addEntryToUI(entry);
    
    if (entry.type === 'policy') {
        allPolicyEvents.push(entry);
        updatePolicyTab();
    }
    if (entry.type === 'crypto') {
        allCryptoEvents.push(entry);
        updateCryptoTab();
    }
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
    applyFilterToEntry(div);

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

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'governance') {
        loadGovernanceData();
    } else if (tabName === 'policy') {
        updatePolicyTab();
    } else if (tabName === 'sessions') {
        loadSessionsData();
    } else if (tabName === 'crypto') {
        updateCryptoTab();
    } else if (tabName === 'remediation') {
        loadRemediationData();
    } else if (tabName === 'details') {
        loadAuditDetails();
    }
}

async function loadGovernanceData() {
    try {
        const response = await fetch('/api/governance');
        const data = await response.json();
        
        const statsDiv = document.getElementById('governance-stats');
        statsDiv.innerHTML = `
            <div class="info-item">
                <div class="info-label">Approved Plans</div>
                <div class="info-value">${data.approved_plans_count || 0}</div>
            </div>
            <div class="info-item ${data.bootstrap_enabled ? '' : 'warning'}">
                <div class="info-label">Bootstrap Status</div>
                <div class="info-value">${data.bootstrap_enabled ? 'Enabled' : 'Disabled'}</div>
            </div>
        `;

        const logDiv = document.getElementById('governance-log');
        logDiv.innerHTML = '<h3>Governance Events</h3>';
        if (allGovernanceEvents.length === 0) {
            logDiv.innerHTML += '<div class="placeholder">No governance events recorded</div>';
        } else {
            allGovernanceEvents.forEach(evt => {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.innerHTML = `<strong>${evt.action}</strong> - ${new Date(evt.timestamp).toLocaleString()}`;
                logDiv.appendChild(entry);
            });
        }
    } catch (e) {
        document.getElementById('governance-stats').innerHTML = `<div class="placeholder">Error loading governance data</div>`;
    }
}

async function loadSessionsData() {
    try {
        const response = await fetch('/api/sessions');
        const data = await response.json();
        
        const tbody = document.getElementById('sessions-tbody');
        tbody.innerHTML = '';

        if (data.sessions && data.sessions.length > 0) {
            data.sessions.forEach(session => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><code>${session.session_id.substring(0, 12)}...</code></td>
                    <td>${session.role || 'UNKNOWN'}</td>
                    <td><code>${session.workspace_root || 'N/A'}</code></td>
                    <td>${session.active ? 'Active' : 'Inactive'}</td>
                    <td>${new Date(session.last_activity).toLocaleString()}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center; color: var(--text-secondary);">No active sessions</td>';
            tbody.appendChild(row);
        }
    } catch (e) {
        const tbody = document.getElementById('sessions-tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Error loading sessions</td></tr>';
    }
}

function updatePolicyTab() {
    const policyLog = document.getElementById('policy-log');
    if (!policyLog) return;

    const filter = document.querySelector('[data-policy-filter].active')?.dataset.policyFilter || 'all';
    const filtered = filter === 'all' ? allPolicyEvents : allPolicyEvents.filter(evt => evt.status === filter);

    policyLog.innerHTML = '';
    if (filtered.length === 0) {
        policyLog.innerHTML = '<div class="placeholder">No policy events</div>';
    } else {
        filtered.forEach(evt => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${evt.status === 'violation' ? 'error' : 'success'}`;
            entry.innerHTML = `
                <strong>${evt.invariant_id || 'Policy Check'}</strong><br>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${evt.description}</span>
            `;
            policyLog.appendChild(entry);
        });
    }
}

function updateCryptoTab() {
    const cryptoLog = document.getElementById('crypto-log');
    if (!cryptoLog) return;

    const filter = document.querySelector('[data-crypto-filter].active')?.dataset.cryptoFilter || 'all';
    const filtered = filter === 'all' ? allCryptoEvents : allCryptoEvents.filter(evt => evt.operation === filter);

    cryptoLog.innerHTML = '';
    if (filtered.length === 0) {
        cryptoLog.innerHTML = '<div class="placeholder">No cryptographic operations</div>';
    } else {
        filtered.forEach(evt => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${evt.status === 'success' ? 'success' : 'error'}`;
            entry.innerHTML = `
                <strong>${evt.operation}</strong><br>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${evt.description}</span>
            `;
            cryptoLog.appendChild(entry);
        });
    }
}

async function loadRemediationData() {
    try {
        const response = await fetch('/api/remediation-proposals');
        const data = await response.json();
        allRemediationProposals = data.proposals || [];

        const remediationLog = document.getElementById('remediation-log');
        remediationLog.innerHTML = '';

        if (allRemediationProposals.length === 0) {
            remediationLog.innerHTML = '<div class="placeholder">No remediation proposals</div>';
        } else {
            allRemediationProposals.forEach(proposal => {
                const entry = document.createElement('div');
                entry.className = `log-entry ${proposal.status === 'PENDING' ? 'warning' : (proposal.status === 'APPROVED' ? 'success' : 'error')}`;
                entry.innerHTML = `
                    <strong>${proposal.proposal_type}</strong> - <span style="color: var(--text-secondary);">${proposal.status}</span><br>
                    <span style="font-size: 0.8rem;">${proposal.evidence_refs?.join(', ') || 'No evidence'}</span><br>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Risk: ${proposal.risk_assessment?.level}</span>
                `;
                remediationLog.appendChild(entry);
            });
        }
    } catch (e) {
        document.getElementById('remediation-log').innerHTML = '<div class="placeholder">Error loading remediation proposals</div>';
    }
}

async function loadAuditDetails() {
    try {
        const response = await fetch('/api/audit-full');
        const data = await response.json();
        const events = data.events || [];

        const detailsLog = document.getElementById('details-log');
        detailsLog.innerHTML = '';

        if (events.length === 0) {
            detailsLog.innerHTML = '<div class="placeholder">No audit events</div>';
        } else {
            events.forEach((evt, idx) => {
                const entry = document.createElement('div');
                entry.className = 'detail-entry';
                entry.innerHTML = `
                    <div class="detail-entry-header">
                        <span>${evt.tool || 'SYSTEM'} - ${evt.role || 'UNKNOWN'}</span>
                        <span>${new Date(evt.ts || evt.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="detail-entry-body">
                        <div class="json-display">${JSON.stringify(evt, null, 2)}</div>
                    </div>
                `;
                entry.addEventListener('click', () => {
                    entry.classList.toggle('expanded');
                });
                detailsLog.appendChild(entry);
            });
        }
    } catch (e) {
        document.getElementById('details-log').innerHTML = '<div class="placeholder">Error loading audit details</div>';
    }
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn:not(.policy-filter):not(.crypto-filter):not(.remediation-filter)').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            
            document.querySelectorAll('.entry').forEach(applyFilterToEntry);
        });
    });

    document.querySelectorAll('.policy-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.policy-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updatePolicyTab();
        });
    });

    document.querySelectorAll('.crypto-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.crypto-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCryptoTab();
        });
    });

    document.querySelectorAll('.remediation-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.remediation-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.remediationFilter;
            const filteredProposals = filter === 'all' ? allRemediationProposals : allRemediationProposals.filter(p => p.status === filter);
            const remediationLog = document.getElementById('remediation-log');
            remediationLog.innerHTML = '';
            filteredProposals.forEach(proposal => {
                const entry = document.createElement('div');
                entry.className = `log-entry ${proposal.status === 'PENDING' ? 'warning' : (proposal.status === 'APPROVED' ? 'success' : 'error')}`;
                entry.innerHTML = `
                    <strong>${proposal.proposal_type}</strong> - <span style="color: var(--text-secondary);">${proposal.status}</span><br>
                    <span style="font-size: 0.8rem;">${proposal.evidence_refs?.join(', ') || 'No evidence'}</span>
                `;
                remediationLog.appendChild(entry);
            });
        });
    });

    document.getElementById('details-search')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.detail-entry').forEach(entry => {
            const text = entry.textContent.toLowerCase();
            entry.style.display = text.includes(query) ? 'block' : 'none';
        });
    });

    document.getElementById('export-btn')?.addEventListener('click', () => {
        const dataStr = JSON.stringify(allEvents, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `atlas-gate-audit-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

async function setupDoctor() {
    const doctorBtn = document.getElementById('doctor-btn');
    const doctorContent = document.getElementById('doctor-content');
    const doctorFixBtn = document.getElementById('doctor-fix-btn');
    const doctorFixStatus = document.getElementById('doctor-fix-status');
    const fixResults = document.getElementById('fix-results');

    doctorBtn.addEventListener('click', async () => {
        doctorBtn.disabled = true;
        doctorBtn.innerHTML = '<span class="icon">⏳</span> Scanning...';
        
        try {
            const response = await fetch('/api/doctor');
            const data = await response.json();
            
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
                                <span style="font-family: monospace; font-size: 0.85rem;">${issue}</span>
                            </div>
                          `).join('')
                    }
                </div>
            `;

            if (data.issues.length > 0) {
                doctorFixStatus.classList.remove('hidden');
            } else {
                doctorFixStatus.classList.add('hidden');
            }
        } catch (e) {
            doctorContent.innerHTML = `<div class="health-item issue">Error running doctor: ${e.message}</div>`;
        } finally {
            doctorBtn.disabled = false;
            doctorBtn.innerHTML = '<span class="icon">🩺</span> Run Doctor';
        }
    });

    doctorFixBtn.addEventListener('click', async () => {
        doctorFixBtn.disabled = true;
        doctorFixBtn.innerHTML = '<span class="icon">⏳</span> Fixing...';
        fixResults.classList.add('hidden');
        
        try {
            const response = await fetch('/api/doctor-fix', { method: 'POST' });
            const data = await response.json();
            
            fixResults.classList.remove('hidden');
            fixResults.innerHTML = `
                <h3>Auto-Fix Results</h3>
                <div style="margin-top: 1rem;">
                    ${data.fixes_applied.map(fix => `
                        <div class="health-item ${fix.success ? '' : 'issue'}">
                            <strong>${fix.action}</strong><br>
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">${fix.message}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <p style="color: var(--text-secondary);">Fixed: ${data.fixes_applied.filter(f => f.success).length}/${data.fixes_applied.length}</p>
                </div>
            `;

            setTimeout(() => {
                doctorBtn.click();
            }, 2000);
        } catch (e) {
            fixResults.classList.remove('hidden');
            fixResults.innerHTML = `<div class="health-item issue">Error during auto-fix: ${e.message}</div>`;
        } finally {
            doctorFixBtn.disabled = false;
            doctorFixBtn.innerHTML = '<span class="icon">🔧</span> Auto-Fix Issues';
        }
    });
}

connect();
setupTabs();
setupFilters();
setupDoctor();
