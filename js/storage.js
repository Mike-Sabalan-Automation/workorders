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
                // Admin users see all work orders in their organization (RLS policy handles this)
                console.log('Loading work orders for admin user');
            } else {
                // Technicians see only work orders assigned to them (RLS policy handles this)
                console.log('Loading work orders for technician user');
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
                    createdBy: dbWorkOrder.created_by,
                    assignedTo: dbWorkOrder.assigned_to,
                    title: dbWorkOrder.title,
                    description: dbWorkOrder.description || '',
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
                created_by: this.state.currentUser.id,
                assigned_to: workOrder.assignedTo || this.state.currentUser.id,
                title: workOrder.title,
                description: workOrder.description || '',
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
                    .single();
                
                console.log('DEBUG: Existing work order check:', existingWorkOrder);
                
                if (existingWorkOrder.data && !existingWorkOrder.error) {
                    // Update existing work order
                    console.log('DEBUG: Updating existing work order');
                    result = await this.config.supabaseClient
                        .from('work_orders')
                        .update(dbWorkOrder)
                        .eq('id', workOrder.id);
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
                .eq('id', id);
                
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
    
    // Load organization users for admin assignment dropdown
    async loadOrganizationUsers() {
        if (!this.state.currentUser || !this.config.isSupabaseConfigured || !this.config.supabaseClient || !this.state.isUserAdmin) {
            return [];
        }
        
        try {
            // Instead of using auth.admin, we'll get users who have created work orders
            // or we can create a public user_profiles view for this purpose
            
            // For now, let's try a simple approach - get unique user IDs from work orders
            const { data: workOrderUsers, error: woError } = await this.config.supabaseClient
                .from('work_orders')
                .select('created_by, assigned_to')
                .or(`created_by.eq.${this.state.currentUser.id},assigned_to.eq.${this.state.currentUser.id}`);
            
            if (woError) {
                console.warn('Could not load existing work order users:', woError);
                // Return at least the current user
                return [{
                    id: this.state.currentUser.id,
                    email: this.state.currentUser.email,
                    isAdmin: this.state.isUserAdmin
                }];
            }
            
            // Get unique user IDs
            const userIds = new Set();
            workOrderUsers?.forEach(wo => {
                if (wo.created_by) userIds.add(wo.created_by);
                if (wo.assigned_to) userIds.add(wo.assigned_to);
            });
            
            // Always include current user
            userIds.add(this.state.currentUser.id);
            
            // For now, return user IDs with placeholder emails
            // In a real app, you'd have a user_profiles table to query
            return Array.from(userIds).map(userId => ({
                id: userId,
                email: userId === this.state.currentUser.id ? 
                    this.state.currentUser.email : 
                    `User ${userId.substring(0, 8)}...`,
                isAdmin: userId === this.state.currentUser.id ? this.state.isUserAdmin : false
            }));
            
        } catch (error) {
            console.error('Error loading organization users:', error);
            // Fallback: return at least the current user
            return [{
                id: this.state.currentUser.id,
                email: this.state.currentUser.email,
                isAdmin: this.state.isUserAdmin
            }];
        }
    }
}

// Create global instance
window.storageManager = new StorageManager();