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
        console.log('DEBUG: setupAdminFilters called, isUserAdmin:', this.state.isUserAdmin);
        
        // Setup role-specific UI
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
        } else {
            // Setup technician interface
            this.setupTechnicianInterface();
        }
    }
    
    setupTechnicianInterface() {
        console.log('DEBUG: Setting up technician interface');
        
        // Hide admin-only elements
        const assignToGroup = document.getElementById('assign-to-group');
        if (assignToGroup) {
            assignToGroup.style.display = 'none';
        }
        
        // Update form title for technicians
        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.textContent = 'Update Work Order';
        }
        
        // Simplify the form for technicians - hide create button, show only when editing
        const submitBtn = document.getElementById('submit-btn');
        const formSection = document.querySelector('.form-section');
        
        if (submitBtn && formSection) {
            // Only hide the form if not in edit mode and not marked as edit-active
            const isEditMode = document.getElementById('edit-id').value;
            const isEditActive = formSection.getAttribute('data-edit-active') === 'true';
            
            if (!isEditMode && !isEditActive) {
                console.log('DEBUG: Hiding form for technician (not in edit mode)');
                formSection.style.display = 'none';
            } else {
                console.log('DEBUG: Keeping form visible for technician (edit mode or edit-active)');
            }
            
            // Add a note for technicians
            const techNote = document.createElement('div');
            techNote.id = 'tech-note';
            techNote.className = 'form-section';
            techNote.innerHTML = `
                <h2>Your Work Orders</h2>
                <p>Click on any work order below to update its status and add notes.</p>
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <strong>💡 Tip:</strong> You can update work order descriptions to add progress notes and change status when tasks are completed.
                </div>
            `;
            
            // Insert before the hidden form
            formSection.parentNode.insertBefore(techNote, formSection);
        }
    }
    
    async setupAdminFormControls() {
        if (!this.state.isUserAdmin) {
            console.log('DEBUG: User is not admin, skipping admin form controls');
            return;
        }
        
        console.log('DEBUG: Setting up admin form controls');
        
        // Show the assign-to dropdown for admins
        const assignToGroup = document.getElementById('assign-to-group');
        if (assignToGroup) {
            assignToGroup.style.display = 'block';
            console.log('DEBUG: Assign-to group made visible');
            
            // Load organization users and populate dropdown
            console.log('DEBUG: Loading organization users...');
            const users = await window.storageManager.loadOrganizationUsers();
            console.log('DEBUG: Loaded users:', users);
            
            const assignToSelect = document.getElementById('assigned-to');
            
            if (assignToSelect) {
                // Clear existing options except the first one
                assignToSelect.innerHTML = '<option value="">Select technician...</option>';
                
                // Always add current user as an option for admins
                const currentUserOption = document.createElement('option');
                currentUserOption.value = this.state.currentUser.id;
                currentUserOption.textContent = `${this.state.currentUser.email} (Me - Admin)`;
                assignToSelect.appendChild(currentUserOption);
                
                // Add other organization users if any
                if (users && users.length > 0) {
                    users.forEach(user => {
                        // Skip current user since we already added them
                        if (user.id !== this.state.currentUser.id) {
                            const option = document.createElement('option');
                            option.value = user.id;
                            option.textContent = `${user.email}${user.isAdmin ? ' (Admin)' : ' (Technician)'}`;
                            assignToSelect.appendChild(option);
                        }
                    });
                }
                
                console.log('DEBUG: Dropdown populated with', assignToSelect.options.length, 'options');
            } else {
                console.error('DEBUG: Could not find assigned-to select element');
            }
        } else {
            console.error('DEBUG: Could not find assign-to-group element');
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
        // Re-enable any disabled fields
        document.getElementById('title').disabled = false;
        document.getElementById('priority').disabled = false;
        document.getElementById('due-date').disabled = false;
        
        // Reset placeholder text
        const descriptionField = document.getElementById('description');
        descriptionField.placeholder = 'Describe the work to be done...';
        
        // Standard form reset
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
        
        // Handle technician-specific reset
        if (!this.state.isUserAdmin) {
            // Hide the form again for technicians and clear edit-active flag
            const formSection = document.querySelector('.form-section');
            if (formSection) {
                formSection.style.display = 'none';
                formSection.removeAttribute('data-edit-active');
                console.log('DEBUG: Form hidden and edit-active flag cleared for technician');
            }
            
            // Show the tech note again
            const techNote = document.getElementById('tech-note');
            if (techNote) {
                techNote.style.display = 'block';
            }
        }
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