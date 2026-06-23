const mongoose = require('mongoose');

// Middleware para tratar erros de validação do Mongoose
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => ({
    field: val.path,
    message: val.message
  }));

  return {
    success: false,
    message: 'Dados inválidos',
    errors
  };
};

// Middleware para tratar erros de duplicação do Mongoose
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  return {
    success: false,
    message: `${field} já existe: ${value}`
  };
};

// Middleware para tratar erros de cast do Mongoose
const handleCastErrorDB = (err) => {
  return {
    success: false,
    message: `Valor inválido para ${err.path}: ${err.value}`
  };
};

// Middleware para tratar erros de JWT
const handleJWTError = () => {
  return {
    success: false,
    message: 'Token inválido. Por favor, faça login novamente.'
  };
};

// Middleware para tratar JWT expirado
const handleJWTExpiredError = () => {
  return {
    success: false,
    message: 'Seu token expirou. Por favor, faça login novamente.'
  };
};

// Middleware para tratar erros de upload de arquivos
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return {
      success: false,
      message: 'Arquivo muito grande. O tamanho máximo é 5MB.'
    };
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return {
      success: false,
      message: 'Muitos arquivos. O máximo permitido é 1.'
    };
  }
  
  if (err.message.includes('Apenas arquivos de imagem são permitidos')) {
    return {
      success: false,
      message: 'Apenas arquivos de imagem são permitidos (JPG, PNG, etc).'
    };
  }

  return {
    success: false,
    message: 'Erro no upload do arquivo.'
  };
};

// Middleware para tratar erros de validação do Joi
const handleJoiError = (err) => {
  const errors = err.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));

  return {
    success: false,
    message: 'Dados inválidos',
    errors
  };
};

// Middleware principal de tratamento de erros
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro para debug
  console.error('ERRO:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const response = handleValidationError(err);
    return res.status(400).json(response);
  }

  // Erro de duplicação (campo único)
  if (err.code === 11000) {
    const response = handleDuplicateFieldsDB(err);
    return res.status(400).json(response);
  }

  // Erro de cast do Mongoose
  if (err.name === 'CastError') {
    const response = handleCastErrorDB(err);
    return res.status(400).json(response);
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    const response = handleJWTError();
    return res.status(401).json(response);
  }

  // Erro de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const response = handleJWTExpiredError();
    return res.status(401).json(response);
  }

  // Erro de validação do Joi
  if (err.isJoi) {
    const response = handleJoiError(err);
    return res.status(400).json(response);
  }

  // Erro do Multer
  if (err.name === 'MulterError') {
    const response = handleMulterError(err);
    return res.status(400).json(response);
  }

  // Erro de validação do Multer
  if (err.message.includes('Apenas arquivos de imagem são permitidos')) {
    const response = handleMulterError(err);
    return res.status(400).json(response);
  }

  // Erro de rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: err.retryAfter || 60
    });
  }

  // Erros específicos da aplicação
  if (err.name === 'ScanLimitError') {
    return res.status(429).json({
      success: false,
      message: err.message,
      code: 'SCAN_LIMIT_EXCEEDED'
    });
  }

  if (err.name === 'SubscriptionError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.name === 'ProductNotFoundError') {
    return res.status(404).json({
      success: false,
      message: err.message
    });
  }

  // Erro genérico em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: error.message || 'Erro interno do servidor',
      stack: error.stack,
      error
    });
  }

  // Erro genérico em produção
  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Erro interno do servidor'
  });
};

// Middleware para rotas não encontradas
const notFound = (req, res, next) => {
  // Ignorar favicon e outros arquivos estáticos
  if (req.path === '/favicon.ico' || req.path.startsWith('/static/') || req.path === '/') {
    return res.status(404).json({
      success: false,
      message: 'Recurso não encontrado'
    });
  }
  
  const error = new Error(`Rota não encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Middleware para capturar erros assíncronos
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Classes de erro personalizadas
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ScanLimitError extends AppError {
  constructor(message = 'Limite de scans atingido') {
    super(message, 429);
    this.name = 'ScanLimitError';
  }
}

class SubscriptionError extends AppError {
  constructor(message = 'Erro na assinatura') {
    super(message, 400);
    this.name = 'SubscriptionError';
  }
}

class ProductNotFoundError extends AppError {
  constructor(message = 'Produto não encontrado') {
    super(message, 404);
    this.name = 'ProductNotFoundError';
  }
}

// Middleware para validação de erros de ambiente
const validateEnvironment = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'STRIPE_SECRET_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Variáveis de ambiente obrigatórias faltando:', missingVars);
    process.exit(1);
  }
};

module.exports = {
  errorHandler,
  notFound,
  catchAsync,
  AppError,
  ScanLimitError,
  SubscriptionError,
  ProductNotFoundError,
  validateEnvironment
};
