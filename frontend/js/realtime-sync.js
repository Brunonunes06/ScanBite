// Real-time Dashboard Sync System
class RealtimeDashboardSync {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.isOnline = navigator.onLine;
        this.cache = new Map();
        
        this.initializeEventListeners();
        this.startPeriodicSync();
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Network status monitoring
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleReconnect();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleDisconnect();
        });

        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.syncData();
            }
        });

        // WebSocket connection events
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }

    // Initialize WebSocket connection for real-time updates
    initializeWebSocket() {
        if (!this.isOnline) return;

        try {
            // Simulated WebSocket URL (replace with actual WebSocket server)
            const wsUrl = `ws://localhost:3000/dashboard-sync`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🔌 WebSocket connected');
                this.reconnectAttempts = 0;
                this.requestInitialData();
            };

            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(event);
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.handleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('🔌 WebSocket error:', error);
                this.handleReconnect();
            };

        } catch (error) {
            console.error('🔌 Failed to initialize WebSocket:', error);
            this.startPeriodicSync();
        }
    }

    // Handle WebSocket messages
    handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'initial_data':
                    this.updateDashboard(data.payload);
                    break;
                case 'scan_update':
                    this.handleScanUpdate(data.payload);
                    break;
                case 'stats_update':
                    this.updateStats(data.payload);
                    break;
                case 'plan_update':
                    this.updatePlanUsage(data.payload);
                    break;
                case 'user_activity':
                    this.handleUserActivity(data.payload);
                    break;
                default:
                    console.log('🔌 Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('🔌 Error parsing WebSocket message:', error);
        }
    }

    // Handle scan updates in real-time
    handleScanUpdate(scanData) {
        // Update local cache
        this.cache.set(`scan_${scanData.id}`, scanData);
        
        // Update dashboard counters
        this.updateScanCounters(scanData);
        
        // Show real-time notification
        this.showRealtimeNotification(scanData);
        
        // Update recent scans list
        this.updateRecentScans(scanData);
        
        // Trigger animation
        this.animateCounter('totalScans');
    }

    // Update scan counters
    updateScanCounters(scanData) {
        const totalScansEl = document.getElementById('totalScans');
        const safeProductsEl = document.getElementById('safeProducts');
        const warningsFoundEl = document.getElementById('warningsFound');
        
        if (totalScansEl) {
            const current = parseInt(totalScansEl.textContent) || 0;
            totalScansEl.textContent = current + 1;
        }
        
        if (scanData.status === 'safe' && safeProductsEl) {
            const current = parseInt(safeProductsEl.textContent) || 0;
            safeProductsEl.textContent = current + 1;
        }
        
        if ((scanData.status === 'warning' || scanData.status === 'danger') && warningsFoundEl) {
            const current = parseInt(warningsFoundEl.textContent) || 0;
            warningsFoundEl.textContent = current + 1;
        }
    }

    // Show real-time notification
    showRealtimeNotification(scanData) {
        const notification = document.createElement('div');
        notification.className = 'realtime-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${scanData.status === 'safe' ? 'check-circle' : 'exclamation-triangle'}"></i>
                <span>Novo scan: ${scanData.product}</span>
                <span class="status-${scanData.status}">${this.getStatusText(scanData.status)}</span>
            </div>
        `;
        
        // Add notification styles if not exists
        if (!document.getElementById('realtime-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'realtime-notification-styles';
            styles.textContent = `
                .realtime-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 10px;
                    padding: 1rem 1.5rem;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    z-index: 1000;
                    animation: slideInRight 0.5s ease;
                    max-width: 300px;
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .notification-content i {
                    color: var(--primary-green);
                }
                
                .status-safe { color: var(--success-green); }
                .status-warning { color: var(--warning-orange); }
                .status-danger { color: var(--danger-red); }
                
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }

    // Update recent scans list
    updateRecentScans(scanData) {
        const recentScansList = document.getElementById('recentScansList');
        if (!recentScansList) return;
        
        // Create new scan item
        const scanItem = document.createElement('div');
        scanItem.className = 'scan-item';
        scanItem.innerHTML = `
            <div class="scan-info">
                <div class="scan-product">${scanData.product}</div>
                <div class="scan-date">${new Date(scanData.date).toLocaleString('pt-BR')}</div>
            </div>
            <div class="scan-status status-${scanData.status}">
                <i class="fas fa-${this.getStatusIcon(scanData.status)}"></i>
                ${this.getStatusText(scanData.status)}
            </div>
        `;
        
        // Add to top of list
        recentScansList.insertBefore(scanItem, recentScansList.firstChild);
        
        // Remove last item if more than 5
        const items = recentScansList.querySelectorAll('.scan-item');
        if (items.length > 5) {
            items[items.length - 1].remove();
        }
        
        // Add animation
        scanItem.style.animation = 'slideInLeft 0.5s ease';
    }

    // Get status text
    getStatusText(status) {
        const texts = {
            'safe': 'Seguro',
            'warning': 'Atenção',
            'danger': 'Perigo'
        };
        return texts[status] || 'Desconhecido';
    }

    // Get status icon
    getStatusIcon(status) {
        const icons = {
            'safe': 'check-circle',
            'warning': 'exclamation-triangle',
            'danger': 'times-circle'
        };
        return icons[status] || 'question-circle';
    }

    // Start periodic sync (fallback when WebSocket is not available)
    startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.isOnline && !this.ws || this.ws.readyState !== WebSocket.OPEN) {
                this.syncData();
            }
        }, 5000); // Sync every 5 seconds
    }

    // Sync data with server
    async syncData() {
        if (!this.isOnline) return;
        
        try {
            const response = await fetch('/api/dashboard/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateDashboard(data);
                this.lastSyncTime = new Date();
                console.log('🔄 Dashboard synced successfully');
                // Após buscar estatísticas, tentar enviar alterações locais (análises/exclusões)
                await this.pushPendingUpdates();
            }
        } catch (error) {
            console.error('🔄 Sync error:', error);
            // Use cached data if available
            this.loadFromCache();
        }
    }

    // Push local pending updates (new analysis or deletions) to server
    async pushPendingUpdates() {
        try {
            // Push last analysis if exists
            const last = JSON.parse(localStorage.getItem('allergyAnalysisLast') || 'null');
            const lastUpdate = localStorage.getItem('allergyAnalysisLastUpdate');
            const pushedMarker = localStorage.getItem('realtime_last_pushed') || '';

            if (last && lastUpdate && pushedMarker !== String(lastUpdate)) {
                // POST to server
                try {
                    const resp = await fetch('/api/scans', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}` },
                        body: JSON.stringify(last)
                    });

                    if (resp.ok) {
                        console.log('🔼 Pushed last analysis to server');
                        localStorage.setItem('realtime_last_pushed', String(lastUpdate));
                        // notify via websocket if connected
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ type: 'scan_update', payload: last }));
                        }
                    }
                } catch (e) {
                    console.warn('Failed to push last analysis:', e);
                }
            }

            // Handle deletions
            const deleted = JSON.parse(localStorage.getItem('allergyAnalysisDeleted') || 'null');
            const deletedMarker = localStorage.getItem('realtime_last_deleted') || '';
            if (deleted && deleted.ts && String(deleted.ts) !== deletedMarker) {
                try {
                    const resp = await fetch(`/api/scans/${deleted.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}` }
                    });

                    if (resp.ok || resp.status === 404) {
                        console.log('🔽 Pushed deletion to server for', deleted.id);
                        localStorage.setItem('realtime_last_deleted', String(deleted.ts));
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ type: 'scan_delete', payload: { id: deleted.id } }));
                        }
                    }
                } catch (e) {
                    console.warn('Failed to push deletion:', e);
                }
            }
        } catch (e) {
            console.warn('pushPendingUpdates error:', e);
        }
    }

    // Update dashboard with new data
    updateDashboard(data) {
        // Update counters with animation
        this.updateCounter('totalScans', data.totalScans);
        this.updateCounter('safeProducts', data.safeProducts);
        this.updateCounter('warningsFound', data.warningsFound);
        this.updateCounter('planUsage', `${data.planUsage}/${data.planLimit}`);
        
        // Update plan usage progress
        this.updatePlanProgress(data.planUsage, data.planLimit);
        
        // Cache the data
        this.cache.set('dashboard_data', data);
    }

    // Update counter with animation
    updateCounter(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const oldValue = parseInt(element.textContent) || 0;
        const targetValue = typeof newValue === 'string' ? newValue : parseInt(newValue);
        
        if (oldValue !== targetValue) {
            this.animateCounter(elementId, oldValue, targetValue);
        }
    }

    // Animate counter change
    animateCounter(elementId, start, end) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current;
            
            // Add pulse effect
            if (progress === 1) {
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Update plan usage progress
    updatePlanProgress(usage, limit) {
        const progressBar = document.getElementById('planProgressBar');
        if (!progressBar) return;
        
        const percentage = (usage / limit) * 100;
        progressBar.style.width = `${percentage}%`;
        
        // Change color based on usage
        if (percentage >= 90) {
            progressBar.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        } else if (percentage >= 70) {
            progressBar.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
        } else {
            progressBar.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        }
    }

    // Handle reconnection
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
                this.initializeWebSocket();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.log('🔄 Max reconnection attempts reached, using periodic sync');
            this.startPeriodicSync();
        }
    }

    // Handle disconnection
    handleDisconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        // Show offline indicator
        this.showOfflineIndicator();
    }

    // Show offline indicator
    showOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.innerHTML = `
            <i class="fas fa-wifi"></i>
            <span>Offline - Modo desconectado</span>
        `;
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 0.8rem 1.2rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            z-index: 1000;
            animation: slideUp 0.5s ease;
        `;
        
        document.body.appendChild(indicator);
    }

    // Hide offline indicator
    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Load data from cache
    loadFromCache() {
        const cachedData = this.cache.get('dashboard_data');
        if (cachedData) {
            this.updateDashboard(cachedData);
            console.log('📦 Loaded data from cache');
        }
    }

    // Request initial data
    requestInitialData() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'request_initial_data',
                userId: localStorage.getItem('nutriScanUser')
            }));
        }
    }

    // Disconnect WebSocket
    disconnect() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            websocketConnected: this.ws && this.ws.readyState === WebSocket.OPEN,
            lastSyncTime: this.lastSyncTime,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Initialize the real-time sync system
let realtimeSync;

document.addEventListener('DOMContentLoaded', () => {
    realtimeSync = new RealtimeDashboardSync();
    
    // Make it globally accessible
    window.realtimeSync = realtimeSync;
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeDashboardSync;
}
