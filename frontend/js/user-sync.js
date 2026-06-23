// Sistema de Sincronização de Dados do Usuário em Tempo Real
class UserSyncManager {
  constructor() {
    this.currentUser = null;
    this.syncInterval = null;
    this.eventListeners = new Map();
    this.isOnline = navigator.onLine;
    this.lastSyncTime = null;
    
    this.init();
  }

  init() {
    // Carregar dados iniciais do usuário
    this.loadUserData();
    
    // Configurar listeners de eventos
    this.setupEventListeners();
    
    // Iniciar sincronização automática
    this.startAutoSync();
    
    // Configurar storage events para sincronização entre abas
    this.setupStorageEvents();
    
    console.log('UserSyncManager inicializado');
  }

  // Carregar dados do usuário do localStorage
  loadUserData() {
    try {
      const userData = localStorage.getItem('nutriScanUser');
      const token = localStorage.getItem('nutriScanToken');
      
      if (userData && token) {
        this.currentUser = JSON.parse(userData);
        this.updateAllUIElements();
        console.log('Dados do usuário carregados:', this.currentUser.name);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }

  // Atualizar todos os elementos UI com dados do usuário
  updateAllUIElements() {
    if (!this.currentUser) return;

    // Elementos comuns em todas as páginas
    const userElements = {
      // Nome do usuário
      'userName': this.currentUser.name || 'Usuário',
      
      // Email do usuário
      'userEmail': this.currentUser.email || 'usuario@exemplo.com',
      
      // Avatar (iniciais)
      'userAvatar': this.getInitials(this.currentUser.name),
      
      // Badge de plano
      'userBadge': this.currentUser.plan || 'Free',
      
      // Profile name
      'profileName': this.currentUser.name || 'Usuário',
      
      'profileEmail': this.currentUser.email || 'usuario@exemplo.com',
      
      'profileBadge': this.currentUser.plan || 'Free'
    };

    // Atualizar cada elemento
    Object.entries(userElements).forEach(([elementId, value]) => {
      this.updateElement(elementId, value);
    });

    // Atualizar avatar com background image se existir
    if (this.currentUser.profileImage) {
      this.updateAvatarImages(this.currentUser.profileImage);
    }

    // Disparar evento de atualização
    this.dispatchSyncEvent('userUpdated', this.currentUser);
  }

  // Atualizar elemento específico
  updateElement(elementId, value) {
    const elements = document.querySelectorAll(`#${elementId}`);
    elements.forEach(element => {
      if (element) {
        // Se for avatar, usar texto (iniciais)
        if (elementId.includes('Avatar') && !element.style.backgroundImage) {
          element.textContent = value;
        } else {
          element.textContent = value;
        }
      }
    });
  }

  // Atualizar imagens de avatar
  updateAvatarImages(imageData) {
    const avatarElements = document.querySelectorAll('.user-avatar, #userAvatar, #profileAvatar');
    avatarElements.forEach(element => {
      if (element) {
        element.style.backgroundImage = `url(${imageData})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.textContent = '';
      }
    });
  }

  // Obter iniciais do nome
  getInitials(name) {
    if (!name) return 'U';
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Configurar event listeners
  setupEventListeners() {
    // Eventos de storage (sincronização entre abas)
    window.addEventListener('storage', (e) => {
      if (e.key === 'nutriScanUser') {
        this.handleStorageUpdate(e);
      }
    });

    // Eventos de online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWithServer();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Eventos de visibilidade da página
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.currentUser) {
        this.syncWithServer();
      }
    });
  }

  // Configurar storage events para sincronização
  setupStorageEvents() {
    // Monitorar mudanças no localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      originalSetItem.call(localStorage, key, value);
      
      if (key === 'nutriScanUser') {
        this.handleUserUpdate(JSON.parse(value));
      }
    };
  }

  // Lidar com atualização de usuário
  handleUserUpdate(userData) {
    const oldUser = this.currentUser;
    this.currentUser = userData;
    
    // Atualizar UI apenas se os dados mudaram
    if (!oldUser || JSON.stringify(oldUser) !== JSON.stringify(userData)) {
      this.updateAllUIElements();
      
      // Disparar evento de sincronização
      this.dispatchSyncEvent('userSynced', userData);
    }
  }

  // Lidar com atualização do storage
  handleStorageUpdate(event) {
    if (event.newValue) {
      try {
        const userData = JSON.parse(event.newValue);
        this.handleUserUpdate(userData);
      } catch (error) {
        console.error('Erro ao processar atualização do storage:', error);
      }
    }
  }

  // Iniciar sincronização automática
  startAutoSync() {
    // Sincronizar a cada 30 segundos
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.currentUser) {
        this.syncWithServer();
      }
    }, 30000);
  }

  // Parar sincronização automática
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sincronizar com servidor
  async syncWithServer() {
    if (!this.currentUser || !this.isOnline) return;

    try {
      // Tentar sincronizar com API
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nutriScanToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Atualizar dados locais se forem diferentes
        if (JSON.stringify(data.user) !== JSON.stringify(this.currentUser)) {
          localStorage.setItem('nutriScanUser', JSON.stringify(data.user));
          this.handleUserUpdate(data.user);
        }
        
        this.lastSyncTime = new Date();
        console.log('Sincronização com servidor concluída');
      }
    } catch (error) {
      console.log('Sincronização offline - usando dados locais');
    }
  }

  // Atualizar dados do usuário (chamado por outras páginas)
  updateUser(userData) {
    localStorage.setItem('nutriScanUser', JSON.stringify(userData));
    this.handleUserUpdate(userData);
  }

  // Atualizar foto de perfil
  updateProfileImage(imageData) {
    if (!this.currentUser) return;

    this.currentUser.profileImage = imageData;
    localStorage.setItem('nutriScanUser', JSON.stringify(this.currentUser));
    
    // Atualizar UI imediatamente
    this.updateAvatarImages(imageData);
    
    // Disparar evento
    this.dispatchSyncEvent('profileImageUpdated', imageData);
  }

  // Disparar evento de sincronização
  dispatchSyncEvent(eventType, data) {
    const event = new CustomEvent('userSync', {
      detail: {
        type: eventType,
        data: data,
        timestamp: new Date()
      }
    });
    
    document.dispatchEvent(event);
    
    // Notificar listeners registrados
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erro no callback de evento:', error);
        }
      });
    }
  }

  // Registrar listener de evento
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  // Remover listener de evento
  off(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      const callbacks = this.eventListeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Limpar recursos
  destroy() {
    this.stopAutoSync();
    this.eventListeners.clear();
    this.currentUser = null;
  }

  // Forçar sincronização manual
  forceSync() {
    this.loadUserData();
    this.syncWithServer();
  }

  // Obter status da sincronização
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSyncTime,
      currentUser: this.currentUser
    };
  }
}

// Criar instância global
window.userSync = new UserSyncManager();

// Expor funções globais para compatibilidade
window.updateUserData = (userData) => {
  window.userSync.updateUser(userData);
};

window.updateProfileImage = (imageData) => {
  window.userSync.updateProfileImage(imageData);
};

// Listener global para eventos de sincronização
document.addEventListener('userSync', (e) => {
  console.log('Evento de sincronização:', e.detail.type, e.detail.timestamp);
});

// Exportar para módulos (se usar)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserSyncManager;
}
