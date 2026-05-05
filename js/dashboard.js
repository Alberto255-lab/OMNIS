// ============================================
// OMNIS Dashboard - REAL BACKEND ONLY
// ============================================

if (!requireAuth()) throw new Error('Auth required');

let currentService = '';
let selectedFiles = [];
let serverOnline = false;
let projectToDelete = null;

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
            updateServerUI(true, `🟢 Online - ${data.model || 'Attivo'}`);
            const modelInfo = document.getElementById('serverModelInfo');
            if (modelInfo) {
                modelInfo.textContent = `Modello: ${data.model || 'AI Attivo'} | Pronto a generare contenuti`;
            }
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

document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();
    loadProjects();
    serverOnline = await checkServerStatus();
    setInterval(checkServerStatus, CONFIG.COLAB_CHECK_INTERVAL);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });
});

// ============================================
// MODAL
// ============================================
function openModal(service) {
    if (!serverOnline) {
        alert('⚠️ Il server AI non è attivo.\n\nAttendi che il founder avvii il backend su Google Colab.\n\nControlla lo stato nel pannello admin.');
        return;
    }
    
    currentService = service;
    const modal = document.getElementById('uploadModal');
    const title = document.getElementById('modalTitle');
    
    const titles = {
        'summary': '📝 Crea Riassunto',
        'mindmap': '🗺️ Crea Mappa Concettuale',
        'quiz': '❓ Crea Quiz'
    };
    
    title.textContent = titles[service] || 'Crea Contenuto';
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
// DELETE PROJECT MODAL
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
// GENERATE CONTENT - SOLO BACKEND REALE
// ============================================
async function generateContent() {
    const textInput = document.getElementById('textInput')?.value.trim() || '';
    const customPrompt = document.getElementById('customPrompt')?.value.trim() || '';
    const link = document.getElementById('linkInput')?.value.trim() || '';
    const includeImages = document.getElementById('includeImages')?.checked || false;
    const user = getCurrentUser();
    
    if (!textInput && selectedFiles.length === 0 && !link) {
        alert('⚠️ Inserisci del testo, carica un file o incolla un link per continuare.');
        return;
    }
    
    if (!serverOnline) {
        alert('🔴 Il server AI non è attivo. Non posso generare contenuti.\n\nAttendi che il founder avvii Colab.');
        return;
    }
    
    const generateBtn = document.getElementById('generateBtn');
    const loadingBlock = document.getElementById('loadingBlock');
    const errorBlock = document.getElementById('errorBlock');
    const resultSection = document.getElementById('resultSection');
    
    generateBtn.style.display = 'none';
    loadingBlock.style.display = 'block';
    errorBlock.style.display = 'none';
    resultSection.style.display = 'none';
    
    try {
        const content = await callColabBackend(
            currentService, 
            textInput,
            selectedFiles, 
            link, 
            customPrompt, 
            includeImages
        );
        
        loadingBlock.style.display = 'none';
        resultSection.style.display = 'block';
        document.getElementById('resultContent').textContent = content;
        
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
        loadingBlock.style.display = 'none';
        errorBlock.style.display = 'block';
        generateBtn.style.display = 'block';
    }
}

// ============================================
// CHIAMATA REALE AL BACKEND COLAB
// ============================================
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
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    try {
        const response = await fetch(`${CONFIG.COLAB_URL}/api/generate`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.content && !data.result) {
            throw new Error('Nessun contenuto ricevuto dal server');
        }
        
        return data.content || data.result;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Timeout: Il server ha impiegato troppo tempo. Riprova.');
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
        grid.innerHTML = '<p class="empty-state">📭 Nessun progetto ancora. Inizia a creare!</p>';
        return;
    }
    
    grid.innerHTML = userProjects.slice(0, 12).map(project => `
        <div class="project-card">
            <div onclick="viewProject(${project.id})" style="cursor:pointer;">
                <h4>${getServiceIcon(project.service)} ${getServiceName(project.service)}</h4>
                <p class="project-meta">${formatDate(project.date)}</p>
                <p class="project-preview">${escapeHtml(project.content.substring(0, 100))}...</p>
            </div>
            <button class="btn-delete-project" onclick="event.stopPropagation(); openDeleteModal(${project.id})" title="Elimina progetto">
                🗑️
            </button>
        </div>
    `).join('');
}

function viewProject(id) {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const project = projects.find(p => p.id === id);
    if (project) {
        currentService = project.service;
        document.getElementById('modalTitle').textContent = getServiceName(project.service);
        document.getElementById('uploadModal').classList.add('active');
        document.getElementById('resultContent').textContent = project.content;
        document.getElementById('resultSection').style.display = 'block';
        document.getElementById('generateBtn').style.display = 'none';
        document.getElementById('errorBlock').style.display = 'none';
        document.getElementById('loadingBlock').style.display = 'none';
    }
}

function getServiceName(service) {
    const names = { 'summary': 'Riassunto', 'mindmap': 'Mappa Concettuale', 'quiz': 'Quiz' };
    return names[service] || service;
}

function getServiceIcon(service) {
    const icons = { 'summary': '📝', 'mindmap': '🗺️', 'quiz': '❓' };
    return icons[service] || '📄';
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

// ============================================
// COPY, DOWNLOAD, SHARE
// ============================================
function copyResult() {
    const content = document.getElementById('resultContent')?.textContent;
    if (content) {
        navigator.clipboard.writeText(content).then(() => alert('✅ Copiato negli appunti!'));
    }
}

function downloadResult() {
    const content = document.getElementById('resultContent')?.textContent;
    if (content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omnis-${currentService}-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

function shareResult() {
    const content = document.getElementById('resultContent')?.textContent;
    if (!content) return;
    
    if (confirm('📤 Condividere questo progetto nella Gazzetta? Sarà visibile a tutti gli studenti.')) {
        const user = getCurrentUser();
        const gazzetta = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAZZETTA) || '[]');
        gazzetta.unshift({
            id: Date.now(),
            userName: user.username,
            service: currentService,
            content,
            date: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEYS.GAZZETTA, JSON.stringify(gazzetta.slice(0, 100)));
        alert('✅ Progetto condiviso nella Gazzetta!');
    }
}