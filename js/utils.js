// Utility functions
class Utils {
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // Export/Import functionality
    exportWorkOrders() {
        if (window.appState.workOrders.length === 0) {
            window.uiManager.showNotification('No work orders to export!', 'error');
            return;
        }
        
        // Create CSV headers
        const headers = [
            'ID',
            'Title',
            'Description',
            'Assignee',
            'Priority',
            'Status',
            'Due Date',
            'Estimated Hours',
            'Created Date',
            'Updated Date'
        ];
        
        // Convert work orders to CSV rows
        const csvRows = window.appState.workOrders.map(wo => [
            `WO-${String(wo.id).padStart(4, '0')}`,
            `"${(wo.title || '').replace(/"/g, '""')}"`,
            `"${(wo.description || '').replace(/"/g, '""')}"`,
            `"${(wo.assignee || '').replace(/"/g, '""')}"`,
            wo.priority || '',
            wo.status || '',
            wo.dueDate || '',
            wo.estimatedHours || '',
            this.formatDateTime(wo.createdDate),
            this.formatDateTime(wo.updatedDate)
        ]);
        
        // Combine headers and rows
        const csvContent = [headers, ...csvRows]
            .map(row => row.join(','))
            .join('\n');
        
        // Create and download CSV file
        const dataBlob = new Blob([csvContent], {type:'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `work_orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        window.uiManager.showNotification('Work orders exported to CSV successfully!', 'success');
    }

    importWorkOrders() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.json';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const content = e.target.result;
                        let importedData;
                        
                        if (file.name.toLowerCase().endsWith('.csv')) {
                            // Parse CSV
                            const lines = content.split('\n').filter(line => line.trim());
                            if (lines.length < 2) {
                                window.uiManager.showNotification('CSV file must have headers and at least one data row!', 'error');
                                return;
                            }
                            
                            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                            importedData = lines.slice(1).map((line, index) => {
                                const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                                const workOrder = {
                                    id: window.workOrderManager.generateTempId(),
                                    title: values[1] || `Imported Work Order ${index + 1}`,
                                    description: values[2] || '',
                                    assignee: values[3] || '',
                                    priority: values[4] || 'medium',
                                    status: values[5] || 'open',
                                    dueDate: values[6] || '',
                                    estimatedHours: parseFloat(values[7]) || 0,
                                    createdDate: new Date().toISOString(),
                                    updatedDate: new Date().toISOString()
                                };
                                return workOrder;
                            });
                        } else {
                            // Parse JSON
                            importedData = JSON.parse(content);
                            if (!Array.isArray(importedData)) {
                                window.uiManager.showNotification('Invalid JSON file format!', 'error');
                                return;
                            }
                        }
                        
                        window.appState.workOrders = importedData;
                        if (importedData.length > 0) {
                            const maxId = Math.max(...importedData.map(wo => wo.id));
                            if (maxId > 0) {
                                window.appState.nextId = Math.max(window.appState.nextId, maxId + 1);
                            }
                        }
                        window.storageManager.saveToStorage();
                        window.workOrderManager.renderWorkOrders();
                        window.workOrderManager.updateStats();
                        window.uiManager.showNotification(`${importedData.length} work orders imported successfully!`, 'success');
                        
                    } catch (error) {
                        console.error('Import error:', error);
                        window.uiManager.showNotification('Error importing file! Please check the file format.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // Add export/import buttons
    addImportExportButtons() {
        const header = document.querySelector('.section-header');
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-small';
        exportBtn.textContent = 'Export';
        exportBtn.onclick = () => this.exportWorkOrders();
        
        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn-small btn-secondary';
        importBtn.textContent = 'Import';
        importBtn.onclick = () => this.importWorkOrders();
        
        buttonContainer.appendChild(exportBtn);
        buttonContainer.appendChild(importBtn);
        header.appendChild(buttonContainer);
    }

    // Sample data for demonstration
    loadSampleData() {
        const sampleOrders = [
            {
                id: window.workOrderManager.generateTempId(),
                title: "Fix Office Printer",
                description: "The main office printer is jamming frequently and needs maintenance. Users are unable to print important documents.",
                assignee: "John Smith",
                priority: "high",
                status: "open",
                dueDate: "2025-06-06",
                estimatedHours: 2,
                createdDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                updatedDate: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: window.workOrderManager.generateTempId(),
                title: "Update Software Documentation",
                description: "Review and update the user manual for the new software version. Include screenshots and step-by-step instructions.",
                assignee: "Sarah Johnson",
                priority: "medium",
                status: "in-progress",
                dueDate: "2025-06-10",
                estimatedHours: 8,
                createdDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                updatedDate: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
            },
            {
                id: window.workOrderManager.generateTempId(),
                title: "Replace Broken Conference Room Chair",
                description: "One of the chairs in Conference Room B has a broken wheel and needs to be replaced for safety reasons.",
                assignee: "Mike Wilson",
                priority: "low",
                status: "completed",
                dueDate: "2025-06-05",
                estimatedHours: 1,
                createdDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
                updatedDate: new Date(Date.now() - 21600000).toISOString() // 6 hours ago
            }
        ];

        window.appState.workOrders.push(...sampleOrders);
        window.storageManager.saveToStorage();
        window.workOrderManager.renderWorkOrders();
        window.workOrderManager.updateStats();
        window.uiManager.showNotification('Sample data loaded successfully!', 'success');
    }

    // Add sample data button (for demonstration)
    addSampleDataButton() {
        const formSection = document.querySelector('.form-section');
        const sampleButton = document.createElement('button');
        sampleButton.type = 'button';
        sampleButton.className = 'btn btn-secondary';
        sampleButton.textContent = 'Load Sample Data';
        sampleButton.style.marginTop = '10px';
        sampleButton.style.width = '100%';
        sampleButton.onclick = () => this.loadSampleData();
        formSection.appendChild(sampleButton);
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl+N or Cmd+N - New work order
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                window.uiManager.resetForm();
                document.getElementById('title').focus();
            }
            
            // Escape - Close modal or cancel edit
            if (e.key === 'Escape') {
                const modal = document.getElementById('work-order-modal');
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                } else if (document.getElementById('edit-id').value) {
                    window.uiManager.resetForm();
                }
            }
            
            // Ctrl+S or Cmd+S - Quick save (if form is active)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.closest('#work-order-form')) {
                    e.preventDefault();
                    document.getElementById('work-order-form').dispatchEvent(new Event('submit'));
                }
            }
        });
    }
}

// Create global instance
window.utils = new Utils();