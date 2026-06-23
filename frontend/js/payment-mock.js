/**
 * payment-mock.js
 * Script de testes com dados reais de teste do Mercado Pago
 * Use quando o servidor não está disponível
 */

class PaymentMockService {
  constructor() {
    this.transactions = [];
    this.mockUsers = {
      'TESTUSER2312961698484744720': {
        id: '3426677436',
        name: 'Comprador Teste',
        email: 'TESTUSER2312961698484744720@testuser.com',
        cpf: '123.456.789-09',
        subscription: 'free'
      }
    };
  }

  // ── Mock: Simular resposta dos métodos de pagamento ───────
  async getMockPaymentMethods() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          methods: [
            { id: 'pix', name: 'PIX', processingTime: 'Instantâneo' },
            { id: 'boleto', name: 'Boleto', processingTime: '1–3 dias úteis' },
            { id: 'card', name: 'Cartão', processingTime: 'Instantâneo' }
          ]
        });
      }, 500);
    });
  }

  // ── Mock: Simular geração de PIX ─────────────────────────
  async generateMockPIX(amount, description) {
    const pixId = `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pixCode = this.generatePixCode();
    
    // Usar image.png como QR Code estático
    const qrCode = 'qr-code-pix.png';
    
    const pixData = {
      success: true,
      payment: {
        id: pixId,
        status: 'pending',
        amount: parseFloat(amount),
        qrCode: qrCode,
        pixCode: pixCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        description: description || 'Assinatura Premium Safe-Bite',
        createdAt: new Date().toISOString()
      }
    };

    this.transactions.push(pixData.payment);

    return new Promise((resolve) => {
      setTimeout(() => resolve(pixData.payment), 1000);
    });
  }

  // ── Mock: Simular geração de Boleto ──────────────────────
  async generateMockBoleto(amount, customerInfo) {
    const boletoId = `boleto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const boletoData = {
      success: true,
      payment: {
        id: boletoId,
        status: 'pending',
        amount: parseFloat(amount),
        barcodeNumber: this.generateBarcodeNumber(),
        digitableLine: this.generateDigitableLine(),
        boletoUrl: `https://example.com/boleto/${boletoId}`,
        dueDate: dueDate.toISOString(),
        beneficiary: {
          name: 'Safe-Bite',
          cnpj: '12.345.678/0001-90',
          bank: 'Mercado Pago'
        },
        payer: customerInfo,
        instructions: [
          'Pague em qualquer banco, lotérica ou app de pagamento.',
          'Não pague após o vencimento sem verificar a correção monetária.',
          'O boleto pode levar até 3 dias úteis para compensar.',
          'Quaisquer dúvidas, entre em contato conosco.'
        ],
        createdAt: new Date().toISOString()
      }
    };

    this.transactions.push(boletoData.payment);

    return new Promise((resolve) => {
      setTimeout(() => resolve(boletoData.payment), 1500);
    });
  }

  // ── Mock: Simular processamento de Cartão ────────────────
  async processMockCardPayment(cardToken, amount, installments) {
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simular aprovação / rejeição
    const isApproved = Math.random() > 0.1; // 90% de chance de aprovação

    const cardData = {
      success: isApproved,
      payment: {
        id: cardId,
        status: isApproved ? 'approved' : 'rejected',
        statusDetail: isApproved 
          ? 'Pagamento aprovado com sucesso! Processando assinatura...'
          : 'Cartão recusado. Verifique os dados e tente novamente.',
        amount: parseFloat(amount),
        installments: parseInt(installments) || 1,
        installmentAmount: (parseFloat(amount) / (parseInt(installments) || 1)).toFixed(2),
        lastFourDigits: cardToken.slice(-4),
        authorizationCode: this.generateAuthorizationCode(),
        createdAt: new Date().toISOString()
      }
    };

    this.transactions.push(cardData.payment);

    return new Promise((resolve) => {
      // Simular delay de processamento
      setTimeout(() => {
        resolve(cardData.payment);
      }, 2000);
    });
  }

  // ── Mock: Verificar status de pagamento ──────────────────
  async getMockPaymentStatus(paymentId) {
    const transaction = this.transactions.find(t => t.id === paymentId);

    if (!transaction) {
      return {
        success: false,
        message: 'Pagamento não encontrado',
        payment: {
          id: paymentId,
          status: 'not_found'
        }
      };
    }

    // Simular mudança de status ao longo do tempo
    let status = transaction.status;
    
    if (transaction.status === 'pending') {
      // Aleatoriamente marcar como pago após alguns segundos
      if (Math.random() > 0.5) {
        status = 'paid';
        transaction.status = 'paid';
        transaction.paidAt = new Date().toISOString();
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          payment: {
            id: paymentId,
            status: status,
            statusDetail: this.getStatusDescription(status),
            amount: transaction.amount,
            method: transaction.id.split('_')[0],
            createdAt: transaction.createdAt,
            paidAt: transaction.paidAt || null
          }
        });
      }, 800);
    });
  }

  // ── Mock: Obter histórico de transações ───────────────────
  getMockTransactionHistory(limit = 10) {
    return this.transactions.slice(-limit).reverse().map(t => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      method: t.id.split('_')[0].toUpperCase(),
      createdAt: t.createdAt,
      description: t.description || 'Assinatura'
    }));
  }

  // ── Helpers ──────────────────────────────────────────────

  generateQRCodeBase64Fallback() {
    // Retorna um PNG simples em base64 (fallback)
    return 'https://media.discordapp.net/attachments/1393084275993346170/1510374121760886955/image.png?ex=6a1c9504&is=6a1b4384&hm=7f013aee65e8fbd9783a2737f4a4570cb3786c462c0df628630885f117a6a9db&=&format=webp&quality=lossless';
  }

  async generatePixQRCodeAlternative(pixCode) {
    // Gera QR Code via API externa (funciona offline com cache)
    try {
      const encodedCode = encodeURIComponent(pixCode);
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedCode}&color=2ecc71&bgcolor=ffffff`;
    } catch (error) {
      console.warn('Erro ao gerar QR Code alternativo:', error);
      return this.generateQRCodeBase64Fallback();
    }
  }

  generateQRCodeBase64() {
    // Retorna um PNG simples em base64 (placeholderImage)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  generatePixCode() {
    // Gera código PIX real de teste do Mercado Pago
    // Formato: chave PIX + dados da transação
    const pixKey = 'myhpc3301@gmail.com';
    const transactionId = `MP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const amount = '0000000000990'; // R$ 9,90 em formato PIX
    
    // VALOR DO PIX
    return `00020126360014br.gov.bcb.pix0114+554499736812952040000530398654049.905802BR5924Bruno Perandre Nunes Dos6009Sao Paulo62240520daqr339692014808645263042248`;
  }

  generateQRCodeBase64Fallback() {
    // Usa a imagem image.png como QR Code do PIX
    return 'image.png';
  }

  generateBarcodeNumber() {
    // Formato: XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXX
    const numbers = Array(47).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
    const formatted = [
      numbers.slice(0, 5),
      numbers.slice(5, 10),
      numbers.slice(10, 15),
      numbers.slice(15, 21),
      numbers.slice(21, 26),
      numbers.slice(26, 32),
      numbers.slice(32, 37),
      numbers.slice(37, 38),
      numbers.slice(38, 47)
    ].join('.');

    return formatted;
  }

  generateDigitableLine() {
    return this.generateBarcodeNumber(); // Mesmo formato neste mock
  }

  generateAuthorizationCode() {
    return 'AUTH' + Date.now().toString().slice(-6);
  }

  getStatusDescription(status) {
    const descriptions = {
      'approved': 'Pagamento aprovado com sucesso',
      'pending': 'Pagamento pendente de confirmação',
      'paid': 'Pagamento confirmado e processado',
      'rejected': 'Pagamento recusado',
      'cancelled': 'Pagamento cancelado',
      'expired': 'Pagamento expirou',
      'refunded': 'Pagamento reembolsado'
    };

    return descriptions[status] || 'Status desconhecido';
  }

  // ── Mock: Simular erro de conexão ────────────────────────
  async simulateServerError(errorType = 'ECONNREFUSED') {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const error = new Error(`Erro de conexão: ${errorType}`);
        error.code = errorType;
        reject(error);
      }, 500);
    });
  }

  // ── Mock: Simular webhook de pagamento ───────────────────
  async processWebhookMock(paymentId) {
    const transaction = this.transactions.find(t => t.id === paymentId);
    
    if (transaction) {
      transaction.status = 'paid';
      transaction.paidAt = new Date().toISOString();
      
      return {
        success: true,
        message: 'Webhook recebido e processado',
        payment: transaction
      };
    }

    return {
      success: false,
      message: 'Pagamento não encontrado para webhook'
    };
  }
}

// Instância global do serviço de mock
let paymentMockService;
if (typeof window !== 'undefined') {
  paymentMockService = new PaymentMockService();
}

  // Retornar informações de cliente mock (utilitário)
  PaymentMockService.prototype.getMockCustomerInfo = async function() {
    const keys = Object.keys(this.mockUsers || {});
    const u = this.mockUsers[keys[0]] || {};
    return {
      name: u.name || 'Comprador Teste',
      email: u.email || 'TESTUSER2312961698484744720@testuser.com',
      cpf: u.cpf || '123.456.789-09'
    };
  };

// Exemplo de uso:
/*
// Gerar PIX fictício
const pixPayment = await paymentMockService.generateMockPIX(9.90, 'Assinatura Premium');
console.log('PIX gerado:', pixPayment);

// Processar cartão fictício
const cardPayment = await paymentMockService.processMockCardPayment('4111111111111111', 9.90, 1);
console.log('Cartão processado:', cardPayment);

// Verificar status
const status = await paymentMockService.getMockPaymentStatus(pixPayment.id);
console.log('Status:', status);

// Histórico
console.log('Histórico:', paymentMockService.getMockTransactionHistory());
*/
