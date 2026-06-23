import React, { useState } from 'react';

export default function PixPayment() {
  const [amount, setAmount] = useState('9.90');
  const [name, setName] = useState('Cliente Teste');
  const [email, setEmail] = useState('cliente@example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payment, setPayment] = useState(null);

  async function createPix(e) {
    e && e.preventDefault();
    setLoading(true);
    setError(null);
    setPayment(null);

    try {
      const res = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: 'Pagamento via geradorqrcode',
          customerInfo: { name, email }
        })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      if (!data || !data.payment) throw new Error('Resposta inválida do servidor');

      setPayment(data.payment);
    } catch (err) {
      console.error('Erro ao criar PIX:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function copyText(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      alert('Copiado para área de transferência');
    }).catch(() => alert('Falha ao copiar'));
  }

  return (
    <div style={{maxWidth:720, margin:'0 auto', padding:20}}>
      <h2>Gerador de PIX / QR</h2>
      <form onSubmit={createPix} style={{display:'grid', gap:10}}>
        <label>
          Valor (BRL)
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          Nome do pagador
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          Email do pagador
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </label>

        <div>
          <button type="submit" disabled={loading}>{loading ? 'Gerando...' : 'Gerar PIX / QR'}</button>
        </div>
      </form>

      {error && <div style={{color:'crimson', marginTop:10}}>Erro: {error}</div>}

      {payment && (
        <div style={{marginTop:20, padding:16, border:'1px solid #ddd', borderRadius:8}}>
          <h3>Pagamento gerado</h3>
          <div><strong>Tipo:</strong> {payment.type}</div>
          <div style={{marginTop:8}}>
            {payment.qrCode ? (
              <div>
                <img src={payment.qrCode} alt="QR Code" style={{maxWidth:'100%'}} />
              </div>
            ) : (
              <div style={{padding:12, background:'#f6f6f6', borderRadius:6}}>
                <code style={{wordBreak:'break-all'}}>{payment.pixCode || payment.copyPaste || (payment.raw && JSON.stringify(payment.raw))}</code>
              </div>
            )}
          </div>

          <div style={{marginTop:12}}>
            <button onClick={() => copyText(payment.copyPaste || payment.pixCode || (payment.raw && JSON.stringify(payment.raw)))}>Copiar código</button>
          </div>
          <div style={{marginTop:8, color:'#666'}}>Expira: {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString() : '—'}</div>
        </div>
      )}
    </div>
  );
}
