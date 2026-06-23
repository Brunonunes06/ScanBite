// Diagnóstico do Sistema de Email Safe-Bite
const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailDiagnostic {
  constructor() {
    this.testResults = [];
  }

  async runFullDiagnostic() {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DO SISTEMA DE EMAIL\n');
    
    // 1. Verificar variáveis de ambiente
    this.checkEnvironmentVariables();
    
    // 2. Verificar dependências
    this.checkDependencies();
    
    // 3. Testar configuração do transporter
    await this.testTransporterConfig();
    
    // 4. Testar envio de email
    await this.testEmailSending();
    
    // 5. Verificar configuração do servidor
    this.checkServerConfig();
    
    // 6. Gerar relatório
    this.generateReport();
  }

  checkEnvironmentVariables() {
    console.log('📋 1. VERIFICANDO VARIÁVEIS DE AMBIENTE');
    
    const requiredVars = ['GMAIL_EMAIL', 'GMAIL_PASSWORD'];
    let allPresent = true;
    
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      const status = value ? '✅' : '❌';
      const display = value ? `${value.substring(0, 3)}***` : 'NÃO DEFINIDA';
      
      console.log(`   ${status} ${varName}: ${display}`);
      
      if (!value) {
        allPresent = false;
        this.testResults.push({
          test: `Variável ${varName}`,
          status: 'FAILED',
          message: `${varName} não está definida no arquivo .env`
        });
      } else {
        this.testResults.push({
          test: `Variável ${varName}`,
          status: 'PASSED',
          message: `${varName} está configurada`
        });
      }
    });
    
    if (allPresent) {
      console.log('   ✅ Todas as variáveis de ambiente estão presentes\n');
    } else {
      console.log('   ❌ Variáveis de ambiente ausentes\n');
    }
  }

  checkDependencies() {
    console.log('📦 2. VERIFICANDO DEPENDÊNCIAS');
    
    try {
      const nodemailerVersion = require('nodemailer/package.json').version;
      console.log(`   ✅ Nodemailer: v${nodemailerVersion}`);
      
      this.testResults.push({
        test: 'Dependência Nodemailer',
        status: 'PASSED',
        message: `Nodemailer v${nodemailerVersion} instalado`
      });
    } catch (error) {
      console.log('   ❌ Nodemailer não encontrado');
      this.testResults.push({
        test: 'Dependência Nodemailer',
        status: 'FAILED',
        message: 'Nodemailer não está instalado'
      });
    }
    
    console.log('');
  }

  async testTransporterConfig() {
    console.log('⚙️ 3. TESTANDO CONFIGURAÇÃO DO TRANSPORTER');
    
    try {
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_EMAIL || 'bruno.nunes.santos06@escola.pr.gov.br',
          pass: process.env.GMAIL_PASSWORD || 'sua_senha_app'
        }
      });
      
      // Verificar se o transporter foi criado
      if (transporter) {
        console.log('   ✅ Transporter criado com sucesso');
        
        // Verificar configuração
        const options = transporter.options;
        console.log(`   📧 Serviço: ${options.service}`);
        console.log(`   👤 Usuário: ${options.auth.user}`);
        console.log(`   🔑 Senha: ${options.auth.pass ? 'CONFIGURADA' : 'NÃO CONFIGURADA'}`);
        
        this.testResults.push({
          test: 'Configuração Transporter',
          status: 'PASSED',
          message: 'Transporter configurado corretamente'
        });
        
        return transporter;
      }
    } catch (error) {
      console.log(`   ❌ Erro ao criar transporter: ${error.message}`);
      this.testResults.push({
        test: 'Configuração Transporter',
        status: 'FAILED',
        message: `Erro: ${error.message}`
      });
    }
    
    console.log('');
    return null;
  }

  async testEmailSending() {
    console.log('📨 4. TESTANDO ENVIO DE EMAIL');
    
    try {
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_EMAIL || 'bruno.nunes.santos06@escola.pr.gov.br',
          pass: process.env.GMAIL_PASSWORD || 'sua_senha_app'
        }
      });
      
      // Verificar conexão com Gmail
      await transporter.verify();
      console.log('   ✅ Conexão com Gmail estabelecida');
      
      // Tentar enviar email de teste
      const testEmail = {
        from: `"Teste Safe-Bite" <${process.env.GMAIL_EMAIL || 'bruno.nunes.santos06@escola.pr.gov.br'}>`,
        to: process.env.GMAIL_EMAIL || 'bruno.nunes.santos06@escola.pr.gov.br',
        subject: '🧪 TESTE - Safe-Bite Email Diagnostic',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2ecc71;">✅ Email de Teste - Safe-Bite</h2>
            <p>Este é um email de teste para verificar se o sistema de envio está funcionando.</p>
            <p><strong>Data do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Status:</strong> Sistema funcionando perfeitamente!</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Este email foi gerado automaticamente pelo sistema de diagnóstico do Safe-Bite.
            </p>
          </div>
        `
      };
      
      const result = await transporter.sendMail(testEmail);
      console.log(`   ✅ Email enviado com sucesso!`);
      console.log(`   📋 Message ID: ${result.messageId}`);
      console.log(`   📧 Para: ${testEmail.to}`);
      
      this.testResults.push({
        test: 'Envio de Email',
        status: 'PASSED',
        message: `Email enviado com sucesso (ID: ${result.messageId})`
      });
      
    } catch (error) {
      console.log(`   ❌ Erro ao enviar email: ${error.message}`);
      
      // Análise detalhada do erro
      let errorAnalysis = this.analyzeEmailError(error);
      console.log(`   🔍 Análise: ${errorAnalysis}`);
      
      this.testResults.push({
        test: 'Envio de Email',
        status: 'FAILED',
        message: `${error.message} - ${errorAnalysis}`
      });
    }
    
    console.log('');
  }

  analyzeEmailError(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('535') || errorMessage.includes('username and password')) {
      return 'CREDENCIAIS INCORRETAS - Verifique usuário e senha do Gmail';
    }
    
    if (errorMessage.includes('less secure') || errorMessage.includes('app password')) {
      return 'NECESSÁRIO SENHA DE APP - Use "App Password" do Gmail em vez da senha normal';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'PROBLEMA DE REDE - Verifique sua conexão com a internet';
    }
    
    if (errorMessage.includes('timeout')) {
      return 'TIMEOUT - O servidor demorou muito para responder';
    }
    
    if (errorMessage.includes('authentication')) {
      return 'ERRO DE AUTENTICAÇÃO - Problema com as credenciais do Gmail';
    }
    
    return 'ERRO DESCONHECIDO - Verifique logs completos para mais detalhes';
  }

  checkServerConfig() {
    console.log('🖥️ 5. VERIFICANDO CONFIGURAÇÃO DO SERVIDOR');
    
    try {
      // Verificar se a rota de contato está configurada
      const fs = require('fs');
      const path = require('path');
      
      const serverPath = path.join(__dirname, 'server.js');
      if (fs.existsSync(serverPath)) {
        console.log('   ✅ Arquivo server.js encontrado');
        
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        
        if (serverContent.includes('contactRoutes')) {
          console.log('   ✅ Rota de contato configurada');
          this.testResults.push({
            test: 'Rota de Contato',
            status: 'PASSED',
            message: 'Rota /api/contact configurada no servidor'
          });
        } else {
          console.log('   ❌ Rota de contato não configurada');
          this.testResults.push({
            test: 'Rota de Contato',
            status: 'FAILED',
            message: 'Rota /api/contact não encontrada em server.js'
          });
        }
        
        if (serverContent.includes('/api/contact')) {
          console.log('   ✅ Endpoint /api/contact definido');
        } else {
          console.log('   ❌ Endpoint /api/contact não definido');
        }
      }
    } catch (error) {
      console.log(`   ❌ Erro ao verificar servidor: ${error.message}`);
    }
    
    console.log('');
  }

  generateReport() {
    console.log('📊 6. RELATÓRIO FINAL\n');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`📈 RESUMO: ${passed}/${total} testes passaram (${failed} falhas)`);
    console.log('');
    
    if (failed > 0) {
      console.log('❌ TESTES FALHADOS:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.test}: ${test.message}`);
        });
      console.log('');
    }
    
    console.log('✅ TESTES PASSADOS:');
    this.testResults
      .filter(r => r.status === 'PASSED')
      .forEach(test => {
        console.log(`   • ${test.test}: ${test.message}`);
      });
    
    console.log('\n🔧 RECOMENDAÇÕES:');
    
    if (failed > 0) {
      console.log('1. Configure as variáveis de ambiente no arquivo .env');
      console.log('2. Crie uma "App Password" no Gmail');
      console.log('3. Verifique sua conexão com a internet');
      console.log('4. Confirme se o servidor está rodando');
    } else {
      console.log('✅ Sistema funcionando perfeitamente!');
      console.log('📧 Verifique sua caixa de entrada para o email de teste.');
    }
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Inicie o servidor: node server.js');
    console.log('2. Teste o formulário em: http://localhost:5000');
    console.log('3. Monitore os logs do console');
    console.log('4. Verifique emails recebidos');
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 DIAGNÓSTICO CONCLUÍDO');
    console.log('='.repeat(60));
  }
}

// Executar diagnóstico
if (require.main === module) {
  const diagnostic = new EmailDiagnostic();
  diagnostic.runFullDiagnostic().catch(console.error);
}

module.exports = EmailDiagnostic;
