// ============================================
// OMNIS Configuration
// ============================================

const CONFIG = {
    // Colab backend URL
    COLAB_URL: localStorage.getItem('omnis_colab_url') || '',
    
    // Default admin password
    ADMIN_DEFAULT_PASSWORD: 'OmnisAdmin123!',
    
    // Colab session
    COLAB_START_TIME: localStorage.getItem('omnis_colab_start') || null,
    COLAB_MAX_HOURS: 12,
    COLAB_CHECK_INTERVAL: 30000, // 30 secondi
    
    // App
    APP_NAME: 'OMNIS',
    APP_VERSION: '2.0.0',
};

const STORAGE_KEYS = {
    USERS: 'omnis_users',
    PROJECTS: 'omnis_projects',
    GAZZETTA: 'omnis_gazzetta',
    CURRENT_USER: 'omnis_current_user',
    ADMIN_PASSWORD: 'omnis_admin_password',
    COLAB_URL: 'omnis_colab_url',
    COLAB_START: 'omnis_colab_start',
    SERVER_STATUS: 'omnis_server_status',
    LAST_SERVER_CHECK: 'omnis_last_server_check',
};