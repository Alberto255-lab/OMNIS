// ============================================
// OMNIS Gazzetta Logic
// ============================================

if (!requireAuth()) throw new Error('Auth required');

let currentFilter = 'all';

function loadGazzetta(filter = 'all') {
    const gazzetta = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAZZETTA) || '[]');
    const grid = document.getElementById('gazzettaGrid');
    
    if (!grid) return;
    
    let filtered = gazzetta;
    if (filter !== 'all') {
        filtered = gazzetta.filter(p => p.service === filter);
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-state">📭 Nessun progetto nella Gazzetta. Sii il primo a condividere!</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(project => `
        <div class="gazzetta-card" data-type="${project.service}">
            <div class="card-header">
                <span class="card-type-badge">${getServiceIcon(project.service)} ${getServiceName(project.service)}</span>
                <span class="card-author">di ${project.userName}</span>
            </div>
            <div class="card-content">${project.content.substring(0, 200)}</div>
            <div class="card-date">${new Date(project.date).toLocaleDateString('it-IT')}</div>
        </div>
    `).join('');
}

function filterGazzetta(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadGazzetta(type);
}

function getServiceName(service) {
    const names = { 'summary': 'Riassunto', 'mindmap': 'Mappa', 'quiz': 'Quiz' };
    return names[service] || service;
}

function getServiceIcon(service) {
    const icons = { 'summary': '📝', 'mindmap': '🗺️', 'quiz': '❓' };
    return icons[service] || '📄';
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    loadGazzetta();
});