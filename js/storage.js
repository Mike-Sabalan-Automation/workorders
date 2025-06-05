// Storage management - handles both localStorage and Supabase
class StorageManager {
    constructor() {
        this.config = window.appConfig;
        this.state = window.appState;
    }
    
    // Check if localStorage is available
    checkLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            this.state.useLocalStorage = true;
            return true;
        } catch (e) {
            this.state.useLocalStorage = false;
            return false;
        }
    }

    // Save work orders to localStorage
    saveToStorage() {
        if (this.state.useLocalStorage) {
            try {
                localStorage.setItem('workOrders', JSON.stringify(this.state.workOrders));
                localStorage.setItem('nextId', this.state.nextId.toString());
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
            }
        }
    }

    // Load work orders from localStorage
    loadFromStorage() {
        if (this.state.useLocalStorage) {
            try {
                const savedOrders = localStorage.getItem('workOrders');
                const savedNextId = localStorage.getItem('nextId');
                
                if (savedOrders) {
                    this.state.workOrders = JSON.parse(savedOrders);
                }
                if (savedNextId) {
                    this.state.nextId = parseInt(savedNextId);
                }
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
                this.state.workOrders = [];
                this.state.nextId = 1;
            }
        }
    }
    
    // Load user data from Supabase
    async loadUserData() {
        if (!this.state.currentUser || !this.config.isSupabaseConfigured || !this.config.supabaseClient) {
            this.loadFromStorage();
            window.workOrderManager.renderWorkOrders();
            window.workOrderManager.updateStats();
            return;
        }
        
        try {
            // Query will be filtered by RLS policies based on client_id and admin status
            let query = this.config.supabaseClient.from('work_orders').select('*');
            
            if (this.state.isUserAdmin) {
                // Admin users see all work orders for their client (RLS policy handles this)
                console.log('Loading work orders for admin user');
            } else {
                // Regular users see only their own work orders
                query = query.eq('user_id', this.state.currentUser.id);
            }
            
            const { data, error } = await query;
                
            if (error) {
                console.error('Error loading work orders:', error);
                window.uiManager.showNotification('Error loading from cloud, using local data', 'info');
                this.loadFromStorage();
                window.workOrderManager.renderWorkOrders();
                window.workOrderManager.updateStats();
                return;
            }
            
            if (data && data.length > 0) {
                // Map database fields to JavaScript object fields
                this.state.workOrders = data.map(dbWorkOrder => ({
                    id: dbWorkOrder.id,
                    user_id: dbWorkOrder.user_id,
                    client_id: dbWorkOrder.client_id,
                    title: dbWorkOrder.title,
                    description: dbWorkOrder.description || '',
                    assignee: dbWorkOrder.assignee || '',
                    priority: dbWorkOrder.priority || 'medium',
                    status: dbWorkOrder.status || 'open',
                    dueDate: dbWorkOrder.due_date || '',
                    estimatedHours: dbWorkOrder.estimated_hours || 0,
                    createdDate: dbWorkOrder.created_date,
                    updatedDate: dbWorkOrder.updated_date
                }));
                this.state.nextId = Math.max(...this.state.workOrders.map(wo => wo.id)) + 1;
                console.log(`Loaded ${this.state.workOrders.length} work orders from Supabase`);
            } else {
                this.state.workOrders = [];
                this.state.nextId = 1;
                console.log('No work orders found in Supabase');
            }
            
            window.workOrderManager.renderWorkOrders();
            window.workOrderManager.updateStats();
        } catch (error) {
            console.error('Error fetching data:', error);
            
            // If table doesn't exist or there's another DB error, fall back to localStorage
            window.uiManager.showNotification('Using local storage as fallback', 'info');
            this.loadFromStorage();
            window.workOrderManager.renderWorkOrders();
            window.workOrderManager.updateStats();
        }
    }
    
    // Save data to Supabase
    async saveToSupabase(workOrder) {
        if (!this.state.currentUser || !this.config.isSupabaseConfigured || !this.config.supabaseClient) return false;
        
        try {
            // Map JavaScript object to database field names
            const dbWorkOrder = {
                user_id: this.state.currentUser.id,
                client_id: this.state.userClientId,
                is_admin: this.state.isUserAdmin,
                title: workOrder.title,
                description: workOrder.description || '',
                assignee: workOrder.assignee || '',
                priority: workOrder.priority || 'medium',
                status: workOrder.status || 'open',
                due_date: workOrder.dueDate || null,
                estimated_hours: workOrder.estimatedHours || 0,
                created_date: workOrder.createdDate,
                updated_date: workOrder.updatedDate
            };
            
            let result;
            
            // For temporary IDs (negative numbers), always insert as new
            if (workOrder.id < 0) {
                console.log('DEBUG: Temporary ID detected, inserting new work order');
                
                // Explicitly remove any id field to ensure clean insert
                const insertWorkOrder = { ...dbWorkOrder };
                delete insertWorkOrder.id;
                console.log('DEBUG: Clean insert object (no ID field):', insertWorkOrder);
                
                // Insert new work order (let database generate ID)
                result = await this.config.supabaseClient
                    .from('work_orders')
                    .insert(insertWorkOrder)
                    .select(); // Return the inserted record with generated ID
                
                console.log('DEBUG: Insert result:', result);
                
                // Update local work order with the database-generated ID
                if (result.data && result.data[0]) {
                    const insertedId = result.data[0].id;
                    console.log('DEBUG: Database generated ID:', insertedId);
                    
                    const index = this.state.workOrders.findIndex(wo => wo.id === workOrder.id);
                    if (index !== -1) {
                        console.log('DEBUG: Updating local work order at index', index, 'from ID', workOrder.id, 'to ID', insertedId);
                        this.state.workOrders[index].id = insertedId;
                    }
                    // Update nextId to prevent conflicts
                    this.state.nextId = Math.max(this.state.nextId, insertedId + 1);
                    console.log('DEBUG: Updated nextId to:', this.state.nextId);
                }
            } else {
                console.log('DEBUG: Positive ID detected, checking if exists for update');
                
                // Check if this is an update (work order already exists in Supabase)
                const existingWorkOrder = await this.config.supabaseClient
                    .from('work_orders')
                    .select('id')
                    .eq('id', workOrder.id)
                    .eq('user_id', this.state.currentUser.id)
                    .single();
                
                console.log('DEBUG: Existing work order check:', existingWorkOrder);
                
                if (existingWorkOrder.data && !existingWorkOrder.error) {
                    // Update existing work order
                    console.log('DEBUG: Updating existing work order');
                    result = await this.config.supabaseClient
                        .from('work_orders')
                        .update(dbWorkOrder)
                        .eq('id', workOrder.id)
                        .eq('user_id', this.state.currentUser.id);
                } else {
                    // This should not happen with our new logic, but handle it
                    console.log('DEBUG: Positive ID but no existing record found, inserting new');
                    
                    // Explicitly remove any id field to ensure clean insert
                    const insertWorkOrder = { ...dbWorkOrder };
                    delete insertWorkOrder.id;
                    console.log('DEBUG: Clean fallback insert object (no ID field):', insertWorkOrder);
                    
                    result = await this.config.supabaseClient
                        .from('work_orders')
                        .insert(insertWorkOrder)
                        .select();
                    
                    if (result.data && result.data[0]) {
                        const insertedId = result.data[0].id;
                        console.log('DEBUG: Fallback insert generated ID:', insertedId);
                        
                        const index = this.state.workOrders.findIndex(wo => wo.id === workOrder.id);
                        if (index !== -1) {
                            this.state.workOrders[index].id = insertedId;
                        }
                        this.state.nextId = Math.max(this.state.nextId, insertedId + 1);
                    }
                }
            }
            
            if (result.error) {
                console.error('Error saving to Supabase:', result.error);
                window.uiManager.showNotification(`Database error: ${result.error.message}`, 'error');
                return false;
            }
            
            console.log('Successfully saved to Supabase:', workOrder.id);
            return true;
        } catch (error) {
            console.error('Error saving to Supabase:', error);
            window.uiManager.showNotification(`Save error: ${error.message}`, 'error');
            return false;
        }
    }
    
    // Delete from Supabase
    async deleteFromSupabase(id) {
        if (!this.state.currentUser || !this.config.isSupabaseConfigured || !this.config.supabaseClient) return false;
        
        try {
            const { error } = await this.config.supabaseClient
                .from('work_orders')
                .delete()
                .eq('id', id)
                .eq('user_id', this.state.currentUser.id);
                
            if (error) {
                console.error('Error deleting from Supabase:', error);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting from Supabase:', error);
            return false;
        }
    }
}

// Create global instance
window.storageManager = new StorageManager();