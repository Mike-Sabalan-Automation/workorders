// UI Management and utilities
class UIManager {
    constructor() {
        this.state = window.appState;
        this.config = window.appConfig;
    }
    
    // Show authentication view
    showAuthView() {
        document.getElementById('auth-view').style.display = 'block';
        document.getElementById('main-view').style.display = 'none';
    }
    
    // Show main application view
    showMainView() {
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('main-view').style.display = 'block';
    }
    
    async setupAdminFilters() {
        if (this.state.isUserAdmin && this.config.isSupabaseConfigured) {
            // Add admin view filter
            const filtersContainer = document.querySelector('.filters');
            
            // Check if admin filter already exists
            if (!document.getElementById('filter-view')) {
                const adminFilterGroup = document.createElement('div');
                adminFilterGroup.className = 'filter-group';
                adminFilterGroup.innerHTML = `
                    <label>View:</label>
                    <select id="filter-view">
                        <option value="all">All Organization Work Orders</option>
                        <option value="mine">My Work Orders Only</option>
                    </select>
                `;
                
                // Insert as first filter
                filtersContainer.insertBefore(adminFilterGroup, filtersContainer.firstChild);
                
                // Add event listener
                document.getElementById('filter-view').addEventListener('change', () => window.workOrderManager.applyFilters());
            }
            
            // Setup admin form controls
            await this.setupAdminFormControls();
        }
    }
    
    async setupAdminFormControls() {
        if (!this.state.isUserAdmin) return;
        
        // Show the assign-to dropdown for admins
        const assignToGroup = document.getElementById('assign-to-group');
        if (assignToGroup) {
            assignToGroup.style.display = 'block';
            
            // Load organization users and populate dropdown
            const users = await window.storageManager.loadOrganizationUsers();
            const assignToSelect = document.getElementById('assigned-to');
            
            if (assignToSelect && users.length > 0) {
                // Clear existing options except the first one
                assignToSelect.innerHTML = '<option value="">Select technician...</option>';
                
                // Add all organization users
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.email}${user.isAdmin ? ' (Admin)' : ' (Technician)'}`;
                    assignToSelect.appendChild(option);
                });
            }
        }
        
        // Update form title for admins
        const formTitle = document.getElementById('form-title');
        if (formTitle && formTitle.textContent === 'Create New Work Order') {
            formTitle.textContent = 'Create & Assign Work Order';
        }
    }

    initializeApp() {
        // Set today's date as default due date
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('due-date').value = tomorrow.toISOString().split('T')[0];
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('work-order-form').addEventListener('submit', (e) => window.workOrderManager.handleFormSubmit(e));

        // Cancel button
        document.getElementById('cancel-btn').addEventListener('click', () => this.resetForm());

        // Filters
        document.getElementById('filter-status').addEventListener('change', () => window.workOrderManager.applyFilters());
        document.getElementById('filter-priority').addEventListener('change', () => window.workOrderManager.applyFilters());
        document.getElementById('search-input').addEventListener('input', () => window.workOrderManager.applyFilters());

        // Modal
        const modal = document.getElementById('work-order-modal');
        document.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    resetForm() {
        document.getElementById('work-order-form').reset();
        document.getElementById('form-title').textContent = 'Create New Work Order';
        document.getElementById('edit-id').value = '';
        document.getElementById('submit-btn').textContent = 'Create Work Order';
        document.getElementById('cancel-btn').style.display = 'none';
        
        // Reset due date to tomorrow
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('due-date').value = tomorrow.toISOString().split('T')[0];
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d1fae5' : type === 'error' ? '#fee2e2' : '#dbeafe'};
            color: ${type === 'success' ? '#065f46' : type === 'error' ? '#991b1b' : '#1e40af'};
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 1001;
            font-weight: 600;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Create global instance
window.uiManager = new UIManager();