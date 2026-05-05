// ============================================
// OMNIS Admin Panel
// ============================================

if (!requireAdmin()) throw new Error('Admin access required');

let colabStartTime = localStorage.getItem(STORAGE_KEYS.COLAB_START) 
    ? new Date(parseInt(localStorage.getItem(STORAGE_KEYS.COLAB_START))) 
    : null;
let colabTimerInterval = null;
let userToDelete = null;

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    loadStats();
    loadUsers();
    loadModerationList();
    startColabTimer();
    
    const savedUrl = localStorage.getItem(STORAGE_KEYS.COLAB_URL);
    if (savedUrl) {
        document.getElementById('colabUrlInput').value = savedUrl;
    }
    
    document.getElementById('confirmDeleteUserBtn')?.addEventListener('click', confirmDeleteUser);
});

// ============================================
// COLAB MONITORING
// ============================================
function startColabTimer() {
    updateColabStatus();
    colabTimerInterval = setInterval(updateColabStatus, 30000);
}

async function updateColabStatus() {
    const statusDot = document.getElementById('colabStatusDot');
    const uptimeEl = document.getElementById('colabUptime');
    const remainingEl = document.getElementById('colabRemaining');
    const requestsEl = document.getElementById('colabRequests');
    const statusTextEl = document.getElementById('colabStatusText');
    const warningEl = document.getElementById('colabWarning');
    const urlEl = document.getElementById('colabUrl');
    
    const hasUrl = !!CONFIG.COLAB_URL;
    
    let isOnline = false;
    if (hasUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(`${CONFIG.COLAB_URL}/api/health`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            isOnline = response.ok;
        } catch (e) {
            isOnline = false;
        }
    }
    
    if (statusDot) {
        statusDot.className = 'status-dot ' + (isOnline ? 'online' : 'offline');
    }
    
    if (statusTextEl) {
        statusTextEl.textContent = isOnline ? 'Online 🟢' : 'Offline 🔴';
        statusTextEl.style.color = isOnline ? '#10B981' : '#ef4444';
    }
    
    if (urlEl) {
        urlEl.textContent = CONFIG.COLAB_URL || 'Nessun URL Colab configurato';
    }
    
    if (colabStartTime && hasUrl) {
        const now = new Date();
        const uptimeMs = now - colabStartTime;
        const uptimeHours = uptimeMs / (1000 * 60 * 60);
        const remainingHours = Math.max(0, CONFIG.COLAB_MAX_HOURS - uptimeHours);
        
        const uptimeH = Math.floor(uptimeHours);
        const uptimeM = Math.floor((uptimeHours - uptimeH) * 60);
        const uptimeS = Math.floor(((uptimeHours - uptimeH) * 60 - uptimeM) * 60);
        
        if (uptimeEl) uptimeEl.textContent = `${pad(uptimeH)}:${pad(uptimeM)}:${pad(uptimeS)}`;
        
        const remH = Math.floor(remainingHours);
        const remM = Math.floor((remainingHours - remH) * 60);
        const remS = Math.floor(((remainingHours - remH) * 60 - remM) * 60);
        
        if (remainingEl) remainingEl.textContent = `${pad(Math.max(0, remH))}:${pad(Math.max(0, remM))}:${pad(Math.max(0, remS))}`;
        
        if (warningEl) {
            if (remainingHours <= 0.5) {
                warningEl.innerHTML = '<div class="timer-critical">🔴 CRITICO: Meno di 30 minuti! Riavvia Colab!</div>';
            } else if (remainingHours <= 2) {
                warningEl.innerHTML = '<div class="timer-warning">🟡 ATTENZIONE: Meno di 2 ore rimanenti</div>';
            } else {
                warningEl.innerHTML = '';
            }
        }
    } else {
        if (uptimeEl) uptimeEl.textContent = '--:--:--';
        if (remainingEl) remainingEl.textContent = '--:--:--';
    }
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const today = new Date().toDateString();
    const todayProjects = projects.filter(p => new Date(p.date).toDateString() === today);
    if (requestsEl) requestsEl.textContent = todayProjects.length;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// ============================================
// STATS
// ============================================
function loadStats() {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const users = getUsers();
    const gazzetta = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAZZETTA) || '[]');
    const today = new Date().toDateString();
    const todayProjects = projects.filter(p => new Date(p.date).toDateString() === today);
    
    document.getElementById('totalGenerations').textContent = projects.length;
    document.getElementById('dailyGenerations').textContent = todayProjects.length;
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('gazzettaCount').textContent = gazzetta.length;
}

