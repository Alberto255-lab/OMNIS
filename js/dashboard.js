// ============================================
// OMNIS Dashboard - REAL BACKEND ONLY
// ============================================

if (!requireAuth()) throw new Error('Auth required');

let currentService = '';
let selectedFiles = [];
let serverOnline = false;
let projectToDelete = null;
let _lastGeneratedContent = null;
let _lastGeneratedService = null;

// ============================================
// SERVER STATUS CHECK
// ============================================
async function checkServerStatus() {
    const statusText = document.getElementById('serverStatusText');
    const offlineBanner = document.getElementById('serverStatusBanner');
    const onlineBanner = document.getElementById('serverOnlineBanner');
    
    if (!CONFIG.COLAB_URL) {
        updateServerUI(false, 'Server AI non configurato.');
        return false;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${CONFIG.COLAB_URL}/api/health`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            updateServerUI(true, `🟢 Online - Pronto`);
            return true;
        } else {
            updateServerUI(false, '🔴 Server Offline');
            return false;
        }
    } catch (error) {
        updateServerUI(false, '🔴 Server non raggiungibile');
        return false;
    }
}

function updateServerUI(online, message) {
    serverOnline = online;
    const statusText = document.getElementById('serverStatusText');
    const offlineBanner = document.getElementById('serverStatusBanner');
    const onlineBanner = document.getElementById('serverOnlineBanner');
    
    if (statusText) {
        statusText.textContent = message;
        statusText.style.color = online ? '#10B981' : '#ef4444';
    }
    
    if (offlineBanner && onlineBanner) {
        if (online) {
            offlineBanner.style.display = 'none';
            onlineBanner.style.display = 'block';
        } else {
            offlineBanner.style.display = 'block';
            onlineBanner.style.display = 'none';
        }
    }
}

// ============================================
// FULL PAGE LOADING
// ============================================
function showFullpageLoading() {
    if (!document.getElementById('loadingFullpage')) {
        const html = `
            <div class="loading-fullpage" id="loadingFullpage">
                <div class="spinner"></div>
                <span class="loading-sparkles">✨</span>
                <h2>OMNIS sta generando...</h2>
                <p id="loadingStatus">Analisi del contenuto in corso</p>
                <div class="loading-progress">
                    <div class="loading-progress-bar"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
    document.getElementById('loadingFullpage').classList.add('active');
}

function hideFullpageLoading() {
    const el = document.getElementById('loadingFullpage');
    if (el) el.classList.remove('active');
}

function setLoadingStatus(text) {
    const el = document.getElementById('loadingStatus');
    if (el) el.textContent = text;
}

// ============================================
// FULL PAGE RESULT
// ============================================
function showResultFullpage(content, service) {
    const old = document.getElementById('resultFullpage');
    if (old) old.remove();
    
    const names = {
        'summary': '📝 Riassunto',
        'mindmap': '🗺️ Mappa Concettuale',
        'quiz': '❓ Quiz'
    };
    
    const isMindmap = service === 'mindmap';
    const contentHTML = isMindmap 
        ? content 
        : `<pre class="result-page-text">${escapeHtml(content)}</pre>`;
    
    const html = `
        <div class="result-fullpage" id="resultFullpage">
            <div class="result-overlay" onclick="closeResultFullpage()"></div>
            <div class="result-page-content">
                <div class="result-page-header">
                    <h2>${names[service] || 'Risultato'}</h2>
                    <div class="result-page-actions">
                        <button class="btn-icon" onclick="copyResultFullpage()">📋</button>
                        <button class="btn-icon" onclick="downloadResultFullpage()">📄</button>
                        <button class="btn-icon" onclick="shareResultFullpage()">📤</button>
                        <button class="btn-icon" onclick="closeResultFullpage()">✕</button>
                    </div>
                </div>
                <div class="result-page-body">
                    ${contentHTML}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    _lastGeneratedContent = content;
    _lastGeneratedService = service;
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();
    loadProjects();
    serverOnline = await checkServerStatus();
    setInterval(checkServerStatus, CONFIG.COLAB_CHECK_INTERVAL);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
            closeResultFullpage();
        }
    });
});

// ============================================
// MODAL
// ============================================
function openModal(service) {
    if (!serverOnline) {
        alert('⚠️ Il server AI non è attivo.');
        return;
    }
    
    currentService = service;
    const modal = document.getElementById('uploadModal');
    const titles = {
        'summary': '📝 Crea Riassunto',
        'mindmap': '🗺️ Crea Mappa Concettuale',
        'quiz': '❓ Crea Quiz'
    };
    
    document.getElementById('modalTitle').textContent = titles[service] || 'Crea Contenuto';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('errorBlock').style.display = 'none';
    document.getElementById('loadingBlock').style.display = 'none';
    document.getElementById('generateBtn').style.display = 'block';
    document.getElementById('textInput').value = '';
    document.getElementById('customPrompt').value = '';
    document.getElementById('linkInput').value = '';
    selectedFiles = [];
    updateFileList();
}

function closeModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    selectedFiles = [];
    updateFileList();
}

// ============================================
// DELETE PROJECT
// ============================================
function openDeleteModal(projectId) {
    projectToDelete = projectId;
    document.getElementById('deleteModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    projectToDelete = null;
}

function confirmDeleteProject() {
    if (!projectToDelete) return;
    let projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    projects = projects.filter(p => p.id !== projectToDelete);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    closeDeleteModal();
    loadProjects();
    alert('✅ Progetto eliminato!');
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeleteProject);

// ============================================
// UPLOAD FILE
// ============================================
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#8B5CF6'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        addFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => addFiles(e.target.files));
}

function addFiles(files) {
    selectedFiles = [...selectedFiles, ...Array.from(files)];
    updateFileList();
}

function updateFileList() {
    const container = document.getElementById('fileList');
    if (!container) return;
    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <span>📄 ${file.name} (${formatFileSize(file.size)})</span>
            <button onclick="removeFile(${index})">✕</button>
        </div>
    `).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ============================================
// GENERATE CONTENT
// ============================================
async function generateContent() {
    const textInput = document.getElementById('textInput')?.value.trim() || '';
    const customPrompt = document.getElementById('customPrompt')?.value.trim() || '';
    const link = document.getElementById('linkInput')?.value.trim() || '';
    const includeImages = document.getElementById('includeImages')?.checked || false;
    const user = getCurrentUser();
    
    if (!textInput && selectedFiles.length === 0 && !link) {
        alert('⚠️ Inserisci testo, carica file o incolla link.');
        return;
    }
    
    if (!serverOnline) {
        alert('🔴 Server AI non attivo.');
        return;
    }
    
    // Chiudi modal e mostra loading full page
    closeModal();
    showFullpageLoading();
    setLoadingStatus('Analisi del contenuto...');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 400));
        setLoadingStatus('🧠 L\'AI sta elaborando...');
        
        let content;

