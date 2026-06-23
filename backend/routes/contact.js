const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configuração do transporte de email (Gmail)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL || 'bruno.nunes.santos06@escola.pr.gov.br',
      pass: process.env.GMAIL_PASSWORD || 'sua_senha_app'
    }
  });
};

// @desc    Enviar mensagem de contato
// @route   POST /api/contact
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { nome, email, mensagem } = req.body;

    // Validar campos obrigatórios
    if (!nome || !email || !mensagem) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios.'
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido.'
      });
    }

    // Salvar mensagem no banco de dados (opcional)
    const contactMessage = {
      id: Date.now().toString(),
      nome,
      email,
      mensagem,
      data: new Date(),
      status: 'pendente'
    };

    // Salvar no banco de dados em memória
    if (req.db) {
      await req.db.saveContactMessage(contactMessage);
    }

    // Tentar enviar email
    let emailEnviado = false;
    let emailError = null;

    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"${nome}" <${email}>`,
        to: process.env.GMAIL_EMAIL || 'bruno.nunes.santos06@escola.pr.gov.br',
        subject: `📧 Nova Mensagem de Contato - Safe-Bite`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">
                <i class="fas fa-leaf"></i> Safe-Bite
              </h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">Nova Mensagem de Contato</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0 0 10px; font-size: 18px;">📋 Detalhes da Mensagem</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #2ecc71;">
                  <p style="margin: 5px 0;"><strong>👤 Nome:</strong> ${nome}</p>
                  <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${email}</p>
                  <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
              
              <div>
                <h3 style="color: #2c3e50; margin: 0 0 10px; font-size: 18px;">💬 Mensagem</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #3498db;">
                  <p style="margin: 0; line-height: 1.6; color: #34495e;">${mensagem.replace(/\n/g, '<br>')}</p>
                </div>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="margin: 0; color: #7f8c8d; font-size: 12px;">
                  Esta mensagem foi enviada através do formulário de contato do site Safe-Bite
                </p>
              </div>
            </div>
          </div>
        `,
        replyTo: email
      };

      await transporter.sendMail(mailOptions);
      emailEnviado = true;
      
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error('Erro ao enviar email:', emailErr);
    }

    // Resposta ao cliente
    const response = {
      success: true,
      message: emailEnviado 
        ? 'Mensagem enviada com sucesso! Responderemos em breve.'
        : 'Mensagem recebida! Ocorreu um erro ao enviar o email, mas entraremos em contato em breve.',
      messageId: contactMessage.id,
      emailEnviado,
      emailError: emailError ? 'Erro no envio de email' : null
    };

    // Em modo de desenvolvimento, incluir mais informações
    if (process.env.NODE_ENV === 'development') {
      response.debug = {
        savedToDatabase: !!req.db,
        emailConfig: {
          user: process.env.GMAIL_EMAIL || 'nutriscan.contato@gmail.com',
          hasPassword: !!process.env.GMAIL_PASSWORD
        },
        emailError
      };
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Erro no processamento da mensagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar sua mensagem. Tente novamente mais tarde.',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// @desc    Listar mensagens de contato (admin)
// @route   GET /api/contact
// @access  Private
router.get('/', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }

    // Verificar token (simplificado)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutri_scan_secret_key');
    
    // Buscar mensagens
    let messages = [];
    if (req.db) {
      messages = await req.db.getContactMessages();
    }

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });

  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar mensagens.'
    });
  }
});

module.exports = router;
