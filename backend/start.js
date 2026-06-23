// Script de inicialização do servidor
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor Nutri-Scan...');

// Verificar se as dependências estão instaladas
const fs = require('fs');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Instalando dependências...');
  
  const npmInstall = spawn('npm', ['install'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  npmInstall.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependências instaladas com sucesso!');
      startServer();
    } else {
      console.error('❌ Erro ao instalar dependências');
      process.exit(1);
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🔧 Iniciando servidor Node.js...');
  
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  server.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Servidor encerrado com sucesso');
    } else {
      console.error(`❌ Servidor encerrado com código: ${code}`);
    }
  });

  server.on('error', (error) => {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  });
}
