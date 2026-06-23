const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [50, 'Nome não pode ter mais de 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false // Não retornar senha por padrão
  },
  profile: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  dietaryRestrictions: [{
    type: String,
    enum: [
      'gluten', 'lactose', 'peanuts', 'tree_nuts', 'shellfish', 
      'fish', 'eggs', 'soy', 'sesame', 'mustard', 'celery',
      'lupin', 'molluscs', 'sulfites', 'diabetes', 'hypertension'
    ]
  }],
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      enum: ['pt-BR', 'en-US'],
      default: 'pt-BR'
    },
    scanHistory: {
      type: Boolean,
      default: true
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    stripeCustomerId: String,
    subscriptionId: String,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false }
  },
  stats: {
    totalScans: { type: Number, default: 0 },
    scansThisMonth: { type: Number, default: 0 },
    lastScanDate: Date,
    alertsTriggered: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ createdAt: -1 });

// Virtuals
userSchema.virtual('isPremium').get(function() {
  return this.profile === 'premium' || this.subscription.plan === 'premium';
});

userSchema.virtual('scansRemaining').get(function() {
  if (this.isPremium) return Infinity;
  const maxFreeScans = 10;
  return Math.max(0, maxFreeScans - this.stats.scansThisMonth);
});

// Middleware para hash de senha
userSchema.pre('save', async function(next) {
  // Apenas fazer hash se a senha foi modificada
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para verificar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para incrementar scans
userSchema.methods.incrementScan = function() {
  this.stats.totalScans += 1;
  this.stats.scansThisMonth += 1;
  this.stats.lastScanDate = new Date();
  return this.save();
};

// Método para resetar scans mensais
userSchema.methods.resetMonthlyScans = function() {
  this.stats.scansThisMonth = 0;
  return this.save();
};

// Método estático para encontrar usuários com scans mensais para resetar
userSchema.statics.resetMonthlyScans = function() {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);
  
  return this.updateMany(
    { 
      'subscription.plan': 'free',
      updatedAt: { $lt: firstDayOfMonth }
    },
    { 'stats.scansThisMonth': 0 }
  );
};

// Método para obter perfil público
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    profile: this.profile,
    dietaryRestrictions: this.dietaryRestrictions,
    preferences: this.preferences,
    stats: this.stats,
    isPremium: this.isPremium,
    scansRemaining: this.scansRemaining,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
