// Popup de Upgrade para Premium
// Gerenciador de popup com botões Cancelar e Começar Grátis

class UpgradePopupManager {
  constructor() {
    this.popup = null;
    this.init();
  }

  init() {
    this.createPopup();
    this.setupEventListeners();
  }

  createPopup() {
    // Criar popup HTML
    const popupHTML = `
      <div id="upgradePopup" class="upgrade-popup-overlay" style="display: none;">
        <div class="upgrade-popup-content">
          <div class="popup-header">
            <div class="popup-icon">🚀</div>
            <h3>Upgrade para Premium</h3>
          </div>
          
          <div class="popup-body">
            <p>Você será redirecionado para a página de pagamento para completar sua assinatura Premium.</p>
            
            <div class="premium-benefits">
              <div class="benefit-item">
                <i class="fas fa-check-circle"></i>
                <span>Scans ilimitados</span>
              </div>
              <div class="benefit-item">
                <i class="fas fa-check-circle"></i>
                <span>Análise avançada de ingredientes</span>
              </div>
              <div class="benefit-item">
                <i class="fas fa-check-circle"></i>
                <span>Relatórios personalizados</span>
              </div>
              <div class="benefit-item">
                <i class="fas fa-check-circle"></i>
                <span>Suporte prioritário</span>
              </div>
            </div>
          </div>
          
          <div class="popup-actions" id="popupActions">
            <button class="btn-cancel" onclick="upgradePopup.closePopup()">
              <i class="fas fa-times"></i>
              Cancelar
            </button>
            <button class="btn-premium" onclick="upgradePopup.goToPayment()">
              <i class="fas fa-crown"></i>
              Ver Planos
            </button>
          </div>
        </div>
      </div>
    `;

    // Adicionar popup ao body
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    this.popup = document.getElementById('upgradePopup');
  }

  setupEventListeners() {
    // Fechar popup ao clicar fora
    this.popup.addEventListener('click', (e) => {
      if (e.target === this.popup) {
        this.closePopup();
      }
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup.style.display === 'flex') {
        this.closePopup();
      }
    });
  }

  showPopup() {
    this.popup.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevenir scroll
    
    // Verificar plano do usuário e ajustar botões
    this.adjustButtonsForUserPlan();
  }

  adjustButtonsForUserPlan() {
    const user = loginSystem?.getCurrentUser();
    const btnFreeTrial = document.getElementById('btnFreeTrial');
    const popupActions = document.getElementById('popupActions');
    
    if (!user) {
      // Usuário não logado - mostrar botão "Começar Grátis" com login Google
      if (btnFreeTrial) {
        btnFreeTrial.style.display = 'block';
        btnFreeTrial.innerHTML = '<i class="fas fa-google"></i> Entrar com Google';
        btnFreeTrial.onclick = () => this.startFreeTrialWithGoogle();
      }
    } else if (user.subscription?.plan === 'premium') {
      // Usuário premium - REMOVER completamente o botão "Começar Grátis"
      if (btnFreeTrial) {
        btnFreeTrial.remove(); // Remove completamente do DOM
      }
    } else {
      // Usuário free - mostrar botão "Começar Grátis"
      if (btnFreeTrial) {
        btnFreeTrial.style.display = 'block';
        btnFreeTrial.innerHTML = '<i class="fas fa-gift"></i> Começar Grátis';
        btnFreeTrial.onclick = () => this.startFreeTrial();
      }
    }
  }

  closePopup() {
    this.popup.style.display = 'none';
    document.body.style.overflow = ''; // Restaurar scroll
  }

  goToPayment() {
    this.closePopup();
    safeRedirect('payment.html');
  }

  startFreeTrial() {
    this.closePopup();
    // Verificar se usuário já está logado
    const token = localStorage.getItem('nutriScanToken');
    
    if (token) {
      // Usuário já logado, redirecionar para dashboard
      safeRedirect('index.html');
    } else {
      // Usuário não logado, mostrar tela de login
      this.showLoginModal();
    }
  }

  startFreeTrialWithGoogle() {
    this.closePopup();
    // Fazer login direto com Google
    if (loginSystem) {
      loginSystem.handleGoogleLogin();
    } else {
      // Fallback - redirecionar para página de login
      safeRedirect('login.html');
    }
  }

  showLoginModal() {
    // Criar modal de login
    const loginModal = document.createElement('div');
    loginModal.className = 'login-modal-overlay';
    loginModal.innerHTML = `
      <div class="login-modal-content">
        <div class="login-header">
          <h3>Faça seu Login</h3>
          <button class="close-btn" onclick="this.closest('.login-modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="login-body">
          <div class="google-login-section">
            <h4>Entrar com Google</h4>
            <button class="google-login-btn" onclick="loginManager.signInWithGoogle()">
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google">
              <span>Continuar com Google</span>
            </button>
          </div>
          
          <div class="divider">
            <span>ou</span>
          </div>
          
          <div class="email-login-section">
            <h4>Entrar com Email</h4>
            <form id="emailLoginForm" onsubmit="loginManager.signInWithEmail(event)">
              <div class="form-group">
                <label for="loginEmail">Email</label>
                <input type="email" id="loginEmail" placeholder="seu@email.com" required>
              </div>
              <div class="form-group">
                <label for="loginPassword">Senha</label>
                <input type="password" id="loginPassword" placeholder="Sua senha" required>
              </div>
              <button type="submit" class="btn-primary">
                <i class="fas fa-sign-in-alt"></i>
                Entrar
              </button>
            </form>
          </div>
          
          <div class="login-footer">
            <p>Não tem uma conta? 
              <a href="#" onclick="loginManager.showSignup()">Cadastre-se</a>
            </p>
            <p>
              <a href="#" onclick="loginManager.forgotPassword()">Esqueceu a senha?</a>
            </p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(loginModal);
    
    // Adicionar estilos se não existirem
    if (!document.querySelector('#loginModalStyles')) {
      this.addLoginModalStyles();
    }
  }

  addLoginModalStyles() {
    const styles = `
      <style id="loginModalStyles">
        .login-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }
        
        .login-modal-content {
          background: white;
          border-radius: 15px;
          max-width: 450px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        
        .login-header {
          padding: 2rem 2rem 1rem;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .login-header h3 {
          margin: 0;
          color: var(--text-dark);
          font-size: 1.5rem;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--text-light);
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        
        .close-btn:hover {
          background: var(--light-gray);
          color: var(--text-dark);
        }
        
        .login-body {
          padding: 2rem;
        }
        
        .google-login-section {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .google-login-section h4 {
          margin-bottom: 1rem;
          color: var(--text-dark);
        }
        
        .google-login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: white;
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.3s ease;
          width: 100%;
        }
        
        .google-login-btn:hover {
          background: #f8f9fa;
          border-color: #4285f4;
        }
        
        .google-login-btn img {
          width: 20px;
          height: 20px;
        }
        
        .divider {
          text-align: center;
          margin: 2rem 0;
          position: relative;
        }
        
        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #ddd;
        }
        
        .divider span {
          background: white;
          padding: 0 1rem;
          color: var(--text-light);
        }
        
        .email-login-section h4 {
          margin-bottom: 1rem;
          color: var(--text-dark);
        }
        
        .login-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .login-footer p {
          margin: 0.5rem 0;
          color: var(--text-light);
          font-size: 0.9rem;
        }
        
        .login-footer a {
          color: var(--primary-green);
          text-decoration: none;
          font-weight: 500;
        }
        
        .login-footer a:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 480px) {
          .login-modal-content {
            margin: 1rem;
            max-width: calc(100% - 2rem);
          }
          
          .login-header, .login-body {
            padding: 1.5rem;
          }
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
}

