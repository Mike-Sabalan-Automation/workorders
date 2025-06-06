// Authentication management
class AuthManager {
    constructor() {
        this.config = window.appConfig;
        this.state = window.appState;
    }
    
    // Get user client information from JWT metadata
    async getUserClientInfo() {
        if (!this.state.currentUser || !this.config.isSupabaseConfigured || !this.config.supabaseClient) {
            this.state.userOrganizationId = 'org_default';
            this.state.isUserAdmin = false;
            return;
        }
        
        try {
            // Get client info from user metadata or JWT
            const session = await this.config.supabaseClient.auth.getSession();
            if (session.data.session) {
                const jwt = session.data.session.access_token;
                const payload = JSON.parse(atob(jwt.split('.')[1]));
                
                this.state.userOrganizationId = payload.organization_id || this.state.currentUser.user_metadata?.organization_id || 'org_default';
                this.state.isUserAdmin = payload.is_admin || this.state.currentUser.user_metadata?.is_admin || false;
                
                console.log(`User info: organization_id=${this.state.userOrganizationId}, is_admin=${this.state.isUserAdmin}`);
                
                // Update UI to show admin status
                const userEmailElement = document.getElementById('user-email');
                userEmailElement.textContent = `${this.state.currentUser.email}${this.state.isUserAdmin ? ' (Admin)' : ''}`;
            }
        } catch (error) {
            console.warn('Could not get organization info:', error);
            this.state.userOrganizationId = 'org_default';
            this.state.isUserAdmin = false;
        }
    }

    // Check if user is authenticated on page load
    async checkAuth() {
        if (!this.config.isSupabaseConfigured || !this.config.supabaseClient) {
            // No Supabase configuration, go directly to main view with localStorage
            console.log('Using localStorage mode - no authentication required');
            if (window.uiManager) {
                window.uiManager.showMainView();
            }
            document.getElementById('user-email').textContent = 'Local User';
            window.storageManager.loadFromStorage();
            window.workOrderManager.renderWorkOrders();
            window.workOrderManager.updateStats();
            return;
        }
        
        try {
            const { data: { user } } = await this.config.supabaseClient.auth.getUser();
            if (user) {
                this.state.currentUser = user;
                await this.getUserClientInfo();
                if (window.uiManager) {
                    window.uiManager.showMainView();
                }
                if (window.uiManager) {
                    window.uiManager.setupAdminFilters();
                }
                window.storageManager.loadUserData();
            } else {
                if (window.uiManager) {
                    window.uiManager.showAuthView();
                }
            }
        } catch (error) {
            console.warn('Supabase authentication failed, falling back to localStorage mode');
            if (window.uiManager) {
                if (window.uiManager) {
                window.uiManager.showMainView();
            }
            }
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = 'Local User';
            }
            if (window.storageManager) {
                window.storageManager.loadFromStorage();
            }
            if (window.workOrderManager) {
                window.workOrderManager.renderWorkOrders();
                window.workOrderManager.updateStats();
            }
        }
    }
    
    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        if (!this.config.isSupabaseConfigured || !this.config.supabaseClient) {
            document.getElementById('login-error').textContent = 'Supabase not configured. Please check configuration.';
            return;
        }
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        document.getElementById('login-error').textContent = '';
        
        try {
            const { data, error } = await this.config.supabaseClient.auth.signInWithPassword({ email, password });
            
            if (error) {
                document.getElementById('login-error').textContent = error.message;
                return;
            }
            
            this.state.currentUser = data.user;
            await this.getUserClientInfo();
            if (window.uiManager) {
                window.uiManager.showMainView();
            }
            if (window.uiManager) {
                window.uiManager.setupAdminFilters();
            }
            window.storageManager.loadUserData();
        } catch (error) {
            document.getElementById('login-error').textContent = 'An unexpected error occurred';
            console.error('Login error:', error);
        }
    }
    
    // Handle signup form submission
    async handleSignup(e) {
        e.preventDefault();
        
        if (!this.config.isSupabaseConfigured || !this.config.supabaseClient) {
            document.getElementById('signup-error').textContent = 'Supabase not configured. Please check configuration.';
            return;
        }
        
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        document.getElementById('signup-error').textContent = '';
        document.getElementById('signup-success').textContent = '';
        
        try {
            // Sign up new users as admins by default
            const { data, error } = await this.config.supabaseClient.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        is_admin: true,
                        organization_id: `${email.split('@')[0]}_org` // Create org based on email prefix
                    },
                    emailRedirectTo: 'https://mike-sabalan-automation.github.io/workorders/'
                }
            });
            
            if (error) {
                document.getElementById('signup-error').textContent = error.message;
                return;
            }
            
            document.getElementById('signup-success').textContent = 'Admin account created! Please check your email for verification link.';
            // Clear form
            document.getElementById('signup-form').reset();
            
            // If auto-confirm is enabled (development), we can log in right away
            if (data.user && data.session) {
                this.state.currentUser = data.user;
                await this.getUserClientInfo();
                if (window.uiManager) {
                window.uiManager.showMainView();
            }
                if (window.uiManager) {
                    if (window.uiManager) {
                window.uiManager.setupAdminFilters();
            }
                }
                window.storageManager.loadUserData();
            }
        } catch (error) {
            document.getElementById('signup-error').textContent = 'An unexpected error occurred';
            console.error('Signup error:', error);
        }
    }
    
    // Handle logout
    async handleLogout() {
        if (this.config.isSupabaseConfigured && this.config.supabaseClient) {
            try {
                const { error } = await this.config.supabaseClient.auth.signOut();
                if (error) {
                    console.error('Logout error:', error);
                    if (window.uiManager) {
                        window.uiManager.showNotification('Error logging out', 'error');
                    }
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        // Always reset user state
        this.state.reset();
        
        // Clear localStorage
        if (this.state.useLocalStorage) {
            try {
                localStorage.removeItem('workOrders');
                localStorage.removeItem('nextId');
            } catch (e) {
                console.warn('Failed to clear localStorage:', e);
            }
        }
        
        // Show appropriate view
        if (this.config.isSupabaseConfigured) {
            if (window.uiManager) {
                window.uiManager.showAuthView();
            }
        } else {
            // In localStorage mode, reload to clear everything
            location.reload();
        }
    }
    
    // Switch between login and signup tabs
    setupAuthTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Show selected form
                document.querySelectorAll('.auth-form').forEach(form => {
                    form.classList.remove('active');
                });
                document.getElementById(`${tabName}-form`).classList.add('active');
                
                // Clear error messages
                document.getElementById('login-error').textContent = '';
                document.getElementById('signup-error').textContent = '';
                document.getElementById('signup-success').textContent = '';
            });
        });
    }
}

// Create global instance
window.authManager = new AuthManager();