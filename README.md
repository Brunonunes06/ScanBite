# Safe-Bite 🥗

Sistema de análise nutricional e pagamento com integração Mercado Pago.

## 🚀 Funcionalidades

- **Análise Nutricional**: Escaneamento de alimentos para análise nutricional
- **Pagamento PIX**: Integração com Mercado Pago para pagamentos instantâneos
- **Sistema de Assinatura**: Planos premium com funcionalidades avançadas
- **QR Code Dinâmico**: Geração automática de QR Code para pagamentos PIX
- **Segurança Profissional**: Proteção de credenciais e dados sensíveis

## 🔐 Segurança

Este projeto implementa medidas de segurança profissionais:

- ✅ Credenciais protegidas por .gitignore
- ✅ Variáveis de ambiente centralizadas em backend/.env.example
- ✅ JWT secrets fortes para autenticação
- ✅ Webhook secrets para validação de pagamentos
- ✅ CORS configurado para origens permitidas
- ✅ Validação de entrada e sanitização de dados

## 📋 Configuração

### 1. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp backend/.env.example backend/.env

# Editar backend/.env com suas credenciais reais
```

### 2. Obter Credenciais Mercado Pago

- Acesse: https://www.mercadopago.com.br/developers
- Crie uma aplicação
- Copie Access Token e Public Key
- Configure em backend/.env

### 3. Iniciar Servidor

```bash
# Instalar dependências
npm install

# Iniciar backend
cd backend
npm start

# Servidor rodará em http://localhost:5000
```

## 📱 QR Code PIX

![QR Code PIX](qr-code-pix.png)

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express
- **Pagamento**: Mercado Pago API
- **Autenticação**: JWT
- **Banco de Dados**: MongoDB

## 📄 Licença

Este projeto é propriedade de Safe-Bite. Todos os direitos reservados.

## ⚠️ Aviso de Segurança

**NUNCA** compartilhe suas credenciais reais. Use apenas credenciais de teste em desenvolvimento. Revogue credenciais expostas imediatamente.

## 📞 Suporte

Para suporte, entre em contato através do sistema de contato do site.