// Gerenciador de Login
class LoginManager {
  constructor() {
    this.initGoogleAuth();
  }

  initGoogleAuth() {
    // Carregar Google API
    if (!window.gapi) {
      this.loadGoogleScript();
    }
  }

  loadGoogleScript() {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/platform.js';
    script.onload = () => {
      this.initializeGoogleAuth();
    };
    document.head.appendChild(script);
  }

  initializeGoogleAuth() {
    // Configurar Google Auth (simulado para demonstração)
    console.log('Google Auth inicializado');
  }

  async signInWithGoogle() {
    try {
      // Simulação de login com Google
      // Em produção, usaria Google Sign-In API
      
      // Mostrar loading
      this.showLoading('Entrando com Google...');
      
      // Simular delay de autenticação
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Criar usuário simulado do Google
      const googleUser = {
        email: 'usuario@gmail.com',
        name: 'Usuário Google',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        id: 'google_user_id'
      };
      
      // Registrar ou fazer login
      await this.registerOrLoginGoogleUser(googleUser);
      
      // Fechar modal
      document.querySelector('.login-modal-overlay')?.remove();
      
      // Redirecionar
      safeRedirect('index.html');
      
    } catch (error) {
      console.error('Erro no login Google:', error);
      this.showError('Erro ao fazer login com Google');
    }
  }

  async registerOrLoginGoogleUser(googleUser) {
    try {
      // Verificar se usuário já existe
      const response = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          googleId: googleUser.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Salvar token e usuário
        localStorage.setItem('nutriScanToken', data.token);
        localStorage.setItem('nutriScanUser', JSON.stringify(data.user));
        localStorage.setItem('lastActivity', Date.now().toString());

          // Notificar userSync/authMonitor
          try {
            if (window.userSync && typeof window.userSync.updateUser === 'function') window.userSync.updateUser(data.user);
            if (window.authMonitor && typeof window.authMonitor.checkAuthStatus === 'function') window.authMonitor.checkAuthStatus();
          } catch (e) {
            console.warn('Falha ao notificar userSync/authMonitor após upgrade:', e);
          }
        
        this.showSuccess('Login realizado com sucesso!');
      } else {
        throw new Error(data.message || 'Erro no login');
      }
    } catch (error) {
      console.error('Erro ao registrar/login Google:', error);
      throw error;
    }
  }

  async signInWithEmail(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
      this.showLoading('Fazendo login...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('nutriScanToken', data.token);
        localStorage.setItem('nutriScanUser', JSON.stringify(data.user));
        
        document.querySelector('.login-modal-overlay')?.remove();
        safeRedirect('index.html');
      } else {
        throw new Error(data.message || 'Erro no login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      this.showError(error.message || 'Erro ao fazer login');
    }
  }

  showSignup() {
    // Implementar tela de cadastro
    alert('Tela de cadastro será implementada');
  }

  forgotPassword() {
    // Implementar recuperação de senha
    alert('Recuperação de senha será implementada');
  }

  showLoading(message) {
    // Implementar loading
    console.log('Loading:', message);
  }

  showSuccess(message) {
    // Implementar sucesso
    console.log('Success:', message);
  }

  showError(message) {
    // Implementar erro
    console.error('Error:', message);
  }
}

// Inicializar gerenciadores
let upgradePopup;
let loginManager;

document.addEventListener('DOMContentLoaded', () => {
  upgradePopup = new UpgradePopupManager();
  loginManager = new LoginManager();
});

// Funções globais para acesso inline
window.upgradePopup = upgradePopup;
window.loginManager = loginManager;

// Função para mostrar popup de upgrade
function showUpgradePopup() {
  if (upgradePopup) {
    upgradePopup.showPopup();
  }
}
