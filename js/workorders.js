// Work Order management
class WorkOrderManager {
    constructor() {
        this.state = window.appState;
    }
    
    // Handle form submission
    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const isEditMode = document.getElementById('edit-id').value;
        
        // For technicians editing, get original values for disabled fields
        const getFieldValue = (fieldName, fallback) => {
            const field = document.getElementById(fieldName);
            if (field && field.disabled && field.getAttribute('data-original-value')) {
                return field.getAttribute('data-original-value');
            }
            return formData.get(fieldName) || fallback;
        };

        const workOrder = {
            id: isEditMode ? 
                parseInt(document.getElementById('edit-id').value) : 
                this.generateTempId(), // Use temporary ID for new work orders
            title: getFieldValue('title', ''),
            description: formData.get('description'),
            assignedTo: this.state.isUserAdmin ? 
                (formData.get('assigned-to') || this.state.currentUser.id) : 
                (isEditMode ? this.findWorkOrder(document.getElementById('edit-id').value).assignedTo : this.state.currentUser.id),
            priority: getFieldValue('priority', 'medium'),
            status: formData.get('status'),
            dueDate: getFieldValue('due-date', ''),
            estimatedHours: parseFloat(formData.get('estimated-hours')) || 0,
            createdBy: this.state.currentUser.id,
            createdDate: isEditMode ? 
                this.findWorkOrder(document.getElementById('edit-id').value).createdDate : 
                new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };

        console.log('DEBUG: Form submission - isEditMode:', isEditMode, 'workOrder:', workOrder);
        console.log('DEBUG: User role - isUserAdmin:', this.state.isUserAdmin);
        console.log('DEBUG: Current user ID:', this.state.currentUser?.id);
        console.log('DEBUG: Work order assignedTo:', workOrder.assignedTo);
        
        if (isEditMode) {
            this.updateWorkOrder(workOrder);
        } else {
            this.createWorkOrder(workOrder);
        }

