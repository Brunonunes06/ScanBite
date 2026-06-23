/**
 * payment-integration.js
 * Camada de integração e fallback automático para payment manager
 * Conecta payment.html -> payment-manager.js -> payment-brazil.js
 * Com fallback para payment-mock.js quando servidor está offline
 */

class PaymentIntegration {
  constructor() {
    this.manager = null;
    this.mock = null;
    this.isServerAvailable = false;
    this.usesMockData = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    try {
      // Verificar se o servidor está disponível
      const healthCheck = await this.checkServerHealth();
      this.isServerAvailable = healthCheck;

      if (healthCheck) {
        console.log('✓ Servidor de pagamento disponível');
        this.manager = paymentManager;
        this.usesMockData = false;
      } else {
        console.warn('⚠ Servidor de pagamento indisponível. Usando modo de teste.');
        this.mock = paymentMockService;
        this.usesMockData = true;
      }
    } catch (error) {
      console.error('✗ Erro ao inicializar sistema de pagamento:', error);
      this.mock = paymentMockService;
      this.usesMockData = true;
    }
  }

  async checkServerHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:5000/api/health', {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Servidor de pagamento não respondeu (timeout)');
      } else {
        console.warn('Servidor de pagamento indisponível');
      }
      return false;
    }
  }

  async ensureInitialized() {
    await this.initPromise;
  }

  // ── Métodos públicos ────────────────────────────────────

  async getPaymentMethods() {
    await this.ensureInitialized();

    if (this.usesMockData) {
      return this.mock.getMockPaymentMethods();
    }
    return this.manager.getPaymentMethods();
  }

  async generatePIX(amount, description) {
    await this.ensureInitialized();

    if (this.usesMockData) {
      return this.mock.generateMockPIX(amount, description);
    }
    return this.manager.generatePIX(amount, description);
  }

  async generateBoleto(amount, address) {
    await this.ensureInitialized();

    if (this.usesMockData) {
      const customerInfo = await this.manager.getCustomerInfo();
      return this.mock.generateMockBoleto(amount, { ...customerInfo, address });
    }
    return this.manager.generateBoleto(amount, address);
  }

  async processCardPayment(token, amount, installments) {
    await this.ensureInitialized();

    if (this.usesMockData) {
      return this.mock.processMockCardPayment(token, amount, installments);
    }
    return this.manager.processCardPayment(token, amount, installments);
  }

  async getPaymentStatus(paymentId) {
    await this.ensureInitialized();

    if (this.usesMockData) {
      return this.mock.getMockPaymentStatus(paymentId);
    }
    return this.manager.getPaymentStatus(paymentId);
  }

  async getCustomerInfo() {
    await this.ensureInitialized();
    if (this.usesMockData) {
      if (this.mock.getMockCustomerInfo) {
        return await this.mock.getMockCustomerInfo();
      }

      // Fallback: pegar primeiro usuário mock
      if (this.mock && this.mock.mockUsers) {
        const keys = Object.keys(this.mock.mockUsers);
        const u = this.mock.mockUsers[keys[0]] || {};
        return {
          name: u.name || 'Cliente',
          email: u.email || '',
          cpf: u.cpf || ''
        };
      }

      return { name: 'Cliente', email: '', cpf: '' };
    }

    return await this.manager.getCustomerInfo();
  }

  async validateCPF(cpf) {
    await this.ensureInitialized();

    // Usar o validador do manager quando disponível
    if (!this.usesMockData && this.manager && typeof this.manager.validateCPF === 'function') {
      return this.manager.validateCPF(cpf);
    }

    // Validação simples local (fallback para mock)
    const digits = String(cpf).replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let first = (sum * 10) % 11;
    if (first === 10 || first === 11) first = 0;
    if (first !== parseInt(digits[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    let second = (sum * 10) % 11;
    if (second === 10 || second === 11) second = 0;
    return second === parseInt(digits[10]);
  }

    

  async getTransactionHistory(limit = 10) {
    await this.ensureInitialized();

    if (this.usesMockData) {
      if (this.mock && typeof this.mock.getMockTransactionHistory === 'function') {
        return this.mock.getMockTransactionHistory(limit);
      }
      return [];
    }

    if (this.manager && typeof this.manager.getTransactionHistory === 'function') {
      return await this.manager.getTransactionHistory(limit);
    }

    return [];
  }

  isUsingMockData() {
    return this.usesMockData;
  }

  async getStatus() {
    await this.ensureInitialized();

    return {
      serverAvailable: this.isServerAvailable,
      usingMockData: this.usesMockData,
      message: this.usesMockData 
        ? 'Usando modo de teste com dados fictícios'
        : 'Sistema de pagamento conectado ao servidor'
    };
  }
}

// Instância global de integração
let paymentIntegration;

if (typeof window !== 'undefined') {
  // Aguardar que ambos payment-manager.js e payment-mock.js sejam carregados
  const initPaymentIntegration = () => {
    if (typeof paymentManager !== 'undefined' && typeof paymentMockService !== 'undefined') {
      paymentIntegration = new PaymentIntegration();
      console.log('✓ Payment Integration inicializada');
    } else {
      // Tentar novamente em 100ms
      setTimeout(initPaymentIntegration, 100);
    }
  };

  // Iniciar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaymentIntegration);
  } else {
    setTimeout(initPaymentIntegration, 100);
  }
}
