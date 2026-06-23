// Sistema de Dark Mode
// Safe-Bite Theme Manager

class DarkModeManager {
  constructor() {
    this.isDarkMode = false;
    this.userPreference = null;
    this.systemPreference = null;
    // this.init();
  }

  init() {
    console.log('🌙 Iniciando sistema de dark mode');
    
    // Carregar preferências salvas
    this.loadPreferences();
    
    // Detectar preferência do sistema
    this.detectSystemPreference();
    
    // Aplicar tema inicial
    this.applyTheme(this.getEffectiveTheme());
    
    // Configurar listeners
    this.setupEventListeners();
    
    // Adicionar toggle de tema
    // this.addThemeToggle();
  }

  // Carregar preferências do usuário
  loadPreferences() {
    this.userPreference = localStorage.getItem('darkModePreference');
  }

  // Salvar preferência do usuário
  saveUserPreference(preference) {
    this.userPreference = preference;
    localStorage.setItem('darkModePreference', preference);
  }

  // Detectar preferência do sistema
  detectSystemPreference() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPreference = darkModeQuery.matches ? 'dark' : 'light';
      
      // Ouvir mudanças na preferência do sistema
      darkModeQuery.addEventListener('change', (e) => {
        this.systemPreference = e.matches ? 'dark' : 'light';
        if (this.userPreference === null) {
          this.applyTheme(this.getEffectiveTheme());
        }
      });
    }
  }

  // Obter tema efetivo
  getEffectiveTheme() {
    // Prioridade: preferência do usuário > preferência do sistema > light
    return this.userPreference || this.systemPreference || 'light';
  }

  // Aplicar tema
  applyTheme(theme) {
    this.isDarkMode = theme === 'dark';
    
    // Atualizar CSS variables
    this.updateCSSVariables(theme);
    
    // Atualizar atributos HTML
    document.documentElement.setAttribute('data-theme', theme);
    
    // Atualizar classes
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    
    // Atualizar toggle
    this.updateThemeToggle();
    
    // Disparar evento de mudança de tema
    this.dispatchThemeChange(theme);
    
    console.log(`🎨 Tema aplicado: ${theme}`);
  }

  // Atualizar variáveis CSS
  updateCSSVariables(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-card', '#3a3a3a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b0b0b0');
      root.style.setProperty('--text-muted', '#808080');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--accent-primary', '#4ecdc4');
      root.style.setProperty('--accent-secondary', '#45a049');
      root.style.setProperty('--success-green', '#27ae60');
      root.style.setProperty('--warning-yellow', '#f39c12');
      root.style.setProperty('--danger-red', '#e74c3c');
      root.style.setProperty('--info-blue', '#3498db');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--text-primary', '#2c3e50');
      root.style.setProperty('--text-secondary', '#6c757d');
      root.style.setProperty('--text-muted', '#95a5a6');
      root.style.setProperty('--border-color', '#e9ecef');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--accent-primary', '#2ecc71');
      root.style.setProperty('--accent-secondary', '#27ae60');
      root.style.setProperty('--success-green', '#2ecc71');
      root.style.setProperty('--warning-yellow', '#f39c12');
      root.style.setProperty('--danger-red', '#e74c3c');
      root.style.setProperty('--info-blue', '#3498db');
    }
  }

  // Configurar listeners de eventos
  setupEventListeners() {
    // Listener de mudança de tema customizado
    document.addEventListener('themechange', (e) => {
      this.applyTheme(e.detail.theme);
    });
    
    // Atalho de teclado para alternar tema (Ctrl/Cmd + Shift + D)
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
    
    console.log('⌨️ Atalhos de tema configurados');
  }

  // Adicionar botão de toggle
  // addThemeToggle() {
  //   const toggle = document.createElement('div');
  //   toggle.className = 'theme-toggle';
  //   toggle.innerHTML = `
  //     <button class="theme-toggle-btn" id="themeToggleBtn" title="Alternar tema (Ctrl+Shift+D)">
  //       <i class="fas fa-${this.isDarkMode ? 'sun' : 'moon'}"></i>
  //     </button>
  //   `;
    
  //   // Adicionar ao header
  //   const header = document.querySelector('.header-content');
  //   if (header) {
  //     header.appendChild(toggle);
  //   }
    
  //   // Configurar evento de clique
  //   const toggleBtn = document.getElementById('themeToggleBtn');
  //   if (toggleBtn) {
  //     toggleBtn.addEventListener('click', () => this.toggleTheme());
  //   }
  // }

  // Atualizar botão de toggle
  updateThemeToggle() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.className = `fas fa-${this.isDarkMode ? 'sun' : 'moon'}`;
      }
      toggleBtn.title = this.isDarkMode ? 
        'Ativar modo claro (Ctrl+Shift+D)' : 
        'Ativar modo escuro (Ctrl+Shift+D)';
    }
  }

  // Alternar tema
  toggleTheme() {
    const newTheme = this.isDarkMode ? 'light' : 'dark';
    this.saveUserPreference(newTheme);
    this.applyTheme(newTheme);
  }

  // Disparar evento de mudança de tema
  dispatchThemeChange(theme) {
    const event = new CustomEvent('themechange', {
      detail: { theme, isDarkMode: theme === 'dark' }
    });
    document.dispatchEvent(event);
  }

  // Obter status atual
  getStatus() {
    return {
      isDarkMode: this.isDarkMode,
      currentTheme: this.getEffectiveTheme(),
      userPreference: this.userPreference,
      systemPreference: this.systemPreference
    };
  }

  // Definir tema manualmente
  setTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      this.saveUserPreference(theme);
      this.applyTheme(theme);
    }
  }

  // Resetar para preferência do sistema
  resetToSystemPreference() {
    this.userPreference = null;
    localStorage.removeItem('darkModePreference');
    this.applyTheme(this.getEffectiveTheme());
  }

  // Destruir
  destroy() {
    // Remover listeners se necessário
    console.log('🗑️ Sistema de dark mode desativado');
  }
}

// Criar instância global
let darkModeManager;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  darkModeManager = new DarkModeManager();
  
  // Tornar globalmente acessível
  window.darkModeManager = darkModeManager;
  
  console.log('✅ Sistema de dark mode carregado');
});

// Exportar para uso global
window.DarkModeManager = DarkModeManager;
