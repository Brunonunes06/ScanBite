// Backend WebSocket Server for Real-time Dashboard Sync
const WebSocket = require('ws');
const http = require('http');
const url = require('url');

class DashboardSyncServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // userId -> WebSocket connection
        this.userStats = new Map(); // userId -> stats cache
        this.globalStats = {
            totalScans: 0,
            safeProducts: 0,
            warningsFound: 0,
            activeUsers: 0
        };
        
        this.initializeWebSocketServer();
        this.initializePeriodicUpdates();
    }

    // Initialize WebSocket server
    initializeWebSocketServer() {
        this.wss.on('connection', (ws, request) => {
            const userId = this.extractUserIdFromRequest(request);
            
            if (!userId) {
                ws.close(1008, 'User ID required');
                return;
            }

            console.log(`🔌 User ${userId} connected to dashboard sync`);
            
            // Store client connection
            this.clients.set(userId, ws);
            
            // Send initial data
            this.sendInitialData(userId);
            
            // Handle messages
            ws.on('message', (data) => {
                this.handleMessage(userId, data);
            });
            
            // Handle disconnection
            ws.on('close', () => {
                this.handleDisconnection(userId);
            });
            
            // Handle errors
            ws.on('error', (error) => {
                console.error(`🔌 Error for user ${userId}:`, error);
                this.handleDisconnection(userId);
            });
        });
    }

    // Extract user ID from WebSocket request
    extractUserIdFromRequest(request) {
        const query = url.parse(request.url, true).query;
        return query.userId || request.headers['x-user-id'];
    }

    // Handle WebSocket messages
    handleMessage(userId, data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'request_initial_data':
                    this.sendInitialData(userId);
                    break;
                case 'scan_completed':
                    this.handleScanCompleted(userId, message.payload);
                    break;
                case 'ping':
                    this.sendPong(userId);
                    break;
                default:
                    console.log(`🔌 Unknown message type from ${userId}:`, message.type);
            }
        } catch (error) {
            console.error(`🔌 Error parsing message from ${userId}:`, error);
        }
    }

    // Send initial data to user
    async sendInitialData(userId) {
        try {
            const userData = await this.getUserData(userId);
            const stats = await this.calculateUserStats(userId);
            
            const message = {
                type: 'initial_data',
                payload: {
                    user: userData,
                    stats: stats,
                    globalStats: this.globalStats,
                    timestamp: new Date().toISOString()
                }
            };
            
            this.sendToUser(userId, message);
        } catch (error) {
            console.error(`🔌 Error sending initial data to ${userId}:`, error);
        }
    }

    // Get user data from database
    async getUserData(userId) {
        // Simulate database query
        return {
            id: userId,
            name: 'User Name',
            plan: 'Premium',
            planLimit: this.getPlanLimit('Premium'),
            scansToday: await this.getUserScansToday(userId),
            lastScan: await this.getUserLastScan(userId)
        };
    }

    // Calculate user statistics
    async calculateUserStats(userId) {
        // Simulate database queries
        const userScans = await this.getUserScans(userId);
        const stats = {
            totalScans: userScans.length,
            safeProducts: userScans.filter(scan => scan.status === 'safe').length,
            warningsFound: userScans.filter(scan => scan.status === 'warning' || scan.status === 'danger').length,
            planUsage: userScans.filter(scan => this.isScanToday(scan.date)).length,
            planLimit: this.getPlanLimit('Premium'),
            recentScans: userScans.slice(0, 5)
        };
        
        // Cache stats
        this.userStats.set(userId, stats);
        
        return stats;
    }

    // Get user scans from database
    async getUserScans(userId) {
        // Simulate database query - in real implementation, this would query your database
        const cachedScans = this.getCachedUserScans(userId);
        return cachedScans || [];
    }

    // Get cached user scans
    getCachedUserScans(userId) {
        // Simulate cached data
        return [
            {
                id: 1,
                product: 'NutriSafe Cereal',
                date: new Date(Date.now() - 86400000).toISOString(),
                status: 'safe',
                confidence: 95
            },
            {
                id: 2,
                product: 'Protein Bar X',
                date: new Date(Date.now() - 172800000).toISOString(),
                status: 'warning',
                confidence: 87
            },
            {
                id: 3,
                product: 'Organic Juice',
                date: new Date(Date.now() - 259200000).toISOString(),
                status: 'safe',
                confidence: 92
            }
        ];
    }

    // Get user scans today
    async getUserScansToday(userId) {
        const scans = await this.getUserScans(userId);
        return scans.filter(scan => this.isScanToday(scan.date)).length;
    }

    // Get user last scan
    async getUserLastScan(userId) {
        const scans = await this.getUserScans(userId);
        return scans.length > 0 ? scans[0] : null;
    }

    // Check if scan is from today
    isScanToday(scanDate) {
        const scan = new Date(scanDate);
        const today = new Date();
        return scan.toDateString() === today.toDateString();
    }

    // Get plan limit based on plan type
    getPlanLimit(plan) {
        const limits = {
            'Free': 10,
            'Basic': 50,
            'Premium': 200,
            'Enterprise': 1000
        };
        return limits[plan] || 10;
    }

    // Handle scan completed event
    async handleScanCompleted(userId, scanData) {
        try {
            // Update global stats
            this.globalStats.totalScans++;
            
            if (scanData.status === 'safe') {
                this.globalStats.safeProducts++;
            } else if (scanData.status === 'warning' || scanData.status === 'danger') {
                this.globalStats.warningsFound++;
            }
            
            // Update user stats
            const userStats = this.userStats.get(userId) || {};
            userStats.totalScans = (userStats.totalScans || 0) + 1;
            
            if (scanData.status === 'safe') {
                userStats.safeProducts = (userStats.safeProducts || 0) + 1;
            } else {
                userStats.warningsFound = (userStats.warningsFound || 0) + 1;
            }
            
            if (this.isScanToday(scanData.date)) {
                userStats.planUsage = (userStats.planUsage || 0) + 1;
            }
            
            // Add to recent scans
            if (!userStats.recentScans) userStats.recentScans = [];
            userStats.recentScans.unshift(scanData);
            userStats.recentScans = userStats.recentScans.slice(0, 5);
            
            // Cache updated stats
            this.userStats.set(userId, userStats);
            
            // Broadcast update to all connected clients
            this.broadcastScanUpdate(userId, scanData);
            
            // Send specific update to the user
            this.sendUserStatsUpdate(userId, userStats);
            
            console.log(`📊 Scan completed for user ${userId}: ${scanData.product}`);
            
        } catch (error) {
            console.error(`🔌 Error handling scan completion for ${userId}:`, error);
        }
    }

    // Broadcast scan update to all clients
    broadcastScanUpdate(userId, scanData) {
        const message = {
            type: 'scan_update',
            payload: {
                userId: userId,
                scan: scanData,
                globalStats: this.globalStats,
                timestamp: new Date().toISOString()
            }
        };
        
        this.broadcast(message);
    }

    // Send user stats update
    sendUserStatsUpdate(userId, stats) {
        const message = {
            type: 'stats_update',
            payload: {
                stats: stats,
                timestamp: new Date().toISOString()
            }
        };
        
        this.sendToUser(userId, message);
    }

    // Send plan usage update
    sendPlanUsageUpdate(userId, usage, limit) {
        const message = {
            type: 'plan_update',
            payload: {
                usage: usage,
                limit: limit,
                percentage: (usage / limit) * 100,
                timestamp: new Date().toISOString()
            }
        };
        
        this.sendToUser(userId, message);
    }

    // Send pong response
    sendPong(userId) {
        const message = {
            type: 'pong',
            timestamp: new Date().toISOString()
        };
        
        this.sendToUser(userId, message);
    }

    // Send message to specific user
    sendToUser(userId, message) {
        const client = this.clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }

    // Broadcast message to all connected clients
    broadcast(message) {
        this.clients.forEach((client, userId) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // Handle client disconnection
    handleDisconnection(userId) {
        console.log(`🔌 User ${userId} disconnected from dashboard sync`);
        this.clients.delete(userId);
        
        // Update active users count
        this.globalStats.activeUsers = this.clients.size;
        
        // Broadcast updated active users count
        this.broadcast({
            type: 'user_activity',
            payload: {
                activeUsers: this.globalStats.activeUsers,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Initialize periodic updates
    initializePeriodicUpdates() {
        // Update global stats every 30 seconds
        setInterval(() => {
            this.updateGlobalStats();
        }, 30000);
        
        // Clean up inactive connections every 5 minutes
        setInterval(() => {
            this.cleanupInactiveConnections();
        }, 300000);
        
        // Send ping to all clients every 60 seconds
        setInterval(() => {
            this.pingAllClients();
        }, 60000);
    }

    // Update global statistics
    async updateGlobalStats() {
        try {
            // In real implementation, this would query your database
            // For now, we'll use the cached values
            
            // Broadcast updated global stats
            this.broadcast({
                type: 'global_stats_update',
                payload: {
                    globalStats: this.globalStats,
                    timestamp: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('🔌 Error updating global stats:', error);
        }
    }

    // Clean up inactive connections
    cleanupInactiveConnections() {
        this.clients.forEach((client, userId) => {
            if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                this.clients.delete(userId);
            }
        });
        
        this.globalStats.activeUsers = this.clients.size;
    }

    // Ping all clients to check connection health
    pingAllClients() {
        const message = {
            type: 'ping',
            timestamp: new Date().toISOString()
        };
        
        this.broadcast(message);
    }

    // Get server statistics
    getServerStats() {
        return {
            connectedClients: this.clients.size,
            globalStats: this.globalStats,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
    }
}

// Create and export the dashboard sync server
module.exports = DashboardSyncServer;
