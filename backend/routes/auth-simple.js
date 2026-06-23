const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Helper function para gerar token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'nutri_scan_secret_key', {
    expiresIn: '7d'
  });
};

// @desc    Registrar novo usuário
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, dietaryRestrictions } = req.body;

    // Validar campos obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça nome, email e senha.'
      });
    }

    // Verificar se usuário já existe
    const existingUser = await req.db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso.'
      });
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar usuário
    const user = await req.db.createUser({
      name,
      email,
      password: hashedPassword,
      dietaryRestrictions: dietaryRestrictions || [],
      isPremium: false,
      preferences: {
        language: 'pt-BR',
        notifications: 'all'
      },
      stats: {
        totalScans: 0,
        safeProducts: 0,
        warningProducts: 0,
        dangerProducts: 0
      },
      isEmailVerified: false
    });

    // Gerar token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isPremium: user.isPremium,
        dietaryRestrictions: user.dietaryRestrictions,
        preferences: user.preferences,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário.'
    });
  }
});

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça email e senha.'
      });
    }

    // Encontrar usuário
    const user = await req.db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos.'
      });
    }

    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos.'
      });
    }

    // Gerar token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isPremium: user.isPremium,
        dietaryRestrictions: user.dietaryRestrictions,
        preferences: user.preferences,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login.'
    });
  }
});

// @desc    Obter usuário atual
// @route   GET /api/auth/me
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    
    // Encontrar usuário
    const user = await req.db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isPremium: user.isPremium,
        dietaryRestrictions: user.dietaryRestrictions,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido.'
    });
  }
});

// @desc    Atualizar perfil do usuário
// @route   PUT /api/auth/me
// @access  Private
router.put('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    
    // Encontrar usuário
    const user = await req.db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    }

    // Atualizar usuário
    const { name, dietaryRestrictions, preferences } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (dietaryRestrictions) updateData.dietaryRestrictions = dietaryRestrictions;
    if (preferences) updateData.preferences = { ...user.preferences, ...preferences };

    const updatedUser = await req.db.updateUser(user._id, updateData);

    res.json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isPremium: updatedUser.isPremium,
        dietaryRestrictions: updatedUser.dietaryRestrictions,
        preferences: updatedUser.preferences,
        stats: updatedUser.stats
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil.'
    });
  }
});

module.exports = router;
