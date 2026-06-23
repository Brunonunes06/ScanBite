// Dashboard API Routes
const express = require('express');
const router = express.Router();

// Mock database - in real implementation, this would be your actual database
let mockDatabase = {
    users: [
        {
            id: '1',
            name: 'Bruno Test',
            email: 'bruno@test.com',
            plan: 'Premium',
            planLimit: 200,
            createdAt: new Date('2024-01-01')
        }
    ],
    scans: [
        {
            id: 1,
            userId: '1',
            product: 'NutriSafe Cereal',
            date: new Date(Date.now() - 86400000).toISOString(),
            status: 'safe',
            confidence: 95,
            ingredients: ['Aveia', 'Mel', 'Frutas secas'],
            allergens: []
        },
        {
            id: 2,
            userId: '1',
            product: 'Protein Bar X',
            date: new Date(Date.now() - 172800000).toISOString(),
            status: 'warning',
            confidence: 87,
            ingredients: ['Proteína de soja', 'Nozes', 'Cacau'],
            allergens: ['soja', 'nozes']
        },
        {
            id: 3,
            userId: '1',
            product: 'Organic Juice',
            date: new Date(Date.now() - 259200000).toISOString(),
            status: 'safe',
            confidence: 92,
            ingredients: ['Laranja', 'Maçã', 'Cenoura'],
            allergens: []
        },
        {
            id: 4,
            userId: '1',
            product: 'Chocolate Bar',
            date: new Date(Date.now() - 345600000).toISOString(),
            status: 'danger',
            confidence: 94,
            ingredients: ['Leite', 'Amendoim', 'Açúcar'],
            allergens: ['leite', 'amendoim']
        },
        {
            id: 5,
            userId: '1',
            product: 'Vegan Cookies',
            date: new Date(Date.now() - 432000000).toISOString(),
            status: 'safe',
            confidence: 89,
            ingredients: ['Farinha de arroz', 'Coco', 'Baunilha'],
            allergens: []
        }
    ]
};

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user?.id || '1'; // Get from authenticated user or default to '1'
        
        // Get user data
        const user = mockDatabase.users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get user scans
        const userScans = mockDatabase.scans.filter(scan => scan.userId === userId);
        
        // Calculate statistics
        const stats = {
            totalScans: userScans.length,
            safeProducts: userScans.filter(scan => scan.status === 'safe').length,
            warningsFound: userScans.filter(scan => scan.status === 'warning' || scan.status === 'danger').length,
            planUsage: userScans.filter(scan => isToday(scan.date)).length,
            planLimit: user.planLimit,
            recentScans: userScans.slice(0, 5),
            user: {
                id: user.id,
                name: user.name,
                plan: user.plan,
                planLimit: user.planLimit
            },
            lastSync: new Date().toISOString()
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get global statistics (for admin/overview)
router.get('/global-stats', async (req, res) => {
    try {
        const allScans = mockDatabase.scans;
        const activeUsers = mockDatabase.users.length;
        
        const globalStats = {
            totalScans: allScans.length,
            safeProducts: allScans.filter(scan => scan.status === 'safe').length,
            warningsFound: allScans.filter(scan => scan.status === 'warning' || scan.status === 'danger').length,
            activeUsers: activeUsers,
            scansToday: allScans.filter(scan => isToday(scan.date)).length,
            scansThisWeek: allScans.filter(scan => isThisWeek(scan.date)).length,
            topProducts: getTopScannedProducts(allScans),
            riskDistribution: getRiskDistribution(allScans),
            lastUpdate: new Date().toISOString()
        };
        
        res.json(globalStats);
    } catch (error) {
        console.error('Global stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new scan (simulating real-time update)
router.post('/scan', async (req, res) => {
    try {
        const userId = req.user?.id || '1';
        const { product, status, confidence, ingredients, allergens } = req.body;
        
        const newScan = {
            id: mockDatabase.scans.length + 1,
            userId: userId,
            product: product || 'Unknown Product',
            date: new Date().toISOString(),
            status: status || 'safe',
            confidence: confidence || 85,
            ingredients: ingredients || [],
            allergens: allergens || []
        };
        
        // Add to database
        mockDatabase.scans.unshift(newScan);
        
        // Emit real-time update if WebSocket is available
        if (req.app.get('dashboardSync')) {
            req.app.get('dashboardSync').handleScanCompleted(userId, newScan);
        }
        
        res.json({
            success: true,
            scan: newScan,
            message: 'Scan added successfully'
        });
    } catch (error) {
        console.error('Add scan error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user scan history
router.get('/scans', async (req, res) => {
    try {
        const userId = req.user?.id || '1';
        const { page = 1, limit = 10, status, startDate, endDate } = req.query;
        
        let userScans = mockDatabase.scans.filter(scan => scan.userId === userId);
        
        // Apply filters
        if (status) {
            userScans = userScans.filter(scan => scan.status === status);
        }
        
        if (startDate) {
            const start = new Date(startDate);
            userScans = userScans.filter(scan => new Date(scan.date) >= start);
        }
        
        if (endDate) {
            const end = new Date(endDate);
            userScans = userScans.filter(scan => new Date(scan.date) <= end);
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedScans = userScans.slice(startIndex, endIndex);
        
        res.json({
            scans: paginatedScans,
            total: userScans.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(userScans.length / limit)
        });
    } catch (error) {
        console.error('Get scans error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get scan analytics
router.get('/analytics', async (req, res) => {
    try {
        const userId = req.user?.id || '1';
        const userScans = mockDatabase.scans.filter(scan => scan.userId === userId);
        
        const analytics = {
            totalScans: userScans.length,
            averageConfidence: userScans.reduce((sum, scan) => sum + scan.confidence, 0) / userScans.length,
            scansByStatus: {
                safe: userScans.filter(scan => scan.status === 'safe').length,
                warning: userScans.filter(scan => scan.status === 'warning').length,
                danger: userScans.filter(scan => scan.status === 'danger').length
            },
            scansByMonth: getScansByMonth(userScans),
            topAllergens: getTopAllergens(userScans),
            scanFrequency: getScanFrequency(userScans),
            improvement: getImprovementTrend(userScans)
        };
        
        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions
function isToday(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isThisWeek(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
}

function getTopScannedProducts(scans) {
    const productCounts = {};
    scans.forEach(scan => {
        productCounts[scan.product] = (productCounts[scan.product] || 0) + 1;
    });
    
    return Object.entries(productCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([product, count]) => ({ product, count }));
}

function getRiskDistribution(scans) {
    const distribution = {
        safe: scans.filter(scan => scan.status === 'safe').length,
        warning: scans.filter(scan => scan.status === 'warning').length,
        danger: scans.filter(scan => scan.status === 'danger').length
    };
    
    const total = scans.length;
    return {
        ...distribution,
        percentages: {
            safe: total > 0 ? (distribution.safe / total * 100).toFixed(1) : 0,
            warning: total > 0 ? (distribution.warning / total * 100).toFixed(1) : 0,
            danger: total > 0 ? (distribution.danger / total * 100).toFixed(1) : 0
        }
    };
}

function getScansByMonth(scans) {
    const monthCounts = {};
    const currentYear = new Date().getFullYear();
    
    for (let month = 0; month < 12; month++) {
        const monthName = new Date(currentYear, month).toLocaleDateString('pt-BR', { month: 'short' });
        monthCounts[monthName] = 0;
    }
    
    scans.forEach(scan => {
        const date = new Date(scan.date);
        if (date.getFullYear() === currentYear) {
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
            monthCounts[monthName]++;
        }
    });
    
    return monthCounts;
}

function getTopAllergens(scans) {
    const allergenCounts = {};
    
    scans.forEach(scan => {
        scan.allergens.forEach(allergen => {
            allergenCounts[allergen] = (allergenCounts[allergen] || 0) + 1;
        });
    });
    
    return Object.entries(allergenCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([allergen, count]) => ({ allergen, count }));
}

function getScanFrequency(scans) {
    if (scans.length === 0) return 0;
    
    const firstScan = new Date(Math.min(...scans.map(scan => new Date(scan.date))));
    const daysSinceFirst = Math.ceil((new Date() - firstScan) / (1000 * 60 * 60 * 24));
    
    return daysSinceFirst > 0 ? (scans.length / daysSinceFirst).toFixed(2) : scans.length;
}

function getImprovementTrend(scans) {
    if (scans.length < 2) return 0;
    
    const recentScans = scans.slice(0, Math.floor(scans.length / 2));
    const olderScans = scans.slice(Math.floor(scans.length / 2));
    
    const recentSafe = recentScans.filter(scan => scan.status === 'safe').length;
    const olderSafe = olderScans.filter(scan => scan.status === 'safe').length;
    
    const recentPercentage = (recentSafe / recentScans.length) * 100;
    const olderPercentage = (olderSafe / olderScans.length) * 100;
    
    return (recentPercentage - olderPercentage).toFixed(1);
}

module.exports = router;
