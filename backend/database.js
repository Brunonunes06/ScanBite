// Banco de dados em memória para ambiente de teste
// Simula MongoDB com armazenamento local

const fs = require('fs');
const path = require('path');

class SimpleDatabase {
  constructor() {
    this.data = {
      users: [],
      scans: [],
      products: [],
      payments: [],
      subscriptions: []
    };
    this.dataFile = path.join(__dirname, 'test-data.json');
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileData = fs.readFileSync(this.dataFile, 'utf8');
        this.data = JSON.parse(fileData);
      }
    } catch (error) {
      console.log('Criando novo banco de dados de teste...');
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  // Métodos para usuários
  async createUser(userData) {
    const user = {
      _id: this.generateId(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  async findUserByEmail(email) {
    return this.data.users.find(user => user.email === email);
  }

  async findUserById(id) {
    return this.data.users.find(user => user._id === id);
  }

  async updateUser(id, updateData) {
    const userIndex = this.data.users.findIndex(user => user._id === id);
    if (userIndex !== -1) {
      this.data.users[userIndex] = {
        ...this.data.users[userIndex],
        ...updateData,
        updatedAt: new Date()
      };
      this.saveData();
      return this.data.users[userIndex];
    }
    return null;
  }

  // Métodos para scans
  async createScan(scanData) {
    const scan = {
      _id: this.generateId(),
      ...scanData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.scans.push(scan);
    this.saveData();
    return scan;
  }

  async findScansByUserId(userId, page = 1, limit = 10) {
    const userScans = this.data.scans.filter(scan => scan.user === userId);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      scans: userScans.slice(startIndex, endIndex),
      pages: Math.ceil(userScans.length / limit),
      total: userScans.length
    };
  }

  async findScanById(id) {
    return this.data.scans.find(scan => scan._id === id);
  }

  async deleteScan(id) {
    const scanIndex = this.data.scans.findIndex(scan => scan._id === id);
    if (scanIndex !== -1) {
      this.data.scans.splice(scanIndex, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Métodos para produtos
  async createProduct(productData) {
    const product = {
      _id: this.generateId(),
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.products.push(product);
    this.saveData();
    return product;
  }

  async findProductById(id) {
    return this.data.products.find(product => product._id === id);
  }

  async findProductByBarcode(barcode) {
    return this.data.products.find(product => product.barcode === barcode);
  }

  async findProducts(filters = {}) {
    let products = [...this.data.products];
    
    if (filters.category) {
      products = products.filter(product => product.category === filters.category);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm)
      );
    }
    
    return products;
  }

  // Métodos para pagamentos
  async createPayment(paymentData) {
    const payment = {
      _id: this.generateId(),
      ...paymentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.payments.push(payment);
    this.saveData();
    return payment;
  }

  async findPaymentById(id) {
    return this.data.payments.find(payment => payment._id === id);
  }

  async updatePayment(id, updateData) {
    const paymentIndex = this.data.payments.findIndex(payment => payment._id === id);
    if (paymentIndex !== -1) {
      this.data.payments[paymentIndex] = {
        ...this.data.payments[paymentIndex],
        ...updateData,
        updatedAt: new Date()
      };
      this.saveData();
      return this.data.payments[paymentIndex];
    }
    return null;
  }

  // Métodos para assinaturas
  async createSubscription(subscriptionData) {
    const subscription = {
      _id: this.generateId(),
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.subscriptions.push(subscription);
    this.saveData();
    return subscription;
  }

  async findSubscriptionById(id) {
    return this.data.subscriptions.find(subscription => subscription._id === id);
  }

  async updateSubscription(id, updateData) {
    const subscriptionIndex = this.data.subscriptions.findIndex(subscription => subscription._id === id);
    if (subscriptionIndex !== -1) {
      this.data.subscriptions[subscriptionIndex] = {
        ...this.data.subscriptions[subscriptionIndex],
        ...updateData,
        updatedAt: new Date()
      };
      this.saveData();
      return this.data.subscriptions[subscriptionIndex];
    }
    return null;
  }

  // Utilitários
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Seed inicial para teste
  async seedTestData() {
    if (this.data.users.length === 0) {
      // Criar usuário de teste
      const testUser = await this.createUser({
        name: 'Bruno Gabriel',
        email: 'Bruno@exemplo.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', // password123
        isPremium: false,
        dietaryRestrictions: ['gluten', 'lactose'],
        preferences: {
          language: 'pt-BR',
          notifications: 'all'
        },
        stats: {
          totalScans: 0,
          safeProducts: 0,
          warningProducts: 0,
          dangerProducts: 0
        }
      });

      // Criar produtos de teste
      const testProducts = [
        {
          name: 'Biscoito Recheado Chocolate',
          brand: 'Nestlé',
          barcode: '7891000123456',
          category: 'biscoitos',
          ingredients: ['farinha de trigo', 'açúcar', 'gordura vegetal', 'cacau', 'leite em pó'],
          allergens: ['glúten', 'lactose'],
          nutritionalInfo: {
            calories: 150,
            protein: 2,
            carbs: 20,
            fat: 7,
            sodium: 50
          },
          warnings: ['contém glúten', 'contém lactose'],
          safetyRating: 'caution'
        },
        {
          name: 'Maçã Gala',
          brand: 'Natureza',
          barcode: '7891000123457',
          category: 'frutas',
          ingredients: ['maçã'],
          allergens: [],
          nutritionalInfo: {
            calories: 52,
            protein: 0.3,
            carbs: 14,
            fat: 0.2,
            sodium: 1
          },
          warnings: [],
          safetyRating: 'safe'
        }
      ];

      for (const productData of testProducts) {
        await this.createProduct(productData);
      }

      console.log('Dados de teste criados com sucesso!');
      console.log('Usuário de teste: Bruno@exemplo.com / password123');
    }
  }

  // Salvar mensagem de contato
  async saveContactMessage(message) {
    this.data.contactMessages = this.data.contactMessages || [];
    this.data.contactMessages.push(message);
    this.saveData();
    return message;
  }

  // Buscar mensagens de contato
  async getContactMessages() {
    return this.data.contactMessages || [];
  }

  // Limpar dados de teste
  clearData() {
    this.data = {
      users: [],
      scans: [],
      products: [],
      contactMessages: []
    };
    this.saveData();
    console.log('Banco de dados limpo!');
  }
}

module.exports = SimpleDatabase;
