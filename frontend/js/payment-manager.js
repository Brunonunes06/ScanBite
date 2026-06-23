/**
 * payment-manager.js
 * Gerencia pagamentos via PIX, Boleto e Cartão (Mercado Pago)
 * Integra o payment-brazil.js com o frontend
 */

class PaymentManager {
  constructor() {
    this.apiBase = 'http://localhost:5000/api/payment';
    this.token = localStorage.getItem('nutriScanToken');
    this.user = null;
  }

  // ── PIX ──────────────────────────────────────────────────
  async generatePIX(amount, description = '') {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) throw new Error('Dados do cliente não encontrados');

      const response = await fetch(`${this.apiBase}/pix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          amount,
          description: description || 'Assinatura Premium Safe-Bite',
          customerInfo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao gerar PIX');
      }

      // Garantir que exista um QR Code para exibição no cliente.
      try {
        const payment = data.payment || {};

        if (!payment.qrCode && payment.pixCode) {
          // Tentar gerar via qrCodeGenerator se disponível
          if (typeof qrCodeGenerator !== 'undefined') {
            try {
              await qrCodeGenerator.loadLibrary();
              if (qrCodeGenerator.isLibraryLoaded()) {
                payment.qrCode = await qrCodeGenerator.generatePixQRCode(payment.pixCode);
              } else {
                // fallback para API externa
                const encoded = encodeURIComponent(payment.pixCode);
                payment.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&color=2ecc71&bgcolor=ffffff`;
              }
            } catch (e) {
              const encoded = encodeURIComponent(payment.pixCode);
              payment.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&color=2ecc71&bgcolor=ffffff`;
            }
          } else {
            const encoded = encodeURIComponent(payment.pixCode);
            payment.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&color=2ecc71&bgcolor=ffffff`;
          }
        }

        return payment;
      } catch (err) {
        console.warn('Erro ao garantir QR Code localmente:', err);
        return data.payment;
      }
    } catch (error) {
      console.error('[PIX] Erro:', error);
      throw error;
    }
  }

  // ── BOLETO ───────────────────────────────────────────────
  async generateBoleto(amount, address = '') {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) throw new Error('Dados do cliente não encontrados');

      if (!address) {
        throw new Error('Endereço é obrigatório para boleto');
      }

      customerInfo.address = address;

      const response = await fetch(`${this.apiBase}/boleto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          amount,
          customerInfo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao gerar boleto');
      }

      return data.payment;
    } catch (error) {
      console.error('[BOLETO] Erro:', error);
      throw error;
    }
  }

  // ── CARTÃO ───────────────────────────────────────────────
  async processCardPayment(token, amount, installments = 1) {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) throw new Error('Dados do cliente não encontrados');

      const response = await fetch(`${this.apiBase}/card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          token,
          amount,
          installments,
          email: customerInfo.email,
          cpf: customerInfo.cpf,
          name: customerInfo.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar cartão');
      }

      return data.payment;
    } catch (error) {
      console.error('[CARD] Erro:', error);
      throw error;
    }
  }

  // ── VERIFICAR STATUS ─────────────────────────────────────
  async getPaymentStatus(paymentId) {
    try {
      const response = await fetch(`${this.apiBase}/${paymentId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao verificar status');
      }

      return data.payment;
    } catch (error) {
      console.error('[STATUS] Erro:', error);
      throw error;
    }
  }

  // ── OBTER MÉTODOS DISPONÍVEIS ────────────────────────────
  async getPaymentMethods() {
    try {
      const response = await fetch(`${this.apiBase}/methods`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao obter métodos de pagamento');
      }

      return data.methods;
    } catch (error) {
      console.error('[METHODS] Erro:', error);
      // Retornar métodos fictícios como fallback
      return this.getMockPaymentMethods();
    }
  }

  // ── VALIDAR CPF ──────────────────────────────────────────
  validateCPF(cpf) {
    const digits = cpf.replace(/\D/g, '');
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

  // ── OBTER INFORMAÇÕES DO CLIENTE ─────────────────────────
  async getCustomerInfo() {
    try {
      if (!this.user) {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Usuário não autenticado');
        }

        const data = await response.json();
        this.user = data.user;
      }

      return {
        name: this.user.name || 'Cliente',
        email: this.user.email || '',
        cpf: this.user.cpf || localStorage.getItem('userCpf') || ''
      };
    } catch (error) {
      console.error('[CUSTOMER INFO] Erro:', error);
      return null;
    }
  }

  // ── MOCK: Métodos de pagamento fictícios ──────────────────
  getMockPaymentMethods() {
    return [
      { id: 'pix', name: 'PIX', processingTime: 'Instantâneo' },
      { id: 'boleto', name: 'Boleto', processingTime: '1–3 dias úteis' },
      { id: 'card', name: 'Cartão', processingTime: 'Instantâneo' }
    ];
  }


  // ── MOCK: Boleto fictício ────────────────────────────────
  getMockBoletoResponse(amount) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    return {
      id: `boleto_${Date.now()}`,
      status: 'pending',
      amount: amount,
      barcodeNumber: '12345.67890 12345.678901 12345.678901 1 12345678901234',
      digitableLine: '12345.67890 12345.678901 12345.678901 1 12345678901234',
      boletoUrl: 'https://example.com/boleto',
      dueDate: dueDate.toISOString(),
      beneficiary: { name: 'Safe-Bite Ltda' },
      instructions: [
        'Pague em qualquer banco, lotérica ou app de pagamento.',
        'Não pague após o vencimento sem verificar a correção monetária.',
        'O boleto pode levar até 3 dias úteis para compensar.'
      ]
    };
  }

  // ── MOCK: Cartão fictício ────────────────────────────────
  getMockCardResponse() {
    return {
      id: `card_${Date.now()}`,
      status: 'approved',
      statusDetail: 'Pagamento aprovado com sucesso'
    };
  }
}

// Instância global
let paymentManager;
if (typeof window !== 'undefined') {
  paymentManager = new PaymentManager();
}
