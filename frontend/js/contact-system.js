// Sistema de Contato Safe-Bite
class ContactSystem {
  constructor() {
    // Verificar se NutriScanAPI está disponível
    if (typeof NutriScanAPI !== 'undefined') {
      this.api = new NutriScanAPI();
    } else {
      console.warn('NutriScanAPI não encontrada, usando modo simulado');
      this.api = null;
    }
    this.form = null;
    this.submitButton = null;
    this.storageKey = 'nutriscan_contact_form_data';
    this.autoSaveInterval = null;
    this.init();
  }

  init() {
    this.form = document.getElementById('contactForm');
    this.submitButton = document.querySelector('.btn-submit');
    
    if (this.form) {
      this.setupEventListeners();
      this.loadSavedData();
      this.startAutoSave();
    }
  }

  setupEventListeners() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Validação em tempo real
    const inputs = this.form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => {
        this.clearFieldError(input);
        this.saveFormData(); // Auto-salvar ao digitar
      });
    });

    // Salvar ao sair da página
    window.addEventListener('beforeunload', () => {
      this.saveFormData();
    });

    // Limpar dados após envio bem-sucedido
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.loadSavedData();
      }
    });
  }

  async handleSubmit() {
    const formData = this.getFormData();
    
    if (!this.validateForm(formData)) {
      return;
    }

    this.setLoadingState(true);
    this.hideMessages();

    try {
      const response = await this.api.post('/contact', formData);
      
      if (response.success) {
        this.showSuccess(response.message);
        this.resetForm();
        
        // Mostrar informações de debug em desenvolvimento
        if (response.debug && window.location.hostname === 'localhost') {
          console.log('Debug info:', response.debug);
        }
      } else {
        this.showError(response.message || 'Erro ao enviar mensagem.');
      }
    } catch (error) {
      console.error('Erro no envio:', error);
      this.showError('Erro de conexão. Tente novamente mais tarde.');
    } finally {
      this.setLoadingState(false);
    }
  }

  getFormData() {
    return {
      nome: document.getElementById('nome').value.trim(),
      email: document.getElementById('email').value.trim(),
      mensagem: document.getElementById('mensagem').value.trim()
    };
  }

  validateForm(data) {
    let isValid = true;

    // Validar nome
    if (!data.nome) {
      this.showFieldError('nome', 'Nome é obrigatório.');
      isValid = false;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      this.showFieldError('email', 'Email inválido.');
      isValid = false;
    }

    // Validar mensagem
    if (!data.mensagem || data.mensagem.length < 3) {
      this.showFieldError('mensagem', 'Mensagem deve ter pelo menos 3 caracteres.');
      isValid = false;
    }

    return isValid;
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldId = field.id;
    let error = null;

    switch (fieldId) {
      case 'nome':
        if (!value) {
          error = 'Nome é obrigatório.';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !emailRegex.test(value)) {
          error = 'Email inválido.';
        }
        break;
      case 'mensagem':
        if (!value || value.length < 3) {
          error = 'Mensagem deve ter pelo menos 3 caracteres.';
        }
        break;
    }

    if (error) {
      this.showFieldError(fieldId, error);
      return false;
    }

    return true;
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const existingError = field.parentNode.querySelector('.field-error');
    
    if (existingError) {
      existingError.remove();
    }

    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.cssText = `
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    `;

    field.parentNode.appendChild(errorElement);
    field.style.borderColor = '#e74c3c';
  }

  clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
    field.style.borderColor = '';
  }

  setLoadingState(loading) {
    if (loading) {
      this.submitButton.disabled = true;
      this.submitButton.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Enviando...
      `;
    } else {
      this.submitButton.disabled = false;
      this.submitButton.innerHTML = `
        Enviar Mensagem
        <i class="fas fa-paper-plane"></i>
      `;
    }
  }

  showSuccess(message) {
    this.hideMessages();
    
    const successElement = document.createElement('div');
    successElement.className = 'contact-success';
    successElement.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;
    successElement.style.cssText = `
      background: linear-gradient(135deg, #2ecc71, #27ae60);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      animation: slideDown 0.3s ease-out;
    `;

    this.form.parentNode.insertBefore(successElement, this.form);

    // Remover após 5 segundos
    setTimeout(() => {
      if (successElement.parentNode) {
        successElement.remove();
      }
    }, 5000);

    // Adicionar animação
    if (!document.querySelector('#contactAnimations')) {
      const style = document.createElement('style');
      style.id = 'contactAnimations';
      style.textContent = `
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  showError(message) {
    this.hideMessages();
    
    const errorElement = document.createElement('div');
    errorElement.className = 'contact-error';
    errorElement.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>${message}</span>
    `;
    errorElement.style.cssText = `
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      animation: slideDown 0.3s ease-out;
    `;

    this.form.parentNode.insertBefore(errorElement, this.form);
  }

  hideMessages() {
    const existingMessages = this.form.parentNode.querySelectorAll('.contact-success, .contact-error');
    existingMessages.forEach(msg => msg.remove());
  }

  resetForm() {
    this.form.reset();
    // Limpar errors
    const fields = this.form.querySelectorAll('input, textarea');
    fields.forEach(field => {
      this.clearFieldError(field);
    });
    // Limpar dados salvos após envio bem-sucedido
    this.clearSavedData();
  }

  // Métodos de salvamento automático
  saveFormData() {
    const formData = this.getFormData();
    const saveData = {
      ...formData,
      timestamp: Date.now(),
      url: window.location.href
    };
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(saveData));
    } catch (error) {
      console.warn('Não foi possível salvar dados do formulário:', error);
    }
  }

  loadSavedData() {
    try {
      const savedData = localStorage.getItem(this.storageKey);
      if (!savedData) return;

      const data = JSON.parse(savedData);
      
      // Verificar se os dados são recentes (máximo 24 horas)
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
      if (Date.now() - data.timestamp > maxAge) {
        this.clearSavedData();
        return;
      }

      // Verificar se estamos na mesma página
      if (data.url !== window.location.href) {
        return;
      }

      // Preencher campos com dados salvos
      if (data.nome) document.getElementById('nome').value = data.nome;
      if (data.email) document.getElementById('email').value = data.email;
      if (data.mensagem) document.getElementById('mensagem').value = data.mensagem;

      // Mostrar indicador de dados recuperados
      this.showRestoreIndicator();

    } catch (error) {
      console.warn('Erro ao carregar dados salvos:', error);
    }
  }

  clearSavedData() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Erro ao limpar dados salvos:', error);
    }
  }

  startAutoSave() {
    // Salvar automaticamente a cada 30 segundos
    this.autoSaveInterval = setInterval(() => {
      this.saveFormData();
    }, 30000);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  showRestoreIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'form-restore-indicator';
    indicator.innerHTML = `
      <i class="fas fa-info-circle"></i>
      <span>Dados do formulário foram recuperados automaticamente.</span>
      <button type="button" onclick="this.parentElement.remove()">×</button>
    `;
    indicator.style.cssText = `
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      animation: slideDown 0.3s ease-out;
      position: relative;
    `;

    const button = indicator.querySelector('button');
    button.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0;
      margin-left: auto;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    this.form.parentNode.insertBefore(indicator, this.form);

    // Remover automaticamente após 5 segundos
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 5000);
  }
}

// Inicializar sistema quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new ContactSystem();
});

// Exportar para uso global
window.ContactSystem = ContactSystem;
