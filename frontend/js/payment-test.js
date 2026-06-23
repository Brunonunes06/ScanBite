/**
 * payment-test.js
 * Testes automatizados para o sistema de pagamento
 * Executar no console do navegador: loadScript('payment-test.js')
 */

class PaymentSystemTest {
  constructor() {
    this.testResults = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const prefix = {
      'pass': '✓',
      'fail': '✗',
      'info': 'ℹ',
      'warn': '⚠'
    };

    const color = {
      'pass': '#2ecc71',
      'fail': '#e74c3c',
      'info': '#3498db',
      'warn': '#f39c12'
    };

    const style = `color: ${color[type]}; font-weight: bold;`;
    console.log(`%c${prefix[type]} ${message}`, style);
  }

  async test(name, testFunc) {
    try {
      await testFunc();
      this.passed++;
      this.testResults.push({ name, status: 'PASS' });
      this.log(`PASS: ${name}`, 'pass');
    } catch (error) {
      this.failed++;
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      this.log(`FAIL: ${name} - ${error.message}`, 'fail');
    }
  }

  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: esperado ${expected}, recebido ${actual}`);
    }
  }

  assertTrue(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertExists(obj, message) {
    if (!obj) {
      throw new Error(`${message}: objeto não existe`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.clear();
    this.log('=== INICIANDO TESTES DO SISTEMA DE PAGAMENTO ===', 'info');
    this.log('');

    // Testes de inicialização
    await this.test('Scripts carregados', async () => {
      this.assertExists(paymentManager, 'PaymentManager');
      this.assertExists(paymentMockService, 'PaymentMockService');
      this.assertExists(paymentIntegration, 'PaymentIntegration');
    });

    await this.test('PaymentIntegration inicializado', async () => {
      if (paymentIntegration.initPromise) {
        await paymentIntegration.ensureInitialized();
      }
      const status = await paymentIntegration.getStatus();
      this.assertExists(status, 'Status do sistema');
    });

    // Testes de métodos de pagamento
    await this.test('Obter métodos de pagamento', async () => {
      const methods = await paymentIntegration.getPaymentMethods();
      this.assertTrue(Array.isArray(methods), 'Deve retornar array');
      this.assertTrue(methods.length > 0, 'Deve ter pelo menos um método');
      this.log(`  Métodos disponíveis: ${methods.map(m => m.name).join(', ')}`, 'info');
    });

    // Testes PIX
    await this.test('Gerar PIX fictício', async () => {
      const pix = await paymentMockService.generateMockPIX(9.90, 'Teste');
      this.assertExists(pix.id, 'PIX deve ter ID');
      this.assertExists(pix.pixCode, 'PIX deve ter código');
      this.assertExists(pix.qrCode, 'PIX deve ter QR Code');
      this.assertEquals(pix.status, 'pending', 'Status inicial deve ser pending');
      this.log(`  PIX Code: ${pix.pixCode.substring(0, 20)}...`, 'info');
    });

    // Testes Boleto
    await this.test('Gerar Boleto fictício', async () => {
      const boleto = await paymentMockService.generateMockBoleto(9.90, {
        name: 'Teste User',
        email: 'test@example.com'
      });
      this.assertExists(boleto.id, 'Boleto deve ter ID');
      this.assertExists(boleto.barcodeNumber, 'Boleto deve ter número');
      this.assertEquals(boleto.status, 'pending', 'Status inicial deve ser pending');
      this.log(`  Barcode: ${boleto.barcodeNumber}`, 'info');
    });

    // Testes Cartão
    await this.test('Processar Cartão fictício (aprovado)', async () => {
      const card = await paymentMockService.processMockCardPayment('4111111111111111', 9.90, 1);
      this.assertExists(card.id, 'Cartão deve ter ID');
      this.assertTrue(
        ['approved', 'rejected'].includes(card.status),
        'Status deve ser approved ou rejected'
      );
      this.log(`  Status: ${card.status}`, 'info');
    });

    // Testes de validação CPF
    await this.test('Validação CPF - CPF válido', async () => {
      const isValid = paymentManager.validateCPF('111.444.777-35');
      this.assertTrue(isValid, 'CPF válido deve retornar true');
    });

    await this.test('Validação CPF - CPF inválido', async () => {
      const isValid = paymentManager.validateCPF('000.000.000-00');
      this.assertTrue(!isValid, 'CPF inválido deve retornar false');
    });

    // Testes de Status
    await this.test('Verificar status de pagamento', async () => {
      const pix = await paymentMockService.generateMockPIX(9.90);
      await this.sleep(500);
      const status = await paymentMockService.getMockPaymentStatus(pix.id);
      this.assertExists(status.id, 'Status deve ter ID');
      this.assertExists(status.status, 'Status deve ter valor');
    });

    // Testes de Histórico
    await this.test('Obter histórico de transações', async () => {
      // Gerar algumas transações
      await paymentMockService.generateMockPIX(9.90);
      await paymentMockService.generateMockBoleto(9.90, { name: 'Test', email: 'test@test.com' });
      
      const history = paymentMockService.getMockTransactionHistory(5);
      this.assertTrue(Array.isArray(history), 'Histórico deve ser array');
      this.assertTrue(history.length >= 2, 'Deve ter pelo menos 2 transações');
      this.log(`  Total de transações: ${history.length}`, 'info');
    });

    // Testes de Status do Sistema
    await this.test('Status do sistema de pagamento', async () => {
      const status = await paymentIntegration.getStatus();
      this.assertExists(status.serverAvailable, 'Deve ter serverAvailable');
      this.assertExists(status.usingMockData, 'Deve ter usingMockData');
      this.assertExists(status.message, 'Deve ter message');
      this.log(`  Status: ${status.message}`, 'info');
    });

    // Testes de Formatação
    await this.test('Formatação de valores', async () => {
      const formats = [
        { input: 9.9, display: '9.90' },
        { input: 100, display: '100.00' },
        { input: 0.01, display: '0.01' }
      ];

      formats.forEach(f => {
        const formatted = f.input.toFixed(2);
        this.assertEquals(formatted, f.display, `Formatação de ${f.input}`);
      });
    });

    // Testes de Geração de IDs
    await this.test('Geração de IDs únicos', async () => {
      const ids = new Set();
      for (let i = 0; i < 10; i++) {
        const pix = await paymentMockService.generateMockPIX(9.90);
        ids.add(pix.id);
      }
      this.assertEquals(ids.size, 10, 'Todos os IDs devem ser únicos');
    });

    // Relatório final
    console.log('');
    this.log('=== RESUMO DOS TESTES ===', 'info');
    this.log(`Total: ${this.passed + this.failed}`, 'info');
    this.log(`Aprovados: ${this.passed}`, 'pass');
    this.log(`Falhados: ${this.failed}`, this.failed > 0 ? 'fail' : 'pass');
    console.log('');

    if (this.failed === 0) {
      this.log('✓ TODOS OS TESTES PASSARAM!', 'pass');
    } else {
      this.log(`✗ ${this.failed} testes falharam`, 'fail');
    }

    console.log('');
    console.table(this.testResults);

    return {
      total: this.passed + this.failed,
      passed: this.passed,
      failed: this.failed,
      results: this.testResults
    };
  }
}

// Função global para execução
async function runPaymentTests() {
  const tester = new PaymentSystemTest();
  return await tester.runAllTests();
}

// Função para carregar e testar
async function testPaymentSystem() {
  return await runPaymentTests();
}

// Exemplo de uso no console
console.log('%cCOMARdo de teste: testPaymentSystem()', 'color: #3498db; font-weight: bold;');
