// Sistema de Atalhos de Teclado Globais
// Safe-Bite Keyboard Shortcuts Manager

class KeyboardShortcutsManager {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.helpModal = null;
    // this.init();
  }

  init() {
    console.log('⌨️ Iniciando sistema de atalhos de teclado');
    
    // Configurar atalhos padrão
    this.setupDefaultShortcuts();
    
    // Configurar listener de eventos
    this.setupEventListeners();
    
    // Adicionar botão de ajuda
    // this.addHelpButton();
  }

  // Configurar atalhos padrão
  setupDefaultShortcuts() {
    // Navegação
    this.addShortcut('h', 'home', 'Ir para página inicial', () => {
      window.location.href = 'index.html';
    });
    
    this.addShortcut('d', 'theme-shortcut', 'Alternar tema', () => {
      if (window.darkModeManager) {
        darkModeManager.toggleTheme();
      }
    });
    
    this.addShortcut('s', 'scan', 'Iniciar novo scan', () => {
      if (typeof simulateUploadAndScan === 'function') {
        simulateUploadAndScan();
      } else {
        window.location.href = 'index.html#como-funciona';
      }
    });
    
    // Ações
    this.addShortcut('n', 'new', 'Novo scan', () => {
      if (typeof simulateUploadAndScan === 'function') {
        simulateUploadAndScan();
      }
    });
    
    this.addShortcut('e', 'export', 'Exportar dados', () => {
      if (typeof exportScanData === 'function') {
        exportScanData();
      }
    });
    
    this.addShortcut('f', 'search', 'Focar busca', () => {
      const searchInput = document.getElementById('scanSearch');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    });
    
    // Interface
    this.addShortcut('t', 'theme', 'Alternar tema', () => {
      if (window.darkModeManager) {
        darkModeManager.toggleTheme();
      }
    });
    
    this.addShortcut('l', 'logout', 'Logout', () => {
      if (window.authMonitor) {
        authMonitor.logout('Logout via atalho de teclado');
      }
    });
    
    // Ajuda
    this.addShortcut('?', 'help', 'Mostrar ajuda', () => {
      this.showHelp();
    });
    
    // Modificadores
    this.addShortcut(['ctrl', 'shift', 'd'], 'theme', 'Alternar tema (Ctrl+Shift+D)', () => {
      if (window.darkModeManager) {
        darkModeManager.toggleTheme();
      }
    });
    
    this.addShortcut(['ctrl', 'shift', 's'], 'save', 'Salvar dados', () => {
      if (typeof saveToLocalStorage === 'function') {
        saveToLocalStorage();
      }
    });
    
    this.addShortcut(['ctrl', 'shift', 'r'], 'refresh', 'Recarregar dados', () => {
      if (window.authMonitor) {
        authMonitor.forceCheck();
      }
    });
    
    this.addShortcut(['ctrl', 'shift', 'e'], 'export', 'Exportar dados', () => {
      if (typeof exportScanData === 'function') {
        exportScanData();
      }
    });
    
    // Navegação no dashboard
    this.addShortcut('left', 'previous', 'Página anterior', () => {
      if (typeof previousPage === 'function') {
        previousPage();
      }
    });
    
    this.addShortcut('right', 'next', 'Próxima página', () => {
      if (typeof nextPage === 'function') {
        nextPage();
      }
    });
    
    this.addShortcut('escape', 'close', 'Fechar modal', () => {
      this.closeAllModals();
    });
    
    console.log(`📋 ${this.shortcuts.size} atalhos configurados`);
  }

  // Adicionar atalho
  addShortcut(keys, id, description, action) {
    const shortcut = {
      keys: Array.isArray(keys) ? keys : [keys],
      id,
      description,
      action,
      enabled: true
    };
    
    this.shortcuts.set(id, shortcut);
  }

  // Configurar listener de eventos
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;
      
      // Ignorar atalhos em campos de input
      if (this.isInputElement(e.target)) {
        return;
      }
      
      // Verificar cada atalho
      this.shortcuts.forEach((shortcut, id) => {
        if (this.matchesShortcut(e, shortcut)) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log(`⌨️ Atalho acionado: ${id}`);
          
          try {
            shortcut.action();
          } catch (error) {
            console.error(`Erro ao executar atalho ${id}:`, error);
          }
        }
      });
    });
    
    console.log('🎧 Listener de atalhos configurado');
  }

  // Verificar se atalho corresponde
  matchesShortcut(event, shortcut) {
    if (!shortcut.enabled) return false;
    
    const keys = [];
    if (event.ctrlKey) keys.push('ctrl');
    if (event.shiftKey) keys.push('shift');
    if (event.altKey) keys.push('alt');
    if (event.metaKey) keys.push('meta');
    
    // Adicionar tecla principal
    const mainKey = event.key.toLowerCase();
    if (mainKey !== 'control' && mainKey !== 'shift' && mainKey !== 'alt' && mainKey !== 'meta') {
      keys.push(mainKey);
    }
    
    // Verificar se combinação corresponde
    return this.arraysEqual(keys.sort(), shortcut.keys.sort());
  }

  // Comparar arrays
  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Verificar se elemento é input
  isInputElement(element) {
    const inputTypes = ['input', 'textarea', 'select'];
    const contentEditable = element.contentEditable === 'true';
    
    return inputTypes.includes(element.tagName.toLowerCase()) || contentEditable;
  }

  // Fechar todos os modais
  closeAllModals() {
    const modals = document.querySelectorAll('.modal, .notification, .advanced-notification');
    modals.forEach(modal => {
      if (modal.remove) {
        modal.remove();
      } else if (modal.style) {
        modal.style.display = 'none';
      }
    });
  }

   // Mostrar modal de ajuda
  showHelp() {
    if (this.helpModal) {
      this.helpModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'keyboard-help-modal';
    modal.innerHTML = `
      <div class="help-overlay" onclick="this.parentElement.remove()"></div>
      <div class="help-content">
        <div class="help-header">
          <h3>⌨️ Atalhos de Teclado</h3>
          <button class="help-close" onclick="this.closest('.keyboard-help-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="help-body">
          <div class="help-sections">
            ${this.generateHelpSections()}
          </div>
          <div class="help-tips">
            <h4>💡 Dicas</h4>
            <ul>
              <li>Use <kbd>?</kbd> para abrir esta ajuda a qualquer momento</li>
              <li>Atalhos não funcionam em campos de texto</li>
              <li>Combine <kbd>Ctrl</kbd> ou <kbd>Cmd</kbd> com outras teclas para ações avançadas</li>
              <li>Pressione <kbd>Esc</kbd> para fechar modais</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.helpModal = modal;
    
    // Focar no modal
    setTimeout(() => {
      const closeBtn = modal.querySelector('.help-close');
      if (closeBtn) {
        closeBtn.focus();
      }
    }, 100);
  }

  // Gerar seções de ajuda
  generateHelpSections() {
    const sections = {
      '🧭 Navegação': [
        { keys: 'H', desc: 'Ir para página inicial' },
        { keys: 'D', desc: 'Alternar tema' },
        { keys: '← →', desc: 'Navegar entre páginas' }
      ],
      '📸 Scans': [
        { keys: 'S', desc: 'Iniciar novo scan' },
        { keys: 'N', desc: 'Novo scan' },
        { keys: 'F', desc: 'Focar busca' }
      ],
      '⚙️ Ações': [
        { keys: 'T', desc: 'Alternar tema' },
        { keys: 'E', desc: 'Exportar dados' },
        { keys: 'L', desc: 'Logout' }
      ],
      '🔧 Avançado': [
        { keys: 'Ctrl+Shift+D', desc: 'Alternar tema' },
        { keys: 'Ctrl+Shift+S', desc: 'Salvar dados' },
        { keys: 'Ctrl+Shift+R', desc: 'Recarregar dados' },
        { keys: 'Ctrl+Shift+E', desc: 'Exportar dados' }
      ],
      '🎮 Controle': [
        { keys: 'Esc', desc: 'Fechar modal' },
        { keys: '?', desc: 'Mostrar ajuda' }
      ]
    };
    
    let html = '';
    for (const [title, shortcuts] of Object.entries(sections)) {
      html += `
        <div class="help-section">
          <h4>${title}</h4>
          <div class="shortcuts-list">
            ${shortcuts.map(shortcut => `
              <div class="shortcut-item">
                <div class="shortcut-keys">
                  ${this.formatKeys(shortcut.keys)}
                </div>
                <div class="shortcut-desc">${shortcut.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  // Formatar teclas para exibição
  formatKeys(keys) {
    if (typeof keys === 'string') {
      return `<kbd>${keys}</kbd>`;
    }
    
    return keys.map(key => {
      if (key.includes('+')) {
        return key.split('+').map(k => `<kbd>${k}</kbd>`).join(' + ');
      }
      return `<kbd>${key}</kbd>`;
    }).join(' + ');
  }

  // Habilitar/desabilitar atalhos
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🔧 Atalhos ${enabled ? 'habilitados' : 'desabilitados'}`);
  }

  // Obter lista de atalhos
  getShortcuts() {
    const shortcuts = [];
    this.shortcuts.forEach((shortcut, id) => {
      shortcuts.push({
        id,
        keys: shortcut.keys,
        description: shortcut.description,
        enabled: shortcut.enabled
      });
    });
    return shortcuts;
  }

  // Destruir
  destroy() {
    this.shortcuts.clear();
    if (this.helpModal) {
      this.helpModal.remove();
    }
    console.log('🗑️ Sistema de atalhos desativado');
  }
}

// Criar instância global
let keyboardShortcuts;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  keyboardShortcuts = new KeyboardShortcutsManager();
  
  // Tornar globalmente acessível
  window.keyboardShortcuts = keyboardShortcuts;
  
  console.log('✅ Sistema de atalhos de teclado carregado');
});

// Exportar para uso global
window.KeyboardShortcutsManager = KeyboardShortcutsManager;
