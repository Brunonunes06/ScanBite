/**
 * Settings Buttons Manager
 * Gerencia as funções dos botões da página de configurações
 * Com animações de deslize para os lados
 */

class SettingsButtonsManager {
  constructor() {
    this.initializeButtons();
  }

  /**
   * Inicializa todos os botões com listeners
   */
//   initializeButtons() {
//     // Salvar
//     const saveBtn = document.querySelector('button[onclick="saveSettings()"]');
//     if (saveBtn) {
//       saveBtn.addEventListener('click', (e) => this.slideOutAction(e, this.handleSaveSettings.bind(this)));
//     }

//     // Exportar
//     const exportBtn = document.querySelector('button[onclick="exportData()"]');
//     if (exportBtn) {
//       exportBtn.addEventListener('click', (e) => this.slideOutAction(e, this.handleExportData.bind(this)));
//     }

//     // Limpar Histórico
//     const clearBtn = document.querySelector('button[onclick="clearHistory()"]');
//     if (clearBtn) {
//       clearBtn.addEventListener('click', (e) => this.slideOutAction(e, this.handleClearHistory.bind(this)));
//     }

//     // Sair
//     const logoutBtn = document.querySelector('button[onclick="logout()"]');
//     if (logoutBtn) {
//       logoutBtn.addEventListener('click', (e) => this.slideOutAction(e, this.handleLogout.bind(this)));
//     }

//     // Limpar Cache
//     const cacheBtn = document.querySelector('button[onclick="clearCache()"]');
//     if (cacheBtn) {
//       cacheBtn.addEventListener('click', (e) => this.slideOutAction(e, this.handleClearCache.bind(this)));
//     }

//     // Restaurar Padrão
//     const resetBtn = document.querySelector('button[onclick="resetSettings()"]');
//     if (resetBtn) {
//       resetBtn.addEventListener('click', (e) => this.slideOutAction(e, this.handleResetSettings.bind(this)));
//     }
//   }

  /**
   * Animação de deslize para o lado quando o botão é clicado
   * @param {Event} e - Evento do clique
   * @param {Function} callback - Função a executar após a animação
   */
  slideOutAction(e, callback) {
    e.preventDefault();
    const button = e.target.closest('button');

    // Adicionar classe de animação de deslize
    button.classList.add('slide-out-right');

    // Executar callback após a animação
    setTimeout(() => {
      callback();
      button.classList.remove('slide-out-right');
      // Animar de volta
      button.style.animation = 'slideInLeft 0.5s ease forward';
      setTimeout(() => {
        button.style.animation = '';
      }, 500);
    }, 400);
  }

  /**
   * Salvar configurações
   */
  handleSaveSettings() {
    console.log('✅ Salvando configurações...');
    
    // Simular salvamento
    this.showNotification('Configurações salvas com sucesso!', 'success');
    
    // Adicionar efeito visual no botão
    this.addPulseEffect();
  }

  /**
   * Exportar dados
   */
  handleExportData() {
    console.log('📥 Exportando dados...');
    
    // Simular exportação
    this.showNotification('Dados exportados com sucesso!', 'success');
    
    // Adicionar efeito de download
    this.addDownloadEffect();
  }

  /**
   * Limpar histórico
   */
  handleClearHistory() {
    if (confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
      console.log('🗑️ Limpando histórico...');
      this.showNotification('Histórico limpo com sucesso!', 'success');
      this.addTrashEffect();
    }
  }

  /**
   * Logout
   */
  handleLogout() {
    if (confirm('Tem certeza que deseja sair da sua conta?')) {
      console.log('👋 Saindo da conta...');
      this.showNotification('Saindo da conta...', 'warning');
      
      // Simular logout após animação
      setTimeout(() => {
        localStorage.removeItem('nutriScanToken');
        localStorage.removeItem('nutriScanUser');
            safeRedirect('index.html');
      }, 500);
    }
  }

  /**
   * Limpar cache
   */
  handleClearCache() {
    console.log('🧹 Limpando cache...');
    this.showNotification('Cache limpo com sucesso!', 'success');
    this.addBroomEffect();
  }

  /**
   * Restaurar configurações padrão
   */
  handleResetSettings() {
    if (confirm('Tem certeza que deseja restaurar todas as configurações ao padrão?')) {
      console.log('🔄 Restaurando configurações padrão...');
      this.showNotification('Configurações restauradas ao padrão!', 'warning');
      
      // Limpar localStorage
      localStorage.removeItem('nutriscan_settings');
      
      // Recarregar página
      setTimeout(() => {
        location.reload();
      }, 1000);
    }
  }

  /**
   * Mostrar notificação na tela
   * @param {string} message - Mensagem a exibir
   * @param {string} type - Tipo: 'success', 'warning', 'error'
   */
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${this.getIconByType(type)}"></i>
      <span>${message}</span>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${this.getColorByType(type)};
      color: white;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 0.8rem;
      font-weight: 500;
      z-index: 9999;
      animation: slideInRight 0.5s ease;
    `;

    document.body.appendChild(notification);

    // Remover após 3 segundos
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.5s ease';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }

  /**
   * Obter ícone baseado no tipo de notificação
   * @param {string} type - Tipo de notificação
   * @returns {string} Nome do ícone Font Awesome
   */
  getIconByType(type) {
    const icons = {
      success: 'check-circle',
      warning: 'exclamation-circle',
      error: 'times-circle'
    };
    return icons[type] || 'info-circle';
  }

  /**
   * Obter cor baseada no tipo de notificação
   * @param {string} type - Tipo de notificação
   * @returns {string} Cor em formato gradiente
   */
  getColorByType(type) {
    const colors = {
      success: 'linear-gradient(135deg, #2ecc71, #27ae60)',
      warning: 'linear-gradient(135deg, #f39c12, #e67e22)',
      error: 'linear-gradient(135deg, #e74c3c, #c0392b)'
    };
    return colors[type] || 'linear-gradient(135deg, #3498db, #2980b9)';
  }

  /**
   * Adicionar efeito de pulso
   */
  addPulseEffect() {
    const button = document.querySelector('button[onclick="saveSettings()"]');
    if (button) {
      button.style.animation = 'pulse 0.6s ease';
      setTimeout(() => {
        button.style.animation = '';
      }, 600);
    }
  }

  /**
   * Adicionar efeito de download
   */
  addDownloadEffect() {
    const button = document.querySelector('button[onclick="exportData()"]');
    if (button) {
      const icon = button.querySelector('i');
      if (icon) {
        icon.style.animation = 'bounce 0.6s ease';
        setTimeout(() => {
          icon.style.animation = '';
        }, 600);
      }
    }
  }

  /**
   * Adicionar efeito de lixo
   */
  addTrashEffect() {
    const button = document.querySelector('button[onclick="clearHistory()"]');
    if (button) {
      button.style.animation = 'shake 0.5s ease';
      setTimeout(() => {
        button.style.animation = '';
      }, 500);
    }
  }

  /**
   * Adicionar efeito de vassoura
   */
  addBroomEffect() {
    const button = document.querySelector('button[onclick="clearCache()"]');
    if (button) {
      const icon = button.querySelector('i');
      if (icon) {
        icon.style.animation = 'rotate 0.6s ease';
        setTimeout(() => {
          icon.style.animation = '';
        }, 600);
      }
    }
  }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  new SettingsButtonsManager();
});
