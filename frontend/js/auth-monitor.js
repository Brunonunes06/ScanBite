// Sistema de Monitoramento Contínuo de Autenticação
// Safe-Bite Authentication Monitor

class AuthMonitor {
  constructor() {
    this.isLoggedIn = false;
    this.currentUser = null;
    this.checkInterval = null;
    this.lastActivity = Date.now();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
    this.checkFrequency = 5000; // 5 segundos
    this.listeners = new Map();
    
    this.init();
  }

  init() {
    console.log('🔐 Iniciando sistema de monitoramento de autenticação');
    
    // Verificar status inicial
    this.checkAuthStatus();
    
    // Iniciar verificação periódica
    this.startPeriodicCheck();
    
    // Configurar listeners de eventos
    this.setupEventListeners();
    
    // Configurar listener de storage
    this.setupStorageListener();
    
    // Configurar listener de visibilidade da página
    this.setupVisibilityListener();
  }

  // Verificar status atual da autenticação
  checkAuthStatus() {
    const token = localStorage.getItem('nutriScanToken');
    const user = localStorage.getItem('nutriScanUser');
    const wasLoggedIn = this.isLoggedIn;
    
    this.isLoggedIn = !!(token && user);
    this.currentUser = user ? JSON.parse(user) : null;
    
    // Se o status mudou, notificar
    if (wasLoggedIn !== this.isLoggedIn) {
      this.notifyAuthChange();
    }
    
    // Atualizar UI imediatamente
    this.updateAuthUI();
    
    return this.isLoggedIn;
  }

