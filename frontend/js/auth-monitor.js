// =============================================
// AuthMonitor - Sistema de Autenticação Nutri-Scan
// Versão limpa, robusta e sincronizada
// =============================================

class AuthMonitor {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    console.log('🔐 AuthMonitor inicializado');
    this.loadFromStorage();
    this.checkAuthStatus();

    // Listener para mudanças em outras abas
    window.addEventListener('storage', (e) => {
      if (e.key === 'nutriScanUser' || e.key === 'nutriScanToken') {
        console.log('🔄 Mudança detectada em outra aba');
        this.checkAuthStatus();
      }
    });
  }

  loadFromStorage() {
    try {
      const savedUser = localStorage.getItem('nutriScanUser');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      } else {
        this.currentUser = null;
      }
    } catch (e) {
      console.error('Erro ao carregar usuário do LocalStorage:', e);
      this.currentUser = null;
    }
  }

  saveToStorage(user) {
    try {
      localStorage.setItem('nutriScanUser', JSON.stringify(user));
    } catch (e) {
      console.error('Erro ao salvar usuário:', e);
    }
  }

  /**
   * Verifica status atual e atualiza a interface
   */
  checkAuthStatus() {
    this.loadFromStorage();
    this.updateUserInterface();
  }

  /**
   * Atualiza a interface do usuário (nome, foto e toggle de visibilidade)
   */
  updateUserInterface() {
    const loginPrompt = document.getElementById('loginPrompt');
    const userLoggedIn = document.getElementById('userLoggedIn');
    const userNameElement = document.getElementById('user-name');
    const userPicElement = document.getElementById('user-pic');
    const authStatusElement = document.getElementById('authStatus');

    const user = this.currentUser;

    if (user && user.name) {
      // ==================== USUÁRIO LOGADO ====================
      if (userNameElement) {
        userNameElement.textContent = user.name || 'Usuário';
      }

      if (userPicElement) {
        const picUrl = user.picture || user.avatar || user.photoURL || user.picUrl;
        if (picUrl) {
          userPicElement.src = picUrl;
        }
      }

      // Toggle de visibilidade
      if (loginPrompt) loginPrompt.style.display = 'none';
      if (userLoggedIn) userLoggedIn.style.display = 'flex';

      // Status
      if (authStatusElement) {
        authStatusElement.textContent = 'Conectado';
        authStatusElement.classList.remove('offline');
        authStatusElement.classList.add('online');
      }
    } else {
      // ==================== USUÁRIO DESLOGADO ====================
      if (userNameElement) userNameElement.textContent = 'Convidado';

      if (userPicElement) {
        // Fallback SVG offline
        userPicElement.src = 
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjEyIiByPSI2IiBmaWxsPSIjY2NjIi8+PHBhdGggZD0iTTAgMzJIMzJWMjRDMzIgMTggMjYgMTIgMTYgMTJTMCAxOCAwIDI0VjMyWiIgZmlsbD0iI2NjYyIvPjwvc3ZnPg==';
      }

      // Toggle de visibilidade
      if (loginPrompt) loginPrompt.style.display = 'flex';
      if (userLoggedIn) userLoggedIn.style.display = 'none';

      // Status
      if (authStatusElement) {
        authStatusElement.textContent = 'Desconectado';
        authStatusElement.classList.add('offline');
        authStatusElement.classList.remove('online');
      }
    }
  }

  /**
   * Logout seguro
   */
  logout(reason = 'Logout manual') {
    console.log(`🚪 Logout realizado: ${reason}`);

    this.currentUser = null;
    localStorage.removeItem('nutriScanUser');
    localStorage.removeItem('nutriScanToken');

    this.updateUserInterface();

    // Opcional: redirecionar para login
    if (!window.location.pathname.includes('login.html')) {
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 800);
    }
  }

  /**
   * Força verificação manual (útil após login)
   */
  forceCheck() {
    this.checkAuthStatus();
  }
}

// ====================== INSTÂNCIA GLOBAL ======================

let authMonitorInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!authMonitorInstance) {
    authMonitorInstance = new AuthMonitor();
    window.authMonitor = authMonitorInstance;
    console.log('✅ AuthMonitor carregado com sucesso');
  }
});

// Export para compatibilidade
window.AuthMonitor = AuthMonitor;