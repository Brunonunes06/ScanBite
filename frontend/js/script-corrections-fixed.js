// Correções para botões não funcionais do Nutri-Scan
// Versão corrigida e otimizada

// Função para scroll suave para seções
function scrollToSection(sectionId) {
  const section = document.querySelector(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
    // Fechar menu mobile se estiver aberto
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu && navMenu.classList.contains('active')) {
      navMenu.classList.remove('active');
      const toggle = document.querySelector('.mobile-menu-toggle');
      if (toggle) {
        toggle.classList.remove('active');
      }
    }
  }
}

// Aguardar DOM carregar
document.addEventListener('DOMContentLoaded', function() {
  console.log('Script de correções carregado');
  
  // Botões de assinatura - usar popup de upgrade
  document.querySelectorAll('.plan-button, .btn-pricing, .btn-primary').forEach(button => {
    // Verificar se é botão de assinatura
    if (button.textContent.includes('Assinar') || 
        button.textContent.includes('Upgrade') || 
        button.textContent.includes('Premium')) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Usar o popup de upgrade
        if (typeof showUpgradePopup === 'function') {
          showUpgradePopup();
        } else {
          // Fallback se o popup não estiver disponível
          console.log('Popup não disponível, redirecionando...');
          safeRedirect('payment.html');
        }
      });
    }
  });

  // Botão de upload/demo
  const uploadBtn = document.querySelector('.upload-btn, .btn-demo');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Simular upload e scan
      simulateUploadAndScan();
    });
  }

  // Formulário de contato
  const contactForm = document.querySelector('#contactForm, .contact-form form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Simular envio do formulário
      simulateContactForm(this);
    });
  }

  // Newsletter
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Simular inscrição
      simulateNewsletter(this);
    });
  }

  // ===== MENU MOBILE RESPONSIVO ===== 
  // Funciona em Desktop, Tablet e Mobile
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (mobileMenuToggle && navMenu) {
    // Toggle do menu ao clicar no hamburger
    mobileMenuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      navMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
    });
    
    // Fechar menu ao clicar em um link
    const navLinks = navMenu.querySelectorAll('.nav-link, .nav-menu a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
      });
    });
    
    // Fechar menu ao clicar fora dele
    document.addEventListener('click', function(e) {
      if (!mobileMenuToggle.contains(e.target) && !navMenu.contains(e.target)) {
        if (navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          mobileMenuToggle.classList.remove('active');
        }
      }
    });
    
    // Fechar menu ao redimensionar a janela para desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth > 900) {
        // Se voltou ao tamanho desktop, fechar o menu mobile
        if (navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          mobileMenuToggle.classList.remove('active');
        }
        // Mostrar menu normalmente em desktop
        navMenu.style.display = 'flex';
      } else {
        // Em tablet/mobile, deixar o CSS controlar
        navMenu.style.display = '';
      }
    });

    // Suporte a tecla ESC para fechar menu
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
      }
    });
  }

  // Demo upload functionality
  const demoUpload = document.getElementById('demoUpload');
  if (demoUpload) {
    demoUpload.addEventListener('click', function() {
      simulateUploadAndScan();
    });
  }

// Validar arquivo de imagem
function validateImageFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  const validation = {
    isValid: true,
    errors: []
  };
  
  // Verificar tamanho
  if (file.size > maxSize) {
    validation.isValid = false;
    validation.errors.push('O arquivo deve ter no máximo 10MB');
  }
  
  // Verificar tipo
  if (!allowedTypes.includes(file.type)) {
    validation.isValid = false;
    validation.errors.push('Formato não suportado. Use: JPG, PNG ou WebP');
  }
  
  // Verificar dimensões (se possível)
  if (file.type.startsWith('image/')) {
    const img = new Image();
    img.onload = function() {
      if (this.width < 200 || this.height < 200) {
        validation.isValid = false;
        validation.errors.push('A imagem deve ter pelo menos 200x200px');
      }
      if (this.width > 4000 || this.height > 4000) {
        validation.isValid = false;
        validation.errors.push('A imagem deve ter no máximo 4000x4000px');
      }
    };
    img.src = URL.createObjectURL(file);
  }
  
  return validation;
}

