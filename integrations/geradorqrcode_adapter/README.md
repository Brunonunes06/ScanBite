PixPayment Adapter for geradorqrcode
=================================

Este diretório contém um componente React pronto para integrar o repositório
`dlsoares18/geradorqrcode` à API do backend (`/api/payment/pix`) do Safe-Bite.

Objetivo
--------
- Consumir `/api/payment/pix` para gerar um pagamento PIX via Mercado Pago (quando configurado) ou fallback local.
- Exibir o QR Code (data URL ou imagem base64) e o código "copia e cola".

Como aplicar no repositório `geradorqrcode`
-----------------------------------------
1. No seu ambiente local, clone o repositório:

```bash
git clone https://github.com/dlsoares18/geradorqrcode.git
cd geradorqrcode
```

2. Instale dependências e rode a aplicação:

```bash
npm install
npm start
```

3. Copie o arquivo `PixPayment.jsx` deste diretório para `src/components/PixPayment.jsx` no repositório `geradorqrcode`.

4. Importe e use o componente em `src/App.js` ou em uma rota específica:

```jsx
import PixPayment from './components/PixPayment';

function App() {
  return (
    <div>
      <PixPayment />
    </div>
  );
}

export default App;
```

5. Ajuste `package.json` ou `proxy` se necessário para apontar para o backend do Safe-Bite. Por exemplo, no `package.json` do React adicione:

```json
  "proxy": "http://localhost:3001"
```

Isso permite chamadas fetch a `/api/payment/pix` sem CORS durante o desenvolvimento.

Notas
-----
- O componente usa `fetch` para enviar `POST /api/payment/pix` com payload `{ amount, description, customerInfo }`.
- A resposta esperada contém `pixCode`, `qrCode` (data URL) ou `raw` com dados do provedor.
- Se usar Mercado Pago, configure `backend/.env` com `MERCADO_PAGO_ACCESS_TOKEN`.

Se quiser, eu posso aplicar esse patch diretamente no repositório clonado aqui (se você permitir clonar dentro do workspace) ou criar um branch de integração.
