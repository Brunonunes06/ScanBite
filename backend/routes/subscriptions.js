const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const { protect, requirePremium } = require('../middleware/auth-simple');
const router = express.Router();

// @desc    Obter planos disponíveis
// @route   GET /api/subscriptions/plans
// @access  Public
router.get('/plans', (req, res) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'BRL',
        interval: 'month',
        features: [
          'Até 10 scans por mês',
          'Análises básicas',
          '1 perfil de usuário',
          'Histórico limitado',
          'Suporte por email'
        ],
        limits: {
          scansPerMonth: 10,
          profiles: 1,
          scanHistory: 30
        }
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 9.90,
        currency: 'BRL',
        interval: 'month',
        stripePriceId: process.env.NODE_ENV === 'production' 
          ? 'price_premium_production' 
          : 'price_premium_test',
        features: [
          'Scans ilimitados',
          'Análises avançadas',
          'Múltiplos perfis familiares',
          'Histórico completo',
          'Alertas personalizados',
          'Relatórios mensais',
          'Suporte prioritário',
          'Acesso antecipado a novas features'
        ],
        limits: {
          scansPerMonth: Infinity,
          profiles: 10,
          scanHistory: Infinity
        }
      }
    ];

    res.status(200).json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Erro ao obter planos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter planos.'
    });
  }
});

// @desc    Criar sessão de checkout Stripe
// @route   POST /api/subscriptions/create-checkout-session
// @access  Private
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId || planId !== 'premium') {
      return res.status(400).json({
        success: false,
        message: 'Plano inválido.'
      });
    }

    const user = await User.findById(req.user.id);
    
    // Preço do plano Premium
    const price = 9.90; // BRL
    
    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Nutri-Scan Premium',
              description: 'Scans ilimitados e recursos avançados',
              images: ['https://your-domain.com/logo.png']
            },
            unit_amount: Math.round(price * 100), // Stripe usa centavos
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        userId: user.id,
        planId: 'premium'
      },
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      locale: 'pt-BR'
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar sessão de pagamento.'
    });
  }
});

// @desc    Obter status da assinatura do usuário
// @route   GET /api/subscriptions/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    let subscriptionDetails = null;
    
    if (user.subscription.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.subscription.stripeSubscriptionId
        );
        
        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          plan: {
            id: subscription.items.data[0].price.id,
            amount: subscription.items.data[0].price.unit_amount / 100,
            currency: subscription.items.data[0].price.currency,
            interval: subscription.items.data[0].recurring.interval
          }
        };
      } catch (stripeError) {
        console.error('Erro ao buscar assinatura Stripe:', stripeError);
        // Se não encontrar no Stripe, mas tiver no banco, limpar
        if (stripeError.type === 'StripeInvalidRequestError') {
          user.subscription.stripeSubscriptionId = null;
          user.subscription.plan = 'free';
          await user.save();
        }
      }
    }
    
    res.status(200).json({
      success: true,
      subscription: {
        plan: user.subscription.plan,
        isActive: user.isPremium,
        subscriptionDetails
      },
      user: {
        isPremium: user.isPremium,
        scansRemaining: user.scansRemaining,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Erro ao obter status da assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status da assinatura.'
    });
  }
});

// @desc    Webhook do Stripe para processar eventos
// @route   POST /api/subscriptions/webhook
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Erro na verificação do webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
        
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleInvoicePaymentSucceeded(invoice);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await handleInvoicePaymentFailed(failedInvoice);
        break;
        
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        await handleSubscriptionUpdated(updatedSubscription);
        break;
        
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// @desc    Cancelar assinatura
// @route   POST /api/subscriptions/cancel
// @access  Private
router.post('/cancel', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.subscription.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma assinatura ativa encontrada.'
      });
    }
    
    // Cancelar no final do período
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );
    
    user.subscription.cancelAtPeriodEnd = true;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Assinatura cancelada. Você continuará com acesso até o final do período.',
      cancelAt: new Date(subscription.current_period_end * 1000)
    });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar assinatura.'
    });
  }
});

// @desc    Reativar assinatura cancelada
// @route   POST /api/subscriptions/reactivate
// @access  Private
router.post('/reactivate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.subscription.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma assinatura encontrada.'
      });
    }
    
    // Reativar assinatura
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );
    
    user.subscription.cancelAtPeriodEnd = false;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Assinatura reativada com sucesso.',
      nextBillingDate: new Date(subscription.current_period_end * 1000)
    });
  } catch (error) {
    console.error('Erro ao reativar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reativar assinatura.'
    });
  }
});

// @desc    Atualizar método de pagamento
// @route   POST /api/subscriptions/update-payment
// @access  Private
router.post('/update-payment', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.subscription.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma assinatura ativa encontrada.'
      });
    }
    
    // Criar sessão de atualização de pagamento
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer_email: user.email,
      setup_intent_data: {
        metadata: {
          subscription_id: user.subscription.stripeSubscriptionId,
          customer_id: user.subscription.stripeCustomerId
        }
      },
      success_url: `${process.env.FRONTEND_URL}/subscription/payment-updated`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/payment-method`,
      locale: 'pt-BR'
    });
    
    res.status(200).json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error('Erro ao atualizar método de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar método de pagamento.'
    });
  }
});

// Funções auxiliares para webhook
async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;
  
  const user = await User.findById(userId);
  if (!user) return;
  
  // Atualizar assinatura do usuário
  user.subscription.plan = planId;
  user.subscription.stripeCustomerId = session.customer;
  
  if (session.subscription) {
    user.subscription.stripeSubscriptionId = session.subscription;
    
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }
  
  await user.save();
  
  console.log(`Assinatura ${planId} ativada para usuário ${userId}`);
}

async function handleInvoicePaymentSucceeded(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const customerId = subscription.customer;
  
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!user) return;
  
  user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  user.subscription.cancelAtPeriodEnd = false;
  await user.save();
  
  console.log(`Pagamento recebido para usuário ${user.id}`);
}

async function handleInvoicePaymentFailed(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const customerId = subscription.customer;
  
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!user) return;
  
  // TODO: Enviar email de notificação de falha de pagamento
  console.log(`Falha de pagamento para usuário ${user.id}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!user) return;
  
  user.subscription.plan = 'free';
  user.subscription.stripeSubscriptionId = null;
  user.subscription.currentPeriodEnd = null;
  user.subscription.cancelAtPeriodEnd = false;
  await user.save();
  
  console.log(`Assinatura cancelada para usuário ${user.id}`);
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  
  const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!user) return;
  
  user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
  await user.save();
  
  console.log(`Assinatura atualizada para usuário ${user.id}`);
}

module.exports = router;
