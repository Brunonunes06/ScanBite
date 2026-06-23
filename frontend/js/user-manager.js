// Gerenciador de Usuários - Nutri-Scan
// Ferramenta para visualizar e gerenciar usuários cadastrados

class UserManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupUI();
    this.displayUsers();
  }

  setupUI() {
    // Criar botão de gerenciamento se não existir
    if (!document.getElementById('userManagerBtn')) {
      const managerBtn = document.createElement('button');
      managerBtn.id = 'userManagerBtn';
      managerBtn.innerHTML = '<i class="fas fa-users"></i> Gerenciar Usuários';
      managerBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #2ecc71;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
        z-index: 9999;
        font-size: 12px;
      `;
      managerBtn.onclick = () => this.showUserManager();
      document.body.appendChild(managerBtn);
    }
  }

  showUserManager() {
    // Remover modal existente
    const existingModal = document.getElementById('userManagerModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'userManagerModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `;

    content.innerHTML = `
      <h2>Gerenciador de Usuários</h2>
      <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">×</button>
      
      <div style="margin-bottom: 20px;">
        <button onclick="userManager.clearAllUsers()" style="background: #e74c3c; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
          <i class="fas fa-trash"></i> Limpar Todos
        </button>
        <button onclick="userManager.createTestUser()" style="background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">
          <i class="fas fa-user-plus"></i> Criar Usuário Teste
        </button>
      </div>
      
      <div id="usersList"></div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    this.displayUsers();
  }

  displayUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    const registeredUsers = JSON.parse(localStorage.getItem('nutriScanRegisteredUsers') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('nutriScanUser') || 'null');

    if (registeredUsers.length === 0) {
      usersList.innerHTML = '<p>Nenhum usuário cadastrado.</p>';
      return;
    }

    let html = '<h3>Usuários Cadastrados:</h3><table style="width: 100%; border-collapse: collapse;">';
    html += '<tr style="background: #f0f0f0;"><th style="padding: 10px; border: 1px solid #ddd;">Nome</th><th style="padding: 10px; border: 1px solid #ddd;">Email</th><th style="padding: 10px; border: 1px solid #ddd;">Senha</th><th style="padding: 10px; border: 1px solid #ddd;">Status</th><th style="padding: 10px; border: 1px solid #ddd;">Ações</th></tr>';

    registeredUsers.forEach((user, index) => {
      const isCurrent = currentUser && currentUser.email === user.email;
      html += `<tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${user.name} ${isCurrent ? '(👤)' : ''}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${user.email}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${user.password}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${user.subscription?.plan || 'free'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">
          <button onclick="userManager.loginAsUser('${user.email}', '${user.password}')" style="background: #2ecc71; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Login</button>
          <button onclick="userManager.deleteUser(${index})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Excluir</button>
        </td>
      </tr>`;
    });

    html += '</table>';
    
    // Adicionar usuário demo
    html += '<h3 style="margin-top: 20px;">Usuário Demo:</h3>';
    html += '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr style="background: #f0f0f0;"><th style="padding: 10px; border: 1px solid #ddd;">Nome</th><th style="padding: 10px; border: 1px solid #ddd;">Email</th><th style="padding: 10px; border: 1px solid #ddd;">Senha</th><th style="padding: 10px; border: 1px solid #ddd;">Ações</th></tr>';
    html += `<tr>
      <td style="padding: 10px; border: 1px solid #ddd;">Usuário Demo</td>
      <td style="padding: 10px; border: 1px solid #ddd;">demo@nutriscan.com</td>
      <td style="padding: 10px; border: 1px solid #ddd;">demo123</td>
      <td style="padding: 10px; border: 1px solid #ddd;">
        <button onclick="userManager.loginAsUser('demo@nutriscan.com', 'demo123')" style="background: #2ecc71; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Login</button>
      </td>
    </tr>`;
    html += '</table>';

    usersList.innerHTML = html;
  }

  createTestUser() {
    const testUser = {
      id: 'user_' + Date.now(),
      name: 'Usuário Teste',
      email: 'teste@nutriscan.com',
      password: 'teste123',
      subscription: {
        plan: 'free',
        status: 'active',
        startDate: new Date(),
        scansUsed: 0,
        scansLimit: 10
      },
      preferences: {
        allergies: [],
        dietaryRestrictions: [],
        notifications: true,
        language: 'pt-BR'
      },
      createdAt: new Date()
    };

    const registeredUsers = JSON.parse(localStorage.getItem('nutriScanRegisteredUsers') || '[]');
    registeredUsers.push(testUser);
    localStorage.setItem('nutriScanRegisteredUsers', JSON.stringify(registeredUsers));

    alert('Usuário teste criado!\nEmail: teste@nutriscan.com\nSenha: teste123');
    this.displayUsers();
  }

  clearAllUsers() {
    if (confirm('Tem certeza que deseja excluir TODOS os usuários cadastrados?')) {
      localStorage.removeItem('nutriScanRegisteredUsers');
      localStorage.removeItem('nutriScanToken');
      localStorage.removeItem('nutriScanUser');
      alert('Todos os usuários foram excluídos.');
      this.displayUsers();
    }
  }

  deleteUser(index) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      const registeredUsers = JSON.parse(localStorage.getItem('nutriScanRegisteredUsers') || '[]');
      registeredUsers.splice(index, 1);
      localStorage.setItem('nutriScanRegisteredUsers', JSON.stringify(registeredUsers));
      
      // Se era o usuário atual, fazer logout
      const currentUser = JSON.parse(localStorage.getItem('nutriScanUser') || 'null');
      if (currentUser && registeredUsers.findIndex(u => u.email === currentUser.email) === -1) {
        localStorage.removeItem('nutriScanToken');
        localStorage.removeItem('nutriScanUser');
      }
      
      this.displayUsers();
    }
  }

  loginAsUser(email, password) {
    // Simular login
    const registeredUsers = JSON.parse(localStorage.getItem('nutriScanRegisteredUsers') || '[]');
    const foundUser = registeredUsers.find(u => u.email === email);
    
    if (foundUser) {
      const result = {
        success: true,
        token: 'simulated_token_' + Date.now(),
        user: {
          _id: foundUser.id,
          userId: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          subscription: foundUser.subscription,
          preferences: foundUser.preferences
        }
      };

      localStorage.setItem('nutriScanToken', result.token);
      localStorage.setItem('nutriScanUser', JSON.stringify(result.user));
        localStorage.setItem('lastActivity', Date.now().toString());

        // Notificar userSync e authMonitor
        try {
          if (window.userSync && typeof window.userSync.updateUser === 'function') window.userSync.updateUser(result.user);
          if (window.authMonitor && typeof window.authMonitor.checkAuthStatus === 'function') window.authMonitor.checkAuthStatus();
        } catch (e) {
          console.warn('Falha ao notificar userSync/authMonitor:', e);
        }
      
      alert(`Login realizado como ${foundUser.name}!`);
      safeRedirect('index.html');
    } else {
      // Login como usuário demo
      const result = {
        success: true,
        token: 'simulated_token_' + Date.now(),
        user: {
          _id: 'demo_user',
          userId: 'demo_user',
          email: email,
          name: 'Usuário Demo',
          subscription: {
            plan: 'free',
            status: 'active',
            startDate: new Date(),
            scansUsed: 0,
            scansLimit: 10
          },
          preferences: {
            allergies: [],
            dietaryRestrictions: [],
            notifications: true,
            language: 'pt-BR'
          }
        }
      };

      localStorage.setItem('nutriScanToken', result.token);
      localStorage.setItem('nutriScanUser', JSON.stringify(result.user));
      
      alert('Login realizado como Usuário Demo!');
      safeRedirect('index.html');
    }
  }
}

// Inicializar gerenciador
let userManager;
document.addEventListener('DOMContentLoaded', () => {
  userManager = new UserManager();
  window.userManager = userManager;
});

// Garantir que o userManager esteja disponível globalmente
if (typeof window !== 'undefined') {
  window.userManager = window.userManager || null;
}