        window.uiManager.resetForm();
        this.renderWorkOrders();
        this.updateStats();
    }
    
    // Generate a temporary ID for new work orders (will be replaced by database ID)
    generateTempId() {
        // Use negative numbers for temp IDs to avoid conflicts with database IDs
        const tempId = -Date.now();
        console.log('DEBUG: Generated temporary ID:', tempId);
        return tempId;
    }

    createWorkOrder(workOrder) {
        console.log('DEBUG: Creating work order with ID:', workOrder.id, 'Title:', workOrder.title);
        this.state.workOrders.push(workOrder);
        
        // Always save to localStorage as backup
        window.storageManager.saveToStorage();
        
        // Try to save to Supabase if authenticated
        if (this.state.currentUser && window.appConfig.isSupabaseConfigured && window.appConfig.supabaseClient) {
            console.log('DEBUG: Attempting to save to Supabase...', {
                id: workOrder.id,
                title: workOrder.title,
                isTemporary: workOrder.id < 0
            });
            window.storageManager.saveToSupabase(workOrder).then(success => {
                if (success) {
                    window.uiManager.showNotification('Work order saved to cloud successfully!', 'success');
                    // Re-render to show updated ID
                    this.renderWorkOrders();
                } else {
                    window.uiManager.showNotification('Work order saved locally only', 'info');
                }
            });
        } else {
            console.log('DEBUG: Saving locally only (not authenticated)');
            window.uiManager.showNotification('Work order created successfully!', 'success');
        }
    }

    updateWorkOrder(updatedWorkOrder) {
        console.log('DEBUG: updateWorkOrder called with:', updatedWorkOrder);
        const index = this.state.workOrders.findIndex(wo => wo.id == updatedWorkOrder.id);
        console.log('DEBUG: Found work order at index:', index);
        
        if (index !== -1) {
            this.state.workOrders[index] = updatedWorkOrder;
            
            // Always save to localStorage as backup
            window.storageManager.saveToStorage();
            
            // Try to save to Supabase if authenticated
            if (this.state.currentUser && window.appConfig.isSupabaseConfigured && window.appConfig.supabaseClient) {
                console.log('DEBUG: Attempting to update in Supabase...', updatedWorkOrder);
                window.storageManager.saveToSupabase(updatedWorkOrder).then(success => {
                    if (success) {
                        window.uiManager.showNotification('Work order updated in cloud successfully!', 'success');
                    } else {
                        window.uiManager.showNotification('Work order updated locally only', 'info');
                    }
                });
            } else {
                console.log('DEBUG: Updating locally only (not authenticated)');
                window.uiManager.showNotification('Work order updated successfully!', 'success');
            }
        } else {
            console.error('DEBUG: Could not find work order with ID:', updatedWorkOrder.id);
        }
    }

    deleteWorkOrder(id) {
        if (confirm('Are you sure you want to delete this work order?')) {
            this.state.workOrders = this.state.workOrders.filter(wo => wo.id != id);
            
            // Always save to localStorage as backup
            window.storageManager.saveToStorage();
            
            // Try to delete from Supabase if authenticated
            if (this.state.currentUser && window.appConfig.isSupabaseConfigured && window.appConfig.supabaseClient) {
                window.storageManager.deleteFromSupabase(id).then(success => {
                    if (success) {
                        window.uiManager.showNotification('Work order deleted successfully!', 'success');
                    } else {
                        window.uiManager.showNotification('Work order deleted locally', 'info');
                    }
                });
            } else {
                window.uiManager.showNotification('Work order deleted successfully!', 'success');
            }
            
            this.renderWorkOrders();
            this.updateStats();
        }
    }

    findWorkOrder(id) {
        return this.state.workOrders.find(wo => wo.id == id);
    }

    editWorkOrder(id) {
        console.log('DEBUG: editWorkOrder called with ID:', id);
        
        const workOrder = this.findWorkOrder(id);
        if (!workOrder) {
            console.error('Work order not found with ID:', id);
            return;
        }
        
        // Use different editing approach based on user role
        if (this.state.isUserAdmin) {
            this.editWorkOrderAdmin(workOrder);
        } else {
            this.editWorkOrderTechnician(workOrder);
        }
    }
    
    editWorkOrderAdmin(workOrder) {
        // Admin uses the main form
        const formSection = document.querySelector('.form-section');
        if (formSection) {
            formSection.style.display = 'block';
            formSection.setAttribute('data-edit-active', 'true');
        }
        
        // Hide technician note if it exists
        const techNote = document.getElementById('tech-note');
        if (techNote) {
            techNote.style.display = 'none';
        }
        
        document.getElementById('form-title').textContent = 'Edit Work Order';
        document.getElementById('edit-id').value = workOrder.id;
        document.getElementById('title').value = workOrder.title;
        document.getElementById('description').value = workOrder.description;
        document.getElementById('priority').value = workOrder.priority;
        document.getElementById('status').value = workOrder.status;
        document.getElementById('due-date').value = workOrder.dueDate;
        document.getElementById('estimated-hours').value = workOrder.estimatedHours;
        
        const assignedToSelect = document.getElementById('assigned-to');
        if (assignedToSelect && workOrder.assignedTo) {
            assignedToSelect.value = workOrder.assignedTo;
        }
        
        document.getElementById('submit-btn').textContent = 'Update Work Order';
        document.getElementById('cancel-btn').style.display = 'inline-block';
        
        // Scroll to form
        formSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    editWorkOrderTechnician(workOrder) {
        // Technician uses a simple modal
        console.log('DEBUG: Opening technician edit modal for:', workOrder.title);
        
        // Populate modal fields
        document.getElementById('tech-edit-id').value = workOrder.id;
        document.getElementById('tech-title').value = workOrder.title;
        document.getElementById('tech-description').value = workOrder.description;
        document.getElementById('tech-status').value = workOrder.status;
        document.getElementById('tech-estimated-hours').value = workOrder.estimatedHours;
        
        // Show modal
        document.getElementById('technician-edit-modal').style.display = 'block';
        
        // Focus on description field
        setTimeout(() => {
            document.getElementById('tech-description').focus();
        }, 100);
    }
    
    // Handle technician edit form submission
    handleTechnicianEditSubmit(e) {
        e.preventDefault();
        
        const id = parseInt(document.getElementById('tech-edit-id').value);
        const workOrder = this.findWorkOrder(id);
        
        if (!workOrder) {
            console.error('Work order not found for technician edit:', id);
            return;
        }
        
        // Update work order with technician changes
        const updatedWorkOrder = {
            ...workOrder,
            description: document.getElementById('tech-description').value,
            status: document.getElementById('tech-status').value,
            estimatedHours: parseFloat(document.getElementById('tech-estimated-hours').value) || 0,
            updatedDate: new Date().toISOString()
        };
        
        console.log('DEBUG: Technician updating work order:', updatedWorkOrder);
        
        // Update the work order
        this.updateWorkOrder(updatedWorkOrder);
        
        // Close modal
        this.closeTechnicianEdit();
        
        // Show success message
        window.uiManager.showNotification('Work order progress updated successfully!', 'success');
    }
    
    closeTechnicianEdit() {
        document.getElementById('technician-edit-modal').style.display = 'none';
        // Clear form
        document.getElementById('technician-edit-form').reset();
        document.getElementById('tech-edit-id').value = '';
    }

    renderWorkOrders() {
        const container = document.getElementById('work-order-list');
        const filteredOrders = this.getFilteredWorkOrders();

        if (filteredOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.5;">📋</div>
                    <h3>No Work Orders Found</h3>
                    <p>Try adjusting your filters or create a new work order!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredOrders.map(workOrder => `
            <div class="work-order-item" onclick="window.workOrderManager.viewWorkOrder(${workOrder.id})">
                <div class="work-order-header">
                    <div class="work-order-id">WO-${String(workOrder.id).padStart(4, '0')}</div>
                </div>
                <div class="work-order-title">${workOrder.title}</div>
                <div class="work-order-details">
                    ${workOrder.description ? `<p>${workOrder.description.substring(0, 100)}${workOrder.description.length > 100 ? '...' : ''}</p>` : ''}
                    ${workOrder.assignedTo ? `<p><strong>Assigned To:</strong> ${this.getUserDisplayName(workOrder.assignedTo)}</p>` : ''}
                    ${workOrder.dueDate ? `<p><strong>Due:</strong> ${window.utils.formatDate(workOrder.dueDate)}</p>` : ''}
                    ${workOrder.estimatedHours ? `<p><strong>Est. Hours:</strong> ${workOrder.estimatedHours}h</p>` : ''}
                </div>
                <div class="work-order-meta">
                    <div>
                        <span class="status-badge status-${workOrder.status}">${workOrder.status.replace('-', ' ')}</span>
                        <span class="priority-badge priority-${workOrder.priority}">${workOrder.priority}</span>
                    </div>
                    <div class="work-order-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-small btn-secondary" onclick="event.preventDefault(); event.stopPropagation(); console.log('EDIT BUTTON CLICKED - ID:', ${workOrder.id}); window.workOrderManager.editWorkOrder(${workOrder.id}); return false;">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="event.preventDefault(); event.stopPropagation(); window.workOrderManager.deleteWorkOrder(${workOrder.id}); return false;">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getFilteredWorkOrders() {
        let filtered = [...this.state.workOrders];

        // Admin view filter (if admin)
        const viewFilter = document.getElementById('filter-view');
        if (viewFilter && this.state.isUserAdmin && this.state.currentUser) {
            const viewValue = viewFilter.value;
            if (viewValue === 'mine') {
                // Show only work orders assigned to current user
                filtered = filtered.filter(wo => wo.assignedTo === this.state.currentUser.id);
            }
            // 'all' shows all work orders in the organization (RLS handles this)
        }

        // Filter by status
        const statusFilter = document.getElementById('filter-status').value;
        if (statusFilter) {
            filtered = filtered.filter(wo => wo.status === statusFilter);
        }

        // Filter by priority
        const priorityFilter = document.getElementById('filter-priority').value;
        if (priorityFilter) {
            filtered = filtered.filter(wo => wo.priority === priorityFilter);
        }

        // Filter by search term
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(wo => 
                wo.title.toLowerCase().includes(searchTerm) ||
                wo.description.toLowerCase().includes(searchTerm) ||
                wo.assignee.toLowerCase().includes(searchTerm)
            );
        }

        // Sort by creation date (newest first)
        filtered.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

        return filtered;
    }

    applyFilters() {
        this.renderWorkOrders();
        this.updateStats();
    }

    updateStats() {
        const filtered = this.getFilteredWorkOrders();
        const total = filtered.length;
        const open = filtered.filter(wo => wo.status === 'open').length;
        const inProgress = filtered.filter(wo => wo.status === 'in-progress').length;
        const completed = filtered.filter(wo => wo.status === 'completed').length;

        document.getElementById('total-count').textContent = `Total: ${total}`;
        document.getElementById('open-count').textContent = open;
        document.getElementById('progress-count').textContent = inProgress;
        document.getElementById('completed-count').textContent = completed;
    }

    viewWorkOrder(id) {
        const workOrder = this.findWorkOrder(id);
        if (workOrder) {
            const modal = document.getElementById('work-order-modal');
            const modalBody = document.getElementById('modal-content-body');
            
            modalBody.innerHTML = `
                <h2>Work Order Details</h2>
                <div style="margin: 20px 0;">
                    <h3>WO-${String(workOrder.id).padStart(4, '0')}: ${workOrder.title}</h3>
                    <div style="margin: 15px 0;">
                        <span class="status-badge status-${workOrder.status}">${workOrder.status.replace('-', ' ')}</span>
                        <span class="priority-badge priority-${workOrder.priority}">${workOrder.priority}</span>
                    </div>
                </div>
                
                ${workOrder.description ? `<div style="margin: 15px 0;"><strong>Description:</strong><br>${workOrder.description}</div>` : ''}
                ${workOrder.assignee ? `<div style="margin: 15px 0;"><strong>Assignee:</strong> ${workOrder.assignee}</div>` : ''}
                ${workOrder.dueDate ? `<div style="margin: 15px 0;"><strong>Due Date:</strong> ${window.utils.formatDate(workOrder.dueDate)}</div>` : ''}
                ${workOrder.estimatedHours ? `<div style="margin: 15px 0;"><strong>Estimated Hours:</strong> ${workOrder.estimatedHours}h</div>` : ''}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9rem; color: #666;">
                    <div><strong>Created:</strong> ${window.utils.formatDateTime(workOrder.createdDate)}</div>
                    <div><strong>Last Updated:</strong> ${window.utils.formatDateTime(workOrder.updatedDate)}</div>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="window.workOrderManager.editWorkOrder(${workOrder.id}); document.getElementById('work-order-modal').style.display='none';">Edit</button>
                    <button class="btn btn-danger" onclick="window.workOrderManager.deleteWorkOrder(${workOrder.id}); document.getElementById('work-order-modal').style.display='none';">Delete</button>
                </div>
            `;
            
            modal.style.display = 'block';
        }
    }
    
    // Helper function to get user display name from ID
    getUserDisplayName(userId) {
        if (userId === this.state.currentUser?.id) {
            return 'Me';
        }
        
        // In a real app, you'd cache user info or look it up
        // For now, just show partial ID
        return `User ${userId.substring(0, 8)}...`;
    }
}

// Create global instance
window.workOrderManager = new WorkOrderManager();

// Global functions for modal handlers
function closeTechnicianEdit() {
    window.workOrderManager.closeTechnicianEdit();
}