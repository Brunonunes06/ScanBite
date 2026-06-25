// =============================================
// LoginSystem - Ouro Negro Café (Google Login)
// Apenas a parte de autenticação
// =============================================

class LoginSystem {
  constructor() {
    this.authMonitor = window.authMonitor;
    this.googleInitialized = false;

    this.setupGoogleCallbackBridge();
    this.initializeGoogleIdentity();
    console.log('🔑 LoginSystem Ouro Negro carregado');
  }

  initializeGoogleIdentity() {
    if (typeof google === 'undefined' || !google.accounts?.id) {
      setTimeout(() => this.initializeGoogleIdentity(), 600);
      return;
    }

    const CLIENT_ID = "26159719847-pbm48bkdvn0kdojt74if1dh2s2bmnhi2.apps.googleusercontent.com";

    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "signin"
    });

    this.googleInitialized = true;
    console.log('✅ Google Sign-In inicializado');
  }

  setupGoogleCallbackBridge() {
    window.handleCredentialResponse = (response) => {
      if (response?.credential) {
        this.handleGoogleLogin(response.credential);
      }
    };

    // Compatibilidade com botões antigos
    window.handleGoogleLogin = () => {
      this.triggerGoogleLogin();
    };
  }

  triggerGoogleLogin() {
    if (!this.googleInitialized) {
      this.initializeGoogleIdentity();
      setTimeout(() => google.accounts.id.prompt(), 800);
      return;
    }
    google.accounts.id.prompt();
  }

  decodeJwtResponse(token) {
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Erro ao decodificar JWT:', e);
      return null;
    }
  }

  handleGoogleLogin(credential) {
    const googleUser = this.decodeJwtResponse(credential);
    if (!googleUser) return;

    const userData = {
      name: googleUser.name || googleUser.given_name + " " + (googleUser.family_name || ""),
      picture: googleUser.picture,
      email: googleUser.email,
      sub: googleUser.sub,
      loggedAt: new Date().toISOString()
    };

    // Salvar dados
    localStorage.setItem('nutriScanUser', JSON.stringify(userData));
    localStorage.setItem('nutriScanToken', credential);

    // Atualizar interface
    if (this.authMonitor) {
      this.authMonitor.currentUser = userData;
      this.authMonitor.updateUserInterface();
    }

    console.log('✅ Login realizado:', userData.name);

    // Fechar modal de login
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'none';

    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
  }
}

// ====================== INICIALIZAÇÃO ======================
document.addEventListener('DOMContentLoaded', () => {
  if (!window.loginSystem) {
    window.loginSystem = new LoginSystem();
  }
});

// Globais para compatibilidade
window.handleCredentialResponse = (response) => {
  if (window.loginSystem) window.loginSystem.handleCredentialResponse(response);
};

window.handleGoogleLogin = () => {
  if (window.loginSystem) window.loginSystem.triggerGoogleLogin();
};