// Criar input de arquivo real para upload
function createImageUploadInput() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  
  input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = validateImageFile(file);
    
    if (!validation.isValid) {
      showNotification('Erro na validação da imagem:', 'error', {
        duration: 8000,
        actions: [
          {
            text: 'Verificar requisitos',
            icon: 'info-circle',
            onClick: 'showImageRequirements()'
          }
        ]
      });
      
      // Mostrar erros específicos
      validation.errors.forEach(error => {
        setTimeout(() => {
          showNotification(error, 'warning', { duration: 3000 });
        }, 500);
      });
      
      return;
    }
    
    // Se válido, processar imagem
    processImageFile(file);
  });
  
  return input;
}

// Processar arquivo de imagem
function processImageFile(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const imageData = e.target.result;
    
    // Mostrar preview da imagem
    showImagePreview(imageData, file.name);
    
    // Iniciar scan com a imagem real
    simulateUploadAndScan(imageData);
  };
  
  reader.onerror = function() {
    showNotification('Erro ao ler o arquivo de imagem', 'error');
  };
  
  reader.readAsDataURL(file);
}

// Mostrar preview da imagem
function showImagePreview(imageData, fileName) {
  const preview = document.createElement('div');
  preview.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: white;
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 1rem;
    animation: slideUp 0.3s ease;
  `;
  
  preview.innerHTML = `
    <img src="${imageData}" alt="${fileName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
    <div>
      <div style="font-weight: 600; color: #2c3e50; margin-bottom: 0.25rem;">${fileName}</div>
      <div style="font-size: 0.85rem; color: #7f8c8d;">Imagem carregada com sucesso</div>
    </div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #999; cursor: pointer; padding: 0.5rem;">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  document.body.appendChild(preview);
  
  // Auto remover após 5 segundos
  setTimeout(() => {
    if (preview.parentNode) {
      preview.style.animation = 'slideDown 0.3s ease forwards';
      setTimeout(() => preview.remove(), 300);
    }
  }, 5000);
}

// Mostrar requisitos de imagem
function showImageRequirements() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 500px; width: 90%;">
      <h3 style="margin: 0; color: #2c3e50; margin-bottom: 1.5rem;">
        <i class="fas fa-image" style="color: #3498db; margin-right: 0.5rem;"></i>
        Requisitos da Imagem
      </h3>
      
      <div class="requirements-list">
        <div class="requirement-item">
          <i class="fas fa-check-circle" style="color: #2ecc71;"></i>
          <span><strong>Formatos:</strong> JPG, PNG, WebP</span>
        </div>
        <div class="requirement-item">
          <i class="fas fa-check-circle" style="color: #2ecc71;"></i>
          <span><strong>Tamanho máximo:</strong> 10MB</span>
        </div>
        <div class="requirement-item">
          <i class="fas fa-check-circle" style="color: #2ecc71;"></i>
          <span><strong>Dimensões:</strong> Mínimo 200x200px, máximo 4000x4000px</span>
        </div>
        <div class="requirement-item">
          <i class="fas fa-info-circle" style="color: #3498db;"></i>
          <span><strong>Dica:</strong> Imagens nítidas e bem iluminadas funcionam melhor</span>
        </div>
      </div>
      
      <button onclick="this.closest('div').parentElement.remove()" style="margin-top: 1.5rem; padding: 0.8rem 2rem; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Entendido
      </button>
    </div>
  `;
  
  // Adicionar CSS para requisitos
  if (!document.querySelector('#requirementsStyles')) {
    const style = document.createElement('style');
    style.id = 'requirementsStyles';
    style.textContent = `
      .requirements-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .requirement-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 3px solid #2ecc71;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes slideDown {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(modal);
  
  // Fechar ao clicar fora
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

  // Navegação suave
  setupSmoothScrolling();
});

// Verificar se usuário está logado
function isUserLoggedIn() {
  const token = localStorage.getItem('nutriScanToken');
  const user = localStorage.getItem('nutriScanUser');
  return !!(token && user);
}

