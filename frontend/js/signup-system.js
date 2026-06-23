// Sistema de Cadastro - Nutri-Scan
// Gerencia cadastro de novos usuários

class SignupSystem {
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
  }

  setupEventListeners() {
    // Formulário de cadastro
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    // Validação em tempo real
    this.setupRealTimeValidation();
  }

  setupRealTimeValidation() {
    // Validação de nome
    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    
    if (firstName) {
      firstName.addEventListener('blur', () => this.validateName(firstName, 'firstNameError'));
    }
    
    if (lastName) {
      lastName.addEventListener('blur', () => this.validateName(lastName, 'lastNameError'));
    }

    // Validação de email
    const email = document.getElementById('email');
    if (email) {
      email.addEventListener('blur', () => this.validateEmail(email, 'emailError'));
    }

    // Validação de senha
    const password = document.getElementById('password');
    if (password) {
      password.addEventListener('input', () => this.validatePassword(password, 'passwordError'));
    }

    // Validação de confirmação de senha
    const confirmPassword = document.getElementById('confirmPassword');
    if (confirmPassword) {
      confirmPassword.addEventListener('input', () => this.validatePasswordMatch(confirmPassword, 'confirmPasswordError'));
    }
  }

  // Limpar TODOS os dados do usuário (para logout ou troca de usuário)
  clearAllUserData() {
    console.log('🗑️ Limpando todos os dados do usuário anterior...');
    
    // Dados de autenticação
    localStorage.removeItem('nutriScanToken');
    localStorage.removeItem('nutriScanUser');
    localStorage.removeItem('nutriScanRemember');
    localStorage.removeItem('lastActivity');
    
    // Dados de scans e histórico
    localStorage.removeItem('nutriScanScans');
    localStorage.removeItem('allergyAnalysisHistory');
    localStorage.removeItem('pendingScans');
    
    // Dados de plano
    localStorage.removeItem('nutriScanPlan');
    
    // Dados do dashboard
    localStorage.removeItem('dashboardStats');
    localStorage.removeItem('dashboardScans');
    
    // Dados sincronizados
    localStorage.removeItem('syncedUser');
    
    // Limpar qualquer outro dado específico do usuário
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Remover qualquer chave que pareça ser específica do usuário
      if (key && (
        key.includes('scan') || 
        key.includes('allergy') || 
        key.includes('product') || 
        key.includes('analysis') ||
        key.includes('history')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remover as chaves identificadas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  ✓ Removido: ${key}`);
    });
    
    console.log('✅ Todos os dados do usuário foram limpos!');
  }

  async handleSignup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
      firstName: formData.get('firstName').trim(),
      lastName: formData.get('lastName').trim(),
      email: formData.get('email').trim().toLowerCase(),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      terms: formData.get('terms'),
      newsletter: formData.get('newsletter') === 'on'
    };

    // Validação completa
    if (!this.validateSignupForm(userData)) {
      return;
    }

    // Mostrar loading
    this.setLoadingState(true);
    this.hideMessages();

    try {
      // ✅ LIMPAR DADOS DO USUÁRIO ANTERIOR ANTES DO NOVO CADASTRO
      this.clearAllUserData();
      
      // Tentar verificar email e fazer cadastro, mas usar modo simulado se falhar
      let result;
      try {
        // Verificar se email já existe
        const emailCheck = await this.api.post('/auth/check-email', { email: userData.email });
        
        if (emailCheck.exists) {
          throw new Error('Este email já está cadastrado. Faça login ou use outro email.');
        }

        // Fazer cadastro
        result = await this.api.post('/auth/register', {
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          password: userData.password,
          preferences: {
            allergies: [],
            dietaryRestrictions: [],
            notifications: userData.newsletter,
            language: 'pt-BR'
          },
          subscription: {
            plan: 'free',
            status: 'active',
            startDate: new Date(),
            scansUsed: 0,
            scansLimit: 10
          }
        });
      } catch (apiError) {
        // Se falhar a conexão com o servidor, usar modo simulado
        console.log('Servidor não disponível, usando modo simulado para cadastro');
        
        // Verificar usuários já cadastrados no localStorage
        const registeredUsers = JSON.parse(localStorage.getItem('nutriScanRegisteredUsers') || '[]');
        
        // Verificar se email já existe
        if (registeredUsers.find(u => u.email === userData.email) || userData.email === 'demo@nutriscan.com') {
          throw new Error('Este email já está cadastrado. Faça login ou use outro email.');
        }
        
        // Criar novo usuário
        const newUser = {
          id: 'user_' + Date.now(),
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          password: userData.password, // Em produção, usar hash
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
            notifications: userData.newsletter,
            language: 'pt-BR'
          },
          createdAt: new Date()
        };
        
        // Salvar usuário no localStorage
        registeredUsers.push(newUser);
        localStorage.setItem('nutriScanRegisteredUsers', JSON.stringify(registeredUsers));
        
        // Criar resultado para login automático
        result = {
          success: true,
          token: 'simulated_token_' + Date.now(),
          user: {
            _id: newUser.id,
            userId: newUser.id,
            name: newUser.name,
            email: newUser.email,
            subscription: newUser.subscription,
            preferences: newUser.preferences
          }
        };
      }

      if (result.success) {
        // Salvar token e usuário
        localStorage.setItem('nutriScanToken', result.token);
        localStorage.setItem('nutriScanUser', JSON.stringify(result.user));
        localStorage.setItem('lastActivity', Date.now().toString());

        // Atualizar userSync/authMonitor se disponíveis
        try {
          if (window.userSync && typeof window.userSync.updateUser === 'function') window.userSync.updateUser(result.user);
          if (window.authMonitor && typeof window.authMonitor.checkAuthStatus === 'function') window.authMonitor.checkAuthStatus();
        } catch (e) {
          console.warn('userSync/authMonitor não disponíveis após cadastro:', e);
        }

        // Mostrar sucesso
        this.showSuccess('Conta criada com sucesso! Redirecionando...');

        // Redirecionar para index.html
        setTimeout(() => {
          safeRedirect('index.html');
        }, 2000);
      } else {
        throw new Error(result.message || 'Erro no cadastro');
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      this.showError(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async handleGoogleSignup() {
    this.setLoadingState(true);
    this.hideMessages();

    try {
      // ✅ LIMPAR DADOS DO USUÁRIO ANTERIOR ANTES DO NOVO CADASTRO COM GOOGLE
      this.clearAllUserData();
      
      // Simular cadastro com Google
      const googleUser = await this.simulateGoogleSignup();
      
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
        console.log('Servidor não disponível, usando modo simulado para cadastro Google');
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

        // Atualizar userSync/authMonitor se disponíveis
        try {
          if (window.userSync && typeof window.userSync.updateUser === 'function') window.userSync.updateUser(result.user);
          if (window.authMonitor && typeof window.authMonitor.checkAuthStatus === 'function') window.authMonitor.checkAuthStatus();
        } catch (e) {
          console.warn('userSync/authMonitor não disponíveis após cadastro Google:', e);
        }

        this.showSuccess('Conta criada com Google! Redirecionando...');

        setTimeout(() => {
          safeRedirect('index.html');
        }, 2000);
      } else {
        throw new Error(result.message || 'Erro no cadastro Google');
      }
    } catch (error) {
      console.error('Erro no cadastro Google:', error);
      this.showError(error.message || 'Erro ao criar conta com Google.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async simulateGoogleSignup() {
    // Simular resposta do Google Sign-In
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          email: 'novo.usuario@gmail.com',
          name: 'Novo Usuário',
          picture: 'https://lh3.googleusercontent.com/a/default-user',
          id: 'google_' + Date.now()
        });
      }, 1000);
    });
  }

  validateSignupForm(userData) {
    let isValid = true;

    // Validar nome
    if (!userData.firstName || userData.firstName.length < 2) {
      this.showFieldError('firstNameError', 'Nome deve ter pelo menos 2 caracteres.');
      isValid = false;
    }

    if (!userData.lastName || userData.lastName.length < 2) {
      this.showFieldError('lastNameError', 'Sobrenome deve ter pelo menos 2 caracteres.');
      isValid = false;
    }

    // Validar email
    if (!this.isValidEmail(userData.email)) {
      this.showFieldError('emailError', 'Por favor, insira um email válido.');
      isValid = false;
    }

    // Validar senha
    if (!userData.password || userData.password.length < 6) {
      this.showFieldError('passwordError', 'A senha deve ter pelo menos 6 caracteres.');
      isValid = false;
    }

    // Validar confirmação de senha
    if (userData.password !== userData.confirmPassword) {
      this.showFieldError('confirmPasswordError', 'As senhas não coincidem.');
      isValid = false;
    }

    // Validar termos
    if (!userData.terms) {
      this.showError('Você deve aceitar os Termos de Uso e Política de Privacidade.');
      isValid = false;
    }

    return isValid;
  }

  validateName(input, errorId) {
    const name = input.value.trim();
    const errorElement = document.getElementById(errorId);
    
    if (name.length > 0 && name.length < 2) {
      input.classList.add('error');
      this.showFieldError(errorId, 'Nome deve ter pelo menos 2 caracteres.');
      return false;
    } else {
      input.classList.remove('error');
      this.hideFieldError(errorId);
      return true;
    }
  }

  validateEmail(input, errorId) {
    const email = input.value.trim();
    const errorElement = document.getElementById(errorId);
    
    if (email.length > 0 && !this.isValidEmail(email)) {
      input.classList.add('error');
      this.showFieldError(errorId, 'Por favor, insira um email válido.');
      return false;
    } else {
      input.classList.remove('error');
      this.hideFieldError(errorId);
      return true;
    }
  }

  validatePassword(input, errorId) {
    const password = input.value;
    const errorElement = document.getElementById(errorId);
    
    if (password.length > 0 && password.length < 6) {
      input.classList.add('error');
      this.showFieldError(errorId, 'A senha deve ter pelo menos 6 caracteres.');
      return false;
    } else {
      input.classList.remove('error');
      this.hideFieldError(errorId);
      return true;
    }
  }

  validatePasswordMatch(input, errorId) {
    const password = document.getElementById('password').value;
    const confirmPassword = input.value;
    const errorElement = document.getElementById(errorId);
    
    if (confirmPassword.length > 0 && password !== confirmPassword) {
      input.classList.add('error');
      this.showFieldError(errorId, 'As senhas não coincidem.');
      return false;
    } else {
      input.classList.remove('error');
      this.hideFieldError(errorId);
      return true;
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showFieldError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    } else {
      console.warn(`Elemento de erro #${errorId} não encontrado`);
    }
  }

  hideFieldError(fieldId) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
      errorElement.style.display = 'none';
    } else {
      console.warn(`Elemento de erro #${fieldId} não encontrado`);
    }
  }

  setLoadingState(loading) {
    const signupBtn = document.getElementById('signupBtn');
    const googleBtn = document.querySelector('.google-signup-btn');

    if (loading) {
      if (signupBtn) {
        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
      }
      if (googleBtn) {
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
      }
    } else {
      if (signupBtn) {
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Criar Conta Gratuita';
      }
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = '<img src="https://developers.google.com/identity/images/g-logo.png" alt="Google"><span>Criar conta com Google</span>';
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
}

// Funções globais para acesso inline
function handleSignup(event) {
  signupSystem.handleSignup(event);
}

function handleGoogleSignup() {
  signupSystem.handleGoogleSignup();
}

// Inicializar sistema
let signupSystem;
document.addEventListener('DOMContentLoaded', () => {
  signupSystem = new SignupSystem();
});

// Disponibilizar globalmente
window.signupSystem = signupSystem;
