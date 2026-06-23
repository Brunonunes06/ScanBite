// Configuração da API Nutri-Scan
const API_CONFIG = {
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Função utilitária de redirecionamento seguro
 * Pode ser sobrescrita por módulos específicos se necessário
 */
function safeRedirect(url) {
  // Valida e redireciona de forma segura
  if (!url) return;

  // Se há um fileChecker com método especializado, delegar a ele (mantém compatibilidade)
  if (window.fileChecker && typeof window.fileChecker.safeRedirectTo === 'function') {
    try {
      window.fileChecker.safeRedirectTo(url);
      return;
    } catch (e) {
      console.warn('fileChecker.safeRedirectTo falhou, fallback para window.location:', e);
    }
  }

  // Se a URL começa com http, validar o domínio
  try {
    if (url.startsWith('http')) {
      const currentDomain = window.location.hostname;
      const urlObj = new URL(url);
      if (urlObj.hostname !== currentDomain) {
        console.warn('Redirecionamento bloqueado para domínio externo:', url);
        return;
      }
    }
  } catch (e) {
    console.warn('URL inválida passada para safeRedirect:', url, e);
    return;
  }

  // Redirecionamento seguro
  window.location.href = url;
}

// Classe para comunicação com a API
class NutriScanAPI {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.token = localStorage.getItem('nutriScanToken');
  }

  // Método genérico para requisições
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        ...API_CONFIG.headers,
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na API:', error);
      console.log('Servidor não disponível, usando modo simulado');
      
      // Fallback para modo simulado quando servidor não está disponível
      return this.getSimulatedResponse(endpoint, options);
    }
  }

  // Métodos HTTP
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Upload de arquivos
  async upload(endpoint, file) {
    const formData = new FormData();
    formData.append('image', file);

    const config = {
      method: 'POST',
      body: formData,
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      }
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro no upload');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  }

  // Autenticação
  async login(email, password) {
    const result = await this.post('/auth/login', { email, password });
    if (result.token) {
      this.token = result.token;
      localStorage.setItem('nutriScanToken', result.token);
    }
    return result;
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    try {
      await this.get('/auth/logout');
    } finally {
      this.token = null;
      localStorage.removeItem('nutriScanToken');
    }
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  // Usuários
  async getDashboard() {
    return this.get('/users/dashboard');
  }

  async getProfile() {
    return this.get('/users/profile');
  }

  async updateProfile(data) {
    return this.put('/users/profile', data);
  }

  async getScans(page = 1, limit = 10) {
    return this.get(`/users/scans?page=${page}&limit=${limit}`);
  }

  // Scans
  async createScan(file) {
    return this.upload('/scans', file);
  }

  async getScan(id) {
    return this.get(`/scans/${id}`);
  }

  async getScanStats() {
    return this.get('/scans/stats');
  }

  // Produtos
  async getProducts(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/products?${params}`);
  }

  async getProduct(id) {
    return this.get(`/products/${id}`);
  }

  async getProductByBarcode(barcode) {
    return this.get(`/products/barcode/${barcode}`);
  }

  // Assinaturas
  async getPlans() {
    return this.get('/subscriptions/plans');
  }

  async getSubscriptionStatus() {
    return this.get('/subscriptions/status');
  }

  async createCheckoutSession(planId) {
    return this.post('/subscriptions/create-checkout-session', { planId });
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
}

// Instância global da API
let api;
if (typeof NutriScanAPI !== 'undefined') {
  api = new NutriScanAPI();
} else {
  console.warn('NutriScanAPI não encontrada para instância global');
  api = null;
}

// Funções utilitárias
const APIUtils = {
  // Tratamento de erros
  handleError(error, customMessage = null) {
    console.error('Erro da API:', error);
    
    if (customMessage) {
      return customMessage;
    }
    
    if (error.message.includes('Failed to fetch')) {
      return 'Erro de conexão. Verifique se o servidor está rodando.';
    }
    
    if (error.message.includes('401')) {
      return 'Sessão expirada. Faça login novamente.';
    }
    
    if (error.message.includes('403')) {
      return 'Acesso negado.';
    }
    
    if (error.message.includes('404')) {
      return 'Recurso não encontrado.';
    }
    
    if (error.message.includes('429')) {
      return 'Muitas requisições. Tente novamente mais tarde.';
    }
    
    return error.message || 'Ocorreu um erro. Tente novamente.';
  },

  // Verificar se usuário está autenticado
  isAuthenticated() {
    return !!localStorage.getItem('nutriScanToken');
  },

  // Redirecionar para login
  redirectToLogin() {
    localStorage.removeItem('nutriScanToken');
    safeRedirect('index.html');
  },

  // Redirecionar para dashboard
  redirectToDashboard() {
    safeRedirect('dashboard.html');
  },

  // Formatar data
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  // Formatar hora
  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Método para fornecer respostas simuladas quando servidor não está disponível
  getSimulatedResponse(endpoint, options = {}) {
    console.log('Gerando resposta simulada para:', endpoint);
    
    // Simular delay de rede
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = JSON.parse(localStorage.getItem('nutriScanUser') || '{}');
        
        switch (endpoint) {
          case '/auth/google':
            resolve({
              success: true,
              user: {
                id: user.id || '1',
                name: user.name || 'Bruno Teste',
                email: user.email || 'bruno.teste@example.com',
                plan: user.plan || 'Free',
                profileImage: user.profileImage || null
              },
              token: 'simulated-token-' + Date.now()
            });
            break;
            
          case '/auth/login':
            resolve({
              success: true,
              user: {
                id: user.id || '1',
                name: user.name || 'Bruno Teste',
                email: user.email || 'bruno.teste@example.com',
                plan: user.plan || 'Free',
                profileImage: user.profileImage || null
              },
              token: 'simulated-token-' + Date.now()
            });
            break;
            
          case '/auth/register':
            resolve({
              success: true,
              user: {
                id: '1',
                name: options.body?.name || 'Novo Usuário',
                email: options.body?.email || 'usuario@example.com',
                plan: 'Free',
                profileImage: null
              },
              token: 'simulated-token-' + Date.now()
            });
            break;
            
          case '/user/profile':
            resolve({
              success: true,
              user: user || {
                id: '1',
                name: 'Bruno Teste',
                email: 'bruno.teste@example.com',
                plan: 'Free',
                profileImage: null
              }
            });
            break;
            
          case '/user/update':
            resolve({
              success: true,
              user: {
                ...user,
                ...options.body
              }
            });
            break;
            
          case '/scans':
            resolve({
              success: true,
              scans: JSON.parse(localStorage.getItem('nutriScanScans') || '[]')
            });
            break;
            
          case '/scans/save':
            const scans = JSON.parse(localStorage.getItem('nutriScanScans') || '[]');
            const newScan = {
              id: Date.now().toString(),
              ...options.body,
              date: new Date().toISOString()
            };
            scans.push(newScan);
            localStorage.setItem('nutriScanScans', JSON.stringify(scans));
            resolve({
              success: true,
              scan: newScan
            });
            break;
            
          default:
            resolve({
              success: true,
              message: 'Operação simulada concluída'
            });
        }
      }, 500); // Simular delay de 500ms
    });
  }
};
