const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// @desc    Login/Registro com Google
// @route   POST /api/auth/google-login
// @access  Public
router.post('/google-login', async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;

    // Validar dados obrigatórios
    if (!email || !name || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Dados do Google são obrigatórios'
      });
    }

    // Verificar se usuário já existe
    let user = await req.db.findUserByEmail(email);

    if (user) {
      // Usuário existe, verificar se tem Google ID
      if (!user.googleId) {
        // Atualizar usuário com Google ID
        user = await req.db.updateUser(user._id, {
          googleId,
          picture: picture || user.picture,
          lastLogin: new Date()
        });
      } else {
        // Atualizar último login
        user = await req.db.updateUser(user._id, {
          lastLogin: new Date()
        });
      }
    } else {
      // Criar novo usuário
      const userData = {
        name,
        email,
        googleId,
        picture: picture || null,
        password: null, // Sem senha para login Google
        isVerified: true, // Usuários Google são verificados
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          scansUsed: 0,
          scansLimit: 10
        },
        preferences: {
          allergies: [],
          dietaryRestrictions: [],
          notifications: true,
          language: 'pt-BR'
        },
        createdAt: new Date(),
        lastLogin: new Date()
      };

      user = await req.db.createUser(userData);
    }

    // Gerar JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'nutri_scan_secret_key',
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        subscription: user.subscription,
        preferences: user.preferences,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erro no login Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar login com Google'
    });
  }
});

// @desc    Vincular conta Google a usuário existente
// @route   POST /api/auth/link-google
// @access  Private
router.post('/link-google', async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Verificar se usuário existe
    const user = await req.db.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se email do Google corresponde
    if (user.email !== email) {
      return res.status(400).json({
        success: false,
        message: 'Email do Google não corresponde ao usuário'
      });
    }

    // Atualizar usuário com Google ID
    const updatedUser = await req.db.updateUser(userId, {
      googleId,
      picture: picture || user.picture
    });

    res.status(200).json({
      success: true,
      message: 'Conta Google vinculada com sucesso',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        picture: updatedUser.picture,
        googleId: updatedUser.googleId
      }
    });
  } catch (error) {
    console.error('Erro ao vincular Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao vincular conta Google'
    });
  }
});

// @desc    Desvincular conta Google
// @route   DELETE /api/auth/unlink-google
// @access  Private
router.delete('/unlink-google', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Verificar se usuário existe
    const user = await req.db.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se usuário tem senha (não pode desvincular se não tiver)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível desvincular Google sem definir uma senha'
      });
    }

    // Remover Google ID
    const updatedUser = await req.db.updateUser(userId, {
      googleId: null
    });

    res.status(200).json({
      success: true,
      message: 'Conta Google desvinculada com sucesso',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        picture: updatedUser.picture,
        googleId: null
      }
    });
  } catch (error) {
    console.error('Erro ao desvincular Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desvincular conta Google'
    });
  }
});

// @desc    Verificar se email já está cadastrado
// @route   POST /api/auth/check-email
// @access  Public
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    const user = await req.db.findUserByEmail(email);

    res.status(200).json({
      success: true,
      exists: !!user,
      hasGoogle: user?.googleId || false,
      hasPassword: user?.password || false
    });
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar email'
    });
  }
});

module.exports = router;
