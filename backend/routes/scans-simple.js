const express = require('express');
const router = express.Router();

// @desc    Criar novo scan
// @route   POST /api/scans
// @access  Private
router.post('/', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    
    // Encontrar usuário
    const user = await req.db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }

    // Simular análise de imagem
    const { imageUrl, productName, barcode } = req.body;
    
    // Encontrar ou criar produto
    let product;
    if (barcode) {
      product = await req.db.findProductByBarcode(barcode);
    }
    
    if (!product) {
      // Criar produto simulado
      product = await req.db.createProduct({
        name: productName || 'Produto Desconhecido',
        brand: 'Marca Não Identificada',
        barcode: barcode || 'unknown',
        category: 'outros',
        ingredients: ['ingrediente 1', 'ingrediente 2', 'ingrediente 3'],
        allergens: [],
        nutritionalInfo: {
          calories: 100,
          protein: 5,
          carbs: 15,
          fat: 3,
          sodium: 200
        },
        warnings: [],
        safetyRating: 'safe'
      });
    }

    // Verificar restrições do usuário
    const alerts = [];
    const userRestrictions = user.dietaryRestrictions || [];
    
    product.allergens.forEach(allergen => {
      if (userRestrictions.includes(allergen.toLowerCase())) {
        alerts.push({
          type: 'allergy',
          severity: 'danger',
          message: `Contém ${allergen} - alérgeno para você!`,
          ingredient: allergen
        });
      }
    });

    // Determinar risco geral
    let overallRisk = 'safe';
    if (alerts.some(a => a.severity === 'danger')) {
      overallRisk = 'avoid';
    } else if (alerts.length > 0) {
      overallRisk = 'caution';
    }

    // Criar scan
    const scan = await req.db.createScan({
      user: user._id,
      product: product._id,
      imageUrl: imageUrl || null,
      analysis: {
        ingredients: product.ingredients,
        allergens: product.allergens,
        nutritionalInfo: product.nutritionalInfo,
        overallRisk,
        alerts,
        recommendations: overallRisk === 'safe' ? 
          ['Produto seguro para consumo'] : 
          ['Consulte um nutricionista', 'Verifique os ingredientes com cuidado']
      },
      feedback: {
        rating: null,
        comments: null
      }
    });

    // Atualizar estatísticas do usuário
    const stats = user.stats || { totalScans: 0, safeProducts: 0, warningProducts: 0, dangerProducts: 0 };
    stats.totalScans += 1;
    
    if (overallRisk === 'safe') stats.safeProducts += 1;
    else if (overallRisk === 'caution') stats.warningProducts += 1;
    else stats.dangerProducts += 1;

    await req.db.updateUser(user._id, { stats });

    res.status(201).json({
      success: true,
      scan: {
        _id: scan._id,
        product: {
          _id: product._id,
          name: product.name,
          brand: product.brand,
          barcode: product.barcode,
          category: product.category
        },
        analysis: scan.analysis,
        createdAt: scan.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao criar scan:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar scan.'
    });
  }
});

// @desc    Obter scans do usuário
// @route   GET /api/scans
// @access  Private
router.get('/', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    
    // Encontrar usuário
    const user = await req.db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await req.db.findScansByUserId(user._id, page, limit);
    
    // Enriquecer dados com informações do produto
    const enrichedScans = [];
    for (const scan of result.scans) {
      const product = await req.db.findProductById(scan.product);
      enrichedScans.push({
        ...scan,
        product: {
          _id: product._id,
          name: product.name,
          brand: product.brand,
          barcode: product.barcode,
          category: product.category
        }
      });
    }

    res.json({
      success: true,
      scans: enrichedScans,
      pages: result.pages,
      total: result.total,
      page
    });
  } catch (error) {
    console.error('Erro ao obter scans:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter scans.'
    });
  }
});

// @desc    Obter scan específico
// @route   GET /api/scans/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    
    // Encontrar usuário
    const user = await req.db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }

    const scan = await req.db.findScanById(req.params.id);
    
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan não encontrado.'
      });
    }

    // Verificar se o scan pertence ao usuário
    if (scan.user !== user._id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado.'
      });
    }

    // Enriquecer dados do produto
    const product = await req.db.findProductById(scan.product);

    res.json({
      success: true,
      scan: {
        ...scan,
        product
      }
    });
  } catch (error) {
    console.error('Erro ao obter scan:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter scan.'
    });
  }
});

// @desc    Excluir scan
// @route   DELETE /api/scans/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    
    // Encontrar usuário
    const user = await req.db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }

    const scan = await req.db.findScanById(req.params.id);
    
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan não encontrado.'
      });
    }

    // Verificar se o scan pertence ao usuário
    if (scan.user !== user._id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado.'
      });
    }

    await req.db.deleteScan(req.params.id);

    res.json({
      success: true,
      message: 'Scan excluído com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao excluir scan:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir scan.'
    });
  }
});

module.exports = router;
