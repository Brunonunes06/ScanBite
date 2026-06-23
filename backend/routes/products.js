const express = require('express');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth-simple');
const router = express.Router();

// @desc    Buscar produtos
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Filtros
    const filters = { isActive: true };
    
    if (req.query.category) {
      filters.category = req.query.category;
    }
    
    if (req.query.brand) {
      filters.brand = new RegExp(req.query.brand, 'i');
    }
    
    if (req.query.name) {
      filters.name = new RegExp(req.query.name, 'i');
    }
    
    if (req.query.barcode) {
      filters.barcode = req.query.barcode;
    }
    
    // Opções de ordenação
    let sort = {};
    switch (req.query.sort) {
      case 'name':
        sort = { name: 1 };
        break;
      case 'brand':
        sort = { brand: 1 };
        break;
      case 'rating':
        sort = { 'quality.rating': -1 };
        break;
      case 'scans':
      default:
        sort = { scanCount: -1 };
        break;
    }

    const products = await Product.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('quality.reviews.user', 'name');

    const total = await Product.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      products
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produtos.'
    });
  }
});

// @desc    Obter produto por ID
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('quality.reviews.user', 'name');

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter produto.'
    });
  }
});

// @desc    Buscar produtos por código de barras
// @route   GET /api/products/barcode/:barcode
// @access  Public
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ 
      barcode: req.params.barcode,
      isActive: true 
    }).populate('quality.reviews.user', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Erro ao buscar produto por barcode:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produto.'
    });
  }
});

// @desc    Obter produtos populares
// @route   GET /api/products/popular
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const products = await Product.getPopularProducts(limit);

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Erro ao obter produtos populares:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter produtos populares.'
    });
  }
});

// @desc    Obter produtos por categoria
// @route   GET /api/products/category/:category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const products = await Product.getByCategory(req.params.category, limit);

    res.status(200).json({
      success: true,
      count: products.length,
      category: req.params.category,
      products
    });
  } catch (error) {
    console.error('Erro ao obter produtos por categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter produtos por categoria.'
    });
  }
});

// @desc    Obter produtos seguros para restrições específicas
// @route   POST /api/products/safe
// @access  Private
router.post('/safe', protect, async (req, res) => {
  try {
    const { dietaryRestrictions } = req.body;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!dietaryRestrictions || !Array.isArray(dietaryRestrictions)) {
      return res.status(400).json({
        success: false,
        message: 'Forneça uma lista de restrições alimentares.'
      });
    }
    
    const products = await Product.getSafeForRestrictions(dietaryRestrictions, limit);

    res.status(200).json({
      success: true,
      count: products.length,
      restrictions: dietaryRestrictions,
      products
    });
  } catch (error) {
    console.error('Erro ao obter produtos seguros:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter produtos seguros.'
    });
  }
});

// @desc    Adicionar review a um produto
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Forneça uma avaliação de 1 a 5 estrelas.'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.'
      });
    }
    
    await product.addReview(req.user.id, rating, comment);
    
    // Atualizar rating médio
    const avgRating = product.averageRating;
    product.quality.rating = avgRating;
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Avaliação adicionada com sucesso.',
      averageRating: avgRating
    });
  } catch (error) {
    console.error('Erro ao adicionar review:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar avaliação.'
    });
  }
});

// @desc    Obter reviews de um produto
// @route   GET /api/products/:id/reviews
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'quality.reviews',
        populate: { path: 'user', select: 'name' },
        options: { sort: { createdAt: -1 }, skip, limit }
      });
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.'
      });
    }
    
    const total = product.quality.totalReviews;
    const reviews = product.quality.reviews.slice(skip, skip + limit);
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      reviews,
      averageRating: product.averageRating
    });
  } catch (error) {
    console.error('Erro ao obter reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter avaliações.'
    });
  }
});

// @desc    Verificar se produto é seguro para usuário
// @route   POST /api/products/:id/check-safety
// @access  Private
router.post('/:id/check-safety', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    const safetyCheck = product.isSafeForUser(user.dietaryRestrictions);
    
    res.status(200).json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        brand: product.brand,
        category: product.category
      },
      safetyCheck,
      userRestrictions: user.dietaryRestrictions
    });
  } catch (error) {
    console.error('Erro ao verificar segurança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar segurança do produto.'
    });
  }
});

// @desc    Obter categorias disponíveis
// @route   GET /api/products/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    
    const categoryNames = {
      'biscoitos': 'Biscoitos',
      'chocolates': 'Chocolates',
      'doces': 'Doces',
      'salgados': 'Salgados',
      'bebidas': 'Bebidas',
      'laticinios': 'Laticínios',
      'carnes': 'Carnes',
      'frutas': 'Frutas',
      'vegetais': 'Vegetais',
      'graos': 'Grãos',
      'massas': 'Massas',
      'molhos': 'Molhos',
      'congelados': 'Congelados',
      'enlatados': 'Enlatados',
      'outros': 'Outros'
    };
    
    const formattedCategories = categories.map(cat => ({
      value: cat,
      label: categoryNames[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)
    }));
    
    res.status(200).json({
      success: true,
      categories: formattedCategories
    });
  } catch (error) {
    console.error('Erro ao obter categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter categorias.'
    });
  }
});

// @desc    Buscar produtos (search)
// @route   GET /api/products/search
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q: query, category, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Forneça um termo para busca.'
      });
    }
    
    const filters = {
      isActive: true,
      $or: [
        { name: new RegExp(query, 'i') },
        { brand: new RegExp(query, 'i') },
        { 'ingredients.name': new RegExp(query, 'i') }
      ]
    };
    
    if (category) {
      filters.category = category;
    }
    
    const products = await Product.find(filters)
      .sort({ scanCount: -1 })
      .limit(parseInt(limit))
      .populate('quality.reviews.user', 'name');
    
    res.status(200).json({
      success: true,
      query,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na busca de produtos.'
    });
  }
});

module.exports = router;
