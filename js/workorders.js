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
        
        const workOrder = {
            id: isEditMode ? 
                parseInt(document.getElementById('edit-id').value) : 
                this.generateTempId(), // Use temporary ID for new work orders
            title: formData.get('title'),
            description: formData.get('description'),
            assignee: formData.get('assignee'),
            priority: formData.get('priority'),
            status: formData.get('status'),
            dueDate: formData.get('due-date'),
            estimatedHours: parseFloat(formData.get('estimated-hours')) || 0,
            createdDate: isEditMode ? 
                this.findWorkOrder(document.getElementById('edit-id').value).createdDate : 
                new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };

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
        return -Date.now();
    }

    createWorkOrder(workOrder) {
        this.state.workOrders.push(workOrder);
        
        // Always save to localStorage as backup
        window.storageManager.saveToStorage();
        
        // Try to save to Supabase if authenticated
        if (this.state.currentUser && window.appConfig.isSupabaseConfigured && window.appConfig.supabaseClient) {
            console.log('Attempting to save to Supabase...', workOrder);
            window.storageManager.saveToSupabase(workOrder).then(success => {
                if (success) {
                    window.uiManager.showNotification('Work order saved to cloud successfully!', 'success');
                } else {
                    window.uiManager.showNotification('Work order saved locally only', 'info');
                }
            });
        } else {
            console.log('Saving locally only (not authenticated)');
            window.uiManager.showNotification('Work order created successfully!', 'success');
        }
    }

    updateWorkOrder(updatedWorkOrder) {
        const index = this.state.workOrders.findIndex(wo => wo.id == updatedWorkOrder.id);
        if (index !== -1) {
            this.state.workOrders[index] = updatedWorkOrder;
            
            // Always save to localStorage as backup
            window.storageManager.saveToStorage();
            
            // Try to save to Supabase if authenticated
            if (this.state.currentUser && window.appConfig.isSupabaseConfigured && window.appConfig.supabaseClient) {
                console.log('Attempting to update in Supabase...', updatedWorkOrder);
                window.storageManager.saveToSupabase(updatedWorkOrder).then(success => {
                    if (success) {
                        window.uiManager.showNotification('Work order updated in cloud successfully!', 'success');
                    } else {
                        window.uiManager.showNotification('Work order updated locally only', 'info');
                    }
                });
            } else {
                console.log('Updating locally only (not authenticated)');
                window.uiManager.showNotification('Work order updated successfully!', 'success');
            }
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
        const workOrder = this.findWorkOrder(id);
        if (workOrder) {
            document.getElementById('form-title').textContent = 'Edit Work Order';
            document.getElementById('edit-id').value = workOrder.id;
            document.getElementById('title').value = workOrder.title;
            document.getElementById('description').value = workOrder.description;
            document.getElementById('assignee').value = workOrder.assignee;
            document.getElementById('priority').value = workOrder.priority;
            document.getElementById('status').value = workOrder.status;
            document.getElementById('due-date').value = workOrder.dueDate;
            document.getElementById('estimated-hours').value = workOrder.estimatedHours;
            document.getElementById('submit-btn').textContent = 'Update Work Order';
            document.getElementById('cancel-btn').style.display = 'inline-block';
            
            // Scroll to form
            document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        }
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
                    ${workOrder.assignee ? `<p><strong>Assignee:</strong> ${workOrder.assignee}</p>` : ''}
                    ${workOrder.dueDate ? `<p><strong>Due:</strong> ${window.utils.formatDate(workOrder.dueDate)}</p>` : ''}
                    ${workOrder.estimatedHours ? `<p><strong>Est. Hours:</strong> ${workOrder.estimatedHours}h</p>` : ''}
                </div>
                <div class="work-order-meta">
                    <div>
                        <span class="status-badge status-${workOrder.status}">${workOrder.status.replace('-', ' ')}</span>
                        <span class="priority-badge priority-${workOrder.priority}">${workOrder.priority}</span>
                    </div>
                    <div class="work-order-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-small btn-secondary" onclick="window.workOrderManager.editWorkOrder(${workOrder.id})">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="window.workOrderManager.deleteWorkOrder(${workOrder.id})">Delete</button>
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
                // Show only current user's work orders
                filtered = filtered.filter(wo => wo.user_id === this.state.currentUser.id);
            }
            // 'all' shows all work orders for the client (no additional filtering needed)
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
}

// Create global instance
window.workOrderManager = new WorkOrderManager();