// Mostrar aviso de login necessário
function showLoginRequiredWarning() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 400px; width: 90%; text-align: center;">
      <div style="margin-bottom: 1.5rem;">
        <i class="fas fa-lock" style="font-size: 3rem; color: #3498db; margin-bottom: 1rem;"></i>
        <h3 style="margin: 0; color: var(--text-dark); margin-bottom: 1rem;">Login Necessário</h3>
        <p style="margin: 0; color: var(--text-light); line-height: 1.6;">
          Para realizar scans de produtos, você precisa estar logado. 
          Isso nos permite salvar seu histórico e fornecer uma experiência personalizada.
        </p>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button onclick="this.closest('div').parentElement.remove()" style="padding: 0.8rem 1.5rem; background: var(--medium-gray); color: var(--text-dark); border: none; border-radius: 8px; cursor: pointer;">
          Cancelar
        </button>
        <button onclick="safeRedirect('login.html')" style="padding: 0.8rem 1.5rem; background: var(--gradient-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
          Fazer Login
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fechar modal ao clicar fora
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Mostrar loading avançado
function showAdvancedLoading() {
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'advancedLoading';
  loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
  `;

  loadingOverlay.innerHTML = `
    <div style="text-align: center; color: white;">
      <div class="scan-loader" style="margin-bottom: 2rem;">
        <div class="scanner-ring"></div>
        <div class="scanner-dot"></div>
        <div class="scanner-wave"></div>
      </div>
      <h3 style="margin: 0; font-size: 1.5rem; margin-bottom: 0.5rem;">Analisando Imagem</h3>
      <div class="loading-steps">
        <div class="step active" data-step="1">
          <i class="fas fa-upload"></i>
          <span>Enviando imagem</span>
        </div>
        <div class="step" data-step="2">
          <i class="fas fa-brain"></i>
          <span>Processando com IA</span>
        </div>
        <div class="step" data-step="3">
          <i class="fas fa-search"></i>
          <span>Identificando ingredientes</span>
        </div>
        <div class="step" data-step="4">
          <i class="fas fa-check-circle"></i>
          <span>Análise concluída</span>
        </div>
      </div>
      <div class="progress-bar-container" style="width: 300px; margin: 1.5rem auto 0;">
        <div class="progress-bar" id="scanProgressBar" style="width: 0%;"></div>
      </div>
    </div>
  `;

  // Adicionar CSS para o loading
  const style = document.createElement('style');
  style.textContent = `
    .scan-loader {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto;
    }
    
    .scanner-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 3px solid transparent;
      border-top: 3px solid #2ecc71;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    .scanner-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 12px;
      background: #2ecc71;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 1s ease-in-out infinite;
    }
    
    .scanner-wave {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 2px solid #2ecc71;
      border-radius: 50%;
      animation: wave 2s ease-out infinite;
    }
    
    .loading-steps {
      display: flex;
      justify-content: space-between;
      width: 400px;
      margin: 0 auto;
    }
    
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      opacity: 0.3;
      transition: all 0.3s ease;
    }
    
    .step.active {
      opacity: 1;
      transform: scale(1.1);
    }
    
    .step i {
      font-size: 1.5rem;
      color: #2ecc71;
    }
    
    .step span {
      font-size: 0.8rem;
      text-align: center;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.5); }
    }
    
    @keyframes wave {
      0% {
        transform: scale(0.8);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(loadingOverlay);
  
  return loadingOverlay;
}

// Atualizar progresso do loading
function updateLoadingProgress(step, progress) {
  const steps = document.querySelectorAll('.step');
  const progressBar = document.getElementById('scanProgressBar');
  
  // Atualizar steps
  steps.forEach((stepEl, index) => {
    if (index < step) {
      stepEl.classList.add('active');
    } else {
      stepEl.classList.remove('active');
    }
  });
  
  // Atualizar progress bar
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

// Simular upload e scan
function simulateUploadAndScan() {
  // Verificar se usuário está logado
  if (!isUserLoggedIn()) {
    showLoginRequiredWarning();
    return;
  }

  const uploadBtn = document.querySelector('.upload-btn, .btn-demo');
  if (!uploadBtn) return;

  // Mostrar loading avançado
  const loadingOverlay = showAdvancedLoading();
  
  // Simular etapas do processo
  setTimeout(() => updateLoadingProgress(1, 25), 500);
  setTimeout(() => updateLoadingProgress(2, 50), 1500);
  setTimeout(() => updateLoadingProgress(3, 75), 2500);
  setTimeout(() => updateLoadingProgress(4, 100), 3500);
  
  // Simular delay total
  setTimeout(() => {
    // Remover loading
    loadingOverlay.remove();
    
    // Mostrar resultado
    showScanResult();
    
    // Mostrar feedback visual no botão
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-check"></i> Scan Concluído!';
    uploadBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
    
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
      uploadBtn.style.background = '';
    }, 2000);
  }, 4000);
}

