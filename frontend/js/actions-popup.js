class ActionsPopupManager {
  constructor() {
    this.popup = null;
    this.overlay = null;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createPopup();
    this.setupEventListeners();
  }

  createPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'actionsPopupOverlay';
    overlay.className = 'actions-popup-overlay';
    
    const popupContent = `
      <div class="actions-popup-content">
        <div class="actions-popup-header">
          <h3>
            <i class="fas fa-sliders-h"></i>
            Configurações Rápidas
          </h3>
          <button class="actions-popup-close" onclick="actionsPopup.closePopup()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="actions-popup-body">
          <div class="action-item" id="themeActionItem">
            <div class="action-info">
              <div class="action-icon">
                <i class="fas fa-moon"></i>
              </div>
              <div class="action-label">
                <h4>Modo Escuro</h4>
                <p id="themeStatus">Desativado</p>
              </div>
            </div>
            <div class="action-toggle">
              <button class="toggle-switch" id="themeToggleSwitch" onclick="actionsPopup.toggleTheme(event)"></button>
            </div>
          </div>

          <!-- Atalhos de Teclado -->
          <div class="action-item">
            <div class="action-info">
              <div class="action-icon">
                <i class="fas fa-keyboard"></i>
              </div>
              <div class="action-label">
                <h4>Atalhos de Teclado</h4>
                <p>Ver lista completa</p>
              </div>
            </div>
            <button class="action-button" onclick="actionsPopup.showKeyboardShortcuts()">
              <i class="fas fa-arrow-right"></i>
            </button>
          </div>

          <!-- Notificações -->
          <div class="action-item">
            <div class="action-info">
              <div class="action-icon">
                <i class="fas fa-bell"></i>
              </div>
              <div class="action-label">
                <h4>Notificações</h4>
                <p id="notificationStatus">Ativadas</p>
              </div>
            </div>
            <div class="action-toggle">
              <button class="toggle-switch active" id="notificationToggleSwitch" onclick="actionsPopup.toggleNotifications(event)"></button>
            </div>
          </div>

          <!-- Modo Offline -->
          <div class="action-item">
            <div class="action-info">
              <div class="action-icon">
                <i class="fas fa-wifi"></i>
              </div>
              <div class="action-label">
                <h4>Disponibilidade Offline</h4>
                <p>Permite uso sem internet</p>
              </div>
            </div>
            <button class="action-button" onclick="actionsPopup.openOfflineSettings()">
              <i class="fas fa-cog"></i>
            </button>
          </div>
        </div>
        
        <div class="actions-popup-footer">
          <p><strong>Dica:</strong> Use <strong>"?"</strong> para abrir atalhos</p>
          <small>Ctrl+Shift+D para modo escuro</small>
        </div>
      </div>
    `;
    
    overlay.innerHTML = popupContent;
    document.body.appendChild(overlay);
    
    this.overlay = overlay;
    this.popup = overlay.querySelector('.actions-popup-content');
  }

  setupEventListeners() {
    // Fechar popup ao clicar no overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.closePopup();
      }
    });

    // Fechar popup ao pressionar ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closePopup();
      }
    });

    // Atualizar status do tema ao carregar
    this.updateThemeStatus();

    // Ouvir mudanças de tema para manter o toggle sincronizado
    document.addEventListener('themechange', () => {
      this.updateThemeStatus();
    });
  }

  openPopup() {
    this.overlay.classList.add('active');
    this.isOpen = true;
    this.updateThemeStatus();
    document.body.style.overflow = 'hidden';
  }

  closePopup() {
    this.overlay.classList.remove('active');
    this.isOpen = false;
    document.body.style.overflow = 'auto';
  }

  togglePopup() {
    if (this.isOpen) {
      this.closePopup();
    } else {
      this.openPopup();
    }
  }

  updateThemeStatus() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                   (window.darkModeManager && window.darkModeManager.isDarkMode) ||
                   localStorage.getItem('darkModePreference') === 'dark';
    const themeToggle = document.getElementById('themeToggleSwitch');
    const themeStatus = document.getElementById('themeStatus');
    
    if (themeToggle) {
      if (isDark) {
        themeToggle.classList.add('active');
        themeStatus.textContent = 'Ativado';
      } else {
        themeToggle.classList.remove('active');
        themeStatus.textContent = 'Desativado';
      }
    }
  }

  toggleTheme(event) {
    event.stopPropagation();
    
    if (window.darkModeManager) {
      window.darkModeManager.toggleTheme();
    }
    
    setTimeout(() => {
      this.updateThemeStatus();
    }, 100);
  }

  toggleNotifications(event) {
    event.stopPropagation();
    
    const toggle = event.target;
    const status = document.getElementById('notificationStatus');
    
    toggle.classList.toggle('active');
    status.textContent = toggle.classList.contains('active') ? 'Ativadas' : 'Desativadas';
    
    // Salvar preferência
    const isEnabled = toggle.classList.contains('active');
    localStorage.setItem('notificationsEnabled', isEnabled);
  }

  showKeyboardShortcuts() {
    this.closePopup();
    
    if (typeof showKeyboardShortcuts === 'function') {
      showKeyboardShortcuts();
    }
  }

  openOfflineSettings() {
    this.closePopup();
    
    // Avisar sobre offline
    alert('Modo offline: Esta funcionalidade estará disponível em breve.');
  }
}

// Inicializar quando DOM carregar
let actionsPopup;
function initActionsPopup() {
  if (!actionsPopup) actionsPopup = new ActionsPopupManager();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initActionsPopup);
} else {
  initActionsPopup();
}

// Função para abrir popup (pode ser chamada de qualquer lugar)
function openActionsPopup() {
  initActionsPopup();
  if (actionsPopup) {
    actionsPopup.openPopup();
  }
}

// Função para fechar popup
function closeActionsPopup() {
  if (actionsPopup) {
    actionsPopup.closePopup();
  }
}
