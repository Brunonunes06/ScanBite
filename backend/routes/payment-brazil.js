const express = require('express');
const router = express.Router();
const BrazilianPaymentService = require('../payment-service');

const paymentService = new BrazilianPaymentService();

// @desc    Criar pagamento PIX
// @route   POST /api/payment/pix
// @access  Private
router.post('/pix', async (req, res) => {
  try {
    const { amount, description, customerInfo } = req.body;

    // Validar dados
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor do pagamento é obrigatório'
      });
    }

    if (!customerInfo || !customerInfo.name) {
      return res.status(400).json({
        success: false,
        message: 'Informações do cliente são obrigatórias'
      });
    }

    // Gerar PIX — preferir Mercado Pago quando configurado
    let pixPayment;
    if (paymentService.useMercadoPago) {
      try {
        const mp = await paymentService.generateMercadoPagoPix(amount, description, customerInfo);
        pixPayment = {
          type: 'pix',
          provider: 'mercadopago',
          pixCode: mp.qr.code || null,
          qrCode: mp.qr.image || null,
          copyPaste: mp.qr.code || null,
          raw: mp.raw,
          amount,
          expiresAt: new Date(Date.now() + 3600000),
          txid: mp.raw?.id || mp.raw?.external_reference || paymentService.generateTxid()
        };
      } catch (err) {
        console.warn('Mercado Pago falhou, usando gerador local:', err.message);
        pixPayment = await paymentService.generatePix(amount, description, customerInfo);
      }
    } else {
      pixPayment = await paymentService.generatePix(amount, description, customerInfo);
    }

    // Salvar pagamento no banco de dados
    const payment = await req.db.createPayment({
      type: 'pix',
      amount,
      description,
      customerInfo,
      paymentData: pixPayment,
      status: 'pending',
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      payment: {
        id: payment._id,
        type: 'pix',
        pixCode: pixPayment.pixCode,
        qrCode: pixPayment.qrCode,
        copyPaste: pixPayment.copyPaste,
        amount: pixPayment.amount,
        expiresAt: pixPayment.expiresAt,
        txid: pixPayment.txid
      }
    });
  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar pagamento PIX'
    });
  }
});

// @desc    Criar pagamento com Boleto
// @route   POST /api/payment/boleto
// @access  Private
router.post('/boleto', async (req, res) => {
  try {
    const { amount, customerInfo, dueDate } = req.body;

    // Validar dados
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor do pagamento é obrigatório'
      });
    }

    if (!customerInfo || !customerInfo.name) {
      return res.status(400).json({
        success: false,
        message: 'Informações do cliente são obrigatórias'
      });
    }

    // Usar data de vencimento padrão (7 dias) se não fornecida
    const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const paymentDueDate = dueDate ? new Date(dueDate) : defaultDueDate;

    // Gerar Boleto
    const boletoPayment = paymentService.generateBoleto(amount, customerInfo, paymentDueDate);

    // Salvar pagamento no banco de dados
    const payment = await req.db.createPayment({
      type: 'boleto',
      amount,
      customerInfo,
      paymentData: boletoPayment,
      status: 'pending',
      createdAt: new Date(),
      dueDate: paymentDueDate
    });

    res.status(201).json({
      success: true,
      payment: {
        id: payment._id,
        type: 'boleto',
        barcodeNumber: boletoPayment.barcodeNumber,
        digitableLine: boletoPayment.digitableLine,
        amount: boletoPayment.amount,
        dueDate: boletoPayment.dueDate,
        beneficiary: boletoPayment.beneficiary,
        instructions: boletoPayment.instructions,
        expiresAt: boletoPayment.expiresAt
      }
    });
  } catch (error) {
    console.error('Erro ao gerar boleto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar boleto'
    });
  }
});

