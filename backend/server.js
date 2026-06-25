const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Importar banco de dados simplificado
const SimpleDatabase = require('./database');

// Importar rotas simplificadas
const authRoutes = require('./routes/auth-simple');
const scanRoutes = require('./routes/scans-simple');
const paymentRoutes = require('./routes/payment-brazil');
const googleAuthRoutes = require('./routes/auth-google');
const contactRoutes = require('./routes/contact');
const usersRoutes = require('./routes/users-simple');

// Importar middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Inicializar banco de dados
const db = new SimpleDatabase();

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: 'Muitas requisições. Tente novamente mais tarde.'
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disponibilizar banco de dados globalmente
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Inicializar banco de dados e criar dados de teste
db.seedTestData().then(() => {
  console.log('Banco de dados de teste inicializado com sucesso!');
}).catch(err => console.error('Erro ao inicializar banco:', err));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/users', usersRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API Scan-Bite funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Servir arquivos estáticos do frontend
const staticPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(staticPath));

// Rota principal para servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(staticPath, 'Pages', 'index.html'));
});

// Rota para index.html específico
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(staticPath, 'Pages', 'index.html'));
});

// Rota para loading.html
app.get('/loading.html', (req, res) => {
  res.sendFile(path.join(staticPath, 'Pages', 'loading.html'));
});

// Catch-all para outras rotas (SPA)
app.get('*', (req, res, next) => {
  // Se for uma requisição para API, deixar passar
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Se for um arquivo existente, servir
  const filePath = path.join(staticPath, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  // Para rotas não encontradas que não são API, servir index.html
  if (!req.path.startsWith('/api')) {
    return res.sendFile(path.join(staticPath, 'Pages', 'index.html'));
  }
  
  next();
});

// Middleware de erro
app.use(notFound);
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`
  ========================================
  Servidor Scan-Bite rodando na porta ${PORT}
  Ambiente: ${process.env.NODE_ENV || 'development'}
  API: http://localhost:${PORT}/api
  ========================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Fechando servidor...');
  server.close(() => {
    console.log('Servidor fechado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Fechando servidor...');
  server.close(() => {
    console.log('Servidor fechado');
    process.exit(0);
  });
});

module.exports = app;
