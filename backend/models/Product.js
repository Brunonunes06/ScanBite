const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Nome do produto não pode ter mais de 100 caracteres']
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Marca não pode ter mais de 50 caracteres']
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true // Permite múltiplos nulos, mas valores únicos quando presentes
  },
  category: {
    type: String,
    enum: [
      'biscoitos', 'chocolates', 'doces', 'salgados', 'bebidas',
      'laticinios', 'carnes', 'frutas', 'vegetais', 'graos',
      'massas', 'molhos', 'congelados', 'enlatados', 'outros'
    ],
    required: true
  },
  images: [{
    url: String,
    publicId: String,
    isPrimary: { type: Boolean, default: false }
  }],
  ingredients: [{
    name: {
      type: String,
      required: true
    },
    order: Number,
    percentage: Number
  }],
  allergens: [{
    name: {
      type: String,
      required: true
    },
    present: {
      type: Boolean,
      required: true
    },
    traces: {
      type: Boolean,
      default: false
    }
  }],
  nutritionalInfo: {
    servingSize: String,
    unit: String,
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
    sodium: Number,
    sugar: Number,
    saturatedFat: Number,
    transFat: Number,
    cholesterol: Number
  },
  certifications: [{
    type: {
      type: String,
      enum: ['organic', 'gluten_free', 'vegan', 'vegetarian', 'non_gmo', 'halal', 'kosher']
    },
    certified: Boolean,
    certificationNumber: String
  }],
  warnings: [{
    type: {
      type: String,
      enum: ['allergen', 'diabetes', 'hypertension', 'pregnancy', 'children']
    },
    message: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'danger']
    }
  }],
  availability: {
    regions: [{
      country: String,
      states: [String],
      cities: [String]
    }],
    stores: [{
      name: String,
      chain: String,
      website: String
    }]
  },
  manufacturing: {
    company: String,
    address: String,
    phone: String,
    website: String,
    email: String
  },
  quality: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      comment: String,
      helpful: {
        type: Number,
        default: 0
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  scanCount: {
    type: Number,
    default: 0
  },
  lastScanned: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  source: {
    type: String,
    enum: ['user_upload', 'api_import', 'manual_entry', 'crowdsourced'],
    default: 'user_upload'
  },
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
productSchema.index({ name: 1, brand: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ category: 1 });
productSchema.index({ 'allergens.name': 1, 'allergens.present': 1 });
productSchema.index({ scanCount: -1 });
productSchema.index({ lastScanned: -1 });
productSchema.index({ verified: 1 });

// Virtuals
productSchema.virtual('averageRating').get(function() {
  if (this.quality.totalReviews === 0) return null;
  
  const totalRating = this.quality.reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((totalRating / this.quality.totalReviews) * 10) / 10;
});

productSchema.virtual('hasAllergens').get(function() {
  return this.allergens.some(allergen => allergen.present);
});

productSchema.virtual('isSafeForDiabetics').get(function() {
  return this.nutritionalInfo.sugar <= 10;
});

productSchema.virtual('isSafeForHypertensive').get(function() {
  return this.nutritionalInfo.sodium <= 140;
});

// Método para incrementar contador de scans
productSchema.methods.incrementScanCount = function() {
  this.scanCount += 1;
  this.lastScanned = new Date();
  return this.save();
};

// Método para adicionar review
productSchema.methods.addReview = function(userId, rating, comment) {
  // Verificar se usuário já fez review
  const existingReview = this.quality.reviews.find(review => 
    review.user.toString() === userId.toString()
  );
  
  if (existingReview) {
    existingReview.rating = rating;
    existingReview.comment = comment;
    existingReview.createdAt = new Date();
  } else {
    this.quality.reviews.push({
      user: userId,
      rating,
      comment,
      createdAt: new Date()
    });
    this.quality.totalReviews += 1;
  }
  
  return this.save();
};

// Método para verificar se produto é seguro para usuário
productSchema.methods.isSafeForUser = function(userRestrictions) {
  const warnings = [];
  
  // Verificar alérgenos
  this.allergens.forEach(allergen => {
    if (allergen.present && userRestrictions.includes(allergen.name.toLowerCase())) {
      warnings.push({
        type: 'allergen',
        message: `Contém ${allergen.name}`,
        severity: 'danger'
      });
    } else if (allergen.traces && userRestrictions.includes(allergen.name.toLowerCase())) {
      warnings.push({
        type: 'allergen',
        message: `Pode conter traços de ${allergen.name}`,
        severity: 'warning'
      });
    }
  });
  
  // Verificar açúcar para diabéticos
  if (userRestrictions.includes('diabetes') && !this.isSafeForDiabetics) {
    warnings.push({
      type: 'diabetes',
      message: 'Alto teor de açúcar',
      severity: this.nutritionalInfo.sugar > 20 ? 'danger' : 'warning'
    });
  }
  
  // Verificar sódio para hipertensos
  if (userRestrictions.includes('hypertension') && !this.isSafeForHypertensive) {
    warnings.push({
      type: 'hypertension',
      message: 'Alto teor de sódio',
      severity: this.nutritionalInfo.sodium > 400 ? 'danger' : 'warning'
    });
  }
  
  return {
    safe: warnings.length === 0,
    warnings,
    risk: warnings.length > 0 && warnings.some(w => w.severity === 'danger') ? 'avoid' : 'caution'
  };
};

// Método estático para buscar produtos populares
productSchema.statics.getPopularProducts = function(limit = 10) {
  return this.find({ isActive: true, verified: true })
    .sort({ scanCount: -1 })
    .limit(limit)
    .populate('quality.reviews.user', 'name');
};

// Método estático para buscar produtos por categoria
productSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ 
    category, 
    isActive: true, 
    verified: true 
  })
  .sort({ scanCount: -1 })
  .limit(limit)
  .populate('quality.reviews.user', 'name');
};

// Método estático para buscar produtos sem alérgenos específicos
productSchema.statics.getSafeForRestrictions = function(restrictions, limit = 20) {
  const allergenQuery = restrictions.map(restriction => ({
    $or: [
      { 'allergens.name': restriction, 'allergens.present': false },
      { 'allergens.name': { $ne: restriction } }
    ]
  }));
  
  return this.find({
    $and: allergenQuery,
    isActive: true,
    verified: true
  })
  .sort({ scanCount: -1 })
  .limit(limit)
  .populate('quality.reviews.user', 'name');
};

module.exports = mongoose.model('Product', productSchema);
