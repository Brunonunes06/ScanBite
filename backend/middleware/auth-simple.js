const jwt = require('jsonwebtoken');

// Middleware para proteger rotas - versão simplificada
const protect = async (req, res, next) => {
  let token;

  // Verificar se token existe no header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Verificar se não há token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acesso negado. Token não fornecido.'
    });
  }

  try {
    // Verificar token.
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');

    // Adicionar usuário ao request usando banco simplificado
    const user = await req.db.findUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    // Adicionar dados relevantes ao request
    req.user = {
      id: user._id,
      userId: user._id,
      email: user.email,
      name: user.name,
      subscription: user.subscription,
      preferences: user.preferences
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro ao autenticar usuário.'
    });
  }
};

// Middleware para verificar se email está verificado
const requireEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email não verificado. Por favor, verifique seu email.'
    });
  }
  next();
};

// Middleware para verificar plano premium
const requirePremium = (req, res, next) => {
  const subscription = req.user.subscription || {};
  
  if (subscription.plan !== 'premium' || subscription.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Esta funcionalidade requer plano Premium.',
      code: 'PREMIUM_REQUIRED'
    });
  }
  next();
};

// Middleware para verificar limite de scans (usuários free)
const checkScanLimit = async (req, res, next) => {
  const subscription = req.user.subscription || {};
  
  // Se for premium, não tem limite
  if (subscription.plan === 'premium' && subscription.status === 'active') {
    return next();
  }

  // Verificar se atingiu limite mensal
  if (subscription.scansUsed >= subscription.scansLimit) {
    return res.status(429).json({
      success: false,
      message: 'Limite mensal de scans atingido. Faça upgrade para Premium para scans ilimitados.',
      code: 'SCAN_LIMIT_EXCEEDED',
      scansRemaining: 0,
      scansLimit: subscription.scansLimit
    });
  }

  next();
};

// Middleware opcional - não requer autenticação
const optional = async (req, res, next) => {
  let token;

  // Verificar se token existe no header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');

      // Adicionar usuário ao request
      const user = await req.db.findUserById(decoded.userId);
      
      if (user) {
        req.user = {
          id: user._id,
          userId: user._id,
          email: user.email,
          name: user.name,
          subscription: user.subscription,
          preferences: user.preferences
        };
      }
    } catch (error) {
      // Ignorar erros de token em rotas opcionais
      console.log('Token inválido em rota opcional:', error.message);
    }
  }

  next();
};

// Middleware para autorização baseada em papéis (futuro)
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role || 'user';
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissão insuficiente.'
      });
    }
    next();
  };
};

// Middleware para validar ownership de recursos
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.id;
      
      let resource;
      
      switch (resourceType) {
        case 'scan':
          resource = await req.db.findScanById(resourceId);
          break;
        case 'user':
          resource = await req.db.findUserById(resourceId);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Tipo de recurso inválido.'
          });
      }
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado.'
        });
      }
      
      // Verificar se o recurso pertence ao usuário
      if (resource.userId !== userId && resource._id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Recurso não pertence ao usuário.'
        });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar permissão.'
      });
    }
  };
};

module.exports = {
  protect,
  requireEmailVerified,
  requirePremium,
  checkScanLimit,
  optional,
  authorize,
  requireOwnership
};