// Mostrar resultado do scan
function showScanResult(imageData = null) {
  const result = {
    productName: 'Produto Teste',
    ingredients: ['Trigo', 'Açúcar', 'Leite', 'Ovos'],
    allergens: ['Glúten', 'Lactose'],
    status: 'warning',
    message: 'Este produto contém alérgenos que podem afetar você.'
  };

  // Criar modal de resultado
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 500px; width: 90%;">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="width: 60px; height: 60px; background: ${result.status === 'warning' ? '#f39c12' : '#27ae60'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
          <i class="fas fa-${result.status === 'warning' ? 'exclamation' : 'check'}" style="color: white; font-size: 1.5rem;"></i>
        </div>
        <h3 style="margin: 0; color: var(--text-dark);">${result.productName}</h3>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <h4 style="color: var(--text-dark); margin-bottom: 0.5rem;">Ingredientes:</h4>
        <p style="color: var(--text-light);">${result.ingredients.join(', ')}</p>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <h4 style="color: var(--text-dark); margin-bottom: 0.5rem;">⚠️ Alérgenos Detectados:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${result.allergens.map(allergen => `
            <span style="background: #e74c3c; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem;">
              ${allergen}
            </span>
          `).join('')}
        </div>
      </div>
      
      <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <p style="margin: 0; color: var(--text-light);">${result.message}</p>
      </div>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button onclick="this.closest('div').parentElement.remove()" style="padding: 0.8rem 1.5rem; background: var(--medium-gray); color: var(--text-dark); border: none; border-radius: 8px; cursor: pointer;">
          Fechar
        </button>
        <button onclick="saveScanToDashboard('${result.productName}', '${result.status}', ${imageData ? `'${imageData}'` : 'null'}); this.closest('div').parentElement.remove();" style="padding: 0.8rem 1.5rem; background: var(--gradient-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
          Ver Detalhes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fechar modal ao clicar fora
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Simular formulário de contato
function simulateContactForm(form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  // Mostrar loading
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  submitBtn.disabled = true;

  // Simular envio
  setTimeout(() => {
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Enviado!';
    
    // Mostrar mensagem de sucesso
    showNotification('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
    
    // Limpar formulário
    form.reset();
    
    // Restaurar botão
    setTimeout(() => {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }, 2000);
  }, 1500);
}

// Simular newsletter
function simulateNewsletter(form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  // Mostrar loading
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscrevendo...';
  submitBtn.disabled = true;

  // Simular inscrição
  setTimeout(() => {
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Inscrito!';
    
    // Mostrar mensagem de sucesso
    showNotification('Inscrição realizada com sucesso! Obrigado por se inscrever na nossa newsletter.', 'success');
    
    // Limpar formulário
    form.reset();
    
    // Restaurar botão
    setTimeout(() => {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }, 2000);
  }, 1000);
}

// Configurar navegação suave
function setupSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Mostrar notificação avançada
function showNotification(message, type = 'info', options = {}) {
  const {
    duration = 5000,
    showProgress = true,
    actions = [],
    icon = null
  } = options;

  const notification = document.createElement('div');
  notification.className = `advanced-notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-left: 4px solid ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    max-width: 400px;
    min-width: 300px;
    animation: notificationSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    backdrop-filter: blur(10px);
  `;

  const notificationContent = `
    <div class="notification-header">
      <div class="notification-icon">
        <i class="fas fa-${icon || (type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle')}"></i>
      </div>
      <button class="notification-close" onclick="this.closest('.advanced-notification').remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="notification-body">
      <div class="notification-message">${message}</div>
      ${actions.length > 0 ? `
        <div class="notification-actions">
          ${actions.map(action => `
            <button class="notification-action-btn" onclick="${action.onClick}">
              <i class="fas fa-${action.icon}"></i>
              ${action.text}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
    ${showProgress ? `
      <div class="notification-progress">
        <div class="progress-bar" style="animation: progressCountdown ${duration}ms linear forwards;"></div>
      </div>
    ` : ''}
  `;

  notification.innerHTML = notificationContent;

  // Adicionar CSS para notificações avançadas
  if (!document.querySelector('#notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
      .advanced-notification {
        border-radius: 12px;
        overflow: hidden;
      }
      
      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      
      .notification-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        font-size: 1.2rem;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      
      .notification-close:hover {
        background: rgba(0,0,0,0.1);
        color: #666;
      }
      
      .notification-message {
        color: #2c3e50;
        line-height: 1.5;
        margin-bottom: 0.5rem;
      }
      
      .notification-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }
      
      .notification-action-btn {
        padding: 0.4rem 0.8rem;
        border: 1px solid #e0e0e0;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.2s ease;
        color: #666;
      }
      
      .notification-action-btn:hover {
        background: #f8f9fa;
        border-color: #2ecc71;
        color: #2ecc71;
      }
      
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(0,0,0,0.1);
      }
      
      .notification-progress .progress-bar {
        height: 100%;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        width: 100%;
      }
      
      @keyframes notificationSlideIn {
        0% {
          transform: translateX(100%) scale(0.8);
          opacity: 0;
        }
        100% {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }
      
      @keyframes progressCountdown {
        0% { width: 100%; }
        100% { width: 0%; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Auto remover após duração
  if (duration > 0) {
    setTimeout(() => {
      notification.style.animation = 'notificationSlideOut 0.3s ease forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, duration);
  }

  return notification;
}

// Adicionar animações CSS se não existirem
if (!document.querySelector('#notificationAnimations')) {
  const style = document.createElement('style');
  style.id = 'notificationAnimations';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Configurar navegação suave
function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Fechar menu mobile se estiver aberto
        const navMenu = document.querySelector('.nav-menu');
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (navMenu && navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          mobileToggle.classList.remove('active');
        }
      }
    });
  });
}

// Salvar scan no dashboard
function saveScanToDashboard(productName, status, imageData = null) {
  // Atualizar estatísticas em tempo real
  updateDashboardStats(status);
  
  // Verificar se a função global está disponível (se o dashboard foi carregado)
  if (typeof addScanToDashboard === 'function') {
    addScanToDashboard(productName, status, imageData);
    showNotification('Scan salvo no dashboard!', 'success');
  } else {
    // Salvar no localStorage para sincronização posterior
    const scans = JSON.parse(localStorage.getItem('pendingScans') || '[]');
    scans.push({
      productName,
      status,
      imageData,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('pendingScans', JSON.stringify(scans));
    showNotification('Scan salvo! Será sincronizado com o dashboard.', 'success');
  }
}

// Atualizar estatísticas do dashboard em tempo real
function updateDashboardStats(status) {
  // Obter estatísticas atuais
  let stats = JSON.parse(localStorage.getItem('dashboardStats') || '{}');
  
  // Inicializar estatísticas se não existirem
  if (!stats.totalScans) stats.totalScans = 0;
  if (!stats.safeProducts) stats.safeProducts = 0;
  if (!stats.warningsFound) stats.warningsFound = 0;
  if (!stats.planUsage) stats.planUsage = 0;
  if (!stats.planLimit) stats.planLimit = 10;
  
  // Atualizar contadores
  stats.totalScans++;
  stats.planUsage++;
  
  if (status === 'safe') {
    stats.safeProducts++;
  } else if (status === 'warning' || status === 'danger') {
    stats.warningsFound++;
  }
  
  // Salvar estatísticas atualizadas
  localStorage.setItem('dashboardStats', JSON.stringify(stats));
  
  // Se o dashboard estiver aberto, atualizar a interface
  if (typeof updateDashboardUI === 'function') {
    updateDashboardUI(stats);
  }
}

// Função para o botão "Começar grátis" do hero
function handleHeroStartFree() {
  // Verificar se usuário já está logado
  if (!isUserLoggedIn()) {
    showLoginRequiredWarning();
    return;
  }
  
  // Usuário logado, redirecionar para dashboard
  safeRedirect('dashboard.html');
}

// Exportar funções para uso global
window.NutriScanCorrections = {
  simulateUploadAndScan,
  showScanResult,
  showNotification,
  setupSmoothScrolling
};

// Disponibilizar função globalmente
window.handleHeroStartFree = handleHeroStartFree;
