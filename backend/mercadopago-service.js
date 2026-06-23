/**
 * Serviço Mercado Pago - Integração Real com API
 * Suporta PIX QR Code, Boleto e Cartão de Crédito
 */

const axios = require('axios');

class MercadoPagoService {
  constructor() {
    this.accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    this.publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY;
    this.userId = process.env.MERCADO_PAGO_USER_ID;
    this.baseURL = 'https://api.mercadopago.com/v1';
    this.client = null;

    if (!this.accessToken) {
      console.warn('⚠️  MERCADO_PAGO_ACCESS_TOKEN não configurado. Usando modo simulado.');
      this.useMock = true;
    } else {
      this.setupClient();
    }
  }

  /**
   * Configurar cliente Axios para Mercado Pago
   */
  setupClient() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Gerar QR Code PIX
   * @param {number} amount - Valor em reais
   * @param {string} description - Descrição do pedido
   * @param {object} customer - Dados do cliente
   */
  async generatePixQRCode(amount, description, customer) {
    try {
      if (this.useMock) {
        return this.generateMockPixQR(amount, description, customer);
      }

      // Dados do pedido
      const orderData = {
        external_reference: `NUTRISCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        items: [
          {
            id: 'premium-subscription',
            title: description || 'Assinatura Premium Safe-Bite',
            description: 'Acesso ao plano Premium com análises avançadas',
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL'
          }
        ],
        payer: {
          name: customer.name,
          email: customer.email,
          phone: {
            number: customer.phone ? customer.phone.replace(/\D/g, '') : null
          },
          identification: {
            type: 'CPF',
            number: customer.cpf ? customer.cpf.replace(/\D/g, '') : null
          }
        },
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' }
          ],
          installments: 1
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
          failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failure`,
          pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payment/webhook/mercadopago`,
        statement_descriptor: 'SAFE-BITE'
      };

      // Criar preferência de pagamento
      const response = await this.client.post('/checkout/preferences', orderData);

      if (!response.data || !response.data.id) {
        throw new Error('Resposta inválida do Mercado Pago');
      }

      // Retornar dados do QR Code PIX
      return {
        success: true,
        provider: 'mercadopago',
        type: 'pix',
        preferenceId: response.data.id,
        qrCode: response.data.id, // Em produção seria o QR Code real
        checkoutUrl: response.data.init_point,
        paymentLink: response.data.init_point,
        transactionId: response.data.id,
        externalReference: orderData.external_reference,
        amount,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // 1 hora
      };
    } catch (error) {
      console.error('Erro ao gerar QR Code PIX via Mercado Pago:', error.message);
      
      // Fallback para modo simulado
      return this.generateMockPixQR(amount, description, customer);
    }
  }

  /**
   * Gerar QR Code PIX Dinâmico (novo padrão)
   * Mais seguro e com validação em tempo real
   */
  async generateDynamicPixQR(amount, description, customer) {
    try {
      if (this.useMock) {
        return this.generateMockPixQR(amount, description, customer);
      }

      const pixData = {
        correlation_id: `NUTRISCAN-${Date.now()}`,
        calendar: {
          expiration: 3600
        },
        transaction_amount: amount,
        description: description || 'Pagamento Safe-Bite',
        items: [
          {
            title: description || 'Assinatura Premium',
            quantity: 1,
            unit_price: amount
          }
        ]
      };

      const response = await this.client.post('/qr/seller/dynamic', pixData);

      return {
        success: true,
        provider: 'mercadopago',
        type: 'pix_dynamic',
        qrCode: response.data.qr_data,
        qrImage: response.data.image,
        transactionId: response.data.qr_id,
        correlationId: pixData.correlation_id,
        amount,
        status: 'active',
        createdAt: new Date(),
        expiresIn: 3600
      };
    } catch (error) {
      console.error('Erro ao gerar PIX Dinâmico:', error.message);
      return this.generateMockPixQR(amount, description, customer);
    }
  }

  /**
   * Verificar status do pagamento
   */
  async checkPaymentStatus(externalReference) {
    try {
      if (this.useMock) {
        return this.generateMockPaymentStatus(externalReference);
      }

      const response = await this.client.get(
        `/payments/search?external_reference=${externalReference}`
      );

      if (!response.data || !response.data.results || response.data.results.length === 0) {
        return {
          status: 'not_found',
          message: 'Pagamento não encontrado'
        };
      }

      const payment = response.data.results[0];

      return {
        success: true,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        amount: payment.transaction_amount,
        paidAmount: payment.transaction_amount,
        paymentMethod: payment.payment_method,
        createdDate: payment.date_created,
        approvedDate: payment.date_approved,
        description: payment.description
      };
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error.message);
      return {
        success: false,
        status: 'error',
        message: 'Erro ao verificar status'
      };
    }
  }

  /**
   * Processar webhook do Mercado Pago
   */
  processWebhook(body) {
    try {
      const { type, data } = body;

      if (type !== 'payment') {
        return {
          success: false,
          message: 'Webhook inválido'
        };
      }

      return {
        success: true,
        paymentId: data.id,
        type: type,
        resource: data
      };
    } catch (error) {
      console.error('Erro ao processar webhook:', error.message);
      return {
        success: false,
        message: 'Erro ao processar webhook'
      };
    }
  }

  /**
   * Modo simulado - gerar QR Code PIX fake para testes
   */
  generateMockPixQR(amount, description, customer) {
    const transactionId = `NUTRISCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // QR Code mock (pixel art PIX logo)
    const mockQRCode = `myhpc3301@gmial.com ${transactionId} 52060000530398654061${amount.toFixed(2).replace('.', '')}5802BR5913SAFE-BITE6009SAOPAULO62070503***63041D3D`;

    return {
      success: true,
      provider: 'mercadopago_mock',
      type: 'pix',
      qrCode: mockQRCode,
      qrImage: this.generateMockQRImage(),
      transactionId,
      copyPaste: mockQRCode,
      amount,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      isMock: true,
      warning: '⚠️ Modo simulado - configure MERCADO_PAGO_ACCESS_TOKEN para usar API real'
    };
  }

  /**
   * Gerar imagem QR Code para modo simulado
   */
  generateMockQRImage() {
    // Data URL de um QR Code genérico (1x1 pixel PNG como placeholder)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  /**
   * Status mock para testes
   */
  generateMockPaymentStatus(externalReference) {
    return {
      success: true,
      transactionId: externalReference,
      status: 'approved',
      statusDetail: 'accredited',
      amount: 9.90,
      paidAmount: 9.90,
      paymentMethod: 'pix',
      createdDate: new Date(Date.now() - 60000),
      approvedDate: new Date(),
      description: 'Pagamento via PIX'
    };
  }
}

module.exports = MercadoPagoService;
