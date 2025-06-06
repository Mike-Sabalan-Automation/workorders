// Main application initialization
class App {
    constructor() {
        this.storageManager = window.storageManager;
        this.authManager = window.authManager;
        this.uiManager = window.uiManager;
        this.utils = window.utils;
    }
    
    // Initialize the application
    async init() {
        // Check localStorage availability as fallback
        const hasLocalStorage = this.storageManager.checkLocalStorage();
        
        if (!hasLocalStorage) {
            setTimeout(() => {
                this.uiManager.showNotification('⚠️ Local storage unavailable. Data may not persist in this environment.', 'info');
            }, 1000);
        } else {
            // Always enable localStorage as backup/fallback
            window.appState.useLocalStorage = true;
            if (!window.appConfig.isSupabaseConfigured) {
                setTimeout(() => {
                    this.uiManager.showNotification('Running in local storage mode. Configure Supabase for cloud storage.', 'info');
                }, 1000);
            }
        }
        
        // Set up authentication
        this.authManager.setupAuthTabs();
        document.getElementById('login-form').addEventListener('submit', (e) => this.authManager.handleLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.authManager.handleSignup(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.authManager.handleLogout());
        
        // Check if user is already authenticated
        await this.authManager.checkAuth();
        
        // Initialize the rest of the app
        this.uiManager.initializeApp();
        this.uiManager.setupEventListeners();
        
        // Add utility features
        setTimeout(() => this.utils.addSampleDataButton(), 100);
        setTimeout(() => this.utils.addImportExportButtons(), 100);
        
        // Setup keyboard shortcuts
        this.utils.setupKeyboardShortcuts();
        
        console.log('Work Order Management System initialized successfully');
        
        // Add global error handling and navigation monitoring
        this.setupGlobalErrorHandling();
    }
    
    setupGlobalErrorHandling() {
        // Catch all JavaScript errors
        window.addEventListener('error', function(e) {
            console.error('GLOBAL ERROR DETECTED:', e.error);
            console.error('Error message:', e.message);
            console.error('Error filename:', e.filename);
            console.error('Error line:', e.lineno);
            console.error('Current URL:', window.location.href);
        });
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', function(e) {
            console.error('UNHANDLED PROMISE REJECTION:', e.reason);
            console.error('Current URL:', window.location.href);
        });
        
        // Monitor for page navigation
        let originalURL = window.location.href;
        const observer = new MutationObserver(function(mutations) {
            if (window.location.href !== originalURL) {
                console.error('CRITICAL: Unexpected page navigation detected!');
                console.error('From:', originalURL);
                console.error('To:', window.location.href);
                originalURL = window.location.href;
            }
        });
        
        observer.observe(document, { subtree: true, childList: true });
        
        // Override window.location to catch programmatic navigation
        const originalReplace = window.location.replace;
        const originalAssign = window.location.assign;
        
        window.location.replace = function(url) {
            console.error('LOCATION.REPLACE CALLED:', url);
            console.trace('Call stack:');
            return originalReplace.call(this, url);
        };
        
        window.location.assign = function(url) {
            console.error('LOCATION.ASSIGN CALLED:', url);
            console.trace('Call stack:');
            return originalAssign.call(this, url);
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    const app = new App();
    await app.init();
});