  // Iniciar verificação periódica
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.checkAuthStatus();
      this.checkSessionTimeout();
    }, this.checkFrequency);
    
    console.log(`⏰ Verificação contínua iniciada (${this.checkFrequency/1000}s)`);
  }

  // Configurar listeners de eventos
  setupEventListeners() {
    // Monitorar atividade do usuário
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'keydown', 'keyup'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, { passive: true });
    });
    
    console.log('👆 Listeners de atividade configurados');
  }

  // Configurar listener de storage (mudanças entre abas)
  setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'nutriScanToken' || e.key === 'nutriScanUser') {
        console.log('🔄 Mudança de autenticação detectada (outra aba)');
        setTimeout(() => {
          this.checkAuthStatus();
        }, 100);
      }
    });
    
    console.log('📦 Listener de storage configurado');
  }

  // Configurar listener de visibilidade da página
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ Página ficou visível, verificando autenticação');
        this.checkAuthStatus();
      }
    });
    
    console.log('👁️ Listener de visibilidade configurado');
  }

  // Atualizar última atividade
  updateLastActivity() {
    this.lastActivity = Date.now();
    localStorage.setItem('lastActivity', this.lastActivity.toString());
  }

  // Verificar timeout da sessão
  checkSessionTimeout() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    
    if (timeSinceActivity > this.sessionTimeout && this.isLoggedIn) {
      console.log('⏰ Sessão expirada por inatividade');
      this.logout('Sessão expirada por inatividade');
    }
  }

  // Notificar mudanças de autenticação
  notifyAuthChange() {
    const status = this.isLoggedIn;
    const user = this.currentUser;
    
    console.log(`🔔 Status de autenticação mudou: ${status ? 'LOGADO' : 'DESLOGADO'}`);
    
    // Disparar eventos para listeners
    this.listeners.forEach((callback, event) => {
      try {
        callback({ status, user, timestamp: Date.now() });
      } catch (error) {
        console.error('Erro no listener de autenticação:', error);
      }
    });
    
    // Mostrar notificação visual
    this.showAuthNotification(status);
    
    // Atualizar indicadores visuais
    this.updateAuthIndicators(status);
  }

  // Mostrar notificação de autenticação
  showAuthNotification(isLoggedIn) {
    if (isLoggedIn) {
      this.showNotification('✅ Você está logado', 'success', {
        duration: 3000,
        icon: 'user-check'
      });
    } else {
      this.showNotification('🔒 Você não está logado', 'warning', {
        duration: 5000,
        icon: 'user-slash',
        actions: [
          {
            text: 'Fazer Login',
            icon: 'sign-in-alt',
            onClick: 'window.location.href = "login.html"'
          }
        ]
      });
    }
  }

  // Atualizar UI de autenticação
  updateAuthUI() {
    this.updateAuthIndicators(this.isLoggedIn);
    this.updatePlanStatus();
    this.updateUserInterface();
  }

  // Atualizar indicadores de autenticação
  updateAuthIndicators(isLoggedIn) {
    // Atualizar botão do dashboard
    const dashboardLink = document.getElementById('dashboardLink');
    if (dashboardLink) {
      if (isLoggedIn) {
        dashboardLink.style.color = '#2ecc71';
        dashboardLink.innerHTML = '<i class="fas fa-tachometer-alt"></i> Dashboard';
      } else {
        dashboardLink.style.color = '#e74c3c';
        dashboardLink.innerHTML = '<i class="fas fa-lock"></i> Dashboard';
      }
    }
    
    // Atualizar elementos de status
    const statusElements = document.querySelectorAll('.auth-status');
    statusElements.forEach(element => {
      element.textContent = isLoggedIn ? 'Conectado' : 'Desconectado';
      element.className = `auth-status ${isLoggedIn ? 'online' : 'offline'}`;
    });
  }

  // Atualizar status do plano
  updatePlanStatus() {
    const planElements = document.querySelectorAll('.plan-status');
    const user = this.currentUser;
    
    if (!planElements.length || !user) return;
    
    const planName = user.subscription?.plan || 'Free';
    const planStatus = user.subscription?.status || 'active';
    
    planElements.forEach(element => {
      element.innerHTML = `
        <span class="plan-name">${planName}</span>
        <span class="plan-indicator ${planStatus}"></span>
      `;
    });
  }

  // Atualizar interface do usuário
  updateUserInterface() {
    const user = this.currentUser;
    
    // Atualizar informações do usuário na interface
    const userElements = document.querySelectorAll('.user-info');
    userElements.forEach(element => {
      if (user) {
        element.innerHTML = `
          <div class="user-avatar">
            ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : 
              '<i class="fas fa-user"></i>'}
          </div>
          <div class="user-details">
            <div class="user-name">${user.name}</div>
            <div class="user-email">${user.email}</div>
          </div>
        `;
      } else {
        element.innerHTML = `
          <div class="login-prompt" style="cursor: pointer;">
            <i class="fas fa-user-slash"></i>
            <span>Faça login para continuar</span>
          </div>
        `;
        
        // Adicionar evento de clique
        const loginPrompt = element.querySelector('.login-prompt');
        if (loginPrompt) {
          loginPrompt.addEventListener('click', () => {
            window.location.href = 'login.html';
          });
        }
      }
    });
  }

  // Adicionar listener de eventos de autenticação
  onAuthChange(callback) {
    const id = Date.now().toString();
    this.listeners.set(id, callback);
    return id;
  }

  // Remover listener de eventos
  removeAuthListener(id) {
    this.listeners.delete(id);
  }

  // Logout
  logout(reason = 'Logout manual') {
    console.log(`🚪 Logout: ${reason}`);
    
    // Limpar dados de autenticação
    localStorage.removeItem('nutriScanToken');
    localStorage.removeItem('nutriScanUser');
    localStorage.removeItem('lastActivity');
    
    // Atualizar status
    this.isLoggedIn = false;
    this.currentUser = null;
    
    // Notificar mudança
    this.notifyAuthChange();
    
    // Redirecionar se não estiver na página de login
    if (!window.location.pathname.includes('login.html')) {
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    }
  }

  // Forçar verificação manual
  forceCheck() {
    console.log('🔍 Verificação manual forçada');
    this.checkAuthStatus();
  }

  // Obter status atual
  getStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      user: this.currentUser,
      lastActivity: this.lastActivity,
      sessionTimeLeft: Math.max(0, this.sessionTimeout - (Date.now() - this.lastActivity))
    };
  }

  // Mostrar notificação genérica
  showNotification(message, type = 'info', options = {}) {
    // Reutilizar função de notificação se existir
    if (typeof showNotification === 'function') {
      showNotification(message, type, options);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // Destruir monitor
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.listeners.clear();
    console.log('🗑️ Monitor de autenticação destruído');
  }
}

// Criar instância global
let authMonitor;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  authMonitor = new AuthMonitor();
  
  // Tornar globalmente acessível
  window.authMonitor = authMonitor;
  
  console.log('✅ Sistema de monitoramento de autenticação carregado');
});

// Exportar para uso global
window.AuthMonitor = AuthMonitor;