// @desc    Verificar status do pagamento
// @route   GET /api/payment/:id/status
// @access  Private
router.get('/:id/status', async (req, res) => {
  try {
    const paymentId = req.params.id;

    // Buscar pagamento no banco
    const payment = await req.db.findPaymentById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }

    // Verificar status com provedor
    const statusCheck = await paymentService.checkPaymentStatus(paymentId);

    // Atualizar status se necessário
    if (statusCheck.status !== payment.status) {
      await req.db.updatePayment(paymentId, {
        status: statusCheck.status,
        paidAt: statusCheck.paidAt
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        type: payment.type,
        status: statusCheck.status,
        amount: payment.amount,
        createdAt: payment.createdAt,
        paidAt: statusCheck.paidAt,
        expiresAt: payment.paymentData.expiresAt
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status do pagamento'
    });
  }
});

// @desc    Criar assinatura com pagamento brasileiro
// @route   POST /api/payment/subscription
// @access  Private
router.post('/subscription', async (req, res) => {
  try {
    const { plan, customerInfo, paymentMethod } = req.body;

    // Validar dados
    if (!plan || !plan.name || !plan.price) {
      return res.status(400).json({
        success: false,
        message: 'Dados do plano são obrigatórios'
      });
    }

    if (!customerInfo || !customerInfo.name) {
      return res.status(400).json({
        success: false,
        message: 'Informações do cliente são obrigatórias'
      });
    }

    if (!paymentMethod || !['pix', 'boleto'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pagamento inválido'
      });
    }

    // Criar assinatura
    const subscription = await paymentService.createSubscription(plan, customerInfo, paymentMethod);

    // Salvar assinatura no banco
    const savedSubscription = await req.db.createSubscription({
      ...subscription,
      userId: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      subscription: {
        id: savedSubscription._id,
        plan: savedSubscription.plan,
        status: savedSubscription.status,
        payment: savedSubscription.payment,
        createdAt: savedSubscription.createdAt,
        nextBilling: savedSubscription.nextBilling
      }
    });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar assinatura'
    });
  }
});

// @desc    Cancelar assinatura
// @route   DELETE /api/payment/subscription/:id
// @access  Private
router.delete('/subscription/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id;

    // Buscar assinatura
    const subscription = await req.db.findSubscriptionById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Cancelar assinatura
    const cancellation = await paymentService.cancelSubscription(subscriptionId);

    // Atualizar no banco
    await req.db.updateSubscription(subscriptionId, {
      status: 'cancelled',
      cancelledAt: cancellation.cancelledAt
    });

    res.json({
      success: true,
      message: 'Assinatura cancelada com sucesso',
      cancellation
    });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar assinatura'
    });
  }
});

// @desc    Listar métodos de pagamento disponíveis
// @route   GET /api/payment/methods
// @access  Public
router.get('/methods', (req, res) => {
  res.json({
    success: true,
    methods: [
      {
        id: 'pix',
        name: 'PIX',
        description: 'Pagamento instantâneo via QR Code',
        icon: 'fas fa-qrcode',
        fees: 0,
        maxAmount: 10000,
        processingTime: 'instantâneo'
      },
      {
        id: 'boleto',
        name: 'Boleto Bancário',
        description: 'Pagamento em até 3 dias úteis',
        icon: 'fas fa-barcode',
        fees: 1.50,
        maxAmount: 50000,
        processingTime: '1-3 dias úteis'
      }
    ]
  });
});

// @desc    Obter taxas de pagamento
// @route   GET /api/payment/fees
// @access  Public
router.get('/fees', (req, res) => {
  const { amount, method } = req.query;

  if (!amount || !method) {
    return res.status(400).json({
      success: false,
      message: 'Valor e método de pagamento são obrigatórios'
    });
  }

  let fee = 0;
  
  if (method === 'boleto') {
    fee = 1.50; // Taxa fixa do boleto
  } else if (method === 'pix') {
    fee = 0; // PIX é gratuito
  }

  const total = parseFloat(amount) + fee;

  res.json({
    success: true,
    fees: {
      amount: parseFloat(amount),
      fee,
      total,
      method,
      percentage: method === 'boleto' ? ((fee / parseFloat(amount)) * 100).toFixed(2) : 0
    }
  });
});

module.exports = router;
