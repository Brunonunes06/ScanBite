// Sistema de Login Completo - Nutri-Scan
// Gerencia login, cadastro e autenticação Google

class LoginSystem {
  constructor() {
    // Verificar se NutriScanAPI está disponível
    if (typeof NutriScanAPI !== 'undefined') {
      this.api = new NutriScanAPI();
    } else {
      console.warn('NutriScanAPI não encontrada, usando modo simulado');
      this.api = null;
    }
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkExistingSession();
  }

  setupEventListeners() {
    // Formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Verificar se estamos na página de login
    if (window.location.pathname.includes('login.html')) {
      this.setupLoginPage();
    }
  }

  setupLoginPage() {
    // Adicionar validação em tempo real
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput) {
      emailInput.addEventListener('blur', () => this.validateEmail(emailInput));
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => this.validatePassword(passwordInput));
    }
  }

  checkExistingSession() {
    const token = localStorage.getItem('nutriScanToken');
    const user = localStorage.getItem('nutriScanUser');

    if (token && user) {
      // Usuário já está logado, redirecionar para dashboard
      if (window.location.pathname.includes('login.html') || 
          window.location.pathname.includes('index.html')) {
        safeRedirect('dashboard.html');
      }
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe');

    // Validação
    if (!this.validateLoginForm(email, password)) {
      return;
    }

    // Mostrar loading
    this.setLoadingState(true);
    this.hideMessages();

    try {
      // Tentar fazer login, mas usar modo simulado se falhar
      let result;
      try {
        result = await this.api.login(email, password);
      } catch (apiError) {
        // Se falhar a conexão com o servidor, usar modo simulado
        console.log('Servidor não disponível, usando modo simulado para login');
        
        // Verificar se existe usuário cadastrado no localStorage
        const registeredUsers = JSON.parse(localStorage.getItem('nutriScanRegisteredUsers') || '[]');
        const foundUser = registeredUsers.find(u => u.email === email);
        
        if (foundUser && foundUser.password === password) {
          result = {
            success: true,
            token: 'simulated_token_' + Date.now(),
            user: {
              _id: foundUser.id,
              userId: foundUser.id,
              email: foundUser.email,
              name: foundUser.name,
              subscription: foundUser.subscription || {
                plan: 'free',
                status: 'active',
                startDate: new Date(),
                scansUsed: 0,
                scansLimit: 10
              },
              preferences: foundUser.preferences || {
                allergies: [],
                dietaryRestrictions: [],
                notifications: true,
                language: 'pt-BR'
              }
            }
          };
        } else if (email === 'demo@nutriscan.com' && password === 'demo123') {
          // Usuário demo para testes
          result = {
            success: true,
            token: 'simulated_token_' + Date.now(),
            user: {
              _id: 'demo_user',
              userId: 'demo_user',
              email: email,
              name: 'Usuário Demo',
              subscription: {
                plan: 'free',
                status: 'active',
                startDate: new Date(),
                scansUsed: 0,
                scansLimit: 10
              },
              preferences: {
                allergies: [],
                dietaryRestrictions: [],
                notifications: true,
                language: 'pt-BR'
              }
            }
          };
        } else {
          throw new Error('Email ou senha inválidos. Verifique seus dados ou crie uma conta.');
        }
      }
      
      if (result.success) {
        // Salvar dados do usuário
        localStorage.setItem('nutriScanToken', result.token);
        localStorage.setItem('nutriScanUser', JSON.stringify(result.user));
        localStorage.setItem('lastActivity', Date.now().toString());

        // Atualizar sistema de sincronização se presente
        try {
          if (window.userSync && typeof window.userSync.updateUser === 'function') {
            window.userSync.updateUser(result.user);
          }
          if (window.authMonitor && typeof window.authMonitor.checkAuthStatus === 'function') {
            window.authMonitor.checkAuthStatus();
          }
        } catch (e) {
          console.warn('Não foi possível atualizar userSync/authMonitor imediatamente:', e);
        }

        // Lembrar-me
        if (rememberMe) {
          localStorage.setItem('nutriScanRemember', 'true');
        } else {
          localStorage.removeItem('nutriScanRemember');
        }

        // Mostrar sucesso
        this.showSuccess('Login realizado com sucesso! Redirecionando...');

        // Redirecionar
        setTimeout(() => {
          const redirectUrl = this.getRedirectUrl();
          safeRedirect(redirectUrl);
        }, 1500);
      } else {
        throw new Error(result.message || 'Erro no login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      this.showError(error.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async handleGoogleLogin() {
    this.setLoadingState(true);
    this.hideMessages();

    try {
      // Simular login Google (em produção, usaria Google Sign-In API)
      const googleUser = await this.simulateGoogleLogin();
      
      // Tentar enviar para backend, mas usar modo simulado se falhar
      let result;
      try {
        result = await this.api.post('/auth/google-login', {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          googleId: googleUser.id
        });
      } catch (apiError) {
        // Se falhar a conexão com o servidor, usar modo simulado
        console.log('Servidor não disponível, usando modo simulado');
        result = {
          success: true,
          token: 'simulated_token_' + Date.now(),
          user: {
            _id: 'user_' + Date.now(),
            userId: 'user_' + Date.now(),
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            subscription: {
              plan: 'free',
              status: 'active',
              startDate: new Date(),
              scansUsed: 0,
              scansLimit: 10
            },
            preferences: {
              allergies: [],
              dietaryRestrictions: [],
              notifications: true,
              language: 'pt-BR'
            }
          }
        };
      }

      if (result.success) {
        // Salvar dados
        localStorage.setItem('nutriScanToken', result.token);
        localStorage.setItem('nutriScanUser', JSON.stringify(result.user));

        // Atualizar sistema de sincronização se presente
        try {
          if (window.userSync && typeof window.userSync.updateUser === 'function') {
            window.userSync.updateUser(result.user);
          }
          if (window.authMonitor && typeof window.authMonitor.checkAuthStatus === 'function') {
            window.authMonitor.checkAuthStatus();
          }
        } catch (e) {
          console.warn('Não foi possível atualizar userSync/authMonitor imediatamente:', e);
        }

        this.showSuccess('Login com Google realizado com sucesso!');

        setTimeout(() => {
          const redirectUrl = this.getRedirectUrl();
          safeRedirect(redirectUrl);
        }, 1500);
      } else {
        throw new Error(result.message || 'Erro no login Google');
      }
    } catch (error) {
      console.error('Erro no login Google:', error);
      this.showError(error.message || 'Erro ao fazer login com Google.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async simulateGoogleLogin() {
    // Simular resposta do Google Sign-In
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          email: 'usuario@gmail.com',
          name: 'Usuário Teste',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
          id: 'google_' + Date.now()
        });
      }, 1000);
    });
  }

  validateLoginForm(email, password) {
    let isValid = true;

    // Validar email
    if (!this.isValidEmail(email)) {
      this.showError('Por favor, insira um email válido.');
      isValid = false;
    }

    // Validar senha
    if (!password || password.length < 6) {
      this.showError('A senha deve ter pelo menos 6 caracteres.');
      isValid = false;
    }

    return isValid;
  }

  validateEmail(input) {
    const email = input.value.trim();
    const isValid = this.isValidEmail(email);

    if (!isValid && email) {
      input.style.borderColor = '#e74c3c';
      this.showError('Por favor, insira um email válido.');
    } else {
      input.style.borderColor = '';
      this.hideMessages();
    }

    return isValid;
  }

  validatePassword(input) {
    const password = input.value;
    
    if (password.length > 0 && password.length < 6) {
      input.style.borderColor = '#e74c3c';
      this.showError('A senha deve ter pelo menos 6 caracteres.');
    } else {
      input.style.borderColor = '';
      this.hideMessages();
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  setLoadingState(loading) {
    const loginBtn = document.getElementById('loginBtn');
    const googleBtn = document.querySelector('.google-login-btn');

    if (loading) {
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
      }
      if (googleBtn) {
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
      }
    } else {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
      }
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = '<img src="https://developers.google.com/identity/images/g-logo.png" alt="Google"><span>Continuar com Google</span>';
      }
    }
  }

  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    this.hideSuccess();
  }

  showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
    }
    this.hideError();
  }

  hideError() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  hideSuccess() {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
      successElement.style.display = 'none';
    }
  }

  hideMessages() {
    this.hideError();
    this.hideSuccess();
  }

  getRedirectUrl() {
    // Verificar se há URL de redirecionamento salva
    const savedUrl = sessionStorage.getItem('redirectUrl');
    if (savedUrl) {
      sessionStorage.removeItem('redirectUrl');
      return savedUrl;
    }

    // Sempre redirecionar para index.html após login
    return 'index.html';
  }

  logout() {
    // Remover dados de autenticação
    localStorage.removeItem('nutriScanToken');
    localStorage.removeItem('nutriScanUser');
    localStorage.removeItem('nutriScanRemember');

    // Redirecionar para login
    safeRedirect('login.html');
  }

  // Verificar se usuário está autenticado
  isAuthenticated() {
    const token = localStorage.getItem('nutriScanToken');
    const user = localStorage.getItem('nutriScanUser');
    return !!(token && user);
  }

  // Obter usuário atual
  getCurrentUser() {
    const userStr = localStorage.getItem('nutriScanUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Verificar se usuário é premium
  isPremium() {
    const user = this.getCurrentUser();
    return user?.subscription?.plan === 'premium' && user?.subscription?.status === 'active';
  }
}

// Funções globais para acesso inline
function handleLogin(event) {
  loginSystem.handleLogin(event);
}

function handleGoogleLogin() {
  loginSystem.handleGoogleLogin();
}

function handleForgotPassword(event) {
  event.preventDefault();
  // Implementar recuperação de senha
  alert('Funcionalidade de recuperação de senha será implementada em breve.');
}

function handleSignup(event) {
  event.preventDefault();
  // Redirecionar para página de cadastro ou mostrar modal
  safeRedirect('signup.html');
}

// Inicializar sistema
let loginSystem;
document.addEventListener('DOMContentLoaded', () => {
  loginSystem = new LoginSystem();
});

// Disponibilizar globalmente
window.loginSystem = loginSystem;
