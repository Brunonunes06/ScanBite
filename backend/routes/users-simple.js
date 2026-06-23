const express = require('express');
const router = express.Router();

// @desc    Obter dashboard do usuário
// @route   GET /api/users/dashboard
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    // Verificar token
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }

    // Buscar usuário no banco de dados em memória
    if (!req.db) {
      return res.status(500).json({
        success: false,
        message: 'Banco de dados não disponível.'
      });
    }

    const user = await req.db.findUserById(decoded.userId || decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    // Buscar scans do usuário
    const scans = await req.db.getUserScans(user.userId);
    const recentScans = scans.slice(-5).reverse(); // Últimos 5 scans
    
    // Calcular estatísticas
    const stats = {
      totalScans: scans.length,
      thisMonth: scans.filter(scan => {
        const scanDate = new Date(scan.date);
        const now = new Date();
        return scanDate.getMonth() === now.getMonth() && 
               scanDate.getFullYear() === now.getFullYear();
      }).length,
      avgRisk: scans.length > 0 
        ? scans.reduce((sum, scan) => sum + (scan.riskScore || 0), 0) / scans.length 
        : 0
    };

    // Gerar dados para gráfico dos últimos 7 dias
    const dailyStats = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const scansOnDay = scans.filter(scan => {
        const scanDate = new Date(scan.date);
        return scanDate.toISOString().split('T')[0] === dateStr;
      }).length;
      
      dailyStats[dateStr] = scansOnDay;
    }

    // Estatísticas de categorias
    const categoryStats = {};
    scans.forEach(scan => {
      const category = scan.category || 'Outros';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          subscription: user.subscription,
          preferences: user.preferences
        },
        stats,
        recentScans,
        dailyStats,
        categoryStats
      }
    });

  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dashboard.'
    });
  }
});

// @desc    Obter perfil do usuário
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado.'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');

    if (!req.db) {
      return res.status(500).json({
        success: false,
        message: 'Banco de dados não disponível.'
      });
    }

    const user = await req.db.findUserById(decoded.userId || decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        subscription: user.subscription,
        preferences: user.preferences,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil.'
    });
  }
});

module.exports = router;
