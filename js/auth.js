// ============================================
// OMNIS Authentication System
// ============================================

function initUsers() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const defaultUsers = [
            {
                id: 'admin-001',
                username: 'admin',
                email: 'admin@omnis.it',
                password: CONFIG.ADMIN_DEFAULT_PASSWORD,
                role: 'admin',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                projectCount: 0
            },
            {
                id: 'user-001',
                username: 'studente',
                email: 'studente@esempio.it',
                password: 'studente123',
                role: 'user',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                projectCount: 0
            }
        ];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }
}

function getUsers() {
    initUsers();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getCurrentUser() {
    const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return userJson ? JSON.parse(userJson) : null;
}

function setCurrentUser(user) {
    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
}

function isLoggedIn() {
    return !!getCurrentUser();
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    if (!isAdmin()) {
        alert('⛔ Accesso negato. Solo gli amministratori possono accedere.');
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// ============================================
// LOGIN
// ============================================
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    
    if (loginError) loginError.classList.remove('show');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Accesso in corso...';
    }
    
    setTimeout(() => {
        const users = getUsers();
        const user = users.find(u => 
            (u.username === username || u.email === username) && 
            u.password === password
        );
        
        if (user) {
            user.lastLogin = new Date().toISOString();
            const userIndex = users.findIndex(u => u.id === user.id);
            users[userIndex] = user;
            saveUsers(users);
            setCurrentUser(user);
            
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            if (loginError) loginError.classList.add('show');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Accedi';
            }
        }
    }, 600);
}

// ============================================
// REGISTRAZIONE
// ============================================
function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorEl = document.getElementById('registerError');
    const registerBtn = document.getElementById('registerBtn');
    
    errorEl.classList.remove('show');
    
    if (!username || !email || !password || !confirmPassword) {
        showError('Tutti i campi sono obbligatori.');
        return;
    }
    
    if (username.length < 3) {
        showError('Username deve avere almeno 3 caratteri.');
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Inserisci un\'email valida.');
        return;
    }
    
    if (password.length < 6) {
        showError('Password deve avere almeno 6 caratteri.');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Le password non coincidono.');
        return;
    }
    
    const users = getUsers();
    
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        showError('Username già in uso.');
        return;
    }
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showError('Email già registrata.');
        return;
    }
    
    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Registrazione...';
    }
    
    setTimeout(() => {
        const newUser = {
            id: 'user-' + Date.now(),
            username: username,
            email: email.toLowerCase(),
            password: password,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            projectCount: 0
        };
        
        users.push(newUser);
        saveUsers(users);
        setCurrentUser(newUser);
        
        alert('✅ Registrazione completata! Benvenuto ' + username + '!');
        window.location.href = 'dashboard.html';
    }, 500);
    
    function showError(msg) {
        errorEl.textContent = '⚠️ ' + msg;
        errorEl.classList.add('show');
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.textContent = '📝 Registrati';
        }
    }
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    window.location.href = 'login.html';
}

function updateNavbar() {
    const user = getCurrentUser();
    const navUserElements = document.querySelectorAll('#navUser');
    
    navUserElements.forEach(el => {
        if (user) {
            const initial = user.username.charAt(0).toUpperCase();
            el.innerHTML = `
                <div class="user-avatar">${initial}</div>
                <span>${user.username}</span>
            `;
        }
    });
    
    const adminBtns = document.querySelectorAll('#adminBtn');
    adminBtns.forEach(btn => {
        if (user && user.role === 'admin') {
            btn.style.display = 'inline-flex';
        } else {
            btn.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initUsers();
    
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'dashboard.html' || currentPage === 'gazzetta.html') {
        if (!requireAuth()) return;
    }
    
    if (currentPage === 'admin.html') {
        if (!requireAdmin()) return;
    }
    
    if ((currentPage === 'login.html' || currentPage === 'register.html') && isLoggedIn()) {
        if (isAdmin()) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
    
    updateNavbar();
});