// ============================================
// USERS TABLE
// ============================================
function loadUsers() {
    const users = getUsers();
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">Nessun utente registrato</td></tr>';
        return;
    }
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    
    tbody.innerHTML = users.map(user => {
        const userProjects = projects.filter(p => p.userName === user.username).length;
        const roleBadge = user.role === 'admin' 
            ? '<span class="user-badge badge-admin">Admin</span>' 
            : '<span class="user-badge badge-user">User</span>';
        
        const currentUser = getCurrentUser();
        const isSelf = currentUser && currentUser.id === user.id;
        
        const deleteBtn = isSelf 
            ? '<span style="color:var(--text-muted);font-size:0.8rem;">Tu</span>'
            : `<button class="btn-delete" onclick="openDeleteUserModal('${user.id}')">🗑️</button>`;
        
        return `
            <tr>
                <td><strong>${escapeHtml(user.username)}</strong></td>
                <td>${escapeHtml(user.email)}</td>
                <td>${roleBadge}</td>
                <td>${userProjects}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('it-IT') : 'N/D'}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('it-IT') : 'Mai'}</td>
                <td>${deleteBtn}</td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// DELETE USER
// ============================================
function openDeleteUserModal(userId) {
    userToDelete = userId;
    document.getElementById('deleteUserModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDeleteUserModal() {
    document.getElementById('deleteUserModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    userToDelete = null;
}

function confirmDeleteUser() {
    if (!userToDelete) return;
    
    let users = getUsers();
    const userToRemove = users.find(u => u.id === userToDelete);
    
    if (!userToRemove) {
        alert('Utente non trovato.');
        closeDeleteUserModal();
        return;
    }
    
    if (userToRemove.role === 'admin') {
        alert('⚠️ Non puoi eliminare un altro admin.');
        closeDeleteUserModal();
        return;
    }
    
    users = users.filter(u => u.id !== userToDelete);
    saveUsers(users);
    
    let projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    projects = projects.filter(p => p.userName !== userToRemove.username);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    
    let gazzetta = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAZZETTA) || '[]');
    gazzetta = gazzetta.filter(p => p.userName !== userToRemove.username);
    localStorage.setItem(STORAGE_KEYS.GAZZETTA, JSON.stringify(gazzetta));
    
    closeDeleteUserModal();
    loadStats();
    loadUsers();
    loadModerationList();
    
    alert(`✅ Utente "${userToRemove.username}" eliminato con tutti i suoi progetti.`);
}

// ============================================
// MODERATION
// ============================================
function loadModerationList() {
    const gazzetta = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAZZETTA) || '[]');
    const container = document.getElementById('moderationList');
    if (!container) return;
    
    if (gazzetta.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">Nessun contenuto da moderare</p>';
        return;
    }
    
    container.innerHTML = gazzetta.map(item => `
        <div class="moderation-item">
            <div class="item-info">
                <div class="item-author">👤 ${escapeHtml(item.userName)} • ${new Date(item.date).toLocaleDateString('it-IT')}</div>
                <div class="item-preview">${escapeHtml(item.content.substring(0, 80))}...</div>
            </div>
            <button class="btn-delete" onclick="deleteFromGazzetta(${item.id})">🗑️ Elimina</button>
        </div>
    `).join('');
}

function deleteFromGazzetta(id) {
    if (!confirm('Eliminare questo contenuto dalla Gazzetta?')) return;
    let gazzetta = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAZZETTA) || '[]');
    gazzetta = gazzetta.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.GAZZETTA, JSON.stringify(gazzetta));
    loadModerationList();
    loadStats();
    alert('✅ Contenuto eliminato!');
}

// ============================================
// SETTINGS
// ============================================
function saveColabUrl() {
    const url = document.getElementById('colabUrlInput').value.trim();
    if (url) {
        localStorage.setItem(STORAGE_KEYS.COLAB_URL, url);
        localStorage.setItem(STORAGE_KEYS.COLAB_START, Date.now().toString());
        CONFIG.COLAB_URL = url;
        colabStartTime = new Date();
        alert('✅ URL Colab salvato! Il backend è ora configurato.');
        updateColabStatus();
    }
}

function changeAdminPassword() {
    const newPassword = document.getElementById('newAdminPassword').value.trim();
    if (!newPassword || newPassword.length < 6) {
        alert('⚠️ Password troppo corta. Minimo 6 caratteri.');
        return;
    }
    const users = getUsers();
    const adminIndex = users.findIndex(u => u.role === 'admin');
    if (adminIndex !== -1) {
        users[adminIndex].password = newPassword;
        saveUsers(users);
        localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, newPassword);
        alert('✅ Password admin aggiornata!');
        document.getElementById('newAdminPassword').value = '';
    }
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.panel-section').forEach(panel => panel.classList.remove('active'));
    event.target.classList.add('active');
    
    const panelMap = {
        'users': 'panel-users',
        'moderation': 'panel-moderation',
        'settings': 'panel-settings'
    };
    
    const panelId = panelMap[tabName];
    if (panelId) document.getElementById(panelId).classList.add('active');
    
    if (tabName === 'users') loadUsers();
    if (tabName === 'moderation') loadModerationList();
}