if (currentService === 'mindmap') {
    // Per la mappa: chiama API mindmap-image che restituisce PNG
    content = await callColabBackendMindmap(textInput, selectedFiles, link, customPrompt);
} else {
    // Per riassunto e quiz: API generate normale
    content = await callColabBackend(currentService, textInput, selectedFiles, link, customPrompt, includeImages);
}
        
        setLoadingStatus('✅ Quasi pronto...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        hideFullpageLoading();
        showResultFullpage(content, currentService);
        
        saveProject(user.username, currentService, content);
        
        const users = getUsers();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex].projectCount = (users[userIndex].projectCount || 0) + 1;
            saveUsers(users);
            setCurrentUser(users[userIndex]);
        }
        
    } catch (error) {
        console.error('Generation error:', error);
        hideFullpageLoading();
        alert('🔴 Errore: ' + error.message);
    }
}

async function callColabBackend(service, textInput, files, link, customPrompt, includeImages) {
    const formData = new FormData();
    formData.append('service', service);
    formData.append('text_input', textInput);
    formData.append('custom_prompt', customPrompt);
    formData.append('include_images', includeImages.toString());
    if (link) formData.append('link', link);
    
    for (const file of files) {
        formData.append('files', file);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);
    
    try {
        const response = await fetch(`${CONFIG.COLAB_URL}/api/generate`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Errore server: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.content) {
            throw new Error('Nessun contenuto ricevuto');
        }
        
        return data.content;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Timeout: riprova con meno testo.');
        }
        throw error;
    }
}

// ============================================
// PROJECT MANAGEMENT
// ============================================
function saveProject(userName, service, content) {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    projects.unshift({
        id: Date.now(),
        userName,
        service,
        content,
        date: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects.slice(0, 50)));
    loadProjects();
}

function loadProjects() {
    const user = getCurrentUser();
    if (!user) return;
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const userProjects = projects.filter(p => p.userName === user.username);
    const grid = document.getElementById('projectsGrid');
    
    if (!grid) return;
    
    if (userProjects.length === 0) {
        grid.innerHTML = '<p class="empty-state">📭 Nessun progetto ancora.</p>';
        return;
    }
    
    grid.innerHTML = userProjects.slice(0, 12).map(project => `
        <div class="project-card">
            <div onclick="viewProject(${project.id})" style="cursor:pointer;">
                <h4>${getServiceIcon(project.service)} ${getServiceName(project.service)}</h4>
                <p class="project-meta">${formatDate(project.date)}</p>
                <p class="project-preview">${escapeHtml(project.content.substring(0, 100))}...</p>
            </div>
            <button class="btn-delete-project" onclick="event.stopPropagation(); openDeleteModal(${project.id})">🗑️</button>
        </div>
    `).join('');
}

function viewProject(id) {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const project = projects.find(p => p.id === id);
    if (project) {
        showResultFullpage(project.content, project.service);
    }
}

function getServiceName(service) {
    return { 'summary': 'Riassunto', 'mindmap': 'Mappa Concettuale', 'quiz': 'Quiz' }[service] || service;
}

function getServiceIcon(service) {
    return { 'summary': '📝', 'mindmap': '🗺️', 'quiz': '❓' }[service] || '📄';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


async function callColabBackendMindmap(textInput, files, link, customPrompt) {
    const formData = new FormData();
    formData.append('text_input', textInput);
    formData.append('custom_prompt', customPrompt);
    if (link) formData.append('link', link);
    
    for (const file of files) {
        formData.append('files', file);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);
    
    try {
        const response = await fetch(`${CONFIG.COLAB_URL}/api/mindmap-image`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('Errore generazione mappa');
        }
        
        const data = await response.json();
        
        if (!data.image_base64) {
            throw new Error('Nessuna immagine ricevuta');
        }
        
        // Restituisce HTML con immagine incorporata
        return `<img src="data:image/png;base64,${data.image_base64}" style="max-width:100%;border-radius:12px;" alt="Mappa Concettuale">`;
        
    } catch (error) {
        throw error;
    }
}
