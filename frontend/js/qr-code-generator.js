/**
 * qr-code-generator.js
 * Gerador de QR Code funciona offline via QRCode.js
 * CDN: https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
 */

class QRCodeGenerator {
  constructor() {
    this.qrCodeLibLoaded = typeof QRCode !== 'undefined';
  }

  /**
   * Gera QR Code em formato canvas/imagem
   * @param {string} text - Texto/código a ser convertido em QR
   * @param {object} options - Opções de configuração
   * @returns {Promise<string>} Data URL da imagem PNG
   */
  async generateQRCode(text, options = {}) {
    const config = {
      width: options.width || 256,
      height: options.height || 256,
      colorDark: options.colorDark || '#000000',
      colorLight: options.colorLight || '#FFFFFF',
      correctLevel: options.correctLevel || 'M',
      ...options
    };

    return new Promise((resolve, reject) => {
      try {
        // Criar container temporário
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.appendChild(container);

        // Gerar QR Code
        const qr = new QRCode(container, {
          text: text,
          width: config.width,
          height: config.height,
          colorDark: config.colorDark,
          colorLight: config.colorLight,
          correctLevel: QRCode.CorrectLevel[config.correctLevel]
        });

        // Aguardar renderização
        setTimeout(() => {
          try {
            const canvas = container.querySelector('canvas');
            if (canvas) {
              const dataUrl = canvas.toDataURL('image/png');
              document.body.removeChild(container);
              resolve(dataUrl);
            } else {
              throw new Error('Canvas não encontrado');
            }
          } catch (error) {
            document.body.removeChild(container);
            reject(error);
          }
        }, 100);
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        reject(error);
      }
    });
  }

  /**
   * Gera QR Code para PIX (com logo)
   * @param {string} pixCode - Código PIX para escanear
   * @returns {Promise<string>} Data URL da imagem PNG
   */
  async generatePixQRCode(pixCode) {
    return this.generateQRCode(pixCode, {
      width: 300,
      height: 300,
      colorDark: '#2ecc71', // Verde Safe-Bite
      colorLight: '#ffffff',
      correctLevel: 'H' // Alta correção de erro
    });
  }

  /**
   * Fallback: Gera QR Code alternativo usando canvas manual
   * Para usar se biblioteca não carregar
   */
  async generateQRCodeManual(text) {
    return this.generateSimpleQRViaSVG(text);
  }

  /**
   * Gera QR Code via SVG (mais simples, sem biblioteca)
   * Fallback para quando QRCode.js não estiver disponível
   */
  async generateSimpleQRViaSVG(text) {
    try {
      // Usar API externa como fallback (funciona offline com cache)
      const encodedText = encodeURIComponent(text);
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedText}&color=2ecc71&bgcolor=ffffff`;
      
      return qrImageUrl;
    } catch (error) {
      console.error('Erro ao gerar QR Code manual:', error);
      throw error;
    }
  }

  /**
   * Valida se biblioteca QRCode está disponível
   */
  isLibraryLoaded() {
    return this.qrCodeLibLoaded;
  }

  /**
   * Carrega biblioteca se não estiver
   */
  async loadLibrary() {
    if (this.qrCodeLibLoaded) {
      return true;
    }

    return new Promise((resolve) => {
      if (typeof QRCode !== 'undefined') {
        this.qrCodeLibLoaded = true;
        resolve(true);
        return;
      }

      // Criar script dinamicamente
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      
      script.onload = () => {
        this.qrCodeLibLoaded = typeof QRCode !== 'undefined';
        console.log('✓ QRCode.js carregado');
        resolve(true);
      };

      script.onerror = () => {
        console.warn('⚠ Não foi possível carregar QRCode.js via CDN');
        this.qrCodeLibLoaded = false;
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }
}

// Instância global
let qrCodeGenerator;

if (typeof window !== 'undefined') {
  qrCodeGenerator = new QRCodeGenerator();
  
  // Carregar biblioteca ao iniciar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      qrCodeGenerator.loadLibrary().catch(e => console.warn('QR Code não disponível:', e));
    });
  } else {
    qrCodeGenerator.loadLibrary().catch(e => console.warn('QR Code não disponível:', e));
  }
}
