const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Nome do produto não pode ter mais de 100 caracteres']
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [50, 'Marca não pode ter mais de 50 caracteres']
    },
    barcode: String,
    category: {
      type: String,
      enum: [
        'biscoitos', 'chocolates', 'doces', 'salgados', 'bebidas',
        'laticinios', 'carnes', 'frutas', 'vegetais', 'graos',
        'massas', 'molhos', 'congelados', 'enlatados', 'outros'
      ]
    },
    image: {
      url: String,
      publicId: String,
      originalName: String
    }
  },
  analysis: {
    ingredients: [{
      name: {
        type: String,
        required: true
      },
      risk: {
        type: String,
        enum: ['safe', 'warning', 'danger'],
        required: true
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      amount: String,
      unit: String
    }],
    allergens: [{
      name: {
        type: String,
        required: true
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
      },
      detected: {
        type: Boolean,
        default: false
      }
    }],
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number,
      sodium: Number,
      sugar: Number,
      servingSize: String,
      unit: String
    },
    overallRisk: {
      type: String,
      enum: ['safe', 'caution', 'avoid'],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    processingTime: {
      type: Number,
      required: true // em segundos
    }
  },
  alerts: [{
    type: {
      type: String,
      enum: ['allergen', 'diabetes', 'hypertension', 'general'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'danger'],
      required: true
    },
    userRestriction: String
  }],
  recommendations: [{
    type: {
      type: String,
      enum: ['avoid', 'limit', 'alternative', 'safe'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    alternativeProduct: String
  }],
  userFeedback: {
    helpful: {
      type: Boolean,
      default: null
    },
    comments: String,
    reported: {
      type: Boolean,
      default: false
    }
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  device: {
    type: {
      type: String,
      enum: ['mobile', 'web', 'api']
    },
    userAgent: String,
    ip: String
  },
  isActive: {
    type: Boolean,
    default: true
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
scanSchema.index({ user: 1, createdAt: -1 });
scanSchema.index({ 'product.barcode': 1 });
scanSchema.index({ 'analysis.overallRisk': 1 });
scanSchema.index({ createdAt: -1 });

// Virtuals
scanSchema.virtual('isHighRisk').get(function() {
  return this.analysis.overallRisk === 'avoid';
});

scanSchema.virtual('hasAlerts').get(function() {
  return this.alerts.length > 0;
});

// Método para gerar alertas baseado nas restrições do usuário
scanSchema.methods.generateAlerts = function(userRestrictions) {
  const alerts = [];
  
  // Verificar alérgenos
  this.analysis.allergens.forEach(allergen => {
    if (allergen.detected && userRestrictions.includes(allergen.name.toLowerCase())) {
      alerts.push({
        type: 'allergen',
        message: `ALERTA: ${allergen.name} detectado! Este produto não é seguro para você.`,
        severity: allergen.severity === 'critical' ? 'danger' : 'warning',
        userRestriction: allergen.name
      });
    }
  });
  
  // Verificar açúcar para diabéticos
  if (userRestrictions.includes('diabetes') && this.analysis.nutritionalInfo.sugar > 15) {
    alerts.push({
      type: 'diabetes',
      message: 'ALERTA: Alto teor de açúcar. Não recomendado para diabéticos.',
      severity: 'danger',
      userRestriction: 'diabetes'
    });
  }
  
  // Verificar sódio para hipertensos
  if (userRestrictions.includes('hypertension') && this.analysis.nutritionalInfo.sodium > 400) {
    alerts.push({
      type: 'hypertension',
      message: 'ALERTA: Alto teor de sódio. Consuma com moderação.',
      severity: 'warning',
      userRestriction: 'hypertension'
    });
  }
  
  this.alerts = alerts;
  return this.save();
};

// Método para gerar recomendações
scanSchema.methods.generateRecommendations = function() {
  const recommendations = [];
  
  // Baseado no risco geral
  if (this.analysis.overallRisk === 'avoid') {
    recommendations.push({
      type: 'avoid',
      message: 'Este produto não é recomendado para consumo.',
      alternativeProduct: 'Procure alternativas sem os ingredientes identificados.'
    });
  } else if (this.analysis.overallRisk === 'caution') {
    recommendations.push({
      type: 'limit',
      message: 'Consuma este produto com moderação.',
      alternativeProduct: 'Considere opções mais saudáveis.'
    });
  }
  
  // Baseado no açúcar
  if (this.analysis.nutritionalInfo.sugar > 10) {
    recommendations.push({
      type: 'alternative',
      message: 'Alto teor de açúcar detectado.',
      alternativeProduct: 'Procure versões sem açúcar ou light.'
    });
  }
  
  // Baseado em fibras
  if (this.analysis.nutritionalInfo.fiber < 2) {
    recommendations.push({
      type: 'alternative',
      message: 'Baixo teor de fibras.',
      alternativeProduct: 'Prefira produtos integrais ricos em fibras.'
    });
  }
  
  this.recommendations = recommendations;
  return this.save();
};

// Método estático para obter estatísticas do usuário
scanSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalScans: { $sum: 1 },
        highRiskScans: {
          $sum: { $cond: [{ $eq: ['$analysis.overallRisk', 'avoid'] }, 1, 0] }
        },
        avgProcessingTime: { $avg: '$analysis.processingTime' },
        mostScannedCategory: {
          $first: {
            $arrayToObject: [
              [{ k: '$product.category', v: 1 }]
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Scan', scanSchema);
