// Configuration and global state management
class Config {
    constructor() {
        // Supabase configuration
        this.SUPABASE_URL = 'https://izaitufxqghaajxgwdge.supabase.co';
        this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6YWl0dWZ4cWdoYWFqeGd3ZGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNjQ2NzQsImV4cCI6MjA2NDY0MDY3NH0.XNVDJxvLIyRAQ7qNuG7ODEt_G1PVN7b2zUj3UOgc1hA';
        
        // Initialize Supabase client
        this.supabaseClient = null;
        this.isSupabaseConfigured = false;
        
        this.initializeSupabase();
    }
    
    initializeSupabase() {
        try {
            if (this.SUPABASE_URL !== 'YOUR_SUPABASE_URL' && this.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
                this.supabaseClient = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
                this.isSupabaseConfigured = true;
            }
        } catch (error) {
            console.warn('Supabase not available, using localStorage mode');
            this.isSupabaseConfigured = false;
        }
    }
}

// Global state management
class AppState {
    constructor() {
        // Authentication state
        this.currentUser = null;
        this.userClientId = 'default';
        this.isUserAdmin = false;
        
        // Data state
        this.workOrders = [];
        this.nextId = 1;
        this.useLocalStorage = false;
    }
    
    // Reset state on logout
    reset() {
        this.currentUser = null;
        this.userClientId = 'default';
        this.isUserAdmin = false;
        this.workOrders = [];
        this.nextId = 1;
    }
}

// Create global instances
window.appConfig = new Config();
window.appState = new AppState();