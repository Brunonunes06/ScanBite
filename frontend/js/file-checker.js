// Verificador de Arquivos - Scan-Bite
// Garante que os arquivos existam antes de redirecionar

class FileChecker {
  constructor() {
    this.availableFiles = new Set();
    this.init();
  }

  init() {
    // Lista de arquivos que devem existir
    this.requiredFiles = [
      'index.html',
      'login.html', 
      'signup.html',
      'dashboard.html',
      'settings.html',
      'scanner.html',
      'allergy-scanner.html',
      'history.html',
      'help.html',
      'payment.html',
      'privacy.html'
    ];

    // Verifica os arquivos primeiro e só depois configura interceptores de
    // redirecionamento para evitar redirecionamentos prematuros enquanto a
    // lista de arquivos disponíveis ainda está sendo carregada.
    this.checkFiles().then(() => {
      this.setupGlobalRedirect();
    });
  }

  async checkFiles() {
    console.log('🔍 Verificando arquivos necessários...');
    
    // Detect if running on file:// protocol
    const isFileProtocol = window.location.protocol === 'file:';
    
    for (const file of this.requiredFiles) {
      try {
        if (isFileProtocol) {
          // On file:// protocol, assume all files exist since fetch is blocked
          this.availableFiles.add(file);
          console.log(`✅ ${file} - Assumindo disponível (protocolo file://)`);
        } else {
          const response = await fetch(file, { method: 'HEAD' });
          if (response.ok) {
            this.availableFiles.add(file);
            console.log(`✅ ${file} - Disponível`);
          } else {
            console.warn(`❌ ${file} - Não encontrado (${response.status})`);
          }
        }
      } catch (error) {
        if (isFileProtocol) {
          // On file:// protocol, fetch errors are expected - assume file exists
          this.availableFiles.add(file);
          console.log(`✅ ${file} - Assumindo disponível (fetch bloqueado no protocolo file://)`);
        } else {
          console.warn(`❌ ${file} - Erro na verificação:`, error);
        }
      }
    }

    console.log('📁 Arquivos disponíveis:', Array.from(this.availableFiles));
  }

  setupGlobalRedirect() {
    // Criar função segura de redirecionamento sem tentar redefinir window.location
    // que é um objeto built-in do navegador
    
    window.ScanRedirect = (url) => {
      // Se for URL relativa, verificar se o arquivo existe
      if (url.startsWith('./') || url.endsWith('.html')) {
        const fileName = url.split('/').pop();
        
        if (!this.availableFiles.has(fileName)) {
          console.error(`❌ Tentativa de redirecionar para arquivo inexistente: ${fileName}`);
          console.log(`📂 Arquivos disponíveis:`, Array.from(this.availableFiles));
          
          // Redirecionar para página segura
          if (this.availableFiles.has('index.html')) {
            console.log('🔄 Redirecionando para index.html');
            window.location.href = 'index.html';
            return;
          }
        }
      }
      
      console.log(`✅ Redirecionando para: ${url}`);
      window.location.href = url;
    };

    // Interceptar cliques em links para validar antes de redirecionar
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a[href]');
      if (target) {
        const href = target.getAttribute('href');
        
        // Validar redirecionamentos para .html
        if (href && (href.endsWith('.html') || href.startsWith('./'))) {
          const fileName = href.split('/').pop();
          
          if (fileName.endsWith('.html') && !this.availableFiles.has(fileName)) {
            event.preventDefault();
            console.error(`❌ Link bloqueado - arquivo não encontrado: ${fileName}`);
            console.log(`📂 Arquivos disponíveis:`, Array.from(this.availableFiles));
            
            // Redirecionar para página segura
            if (this.availableFiles.has('index.html')) {
              console.log('🔄 Redirecionando para index.html como fallback');
              window.location.href = 'index.html';
            }
          }
        }
      }
    }, true);

    console.log('✅ Sistema de redirecionamento seguro ativado');
  }

  // Verificar se arquivo específico existe
  fileExists(fileName) {
    return this.availableFiles.has(fileName);
  }

  // Obter lista de arquivos disponíveis
  getAvailableFiles() {
    return Array.from(this.availableFiles);
  }

  // Redirecionamento seguro
  ScanRedirectTo(page) {
    if (this.availableFiles.has(page)) {
      window.location.href = page;
    } else {
      console.error(`❌ Página ${page} não está disponível`);
      if (this.availableFiles.has('index.html')) {
        window.location.href = 'index.html';
      }
    }
  }
}

// Nota: não definir diretamente `window.ScanRedirect` aqui para evitar
// sobrescrever implementações centrais. Expor `fileChecker.ScanRedirectTo`.

// Inicializar verificador
let fileChecker;
document.addEventListener('DOMContentLoaded', () => {
  fileChecker = new FileChecker();
  window.fileChecker = fileChecker;
  // Registrar helpers globais apenas se ainda não existirem
  if (!window.ScanRedirect) {
    window.ScanRedirect = (url) => fileChecker.ScanRedirectTo(url);
  }
  if (!window.ScanLogin) {
    window.ScanLogin = () => window.ScanRedirect('login.html');
  }
  if (!window.ScanSignup) {
    window.ScanSignup = () => window.ScanRedirect('signup.html');
  }
  if (!window.ScanDashboard) {
    window.ScanDashboard = () => window.ScanRedirect('dashboard.html');
  }
  if (!window.ScanIndex) {
    window.ScanIndex = () => window.ScanRedirect('index.html');
  }
  
  console.log('🛡️ FileChecker inicializado');
  console.log('📋 Funções seguras disponíveis: ScanRedirect, ScanLogin, ScanSignup, ScanDashboard, ScanIndex');
});
