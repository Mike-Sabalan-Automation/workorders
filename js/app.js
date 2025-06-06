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
        
        // Monitor for page navigation and DOM changes
        let originalURL = window.location.href;
        const observer = new MutationObserver(function(mutations) {
            if (window.location.href !== originalURL) {
                console.error('CRITICAL: Unexpected page navigation detected!');
                console.error('From:', originalURL);
                console.error('To:', window.location.href);
                originalURL = window.location.href;
            }
            
            // Check for suspicious DOM changes
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // Check for external scripts being injected
                            if (node.tagName === 'SCRIPT' && node.src && !node.src.includes('supabase')) {
                                console.error('EXTERNAL SCRIPT DETECTED:', node.src);
                            }
                            // Check for iframe injection
                            if (node.tagName === 'IFRAME') {
                                console.error('IFRAME DETECTED:', node.src);
                            }
                            // Check for body replacement
                            if (node.tagName === 'BODY' && node !== document.body) {
                                console.error('BODY REPLACEMENT DETECTED');
                            }
                        }
                    });
                    
                    mutation.removedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.id === 'app') {
                            console.error('CRITICAL: App element removed from DOM!');
                        }
                    });
                }
            });
        });
        
        observer.observe(document, { subtree: true, childList: true });
        
        // Note: Skipping location override due to read-only property restrictions
        console.log('DEBUG: Navigation monitoring active (location override skipped)');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    const app = new App();
    await app.init();
});