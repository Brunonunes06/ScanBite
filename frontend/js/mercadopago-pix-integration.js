/**
 * Integração com Mercado Pago - QR Code PIX
 * Gera QR Codes para pagamentos PIX usando a API do Mercado Pago
 */

class MercadoPagoPixIntegration {
  constructor() {
    this.accessToken = localStorage.getItem('mercadopagoToken') || null;
    this.userId = localStorage.getItem('mercadopagoUserId') || null;
    this.baseURL = 'https://api.mercadopago.com/v1';
    this.publicKey = null;
    this.init();
  }

  /**
   * Inicializar e configurar a integração
   */
  async init() {
    try {
      // Carrega configuração do backend
      const response = await fetch('/api/payment/mercadopago-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}`
        }
      });
      
      if (response.ok) {
        const config = await response.json();
        this.publicKey = config.publicKey;
      }
    } catch (error) {
      console.warn('Não foi possível carregar configuração do Mercado Pago:', error);
    }
  }

  /**
   * Gerar QR Code PIX via API do Mercado Pago
   * @param {number} amount - Valor da transação
   * @param {string} description - Descrição do pagamento
   * @param {object} customer - Dados do cliente
   * @returns {Promise<object>} QR Code e dados do pagamento
   */
  async generatePixQRCode(amount, description, customer) {
    try {
      // Validar dados obrigatórios
      if (!amount || amount <= 0) {
        throw new Error('Valor deve ser maior que 0');
      }

      if (!customer || !customer.email) {
        throw new Error('Email do cliente é obrigatório');
      }

      // Enviar requisição para backend que integrará com Mercado Pago
      const response = await fetch('/api/payment/mercadopago-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}`
        },
        body: JSON.stringify({
          amount,
          description: description || 'Pagamento Safe-Bite',
          customerInfo: {
            name: customer.name || 'Cliente',
            email: customer.email,
            cpf: customer.cpf || null,
            phone: customer.phone || null
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar QR Code');
      }

      const data = await response.json();
      return this.formatPixResponse(data);
    } catch (error) {
      console.error('Erro ao gerar QR Code PIX:', error);
      throw error;
    }
  }

  /**
   * Formatar resposta do Mercado Pago
   */
  formatPixResponse(data) {
    return {
      success: true,
      type: 'pix',
      provider: 'mercadopago',
      qrCode: data.qr_code || data.qrCode,
      qrImage: data.qr_image || data.qrImage,
      copyPaste: data.qr_code || data.qrCode,
      transactionId: data.id || data.transaction_id,
      amount: data.amount,
      status: 'pending',
      expiresAt: data.expires_at || new Date(Date.now() + 3600000),
      createdAt: new Date(),
      paymentLink: data.payment_link || null
    };
  }

  /**
   * Verificar status do pagamento
   */
  async checkPixStatus(transactionId) {
    try {
      const response = await fetch(`/api/payment/mercadopago-pix/${transactionId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar status do pagamento');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      throw error;
    }
  }

  /**
   * Monitorar pagamento com webhook
   */
  setupWebhookListener(transactionId, callback) {
    const checkInterval = setInterval(async () => {
      try {
        const status = await this.checkPixStatus(transactionId);
        
        if (status.status === 'paid' || status.status === 'approved') {
          clearInterval(checkInterval);
          callback({ success: true, status: 'paid', data: status });
        }
      } catch (error) {
        console.error('Erro ao verificar webhook:', error);
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => clearInterval(checkInterval);
  }

  /**
   * Criar pagamento com checkout redirect
   */
  async createCheckoutPreference(items, payerInfo) {
    try {
      const response = await fetch('/api/payment/mercadopago-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}`
        },
        body: JSON.stringify({
          items,
          payer: payerInfo,
          auto_return: 'approved'
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar preferência de checkout');
      }

      const data = await response.json();
      return {
        success: true,
        checkoutUrl: data.init_point,
        preferenceId: data.id
      };
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      throw error;
    }
  }

  /**
   * Listar métodos de pagamento disponíveis
   */
  async getPaymentMethods() {
    try {
      const response = await fetch('/api/payment/methods', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao listar métodos de pagamento');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao listar métodos:', error);
      throw error;
    }
  }

  /**
   * Copiar código PIX para clipboard
   */
  copyPixCode(pixCode) {
    try {
      navigator.clipboard.writeText(pixCode);
      return { success: true, message: 'Código PIX copiado!' };
    } catch (error) {
      console.error('Erro ao copiar:', error);
      return { success: false, message: 'Erro ao copiar código' };
    }
  }

  /**
   * Baixar QR Code como imagem
   */
  downloadQRCode(qrImageUrl, fileName = 'qrcode-pix.png') {
    try {
      const link = document.createElement('a');
      link.href = qrImageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true, message: 'QR Code baixado!' };
    } catch (error) {
      console.error('Erro ao baixar QR Code:', error);
      return { success: false, message: 'Erro ao baixar QR Code' };
    }
  }
}

// Instância global
const mercadoPagoPixService = new MercadoPagoPixIntegration();
